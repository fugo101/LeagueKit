/**
 * Shared League Client (LCU) helpers: common endpoints, gameflow phase names,
 * and thin fetch wrappers. Pengu proxies LCU requests, so paths are relative
 * and need no auth headers.
 */

// Endpoints shared by more than one feature. Feature-specific endpoints stay in
// each feature's own constants.js.
export const LCU = {
  GAMEFLOW_PHASE: '/lol-gameflow/v1/gameflow-phase',
  START_SEARCH: '/lol-lobby/v2/lobby/matchmaking/search',
};

// Gameflow phase names (avoids magic strings across engines).
export const PHASES = {
  NONE: 'None',
  LOBBY: 'Lobby',
  MATCHMAKING: 'Matchmaking',
  READY_CHECK: 'ReadyCheck',
  CHAMP_SELECT: 'ChampSelect',
  WAITING_FOR_STATS: 'WaitingForStats',
  PRE_END_OF_GAME: 'PreEndOfGame',
  END_OF_GAME: 'EndOfGame',
};

// Phases where a game is over / not started — engines reset their per-game state.
export const IDLE_PHASES = [PHASES.NONE, PHASES.LOBBY, PHASES.MATCHMAKING];

// Phases where auto-accept resets its ready-check state (idle + champ select).
export const RESET_PHASES = [...IDLE_PHASES, PHASES.CHAMP_SELECT];

// GET a path and parse JSON, throwing on a non-OK response.
export async function getJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

// POST a path (optionally with a JSON body) and return the Response. Like fetch,
// it rejects only on network errors — callers check `res.ok` themselves.
export function post(path, body) {
  const init = { method: 'POST' };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  return fetch(path, init);
}

// Read a Response body without throwing: parsed JSON when possible, else raw
// text, else null. Consumes the body stream — call only when done with `res`.
export async function readBody(res) {
  try {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

// Log an API failure: a one-line `warn` always, plus — when Debug is on — a
// `debug` dump of the full request ({ method, path, body? }) and response
// ({ status, body }) to ease diagnosis. Pass the Response as `res`, or null for
// a network-error path (then put the error in `request`).
export async function logApiFailure(logger, summary, request, res) {
  if (res) {
    logger.warn(`${summary} — HTTP ${res.status}`);
    logger.debug('↳ API', { request, response: { status: res.status, body: await readBody(res) } });
  } else {
    logger.warn(summary);
    logger.debug('↳ API', { request });
  }
}

// Observe the gameflow phase, invoking handler(phase, message) on each change.
// Returns the observer (with .disconnect()).
export const onGameflowPhase = (socket, handler) =>
  socket.observe(LCU.GAMEFLOW_PHASE, (message) => handler(message.data, message));
