/**
 * Shared logging for LeagueKit.
 *
 * Verbose action logs (`debug`/`info`) print to the DevTools console only when
 * Debug is enabled (toggled in the settings dialog's Info tab); `warn`/`error`
 * always surface so problems are never hidden. The Debug flag persists via
 * shared/persist.js (Pengu DataStore, so it survives client restarts) and is
 * shared by every logger, so flipping it takes effect immediately.
 *
 * Separately — and always on — EVERY level (including debug/info, regardless of
 * the console Debug flag) is mirrored into a capped capture buffer via
 * shared/logsink.js that persists through DataStore (survives client restarts).
 * Pengu's file API (PluginFS) was removed in v1.1.2, so there is no on-disk log
 * file; the settings dialog exports the buffer with Copy / Download / Clear. This
 * module is the single chokepoint: all four log methods funnel through `emit`, so
 * every existing call site is captured with no per-feature changes.
 */

import * as persist from './persist';
import * as logsink from './logsink';

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

// Log capture is always on. index.js drives its lifecycle: startLogCapture() at
// init, stopLogCapture() in the cleanup closure (flushes + clears the timer).
export function startLogCapture() {
  logsink.start();
}

export function stopLogCapture() {
  return logsink.stop();
}

// Local-time timestamp `YYYY-MM-DD HH:mm:ss.SSS` for captured lines.
function localTs() {
  const d = new Date();
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
  );
}

// Serialize one console arg to text for the capture buffer. Strings pass through;
// Errors keep their stack; everything else is JSON (falling back to String on
// circular refs or otherwise-unserializable values).
function fmtArg(a) {
  if (typeof a === 'string') return a;
  if (a instanceof Error) return a.stack || a.message;
  try {
    return JSON.stringify(a);
  } catch (_) {
    return String(a);
  }
}

function formatLine(level, prefix, args) {
  return `[${localTs()}] [${level}] ${prefix} ${args.map(fmtArg).join(' ')}`;
}

// Route one log call to the console (gated per level) and always to the capture
// buffer (all levels).
function emit(level, consoleFn, gated, prefix, args) {
  if (!gated || debugEnabled) consoleFn(prefix, ...args);
  logsink.push(formatLine(level, prefix, args));
}

// Build a logger that prefixes every message.
//
// NOTE: `warn`/`error` previously used `console.warn/error.bind` so DevTools
// attributed them to the real call site. To also tee them to the capture buffer
// we now wrap them, so DevTools shows this file as the source. Deliberate, minimal
// tradeoff: the logged line still carries the `[LeagueKit:<feature>]` prefix,
// level, and message, so the origin remains identifiable.
export function createLogger(prefix) {
  return {
    debug: (...args) => emit('DEBUG', console.log, true, prefix, args),
    info: (...args) => emit('INFO', console.log, true, prefix, args),
    warn: (...args) => emit('WARN', console.warn, false, prefix, args),
    error: (...args) => emit('ERROR', console.error, false, prefix, args),
  };
}

// Plugin-level logger for non-feature messages (registry, store, hotkey).
export const log = createLogger('[LeagueKit]');
