/**
 * Generic settings store for LeagueKit features.
 * Each feature owns a key; values are plain JSON objects.
 *
 * Persistence is delegated to `persist.js` (Pengu DataStore, localStorage
 * fallback) — this file only handles merging stored values over `defaults`.
 */

import { log } from './log';
import * as persist from './persist';

// Deep-copy the (JSON-shaped) defaults so nested arrays/objects are never shared
// with the module-level constant. A shallow `{ ...defaults }` would hand out the
// same nested `preferred` array that callers then mutate in place, polluting the
// default for the process lifetime.
function cloneDefaults(defaults) {
  try {
    return structuredClone(defaults);
  } catch (_) {
    return JSON.parse(JSON.stringify(defaults));
  }
}

// Read a settings object, merged over `defaults`. Returns a copy of `defaults`
// on any failure (missing, malformed, storage disabled). Migrates any legacy
// localStorage value into the durable backend on first read.
export function load(key, defaults) {
  try {
    persist.migrateFromLocalStorage(key);
    const stored = persist.getItem(key);
    if (stored != null) {
      // DataStore returns a structured object; the localStorage fallback returns
      // a JSON string — normalize both to an object before merging.
      const obj = typeof stored === 'string' ? JSON.parse(stored) : stored;
      // Clone defaults first so keys absent from `obj` don't share references.
      return { ...cloneDefaults(defaults), ...obj };
    }
  } catch (err) {
    log.warn(`Failed to load "${key}", using defaults:`, err);
  }
  return cloneDefaults(defaults);
}

export function save(key, value) {
  try {
    persist.setItem(key, value);
  } catch (err) {
    log.warn(`Failed to save "${key}":`, err);
  }
}
