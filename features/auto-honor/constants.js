/**
 * Constants for the Auto Honor feature.
 */

import { createLogger } from '../../shared/log';

export const API = {
  BALLOT: '/lol-honor-v2/v1/ballot',
  // The live client posts honors here with { honorType, recipientPuuid }.
  // (/lol-honor-v2/v1/honor-player with a `puuid` field leaves the recipient
  // unset and answers HTTP 200 "failed_to_contact_honor_server".)
  HONOR: '/lol-honor/v1/honor',
  // Sources for quickly building the preferred-summoner list.
  FRIENDS: '/lol-chat/v1/friends',
  LOBBY: '/lol-lobby/v2/lobby',
  CHAMP_SELECT: '/lol-champ-select/v1/session',
  // Profile-icon asset base: `${PROFILE_ICON}/${iconId}.jpg`.
  PROFILE_ICON: '/lol-game-data/assets/v1/profile-icons',
};

export const log = createLogger('[LeagueKit:auto-honor]');

// The game grants votePool.votes honors per game; when casting several in a row
// give the honor service a short beat between calls.
export const HONOR_STEP_DELAY = 250; // ms between consecutive honor casts

// The honor ceremony's submit/continue button — clicking it finalizes the
// ballot (this is what reveals the honor to the recipient) and closes the
// screen. V3 client markup first, then the older V1 markup.
export const HONOR_SUBMIT_SELECTOR =
  '.vote-ceremony-v3-submit-button, .vote-ceremony-submit-button';
export const HONOR_CLOSE_TRIES = 10;
export const HONOR_CLOSE_DELAY = 300; // ms between submit-button polls

export const STORAGE_KEY = 'leagueKit.autoHonor';
export const DEFAULT_SETTINGS = {
  enabled: true,
  preferOnly: false, // honor only a preferred summoner; skip if none is eligible
  closeScreen: true, // after honoring, click submit to finalize + close the screen
  preferred: [], // [{ puuid, summonerId, gameName, tagLine, iconId }]
};
