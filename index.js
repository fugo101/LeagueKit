/**
 * LeagueKit — a multi-feature plugin suite for the League Client (Pengu Loader).
 *
 * Each feature lives in features/<id>/ and default-exports
 * { id, name, init(context) -> { destroy(), settings?: { title, render(container) } } }.
 * Add a feature by importing it and adding it to the FEATURES array below.
 *
 * Shared UI: the Ctrl+Shift+L hotkey opens one "LeagueKit" settings dialog that
 * groups every feature's section, plus an Info group.
 */

import { registerHotkey } from './shared/hotkey';
import { createSettingsModal } from './shared/settings-panel';
import { aboutSection } from './shared/about';
import { log, startLogCapture, stopLogCapture } from './shared/log';

import autoAccept from './features/auto-accept/index';
import autoHonor from './features/auto-honor/index';
import autoPlayAgain from './features/auto-play-again/index';

const FEATURES = [autoAccept, autoHonor, autoPlayAgain];

export function init(context) {
  // Log capture is always on — start it first so the lines below (feature loads,
  // hotkey) are captured too.
  startLogCapture();

  const instances = [];
  const featureSections = [];

  for (const feature of FEATURES) {
    try {
      const inst = feature.init(context);
      instances.push(inst);
      if (inst && inst.settings) {
        featureSections.push({ id: feature.id, ...inst.settings });
      }
      log.info(`loaded: ${feature.id}`);
    } catch (err) {
      log.error(`failed to load "${feature.id}":`, err);
    }
  }

  const groups = [
    { title: 'group.features', sections: featureSections },
    { title: 'group.info', sections: [aboutSection] },
  ];
  const modal = createSettingsModal(groups);
  // Open the settings dialog with Ctrl+Shift+L (a hotkey always fires, unlike
  // a clickable button placed over the client's window-drag regions).
  const offHotkey = registerHotkey({ ctrl: true, shift: true, code: 'KeyL' }, () => {
    log.debug('Toggle settings dialog');
    modal.toggle();
  });
  log.info('press Ctrl+Shift+L to open settings');

  // Cleanup on plugin reload / unload.
  return () => {
    for (const inst of instances) {
      try {
        inst && inst.destroy && inst.destroy();
      } catch (err) {
        log.warn('cleanup error:', err);
      }
    }
    modal.destroy();
    offHotkey();
    log.info('stopped, cleaned up');
    // Flush + stop the capture buffer last, so the line above is buffered first.
    stopLogCapture();
  };
}
