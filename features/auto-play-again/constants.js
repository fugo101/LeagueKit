/**
 * Constants for the Auto Play-Again feature.
 */

import { LCU } from '../../shared/lcu';
import { createLogger } from '../../shared/log';

export const API = {
  PLAY_AGAIN: '/lol-lobby/v2/play-again',
  LOBBY: '/lol-lobby/v2/lobby',
  START_SEARCH: LCU.START_SEARCH,
};

export const log = createLogger('[LeagueKit:auto-play-again]');

// Auto-queue waits for the lobby to be ready (leader + canStartActivity) before
// searching — premade teammates may still be returning right after the game.
export const READY_POLL_INTERVAL = 2000; // ms between lobby readiness checks
export const READY_TIMEOUT = 30000; // ms max wait for canStartActivity

export const STORAGE_KEY = 'leagueKit.autoPlayAgain';
export const DEFAULT_SETTINGS = {
  returnToLobby: true, // POST play-again after a game (works for any player)
  autoQueue: true, // auto-start matchmaking once leader + lobby is ready
  delayMs: 2000, // wait after EndOfGame before returning to lobby
};

// Delay presets for the settings dropdown.
export const DELAY_PRESETS = [
  { label: '0s', value: 0 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
];
