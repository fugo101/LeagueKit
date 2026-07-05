/**
 * Auto Accept engine: accepts ready-checks reliably via a socket observer
 * with a polling fallback and bounded retries, and optionally re-queues when
 * a found match is canceled.
 */

import { API, MAX_RETRIES, RETRY_BASE_DELAY, POLL_INTERVAL, REQUEUE_DELAY, log } from './constants';
import { sleep } from '../../shared/util';
import {
  PHASES,
  RESET_PHASES,
  getJson,
  post,
  onGameflowPhase,
  logApiFailure,
} from '../../shared/lcu';

// A ready-check is waiting for *our* response.
const isReadyCheckPending = (data) =>
  !!data && data.state === 'InProgress' && data.playerResponse === 'None';

export function createAutoAccept(socket, settings) {
  let hasAccepted = false;
  let retryCount = 0;
  let pollInterval = null;
  let pollStartTimer = null; // pending setTimeout that kicks off polling
  let prevPhase = null;

  const resetState = () => {
    hasAccepted = false;
    retryCount = 0;
  };

  // POST accept with bounded exponential-backoff retries.
  const attemptAcceptance = async () => {
    if (hasAccepted || !settings.enabled) return;
    try {
      const res = await post(API.ACCEPT);
      if (res.ok) {
        hasAccepted = true;
        retryCount = 0;
        log.info('Match accepted ✔');
        return;
      }
      retryCount++;
      await logApiFailure(
        log,
        `Accept attempt ${retryCount} failed`,
        { method: 'POST', path: API.ACCEPT },
        res
      );
    } catch (err) {
      retryCount++;
      log.warn(`Accept attempt ${retryCount} failed:`, err);
      log.debug('↳ API', { request: { method: 'POST', path: API.ACCEPT }, error: String(err) });
    }
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY * 2 ** (retryCount - 1) + Math.random() * 50;
      await sleep(delay);
      return attemptAcceptance();
    }
    log.error('All accept attempts failed');
  };

  // Called when a ready-check is known to be pending. With a delay, we wait
  // then re-verify (so a manual decline during the wait is respected); with no
  // delay we accept directly since the caller already confirmed pending state.
  const acceptReadyCheck = async () => {
    if (hasAccepted || !settings.enabled) return;
    log.debug(
      'Ready-check pending → accepting',
      settings.delayMs ? `(after ${settings.delayMs}ms)` : ''
    );
    if (settings.delayMs <= 0) {
      await attemptAcceptance();
      return;
    }
    await sleep(settings.delayMs);
    if (hasAccepted || !settings.enabled) return;
    try {
      const res = await fetch(API.READY_CHECK);
      if (res.ok && isReadyCheckPending(await res.json())) {
        await attemptAcceptance();
      }
    } catch {
      // If the verify call fails, fall back to a direct accept attempt.
      await attemptAcceptance();
    }
  };

  // Fallback polling while a ready-check is active, in case the socket misses
  // the event.
  const startPolling = () => {
    if (pollInterval || hasAccepted || !settings.enabled) return;
    log.debug('Started ready-check polling');
    pollInterval = setInterval(async () => {
      if (hasAccepted || !settings.enabled) {
        stopPolling();
        return;
      }
      try {
        const res = await fetch(API.READY_CHECK);
        if (res.ok && isReadyCheckPending(await res.json())) {
          stopPolling();
          await acceptReadyCheck();
        }
      } catch {
        // ignore transient poll errors
      }
    }, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollStartTimer) {
      clearTimeout(pollStartTimer);
      pollStartTimer = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
      log.debug('Stopped ready-check polling');
    }
  };

  // Re-queue after a match was canceled (someone declined/dodged).
  const requeue = async () => {
    if (!settings.requeue) return;
    log.debug('Match canceled → re-queuing');
    await sleep(REQUEUE_DELAY);
    // Matchmaking search returns HTTP 400 unless we're the lobby leader and the
    // lobby is ready — verify before posting so a non-leader doesn't 400.
    let lobby;
    try {
      lobby = await getJson(API.LOBBY);
    } catch (_) {
      log.debug('Re-queue: no lobby — skipping');
      return;
    }
    if (!lobby.localMember || !lobby.localMember.isLeader) {
      log.debug('Re-queue: not lobby leader — skipping');
      return;
    }
    if (!lobby.canStartActivity) {
      log.debug('Re-queue: lobby not ready — skipping');
      return;
    }
    try {
      const res = await post(API.START_SEARCH);
      if (res.ok) log.info('Match canceled — re-queued ↻');
      else
        await logApiFailure(
          log,
          'Re-queue failed',
          { method: 'POST', path: API.START_SEARCH },
          res
        );
    } catch (err) {
      log.warn('Re-queue error:', err);
      log.debug('↳ API', {
        request: { method: 'POST', path: API.START_SEARCH },
        error: String(err),
      });
    }
  };

  // --- Socket observers ----------------------------------------------------
  const readyCheckObserver = socket.observe(API.READY_CHECK, async (message) => {
    if (message.eventType === 'Delete' || !message.data) return;
    if (isReadyCheckPending(message.data) && !hasAccepted) {
      await acceptReadyCheck();
    } else if (message.data.state !== 'InProgress' && hasAccepted) {
      resetState();
    }
  });

  const gameflowObserver = onGameflowPhase(socket, (phase) => {
    if (phase === PHASES.READY_CHECK) {
      // Tracked so teardown / an early phase change can cancel it before it
      // fires and starts an otherwise-orphaned poll loop.
      if (pollStartTimer) clearTimeout(pollStartTimer);
      pollStartTimer = setTimeout(() => {
        pollStartTimer = null;
        startPolling();
      }, 500);
    } else {
      stopPolling();
      // Accepted but the lobby returned to 'Lobby' instead of progressing to
      // ChampSelect => the match was canceled (someone declined/dodged).
      if (prevPhase === PHASES.READY_CHECK && phase === PHASES.LOBBY && hasAccepted) {
        requeue();
      }
      if (RESET_PHASES.includes(phase)) {
        resetState();
      }
    }
    prevPhase = phase;
  });

  const searchObserver = socket.observe(API.SEARCH, (message) => {
    if (
      message.eventType === 'Delete' ||
      (message.data && message.data.searchState === 'Invalid')
    ) {
      resetState();
      stopPolling();
    }
  });

  return {
    destroy() {
      readyCheckObserver.disconnect();
      gameflowObserver.disconnect();
      searchObserver.disconnect();
      stopPolling();
    },
  };
}
