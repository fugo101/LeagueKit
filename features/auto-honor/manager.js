/**
 * Preferred-summoner picker for Auto Honor. Rendered inside the settings dialog
 * (after the declarative fields) via the feature's `renderExtra` hook.
 *
 * One unified player list, built with the client's native "block list" markup
 * (lol-blocked-summoners / lol-block-list-player / player-name__*) so the client
 * settings CSS styles it for free. Players are sourced from the friends list +
 * current lobby / champ-select, then de-duped: stale "ghost" friend entries
 * (summonerId 0, left over after a Riot-ID rename) are hidden when a live twin
 * exists. Each row shows the native friend-list avatar (ring frame + availability
 * status dot). Rows are ordered selected -> online out of game -> online in game
 * ('dnd') -> offline; clicking a player selects/deselects them for honoring
 * (selected float to the top and light up, offline are dimmed — see shared/style.css).
 *
 * Honor only ever targets ballot members, so an entry just needs puuid (primary
 * match key) / summonerId (fallback) to be useful; gameName/tagLine/iconId +
 * availability/online are for display/ordering.
 */

import { el, makeFlatButton } from '../../shared/dom';
import { getJson } from '../../shared/lcu';
import { t } from '../../shared/i18n';
import { API, log } from './constants';
import { idKey, samePlayer, isPreferred } from './preferred';

// Display name: "name", or a summonerId placeholder when the name is unknown.
const gameNameOf = (e) =>
  e.gameName ||
  (e.summonerId != null
    ? t('autoHonor.summonerPlaceholder', { id: e.summonerId })
    : t('autoHonor.unknownPlayer'));

// Player sources for the picker. Each is best-effort: fetch a path, pull its
// player list, and normalize each raw entry to a common shape. A missing source
// (offline / not in a lobby / not in champ select) is skipped silently so the
// others still show. Order: friends, lobby, select.
const SOURCES = [
  {
    source: 'Friend',
    path: API.FRIENDS,
    list: (d) => d || [],
    map: (f) => ({
      puuid: f.puuid || null,
      summonerId: f.summonerId || null,
      // A friend roster entry with summonerId 0 no longer resolves to a real
      // summoner — a stale "ghost" left behind after a Riot-ID rename/re-add.
      // Captured from the raw value before the `|| null` coercion above.
      ghost: f.summonerId === 0,
      gameName: f.gameName || f.name || '',
      tagLine: f.gameTag || '',
      iconId: f.icon || null,
      // Raw availability drives the native status dot's color class
      // (chat/away/dnd/mobile/offline); anything but 'offline' counts as online.
      availability: f.availability || 'offline',
      online: !!f.availability && f.availability !== 'offline',
    }),
  },
  {
    source: 'Lobby',
    path: API.LOBBY,
    list: (d) => (d && d.members) || [],
    map: (m) => ({
      puuid: m.puuid || null,
      summonerId: m.summonerId || null,
      gameName: m.gameName || m.summonerName || '',
      tagLine: m.tagLine || '',
      iconId: m.summonerIconId || m.profileIconId || null,
      // A member sharing your lobby is by definition connected.
      availability: 'chat',
      online: true,
    }),
  },
  {
    source: 'Select',
    path: API.CHAMP_SELECT,
    list: (d) => [...((d && d.myTeam) || []), ...((d && d.theirTeam) || [])],
    map: (p) => ({
      puuid: p.puuid || null,
      summonerId: p.summonerId || null,
      gameName: p.gameName || '',
      tagLine: p.tagLine || '',
      iconId: null,
      // A member in your champ select is by definition connected.
      availability: 'chat',
      online: true,
    }),
  },
];

// Fetch every source, normalize, and concatenate (friends → lobby → select).
// Fetches run in parallel; a missing source (fetch rejected) yields null and is
// skipped, so the others still show. Concatenation order is preserved.
async function loadSources() {
  const results = await Promise.all(SOURCES.map((src) => getJson(src.path).catch(() => null)));
  const out = [];
  results.forEach((data, i) => {
    if (data == null) return; // source not available — skip
    const src = SOURCES[i];
    for (const raw of src.list(data)) out.push({ ...src.map(raw), source: src.source });
  });
  return out;
}

// Merge sources with the stored preferred entries (so offline preferred players
// still show), de-dupe by identity, keeping the richest name/icon.
function mergeEntries(sources, preferred) {
  const map = new Map();
  const add = (e) => {
    const k = idKey(e);
    if (!k) return;
    const prev = map.get(k);
    if (!prev) {
      map.set(k, { ...e });
      return;
    }
    // Enrich missing fields from the new entry.
    if (!prev.gameName && e.gameName) prev.gameName = e.gameName;
    if (!prev.tagLine && e.tagLine) prev.tagLine = e.tagLine;
    if (prev.iconId == null && e.iconId != null) prev.iconId = e.iconId;
    if (!prev.source && e.source) prev.source = e.source;
    // Any source that sees the player online wins (e.g. an offline friend who is
    // actually in your lobby/champ select).
    if (!prev.online && e.online) {
      prev.online = true;
      prev.availability = e.availability;
    }
  };
  sources.forEach(add);
  preferred.forEach(add);
  return [...map.values()];
}

// Normalized game name for same-name grouping.
const nameKey = (e) => gameNameOf(e).trim().toLowerCase();

// Drop stale "ghost" friend entries (summonerId 0) when a live, real-summoner
// entry with the same game name exists — the client's friends list can hold a
// leftover roster entry after a Riot-ID rename, showing the friend twice with
// an old tag. Guardrails: a ghost with no live same-name twin is kept (so nobody
// vanishes entirely), and a preferred/selected player is never dropped. Two
// genuinely different accounts that share a name both carry real summonerIds, so
// neither is a ghost and both survive.
function dropGhostDuplicates(entries, preferred) {
  const liveNames = new Set();
  for (const e of entries) if (!e.ghost) liveNames.add(nameKey(e));
  return entries.filter((e) => !e.ghost || !liveNames.has(nameKey(e)) || isPreferred(preferred, e));
}

// "name#tag", or just the name, or a summonerId placeholder.
const aliasText = (e) => gameNameOf(e) + (e.tagLine ? `#${e.tagLine}` : '');

// A player-name alias span. When `withTag`, append the #tagline like the client.
function aliasSpan(entry, withTag) {
  const wrap = el('span', 'player-name-component ember-view');
  const alias = el('span', 'player-name__alias player-name__force-gamename-tagline-order');
  alias.appendChild(
    el('span', 'player-name__game-name player-name__force-locale-text-direction', gameNameOf(entry))
  );
  if (withTag && entry.tagLine) {
    alias.appendChild(
      el(
        'span',
        'player-name__tag-line player-name__tag-line-separator player-name__force-gamename-tagline-order',
        '#'
      )
    );
    alias.appendChild(
      el('span', 'player-name__tag-line player-name__force-locale-text-direction', entry.tagLine)
    );
  }
  wrap.appendChild(alias);
  return wrap;
}

// One row mirroring the native block-list player markup.
function playerRow(entry, selected, onToggle) {
  // Dim offline rows like the greyed "Ẩn" roster entries — but never a selected
  // (preferred) row, which must keep its gold highlight even when offline.
  const offline = !selected && !entry.online;
  const cls =
    'lol-blocked-player ember-view lk-honor-player' +
    (selected ? ' lk-selected' : '') +
    (offline ? ' lk-offline' : '');
  const root = el('div', cls);
  const row = el('div', 'lol-block-list-player');

  // Avatar, rendered like the social roster (plain div with the .lol-social-avatar
  // class) so the client's social CSS draws the ring frame + native status dot.
  const avatar = el('div', 'lol-social-avatar icon');
  const avatarInner = el('div');
  const hasIcon = entry.iconId != null;
  const img = el('img', `icon-image${hasIcon ? ' has-icon' : ''}`);
  if (hasIcon) img.src = `${API.PROFILE_ICON}/${entry.iconId}.jpg`;
  avatarInner.appendChild(img);
  avatarInner.appendChild(el('div', `icon-ring${hasIcon ? ' has-icon' : ''}`));
  // Native availability dot: color comes from the `availability-icon <state>` class.
  const hitbox = el('div', 'lol-social-availability-hitbox');
  hitbox.appendChild(el('div', `availability-icon ${entry.availability || 'offline'}`));
  avatarInner.appendChild(hitbox);
  avatar.appendChild(avatarInner);

  // Name + tagline.
  const name = el('span', 'blocked-player-game-name');
  name.appendChild(aliasSpan(entry, false));
  const tagline = el('span', 'blocked-player-game-name-tagline');
  tagline.appendChild(aliasSpan(entry, true));
  name.appendChild(tagline);

  row.appendChild(avatar);
  row.appendChild(name);

  root.appendChild(row);
  root.addEventListener('click', () => onToggle(entry));
  return root;
}

// Debounce delay for the filter box, so fast typing doesn't rebuild the whole
// list on every keystroke (see renderList — full teardown + rebuild).
const FILTER_DEBOUNCE = 120;

export function renderPreferredManager(container, settings, persist) {
  let filter = '';
  let sources = [];
  let filterTimer = null;

  const wrap = el('div', 'lol-blocked-summoners');
  // Lock the whole picker while the feature is disabled (re-evaluated each draw).
  if (!settings.enabled) wrap.classList.add('lk-row-disabled');
  wrap.appendChild(el('div', 'block-summoner-text', t('autoHonor.choosePlayers')));

  // Filter input (native flat-input markup, as seen in the block-list screen).
  const flat = el('lol-uikit-flat-input');
  flat.style.cssText = 'margin:4px 0;display:block;';
  const input = el('input');
  input.type = 'search';
  input.placeholder = t('autoHonor.filterPlaceholder');
  input.setAttribute('autocomplete', 'off');
  input.addEventListener('input', () => {
    filter = input.value.trim().toLowerCase();
    // Debounce only the type-to-filter path; selection/refresh stay immediate.
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      filterTimer = null;
      renderList();
    }, FILTER_DEBOUNCE);
  });
  flat.appendChild(input);
  wrap.appendChild(flat);

  wrap.appendChild(el('div', 'blocked-summoners-info', t('autoHonor.clickHint')));

  const listEl = el('div', 'blocked-summoners-list');
  wrap.appendChild(listEl);

  const onToggle = (entry) => {
    const i = settings.preferred.findIndex((p) => samePlayer(p, entry));
    if (i >= 0) {
      settings.preferred.splice(i, 1);
      log.debug('Preferred removed', aliasText(entry));
    } else {
      settings.preferred.push({
        puuid: entry.puuid,
        summonerId: entry.summonerId,
        gameName: entry.gameName,
        tagLine: entry.tagLine,
        iconId: entry.iconId ?? null,
      });
      log.debug('Preferred added', aliasText(entry));
    }
    persist();
    renderList();
  };

  const renderList = () => {
    listEl.innerHTML = '';
    const merged = dropGhostDuplicates(
      mergeEntries(sources, settings.preferred),
      settings.preferred
    ).filter((e) => !filter || aliasText(e).toLowerCase().includes(filter));
    // Tiers, top to bottom (stable within each): selected, then online out of
    // game, then online in game ('dnd' — shown with a different dot color), then
    // offline.
    const selected = [];
    const onlineIdle = [];
    const onlineInGame = [];
    const offline = [];
    for (const e of merged) {
      if (isPreferred(settings.preferred, e)) selected.push(e);
      else if (e.online) (e.availability === 'dnd' ? onlineInGame : onlineIdle).push(e);
      else offline.push(e);
    }

    if (!merged.length) {
      const empty = el('div', 'blocked-summoners-info');
      empty.textContent = sources.length ? t('autoHonor.noMatches') : t('autoHonor.noPlayers');
      listEl.appendChild(empty);
      return;
    }
    selected.forEach((e) => listEl.appendChild(playerRow(e, true, onToggle)));
    onlineIdle.forEach((e) => listEl.appendChild(playerRow(e, false, onToggle)));
    onlineInGame.forEach((e) => listEl.appendChild(playerRow(e, false, onToggle)));
    offline.forEach((e) => listEl.appendChild(playerRow(e, false, onToggle)));
  };

  const refresh = async () => {
    try {
      sources = await loadSources();
    } catch (_) {
      sources = [];
    }
    log.debug('Sources refreshed', sources.length);
    renderList();
  };

  // Refresh button row.
  const refreshRow = el('div', 'lol-settings-general-row');
  refreshRow.appendChild(makeFlatButton({ text: t('common.refresh'), onClick: refresh }));
  wrap.appendChild(refreshRow);

  container.appendChild(wrap);

  renderList(); // shows preferred (+ placeholder) until sources load
  refresh();
}
