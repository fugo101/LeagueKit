# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LeagueKit is a multi-feature plugin for the League of Legends client, loaded by
[Pengu Loader](https://pengu.lol). It is plain ES-module JavaScript with **no build step and no
tests**; the plugin itself ships with **zero runtime dependencies** — Pengu Loader loads the `.js`
files directly. A `package.json` exists only for dev tooling (Prettier formatting + a Husky
pre-commit hook); it is never required to install or run the plugin. Code (comments, logs,
identifiers) is written in English. **User-facing UI text is not hardcoded** — it is referenced by
i18n label keys and translated at render time (see Internationalization below).

## Features

Three features today, each in `features/<id>/`, all end-of-game / matchmaking automation driven by
gameflow-phase observers:

- **auto-accept** — auto-accepts the ready-check (optional accept delay; optional re-queue).
- **auto-honor** — honors a player after each game. Supports an "only preferred" mode with a
  preferred-summoner picker (see `manager.js`/`preferred.js`) and optional close-the-screen behavior.
  The picker sources players from friends + lobby + champ-select, hides stale duplicate friend
  entries, orders rows selected → online-out-of-game → online-in-game → offline, and renders the
  native friend-list avatar (ring frame + availability status dot).
- **auto-play-again** — after a game ends, returns the party to the lobby and (as lobby leader,
  once the lobby is ready) starts matchmaking exactly once.

## Running & testing

There is no build/lint/test pipeline — Pengu Loader loads the `.js` files directly.

- Install: the folder lives at `Pengu Loader/plugins/LeagueKit/`.
- Apply changes: in Pengu Loader click **Reload plugins**, or restart the League Client.
- Debug: open client DevTools with **Ctrl+Shift+I**. Console logs are prefixed `[LeagueKit]` and
  `[LeagueKit:<feature-id>]`. Verbose action logs (`log.debug`/`log.info`) are **off by default** and
  gated behind a **Debug logging** toggle in the settings dialog's **Info** tab; `log.warn`/`log.error`
  always show. The flag (key `leagueKit.debug`) persists through `shared/persist.js` (Pengu DataStore,
  localStorage fallback) — not raw `localStorage` — so it survives client restarts.
- Open the settings dialog in-client with the **Ctrl+Shift+L** hotkey.
- The folder is under `C:\Program Files`, so writing files / reloading may require running Pengu
  Loader as Administrator.
- **Formatting**: run `npm install` once to pull dev tooling (Prettier/Husky/lint-staged) and wire
  up the pre-commit hook. `npm run format` formats the whole repo; `npm run format:check` checks
  without writing. Every `git commit` also auto-formats staged `*.js` files via Husky + lint-staged.

## Architecture

`index.js` is the entry point. It exports `init(context)` (called by Pengu when the client is ready;
`context.socket` is the LCU websocket) and returns a cleanup function (called on reload/unload).

**Feature registry** — `index.js` holds a `FEATURES` array. For each feature it calls
`feature.init(context)`, collects the returned `{ destroy, settings }`, arranges the settings
sections into sidebar `groups`, builds the shared settings dialog, and registers the Ctrl+Shift+L
hotkey. Cleanup destroys every feature + the dialog + the hotkey.

**Feature contract** — features are declared with `defineFeature(...)` from `shared/feature.js`:
`{ id, name, storageKey, defaults, log, engine, fields, renderExtra? }`.

- `engine(socket, settings) -> { destroy }` is the background logic (LCU socket observers + `fetch`),
  living in `features/<id>/core.js`.
- `fields: [{ type: 'toggle' | 'select', key, label, options?, requires? }]` is a declarative settings
  schema; `renderFields` turns it into native settings rows automatically. `requires: '<key>'` greys
  out / locks a row while `settings[key]` is falsy (lock a dependent option when its toggle is off).
- `renderExtra(container, settings, persist, rerender)?` appends feature-specific UI after the rows
  (e.g. Auto Honor's preferred-summoner picker).
- `defineFeature` loads/saves settings via `shared/store.js` (one key per feature; persisted through
  `shared/persist.js`) and
  produces a `section` (`{ title, render }`) for the dialog.

A feature folder is at minimum: `index.js` (the `defineFeature` declaration) + `constants.js`
(endpoints, defaults, presets) + `core.js` (the engine). There is intentionally **no per-feature
UI/settings file** — UI is derived from `fields`. A feature may add its own helper modules when it
needs more than the declarative rows (auto-honor ships `manager.js` — the preferred-summoner picker
rendered via `renderExtra` — and `preferred.js` — identity/matching helpers shared by `core.js` and
`manager.js` so the two never drift).

**Settings dialog** (`shared/settings-panel.js`) — a vanilla-DOM modal that mirrors the client's
native settings DOM **1:1**: same custom-element tags (`lol-uikit-dialog-frame`,
`lol-uikit-scrollable`, `lol-uikit-navigation-bar`/`-item`, `lol-uikit-flat-button(-group)`,
`lol-uikit-full-page-backdrop`), the same `.lol-settings-*` classes, and the full native wrapper
chain (`.modal > backdrop + .ember-application-factory.rcp-fe-lol-settings.ember-application >
.ember-view > .lol-settings-container`). This lets the client's own settings stylesheet style the
dialog; `shared/style.css` only controls overlay visibility. It takes `groups: [{ title, sections }]`
and renders one sidebar heading + `navigation-bar` per group, with all tabs sharing one content pane.

**LCU access** — features `fetch()` relative LCU paths (e.g. `/lol-matchmaking/v1/ready-check/accept`)
and `socket.observe('<lcu-uri>', (msg) => ...)` where `msg = { eventType, uri, data }`. No auth
headers needed (Pengu proxies the request).

`shared/` also holds: `lcu.js` (shared LCU endpoints + gameflow `PHASES`/`IDLE_PHASES`, the
`getJson`/`post`/`readBody`/`onGameflowPhase` fetch helpers, and `logApiFailure` for debug-gated
request/response logging), `store.js` (per-feature settings load/save — merges stored values over
deep-cloned `defaults`, delegating actual storage to `persist.js`),
`dom.js` (`el`, `makeFlatButton`, `makeCheckboxRow`, `makeDropdownRow`), `util.js` (`sleep`),
`persist.js` (the **single storage boundary** — the only file that touches Pengu `DataStore` /
`localStorage`; DataStore-backed so config survives client restarts, with a localStorage fallback +
one-time migration. Never read/write `DataStore`/`localStorage` elsewhere — go through `persist.js`),
`log.js` (the gated logger + Debug flag), `hotkey.js`, `i18n.js` + `locales/` (the translation layer,
below), and `about.js` (plugin `META` + the "About" section).

**Internationalization (i18n)** (`shared/i18n.js` + `shared/locales/<code>.js`) — all user-facing
strings are referenced by **semantic label keys** (e.g. `'autoAccept.acceptDelay'`, `'common.enable'`),
never by their visible text. Each language is one flat dictionary in `shared/locales/<code>.js` mapping
those keys to display text; `shared/locales/en.js` is the **canonical source** and must contain every
key. Currently shipped: `en` (canonical) and `vi` (Tiếng Việt). `t(key, params?)` resolves the key for
the current language, **falling back to English and then to
the raw key**, so an untranslated (or newly added) string is always safe. `params` fills `{token}`
placeholders (e.g. `t('autoHonor.summonerPlaceholder', { id })`). Language is a manual choice in the
About tab (no locale auto-detection), persists via `persist.js`, and switching it live-rebuilds the
dialog (`settings-panel.js` subscribes to `onLangChange`). To keep a term in English even in another
language, simply **omit its key** from that language's file (it falls back to `en`). Only the settings
UI is translated — console logs stay English. Rendering already routes through `t()` at the chokepoints
(`feature.js` for field labels, `settings-panel.js` for group/section titles + `DONE`, `about.js`,
`manager.js`), so new UI text just needs a key + an `en.js` entry.

## Hard-won gotchas (do not regress)

- **Directory imports do not resolve.** Pengu appends `.js` to extensionless imports but does NOT
  resolve a folder to its `index.js`. Import a feature as `./features/<id>/index`, never
  `./features/<id>`. Plain file imports may omit `.js`.
- **Do not trigger UI from injected buttons.** The client's top nav bar is a window drag region
  (`-webkit-app-region: drag`) that swallows clicks (hover still works, so it looks clickable). The
  dialog is opened by a **global `keydown` hotkey**, which always fires. Avoid reintroducing a
  clickable injected button for this.
- **Mount overlays in the layer manager.** Append the modal into
  `#lol-uikit-layer-manager-wrapper` (an element id, not a tag) for correct stacking; fall back to
  `document.body`.
- **`init` may run before `document.body` exists** — defer DOM work to `DOMContentLoaded` when body
  is null.
- **Coalesce MutationObserver callbacks** with `requestAnimationFrame`. The client mutates its DOM
  constantly; running `querySelector` on every mutation caused visible client lag.
- **`lol-uikit-framed-dropdown` needs exact markup**: each option requires
  `slot="lol-uikit-dropdown-option"` + class `framed-dropdown-type`; selection is captured with a
  per-option `click` listener (see `makeDropdownRow`). Building these custom-element _containers_ by
  hand works, but they must match the native structure precisely.
- **Match the native wrapper chain exactly** when touching the dialog. Missing the
  `.ember-application` / `.rcp-fe-lol-settings` / `.ember-view` wrappers breaks the native CSS
  (wrong background/font). Native nav-item labels are uppercase; group titles are title-case.
- **Minimize custom CSS — prefer the client's native classes.** The dialog and its rows mirror
  native DOM so the client's own stylesheets do the styling; `shared/style.css` must stay tiny.
  Before adding a rule, look for a native class/attribute that already gives the look (e.g.
  `.lol-social-avatar` + `availability-icon` for avatars/status, the `.lol-settings-*` rows,
  `lol-uikit-*` elements). Only add a **scoped `#lk-root`** rule when no native class fits, and
  keep it to overlay visibility / behavior glue / a genuinely non-native visual (e.g. the picker's
  selection highlight). Never restyle native class internals globally.
- **`/lol-chat/v1/friends` can return stale "ghost" duplicates.** After a friend renames their
  Riot ID (or is re-added), the roster can hold two entries with **different puuids** for the same
  person — so puuid-keyed dedupe (`preferred.js` `idKey`) keeps both. The ghost is marked by
  **`summonerId === 0`** (watch the `f.summonerId || null` coercion — read the raw value first);
  `availability`/`lol`/`lastSeen` do **not** distinguish it. `manager.js` (`dropGhostDuplicates`)
  hides a ghost only when a live, real-summoner same-name twin exists.
- **Reuse the client roster's avatar + status dot by mirroring its markup, not building your own.**
  Render the social roster's plain-div sub-tree keyed on the **`.lol-social-avatar` class** (a
  `<lol-social-avatar>` _tag_ is not matched by the class-based rules): inner
  `img.icon-image.has-icon` + `div.icon-ring.has-icon` + `div.lol-social-availability-hitbox >
div.availability-icon.<state>`. The client's global `rcp-fe-lol-social` CSS then styles it for
  free. `has-icon` is what shows the icon/ring; add `pointer-events:none` on the hitbox so its
  tooltip target can't swallow row clicks. Friend `availability` enum: `chat` (online/green),
  `away`, `dnd` (in-game/red), `mobile`, `offline` (grey).

## Adding a feature

1. `features/<id>/constants.js` — `API` endpoints, `STORAGE_KEY`, `DEFAULT_SETTINGS`, `log`
   (`createLogger('[LeagueKit:<id>]')` from `shared/log.js`), presets.
2. `features/<id>/core.js` — `export function create<Name>(socket, settings) { ...; return { destroy }; }`.
3. `features/<id>/index.js` — `export default defineFeature({ ... fields: [...] })`. The `name` and
   each field `label` are **i18n label keys** (e.g. `'<id>.title'`, `'<id>.someOption'`), not visible
   text — add a matching entry for each in `shared/locales/en.js` (and any other locale).
4. Import it in `index.js` as `./features/<id>/index`, add to `FEATURES`, and place its section in
   the appropriate `groups` entry. Its tab then appears in the settings dialog automatically.

## Adding a language

1. Create `shared/locales/<code>.js` — `export const <code> = { ... }`; copy the keys from `en.js`
   and translate the values. Omit any key you want to stay in English (it falls back to `en`).
2. Register it in `shared/i18n.js`: import the dictionary and add one `{ value, label, dict }` line to
   `REGISTRY`. `LANGS` (the About-tab dropdown) and `t()` pick it up automatically — nothing else changes.
