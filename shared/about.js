/**
 * Plugin metadata + the "About" settings section.
 */

import { el, makeCheckboxRow, makeDropdownRow } from './dom';
import { isDebug, setDebug } from './log';
import { t, LANGS, getLang, setLang } from './i18n';

export const META = {
  name: 'LeagueKit',
  version: '1.0.0',
  description: 'Quality-of-life automation for the League Client.',
  hotkey: 'Ctrl+Shift+L',
  // i18n keys, so the About-tab list matches the translated nav tabs.
  features: ['autoAccept.title', 'autoHonor.title', 'autoPlayAgain.title'],
  author: {
    name: 'fudio101',
    email: 'thenguyen1024@gmail.com',
    repo: 'https://github.com/fugo101/LeagueKit',
  },
  credits: ['Ku-Tadao/SimpleAccept', 'asherathegod/penguplugins', 'ReformedDoge/Snooze-Manager'],
};

// A key/value row reusing native settings row classes.
const infoRow = (label, value) => {
  const row = el('div', 'lol-settings-general-row');
  row.appendChild(el('div', 'lol-settings-window-size-text', label));
  row.appendChild(el('div', 'lol-settings-window-size-text', value));
  return row;
};

export const aboutSection = {
  id: 'about',
  title: 'about.title',
  render(container) {
    container.appendChild(el('div', 'lol-settings-general-section-title', META.name));
    container.appendChild(infoRow(t('about.version'), META.version));
    container.appendChild(infoRow(t('about.openSettings'), META.hotkey));

    const desc = el('div', 'lol-settings-general-row');
    desc.appendChild(el('p', 'lol-settings-general-subtitle', t('about.description')));
    container.appendChild(desc);

    // Language: switches the settings UI between the available languages.
    // Changing it re-renders the whole dialog (settings-panel subscribes to it).
    container.appendChild(el('div', 'lol-settings-general-section-title', t('about.language')));
    container.appendChild(
      makeDropdownRow({
        label: t('about.language'),
        options: LANGS,
        value: getLang(),
        onChange: setLang,
      })
    );

    // Debug toggle: gates verbose action logs in the DevTools console (off by
    // default). Warnings/errors always show regardless.
    container.appendChild(el('div', 'lol-settings-general-section-title', t('about.debug')));
    container.appendChild(
      makeCheckboxRow({
        label: t('about.debugLog'),
        checked: isDebug(),
        onChange: setDebug,
      })
    );

    container.appendChild(el('div', 'lol-settings-general-section-title', t('about.features')));
    META.features.forEach((key) => {
      const row = el('div', 'lol-settings-general-row');
      row.appendChild(el('div', 'lol-settings-window-size-text', t(key)));
      container.appendChild(row);
    });

    container.appendChild(el('div', 'lol-settings-general-section-title', t('about.author')));
    container.appendChild(infoRow(t('about.name'), META.author.name));
    container.appendChild(infoRow(t('about.contact'), META.author.email));
    container.appendChild(infoRow(t('about.repository'), META.author.repo));

    container.appendChild(el('div', 'lol-settings-general-section-title', t('about.credits')));
    const credits = el('div', 'lol-settings-general-row');
    credits.appendChild(
      el(
        'p',
        'lol-settings-general-subtitle',
        t('about.creditsLine', { list: META.credits.join(', ') })
      )
    );
    container.appendChild(credits);
  },
};
