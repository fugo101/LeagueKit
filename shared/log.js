/**
 * Shared logging for LeagueKit.
 *
 * Verbose action logs (`debug`/`info`) print only when Debug is enabled (toggled
 * in the settings dialog's Info tab); `warn`/`error` always surface so problems
 * are never hidden. The Debug flag persists via shared/persist.js (Pengu
 * DataStore, so it survives client restarts) and is shared by every logger, so
 * flipping it takes effect immediately.
 */

import * as persist from './persist';

const DEBUG_KEY = 'leagueKit.debug';

let debugEnabled = false;
try {
  persist.migrateFromLocalStorage(DEBUG_KEY);
  // DataStore returns a boolean; the localStorage fallback returns the string
  // 'true' — accept either.
  const stored = persist.getItem(DEBUG_KEY);
  debugEnabled = stored === true || stored === 'true';
} catch (_) {
  /* storage disabled — stay off */
}

export const isDebug = () => debugEnabled;

export const setDebug = (on) => {
  debugEnabled = !!on;
  try {
    persist.setItem(DEBUG_KEY, debugEnabled);
  } catch (_) {
    /* ignore */
  }
};

// Build a logger that prefixes every message. `warn`/`error` use .bind so
// DevTools attributes them to the real call site (not this file).
export function createLogger(prefix) {
  return {
    debug: (...args) => {
      if (debugEnabled) console.log(prefix, ...args);
    },
    info: (...args) => {
      if (debugEnabled) console.log(prefix, ...args);
    },
    warn: console.warn.bind(console, prefix),
    error: console.error.bind(console, prefix),
  };
}

// Plugin-level logger for non-feature messages (registry, store, hotkey).
export const log = createLogger('[LeagueKit]');
