/**
 * Auto Accept feature — automatically accepts matchmaking ready-checks.
 */

import { defineFeature } from '../../shared/feature';
import { createAutoAccept } from './core';
import { STORAGE_KEY, DEFAULT_SETTINGS, log, DELAY_PRESETS } from './constants';

export default defineFeature({
  id: 'auto-accept',
  name: 'autoAccept.title',
  storageKey: STORAGE_KEY,
  defaults: DEFAULT_SETTINGS,
  log,
  engine: createAutoAccept,
  fields: [
    { type: 'toggle', key: 'enabled', label: 'common.enable' },
    {
      type: 'select',
      key: 'delayMs',
      label: 'autoAccept.acceptDelay',
      options: DELAY_PRESETS,
      requires: 'enabled',
    },
    { type: 'toggle', key: 'requeue', label: 'autoAccept.requeue', requires: 'enabled' },
  ],
});
