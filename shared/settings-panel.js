/**
 * Shared settings modal, built to mirror the client's native settings dialog
 * structure (settings-dialog-on.html) exactly — same tags and .lol-settings-*
 * classes — so the client's (fully loaded) settings CSS styles it natively.
 * We only add behavior (tab switching, open/close) and mount it inside the
 * client's layer manager (#lol-uikit-layer-manager-wrapper).
 *
 * Takes groups: [{ title, sections: [{ id, title, render(body) }] }]. Each
 * group is a sidebar heading + its own navigation-bar of tabs, mirroring the
 * native settings sidebar (e.g. "Client" / "Thông tin").
 */

import './style.css';
import { el } from './dom';
import { t, onLangChange } from './i18n';

const CENTER_LAYER =
  'display:flex;align-items:center;justify-content:center;position:absolute;inset:0;';

export function createSettingsModal(groups) {
  let root = null;
  let titleCurrent = null;
  let optionsBody = null;
  let items = []; // flat: { el, section, navBar, localIndex }
  let currentIndex = 0; // selected tab, preserved across a language rebuild

  const onKeyDown = (e) => {
    if (e.key === 'Escape') close();
  };

  const selectGlobal = (index) => {
    const entry = items[index];
    if (!entry) return;
    currentIndex = index;
    titleCurrent.textContent = t(entry.section.title || '').toUpperCase();

    optionsBody.innerHTML = '';
    entry.section.render(optionsBody);

    items.forEach((it, i) => {
      if (i === index) it.el.setAttribute('active', 'true');
      else it.el.removeAttribute('active');
    });
    // Mark the active tab inside each group's navigation-bar.
    const bars = new Set(items.map((it) => it.navBar));
    bars.forEach((bar) => {
      const active = items.find((it) => it.navBar === bar && it.el.hasAttribute('active'));
      bar.setAttribute('selectedindex', active ? String(active.localIndex) : '-1');
    });
  };

  const build = () => {
    // <div class="modal"> overlay
    root = el('div', 'modal');
    root.id = 'lk-root';

    const backdrop = el('lol-uikit-full-page-backdrop', 'backdrop');
    backdrop.setAttribute('style', CENTER_LAYER);
    backdrop.addEventListener('click', close);

    // Match the native wrapper chain exactly so the client's settings CSS
    // (scoped under .ember-application / .rcp-fe-lol-settings) fully applies.
    const appWrap = el('div', 'ember-application-factory rcp-fe-lol-settings ember-application');
    appWrap.setAttribute('style', CENTER_LAYER);
    const emberView = el('div', 'ember-view');

    const frame = el('lol-uikit-dialog-frame', 'lol-settings-container');
    frame.setAttribute('orientation', 'bottom');
    frame.setAttribute('frame', 'bordered');
    frame.style.zIndex = '0';

    // Header
    const header = el('settings-plugin-header');
    const titleBar = el('div', 'lol-settings-title-bar');
    const title = el('div', 'lol-settings-title');
    title.appendChild(el('span', 'lol-settings-header-group-name', 'LEAGUEKIT'));
    title.appendChild(el('span', 'lol-settings-title-break', '/'));
    title.appendChild(el('span', 'lol-settings-title-current'));
    titleBar.appendChild(title);
    header.appendChild(titleBar);

    // Content: navigation + options
    const content = el('div', 'lol-settings-content');

    const navWrap = el('settings-plugin-navigation-bar', 'lol-settings-navs');
    const navScroll = el('lol-uikit-scrollable', 'lol-settings-nav-scroller');
    navScroll.setAttribute('overflow-masks', 'enabled');
    navScroll.setAttribute('scrolled-top', 'true');
    const navInner = el('div');

    items = [];
    groups.forEach((group) => {
      navInner.appendChild(el('div', 'lol-settings-nav-title', t(group.title)));
      const navBar = el('lol-uikit-navigation-bar');
      navBar.setAttribute('direction', 'down');
      navBar.setAttribute('type', 'tabbed');
      navBar.setAttribute('selectedindex', '-1');
      group.sections.forEach((section, localIndex) => {
        const item = el('lol-uikit-navigation-item', 'lol-settings-nav');
        // Native nav items are uppercase (e.g. "TỔNG QUAN"); group titles are not.
        item.appendChild(el('div', null, t(section.title || '').toUpperCase()));
        item.setAttribute('name', section.id || section.title);
        const globalIndex = items.length;
        item.addEventListener('click', () => selectGlobal(globalIndex));
        navBar.appendChild(item);
        items.push({ el: item, section, navBar, localIndex });
      });
      navInner.appendChild(navBar);
    });

    navScroll.appendChild(navInner);
    navWrap.appendChild(navScroll);

    const options = el('div', 'lol-settings-options');
    const optScroll = el('lol-uikit-scrollable');
    optScroll.setAttribute('overflow-masks', 'enabled');
    optScroll.setAttribute('scrolled-top', 'true');
    optionsBody = el('div');
    optScroll.appendChild(optionsBody);
    options.appendChild(optScroll);

    content.appendChild(navWrap);
    content.appendChild(options);

    // Footer
    const footer = el('div', 'lol-settings-footer ember-view');
    const group = el('lol-uikit-flat-button-group', 'lol-settings-close-container');
    group.setAttribute('type', 'window-popup');
    const done = el('lol-uikit-flat-button', 'lol-settings-close-button', t('common.done'));
    done.addEventListener('click', close);
    group.appendChild(done);
    footer.appendChild(group);

    frame.appendChild(header);
    frame.appendChild(content);
    frame.appendChild(footer);

    emberView.appendChild(frame);
    appWrap.appendChild(emberView);
    root.appendChild(backdrop);
    root.appendChild(appWrap);

    // Mount as the last child of the client's layer manager, where native
    // modals live (an element with id="lol-uikit-layer-manager-wrapper").
    const layerWrapper = document.getElementById('lol-uikit-layer-manager-wrapper');
    (layerWrapper || document.body).appendChild(root);

    titleCurrent = root.querySelector('.lol-settings-title-current');
    selectGlobal(currentIndex);
  };

  // Rebuild the dialog in place (used when the language changes) so nav labels,
  // titles and the DONE button re-translate. Preserves the open state and tab.
  const rebuild = () => {
    const wasShown = !!(root && root.classList.contains('lk-show'));
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    build(); // re-selects currentIndex
    if (wasShown) root.classList.add('lk-show');
  };
  const offLang = onLangChange(() => {
    if (root) rebuild();
  });

  const hasSections = () => groups.some((g) => g.sections && g.sections.length);

  const open = () => {
    if (!hasSections()) return;
    if (!root) build();
    root.classList.add('lk-show');
    document.addEventListener('keydown', onKeyDown);
  };

  const close = () => {
    if (root) root.classList.remove('lk-show');
    document.removeEventListener('keydown', onKeyDown);
  };

  return {
    open,
    close,
    toggle() {
      if (root && root.classList.contains('lk-show')) close();
      else open();
    },
    destroy() {
      offLang();
      document.removeEventListener('keydown', onKeyDown);
      if (root && root.parentNode) root.parentNode.removeChild(root);
      root = null;
    },
  };
}
