/**
 * Auto Honor feature — honors a player at the end of each game.
 */

import { defineFeature } from '../../shared/feature';
import { createAutoHonor } from './core';
import { renderPreferredManager } from './manager';
import { STORAGE_KEY, DEFAULT_SETTINGS, log } from './constants';

export default defineFeature({
  id: 'auto-honor',
  name: 'autoHonor.title',
  storageKey: STORAGE_KEY,
  defaults: DEFAULT_SETTINGS,
  log,
  engine: createAutoHonor,
  fields: [
    { type: 'toggle', key: 'enabled', label: 'common.enable' },
    { type: 'toggle', key: 'preferOnly', label: 'autoHonor.onlyPreferred', requires: 'enabled' },
    {
      type: 'toggle',
      key: 'closeScreen',
      label: 'autoHonor.closeAfter',
      requires: 'enabled',
    },
  ],
  renderExtra: renderPreferredManager,
});
