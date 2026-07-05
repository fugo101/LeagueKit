/**
 * Tiny i18n layer for LeagueKit's settings UI.
 *
 * Strings are referenced by semantic label keys (e.g. 'autoAccept.acceptDelay'),
 * not by their English text. Each language is one dictionary under
 * shared/locales/<code>.js mapping those keys to display text. `t(key)` returns
 * the current language's text, falling back to English (./locales/en.js) when a
 * key isn't translated, and finally to the raw key if it's missing everywhere —
 * so a new/untranslated string is always safe.
 *
 * Adding a language is two steps: create shared/locales/<code>.js (copy en.js and
 * translate) and add one line to REGISTRY below. Nothing else changes.
 *
 * The chosen language persists via shared/persist.js (Pengu DataStore, survives
 * client restarts), mirroring the Debug flag in shared/log.js. Only the settings
 * UI is translated; console logs stay English (they are developer-facing).
 */

import * as persist from './persist';
import { en } from './locales/en';
import { vi } from './locales/vi';

const LANG_KEY = 'leagueKit.lang';
const DEFAULT_LANG = 'en';

// The single source of truth for available languages. Add a language here (plus
// its shared/locales/<value>.js dictionary) and both the dropdown and the
// translator pick it up automatically.
const REGISTRY = [
  { value: 'en', label: 'English', dict: en },
  { value: 'vi', label: 'Tiếng Việt', dict: vi },
];

// Options for the About tab's Language dropdown (native labels, shown as-is).
export const LANGS = REGISTRY.map(({ value, label }) => ({ value, label }));

const DICTS = Object.fromEntries(REGISTRY.map(({ value, dict }) => [value, dict]));
const isValid = (v) => Object.prototype.hasOwnProperty.call(DICTS, v);

let lang = DEFAULT_LANG;
try {
  persist.migrateFromLocalStorage(LANG_KEY);
  const stored = persist.getItem(LANG_KEY);
  if (isValid(stored)) lang = stored;
} catch (_) {
  /* storage disabled — stay on the default language */
}

export const getLang = () => lang;

// Subscribe to language changes; returns an unsubscribe function.
const listeners = new Set();
export const onLangChange = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const setLang = (value) => {
  const next = isValid(value) ? value : DEFAULT_LANG;
  if (next === lang) return;
  lang = next;
  try {
    persist.setItem(LANG_KEY, lang);
  } catch (_) {
    /* ignore */
  }
  listeners.forEach((cb) => {
    try {
      cb(lang);
    } catch (_) {
      /* a bad listener must not break the rest */
    }
  });
};

// Translate a label key for the current language. Falls back to English, then
// to the key itself. `params` fills {token} placeholders in the resolved string.
export const t = (key, params) => {
  const s = (DICTS[lang] && DICTS[lang][key]) ?? en[key] ?? key;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
};
