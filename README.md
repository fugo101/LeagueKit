# LeagueKit

A multi-feature plugin suite for the League Client, built for
[Pengu Loader](https://pengu.lol).

All features are configured from one **LeagueKit** dialog, opened with the **Ctrl+Shift+L**
hotkey (works on any client screen). Settings persist through Pengu Loader's on-disk `DataStore`
(with a `localStorage` fallback), so they survive client restarts. The dialog's language can be
switched between English (default) and Vietnamese from the **Info → About** tab.

## Features

### Auto Accept

Accepts matchmaking ready-checks reliably (LCU socket observer + polling fallback + bounded
retries). Options: **Enable**, **Accept delay** (0s → 0.5s → 1s → 2s → 5s → 10s), **Re-queue**
when a found match is canceled (someone declined/dodged).

### Auto Honor

At the end of each game, honors players (up to the game's available honors) — your preferred picks
first, then random allies. Options: **Enable**, **Only honor preferred** (skip if none of your picks
are eligible), **Close honor screen after honoring**, plus a **preferred-summoner picker** (add
players from your friends list / current lobby / champ-select).

### Auto Play-Again

Two independent options for the post-game flow:

- **Return to lobby after game** — sends the party back to the lobby when a game ends, after a
  configurable **Return delay**.
- **Auto-queue (leader only)** — back in the lobby, starts matchmaking automatically, but only when
  you're the lobby leader and the lobby is ready to start (it waits for premade teammates to return,
  then queues once). Skips silently if you're not the leader.

Combined with Auto Accept, this gives a hands-free loop between games.

## Requirements

- [Pengu Loader](https://pengu.lol) must already be installed and working with your League Client.
  See the official [Getting Started guide](https://penguloader.io/guide/welcome) if you haven't
  set it up yet ([source](https://github.com/PenguLoader/PenguLoader)).

## Install

1. Copy the `LeagueKit` folder into `Pengu Loader/plugins/`, either by downloading this repo or
   cloning it directly:
   ```
   git clone https://github.com/fugo101/LeagueKit.git "Pengu Loader/plugins/LeagueKit"
   ```
2. Open Pengu Loader → **Reload plugins** (or restart the League Client).

## Usage

1. Launch the League Client — Pengu Loader loads LeagueKit automatically.
2. Press **Ctrl+Shift+L** on any client screen to open the LeagueKit settings dialog.
3. Enable the features you want (Auto Accept / Auto Honor / Auto Play-Again) and adjust their
   options; changes are saved automatically and persist across restarts.

## Structure

```
LeagueKit/
  index.js                 # registry: loads features, builds the settings dialog (Ctrl+Shift+L)
  shared/
    feature.js             # defineFeature() — turns a declarative descriptor into a feature
    store.js               # settings load/save (merges over defaults; delegates to persist.js)
    persist.js             # the single storage boundary (Pengu DataStore + localStorage fallback)
    log.js                 # gated logger + persisted Debug flag
    i18n.js                # UI translation + persisted language (English default / Vietnamese)
    locales/
      en.js                 # canonical English dictionary (fallback source for all keys)
      vi.js                 # Vietnamese dictionary (falls back to en.js for omitted keys)
    lcu.js                 # LCU endpoints, gameflow phases, fetch helpers
    dom.js                 # el / makeFlatButton / makeCheckboxRow / makeDropdownRow (native rows)
    util.js                # small helpers (sleep)
    hotkey.js              # global hotkey registration (Ctrl+Shift+L)
    settings-panel.js      # the shared settings dialog (native uikit structure)
    about.js               # plugin metadata + the About section
    style.css              # overlay visibility (the dialog itself uses native CSS)
  features/
    auto-accept/     index.js, constants.js, core.js
    auto-honor/      index.js, constants.js, core.js, manager.js, preferred.js
    auto-play-again/ index.js, constants.js, core.js
```

### Adding a feature

Create `features/<id>/core.js` exporting `create<Name>(socket, settings) -> { destroy }`, then
declare the feature in `features/<id>/index.js`:

```js
import { defineFeature } from '../../shared/feature';
import { createMyFeature } from './core';
import { STORAGE_KEY, DEFAULT_SETTINGS, log } from './constants';

export default defineFeature({
  id: 'my-feature',
  name: 'My Feature',
  storageKey: STORAGE_KEY,
  defaults: DEFAULT_SETTINGS,
  log,
  engine: createMyFeature,
  fields: [
    { type: 'toggle', key: 'enabled', label: 'Enable' },
    { type: 'select', key: 'mode', label: 'Mode', options: [{ label: 'A', value: 'a' }] },
  ],
});
```

Then import it and add it to the `FEATURES` array in `index.js`. Its section appears in the
settings dialog automatically.

## Notes

- The plugins folder lives under `C:\Program Files`, so the first write may require
  Administrator rights. If Pengu Loader can't write, run it as Administrator.

## License

MIT © [fudio101](https://github.com/fugo101) — see [LICENSE](LICENSE) for details.
