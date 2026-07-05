/**
 * The log-capture buffer for LeagueKit.
 *
 * Background: Pengu Loader had a filesystem API (`PluginFS`) but it was REMOVED
 * in v1.1.2 "for security reasons" and is absent from the current stable build
 * (v1.1.6). There is therefore no way for a plugin to write a `.log` file to disk
 * directly. The only durable storage available is Pengu's `DataStore` (JSON blob,
 * accessed here through shared/persist.js — the single storage boundary).
 *
 * So instead of streaming to a file, this sink keeps a capped in-memory ring
 * buffer of the most recent log lines and mirrors it to DataStore so it survives
 * client restarts. The settings dialog exposes Copy / Download / Clear actions
 * (see about.js) that read `getText()` — the user grabs the log on demand and
 * pastes it into a file or bug report.
 *
 * This module imports only persist.js (leaf layer) to avoid import cycles: log.js
 * depends on it, not the other way around. Every storage call is wrapped so a
 * logging failure can never throw back into a call site.
 */

import * as persist from './persist';

const STORAGE_KEY = 'leagueKit.logBuffer';
const MAX_LINES = 2000; // ring-buffer cap; oldest lines drop off the front
const FLUSH_INTERVAL_MS = 3000; // batch DataStore writes so we don't persist per line

let started = false;
let timer = null;
let buffer = [];
let dirty = false;

// Read the persisted buffer without touching module state. DataStore returns the
// array directly; the localStorage fallback returns a JSON string.
function readPersisted() {
  try {
    const stored = persist.getItem(STORAGE_KEY);
    if (Array.isArray(stored)) return stored;
    if (typeof stored === 'string') {
      const arr = JSON.parse(stored);
      if (Array.isArray(arr)) return arr;
    }
  } catch (_) {
    /* corrupt/absent — start empty */
  }
  return [];
}

function persistBuffer() {
  try {
    persist.setItem(STORAGE_KEY, buffer);
  } catch (_) {
    /* storage disabled — keep the in-memory buffer at least */
  }
}

// Begin capturing: load any previously persisted lines and start the flush timer.
// Idempotent.
export function start() {
  if (started) return;
  buffer = readPersisted().slice(-MAX_LINES);
  started = true;
  timer = setInterval(() => {
    if (dirty) {
      dirty = false;
      persistBuffer();
    }
  }, FLUSH_INTERVAL_MS);
}

// Stop capturing: persist any pending lines and clear the timer.
export function stop() {
  if (!started) return;
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  if (dirty) {
    dirty = false;
    persistBuffer();
  }
  started = false;
}

// Queue one preformatted line. No-op until start() has run, so log calls made
// while capture is off cost nothing.
export function push(line) {
  if (!started) return;
  buffer.push(line);
  if (buffer.length > MAX_LINES) buffer.splice(0, buffer.length - MAX_LINES);
  dirty = true;
}

// Full captured log as text (live buffer when capturing, else the persisted one),
// for the Copy / Download actions — works whether or not capture is currently on.
export function getText() {
  const lines = started ? buffer : readPersisted();
  return lines.join('\n');
}

// Number of captured lines available (for labeling UI / empty checks).
export function count() {
  return (started ? buffer : readPersisted()).length;
}

// Wipe the captured log, in memory and on disk.
export function clear() {
  buffer = [];
  dirty = false;
  try {
    persist.removeItem(STORAGE_KEY);
  } catch (_) {
    /* ignore */
  }
}
