/**
 * Auto Play-Again engine: two independent behaviors after a game ends —
 *   (A) returnToLobby: POST play-again to return the party to the lobby;
 *   (B) autoQueue: once in the lobby, start matchmaking — but only when we're
 *       the lobby leader and the lobby is ready (canStartActivity), waiting out
 *       teammates still returning, then searching exactly once.
 */

import { API, log, READY_POLL_INTERVAL, READY_TIMEOUT } from './constants';
import { sleep } from '../../shared/util';
import { PHASES, getJson, post, onGameflowPhase, logApiFailure } from '../../shared/lcu';

// Phases that mean a game is wrapping up — open the post-game window.
const END_PHASES = [PHASES.WAITING_FOR_STATS, PHASES.PRE_END_OF_GAME, PHASES.END_OF_GAME];

export function createAutoPlayAgain(socket, settings) {
  let postGame = false; // a game just ended — gates the post-game auto-queue
  let firedReturn = false; // play-again ran once this game
  let queueTimer = null; // active lobby-readiness poll

  // (A) Return the party to the lobby (dismisses the end-of-game screen).
  const returnToLobby = async () => {
    if (firedReturn || !settings.returnToLobby) return;
    firedReturn = true;
    if (settings.delayMs > 0) await sleep(settings.delayMs);
    try {
      const res = await post(API.PLAY_AGAIN);
      if (res.ok) log.info('Returned to lobby ↩');
      else
        await logApiFailure(
          log,
          'Return to lobby failed',
          { method: 'POST', path: API.PLAY_AGAIN },
          res
        );
    } catch (err) {
      log.warn('Return to lobby error:', err);
      log.debug('↳ API', { request: { method: 'POST', path: API.PLAY_AGAIN }, error: String(err) });
    }
  };

  const stopAutoQueue = () => {
    if (queueTimer) {
      clearInterval(queueTimer);
      queueTimer = null;
    }
  };

  // (B) Poll the lobby until we're the leader and it's ready to start, then
  // search exactly once. Bails early if we're not the leader; gives up on
  // timeout (e.g. a teammate never returns).
  const startAutoQueue = () => {
    if (!settings.autoQueue || queueTimer) return;
    const deadline = Date.now() + READY_TIMEOUT;
    log.debug('Auto-queue: waiting for lobby readiness');

    const tick = async () => {
      let lobby;
      try {
        lobby = await getJson(API.LOBBY);
      } catch (_) {
        log.debug('Auto-queue: no lobby — stopping');
        return stopAutoQueue();
      }
      if (!lobby.localMember || !lobby.localMember.isLeader) {
        log.debug('Auto-queue: not lobby leader — skipping');
        return stopAutoQueue();
      }
      if (lobby.canStartActivity) {
        stopAutoQueue();
        try {
          const res = await post(API.START_SEARCH);
          if (res.ok) log.info('Auto-queued ↻');
          else
            await logApiFailure(
              log,
              'Auto-queue search failed',
              { method: 'POST', path: API.START_SEARCH },
              res
            );
        } catch (err) {
          log.warn('Auto-queue search error:', err);
          log.debug('↳ API', {
            request: { method: 'POST', path: API.START_SEARCH },
            error: String(err),
          });
        }
        return;
      }
      if (Date.now() >= deadline) {
        log.debug('Auto-queue: timed out waiting for readiness — giving up');
        return stopAutoQueue();
      }
      // else: teammates still returning (start button disabled) — keep waiting.
    };

    tick(); // check immediately, then on an interval
    queueTimer = setInterval(tick, READY_POLL_INTERVAL);
  };

  const observer = onGameflowPhase(socket, (phase) => {
    if (END_PHASES.includes(phase)) {
      postGame = true;
      if (phase === PHASES.END_OF_GAME) returnToLobby();
    } else if (phase === PHASES.LOBBY) {
      // Reached the lobby. Auto-queue only if this followed a game (postGame),
      // so a manually created lobby is never auto-queued.
      if (postGame) startAutoQueue();
      postGame = false;
      firedReturn = false;
    } else {
      // NONE / MATCHMAKING / READY_CHECK / CHAMP_SELECT / InProgress: out of the
      // post-game window — reset and cancel any pending readiness poll.
      postGame = false;
      firedReturn = false;
      stopAutoQueue();
    }
  });

  return {
    destroy() {
      observer.disconnect();
      stopAutoQueue();
    },
  };
}
