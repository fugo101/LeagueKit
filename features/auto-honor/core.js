/**
 * Auto Honor engine: at the end of a game, cast the game's honors
 * (votePool.votes) — preferred players first, then (unless preferOnly) random
 * allies to fill the remaining slots.
 */

import {
  API,
  log,
  HONOR_STEP_DELAY,
  HONOR_SUBMIT_SELECTOR,
  HONOR_CLOSE_TRIES,
  HONOR_CLOSE_DELAY,
} from './constants';
import { isPreferred } from './preferred';
import { sleep } from '../../shared/util';
import { PHASES, IDLE_PHASES, getJson, post, onGameflowPhase, readBody } from '../../shared/lcu';

// The honor vote-ceremony screen appears at PreEndOfGame; the ballot is also
// still honorable at EndOfGame. Honor on whichever phase we observe first
// (the honoredThisGame guard keeps it to one sequence per game).
const HONOR_PHASES = [PHASES.PRE_END_OF_GAME, PHASES.END_OF_GAME];

export function createAutoHonor(socket, settings) {
  let honoredThisGame = false;

  // Readable label for a ballot entry (ballots carry an empty summonerName).
  const nameOf = (e) => e.summonerName || e.gameName || e.championName || e.puuid;

  // Fisher–Yates shuffle, in place.
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Whom to honor, up to `votes` slots: every eligible preferred player first,
  // then — unless preferOnly — random others to fill the remaining slots.
  const selectTargets = (pool, votes) => {
    const preferred = pool.filter((c) => isPreferred(settings.preferred, c));
    if (settings.preferOnly) return preferred.slice(0, votes);
    const rest = shuffle(pool.filter((c) => !isPreferred(settings.preferred, c)));
    return [...preferred, ...rest].slice(0, votes);
  };

  // Cast one honor. true on success; false on any error (HTTP, or a 200 body
  // like "failed_to_contact_honor_server").
  const honorOne = async (target) => {
    const name = nameOf(target);
    // The live client honors via /lol-honor/v1/honor with `recipientPuuid`.
    const body = { honorType: 'HEART', recipientPuuid: target.puuid };
    const res = await post(API.HONOR, body);
    // Success is usually an empty 2xx; some failures still answer HTTP 200 with
    // an error body (e.g. "failed_to_contact_honor_server") — inspect it.
    const result = await readBody(res);
    const errorCode =
      typeof result === 'string'
        ? result
        : result &&
          (result.errorCode || result.error || (result.httpStatus >= 400 && 'http_error'));
    if (res.ok && !errorCode) {
      log.info('Honored ✔', name);
      return true;
    }
    log.warn('Honor not completed', { name, errorCode });
    log.debug('↳ API', {
      request: { method: 'POST', path: API.HONOR, body },
      response: { status: res.status, body: result },
    });
    return false;
  };

  // Read the ballot and honor the selected targets. Returns how many succeeded.
  const honorBallot = async () => {
    const ballot = await getJson(API.BALLOT);
    log.debug('Ballot', ballot); // raw shape, for confirming puuid / pool fields
    // Already honored this game (e.g. after a plugin reload) — don't double up.
    if (ballot.honoredPlayers && ballot.honoredPlayers.length) {
      log.info('Already honored this game — nothing to do');
      return 0;
    }
    // votePool.votes = how many honors the game grants (default 1 if absent).
    const votes =
      ballot.votePool && Number.isFinite(ballot.votePool.votes) ? ballot.votePool.votes : 1;
    if (votes <= 0) {
      log.info('Game grants no honor (0 votes) — skipping');
      return 0;
    }
    // Honor applies to allies; fall back to other pools if the client exposes
    // them under a different key. A puuid is required to honor.
    const allies = ballot.eligibleAllies || [];
    const others = ballot.eligiblePlayers || ballot.eligibleOpponents || [];
    const pool = (allies.length ? allies : others).filter((p) => p.puuid);
    if (!pool.length) {
      log.warn('Ballot has no honorable players — nothing to honor');
      return 0;
    }
    const targets = selectTargets(pool, votes);
    if (!targets.length) {
      log.info('No preferred player eligible — skipping honor');
      return 0;
    }
    log.debug(`Honoring ${targets.length}/${votes}:`, targets.map(nameOf).join(', '));
    let honored = 0;
    for (const target of targets) {
      if (honored > 0) await sleep(HONOR_STEP_DELAY); // a beat between casts
      if (await honorOne(target)) honored++;
      else break; // most likely out of votes / server refused — stop, don't spam
    }
    return honored;
  };

  // After an API honor the ceremony UI stays open, and the recipient only sees
  // the result once the ballot is submitted. Click the ceremony's submit/
  // continue button (the same control a player clicks) to finalize and close it.
  const dismissHonorScreen = async () => {
    if (typeof document === 'undefined') return;
    for (let i = 0; i < HONOR_CLOSE_TRIES; i++) {
      const btn = document.querySelector(HONOR_SUBMIT_SELECTOR);
      if (btn) {
        btn.click();
        log.info('Honor screen closed');
        return;
      }
      await sleep(HONOR_CLOSE_DELAY);
    }
    log.debug('Honor submit button not found — leaving screen open');
  };

  const honor = async () => {
    if (honoredThisGame || !settings.enabled) return;
    honoredThisGame = true; // guard so we honor once per game
    log.debug('End of game → honoring');
    try {
      const honored = await honorBallot();
      if (honored > 0) {
        log.info(`Honored ${honored} player(s)`);
        if (settings.closeScreen) await dismissHonorScreen();
      }
    } catch (err) {
      log.warn('Honor error:', err);
    }
  };

  const gameflowObserver = onGameflowPhase(socket, (phase) => {
    if (HONOR_PHASES.includes(phase)) {
      honor();
    } else if (IDLE_PHASES.includes(phase)) {
      honoredThisGame = false; // ready for the next game
    }
  });

  return {
    destroy() {
      gameflowObserver.disconnect();
    },
  };
}
