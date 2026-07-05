/**
 * Identity + matching for preferred summoners, shared by the engine (core.js)
 * and the picker UI (manager.js) so the two never drift. A player is matched by
 * puuid (primary; stable, the key recent client patches use) or summonerId
 * (fallback).
 */

// Stable identity for dedupe/membership: prefer puuid, fall back to summonerId.
export const idKey = (e) =>
  e.puuid != null ? `p:${e.puuid}` : e.summonerId != null ? `s:${e.summonerId}` : null;

// Whether two player-ish objects refer to the same summoner.
export const samePlayer = (a, b) =>
  (a.puuid != null && b.puuid != null && a.puuid === b.puuid) ||
  (a.summonerId != null && b.summonerId != null && a.summonerId === b.summonerId);

// Whether `candidate` is in a list of preferred entries.
export const isPreferred = (list, candidate) => list.some((p) => samePlayer(p, candidate));
