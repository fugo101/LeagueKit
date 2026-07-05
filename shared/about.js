/**
 * Plugin metadata + the "About" settings section.
 */

import { el, makeCheckboxRow, makeDropdownRow, makeFlatButton } from './dom';
import { isDebug, setDebug } from './log';
import * as logsink from './logsink';
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

// Copy text to the clipboard, with a CEF-safe fallback (a hidden textarea +
// execCommand) since navigator.clipboard may be unavailable in the client.
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
    /* fall through to execCommand */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

// Best-effort text-file download. May be a no-op if the client's CEF build has no
// download handler — Copy is the reliable path.
function downloadText(filename, text) {
  try {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (_) {
    /* ignore */
  }
}

// Local yyyy-mm-dd for the download filename.
function todayStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Briefly swap a button's label for feedback, then restore it.
function flashLabel(btn, text) {
  const original = btn.textContent;
  btn.textContent = text;
  setTimeout(() => {
    btn.textContent = original;
  }, 1500);
}

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

    // Log capture is always on (every level is mirrored into a DataStore-backed
    // buffer that survives restarts). Pengu has no file API in this build, so the
    // log is retrieved on demand with the buttons below.
    const hint = el('div', 'lol-settings-general-row');
    hint.appendChild(el('p', 'lol-settings-general-subtitle', t('about.logsHint')));
    container.appendChild(hint);

    const logRow = el('div', 'lol-settings-general-row');
    const group = el('lol-uikit-flat-button-group');
    const copyBtn = makeFlatButton({
      text: t('about.copyLogs'),
      onClick: async () => {
        const ok = await copyToClipboard(logsink.getText());
        if (ok) flashLabel(copyBtn, t('about.logsCopied'));
      },
    });
    const downloadBtn = makeFlatButton({
      text: t('about.downloadLogs'),
      onClick: () => downloadText(`leaguekit-${todayStamp()}.log`, logsink.getText()),
    });
    const clearBtn = makeFlatButton({
      text: t('about.clearLogs'),
      onClick: () => {
        logsink.clear();
        flashLabel(clearBtn, t('about.logsCleared'));
      },
    });
    group.appendChild(copyBtn);
    group.appendChild(downloadBtn);
    group.appendChild(clearBtn);
    logRow.appendChild(group);
    container.appendChild(logRow);

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
