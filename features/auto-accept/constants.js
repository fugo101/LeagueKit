/**
 * Constants for the Auto Accept feature.
 */

import { LCU } from '../../shared/lcu';
import { createLogger } from '../../shared/log';

// LCU endpoints (shared ones come from shared/lcu.js).
export const API = {
  READY_CHECK: '/lol-matchmaking/v1/ready-check',
  ACCEPT: '/lol-matchmaking/v1/ready-check/accept',
  SEARCH: '/lol-matchmaking/v1/search',
  LOBBY: '/lol-lobby/v2/lobby',
  START_SEARCH: LCU.START_SEARCH,
};

// Tunables.
export const MAX_RETRIES = 3;
export const RETRY_BASE_DELAY = 100; // ms, exponential backoff base
export const POLL_INTERVAL = 300; // ms, fallback poll while in ReadyCheck
export const REQUEUE_DELAY = 1500; // ms, wait before re-queueing a canceled match

export const log = createLogger('[LeagueKit:auto-accept]');

// Settings persistence.
export const STORAGE_KEY = 'leagueKit.autoAccept';
export const DEFAULT_SETTINGS = {
  enabled: true,
  delayMs: 0,
  requeue: true,
};

// Accept-delay presets shown in the settings dropdown (label -> milliseconds).
export const DELAY_PRESETS = [
  { label: '0s', value: 0 },
  { label: '0.5s', value: 500 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
];
