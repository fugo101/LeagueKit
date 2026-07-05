/**
 * Auto Play-Again feature — re-queues the same mode after a game ends.
 */

import { defineFeature } from '../../shared/feature';
import { createAutoPlayAgain } from './core';
import { STORAGE_KEY, DEFAULT_SETTINGS, log, DELAY_PRESETS } from './constants';

export default defineFeature({
  id: 'auto-play-again',
  name: 'autoPlayAgain.title',
  storageKey: STORAGE_KEY,
  defaults: DEFAULT_SETTINGS,
  log,
  engine: createAutoPlayAgain,
  fields: [
    { type: 'toggle', key: 'returnToLobby', label: 'autoPlayAgain.returnToLobby' },
    { type: 'toggle', key: 'autoQueue', label: 'autoPlayAgain.autoQueue' },
    {
      type: 'select',
      key: 'delayMs',
      label: 'autoPlayAgain.returnDelay',
      options: DELAY_PRESETS,
      requires: 'returnToLobby',
    },
  ],
});
