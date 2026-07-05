/**
 * The single storage boundary for LeagueKit.
 *
 * The League Client is a CEF/Chromium app that does NOT persist web storage to
 * disk (it behaves like an incognito session), so `localStorage` is wiped on
 * every client restart. Pengu Loader's global `DataStore` namespace persists
 * JSON to an on-disk file and is the durable place for user config.
 *
 * This module is the ONLY file in the codebase that references `DataStore` or
 * `localStorage`. Everything else (settings store, Debug flag, future features)
 * persists through here, so swapping the backend or key scheme is a one-file
 * change. It intentionally imports nothing internal (leaf layer) to stay free of
 * circular dependencies — `store.js` and `log.js` both depend on it.
 *
 * DataStore API (synchronous, JSON values):
 *   DataStore.set(key, value) -> boolean
 *   DataStore.get(key, fallback?) -> value | undefined
 *   DataStore.has(key) -> boolean
 *   DataStore.remove(key) -> boolean
 */

// Cache the capability check: is Pengu's DataStore present?
let dsCache = null;
export function dsAvailable() {
  if (dsCache === null) {
    dsCache = typeof DataStore !== 'undefined' && DataStore !== null;
  }
  return dsCache;
}

// Read a stored value. With DataStore, returns the structured value directly
// (object/array/string/etc.); with the localStorage fallback, returns the raw
// string (callers JSON.parse it, matching the pre-DataStore behavior). Returns
// undefined/null when absent.
export function getItem(key) {
  if (dsAvailable()) return DataStore.get(key);
  return localStorage.getItem(key);
}

// Write a value. DataStore stores the structured value as-is; the localStorage
// fallback keeps the JSON-string form for backward compatibility.
export function setItem(key, value) {
  if (dsAvailable()) return DataStore.set(key, value);
  return localStorage.setItem(key, JSON.stringify(value));
}

// Remove a key. Exposed so callers never need to touch a backend directly.
export function removeItem(key) {
  if (dsAvailable()) return DataStore.remove(key);
  return localStorage.removeItem(key);
}

// One-time upgrade path: copy a legacy localStorage value into DataStore the
// first time we see a key that DataStore doesn't have yet, so users who already
// configured settings under the old backend don't get reset. Non-fatal.
export function migrateFromLocalStorage(key) {
  if (!dsAvailable()) return;
  try {
    if (DataStore.has(key)) return;
    const raw = localStorage.getItem(key);
    if (raw == null) return;
    // Legacy values were stored as JSON strings; parse, else keep the raw string.
    let value;
    try {
      value = JSON.parse(raw);
    } catch (_) {
      value = raw;
    }
    DataStore.set(key, value);
  } catch (_) {
    /* migration is best-effort — never block load on it */
  }
}
