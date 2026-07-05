/**
 * English locale — the canonical source dictionary for LeagueKit's settings UI.
 *
 * Keys are semantic labels (e.g. 'autoAccept.acceptDelay'), not the visible text.
 * This file must contain EVERY key: the i18n layer falls back here when another
 * language is missing a key, and finally to the raw key if it's missing here too.
 * So keeping this complete is what makes untranslated strings render sensibly.
 *
 * `{token}` placeholders are filled by t(key, params) — see shared/i18n.js.
 */

export const en = {
  // Shared / reusable labels.
  'common.enable': 'Enable',
  'common.done': 'DONE',
  'common.refresh': 'Refresh',

  // Sidebar group titles.
  'group.features': 'Features',
  'group.info': 'Info',

  // Auto Accept.
  'autoAccept.title': 'Auto Accept',
  'autoAccept.acceptDelay': 'Accept delay',
  'autoAccept.requeue': 'Re-queue when canceled',

  // Auto Honor.
  'autoHonor.title': 'Auto Honor',
  'autoHonor.onlyPreferred': 'Only honor preferred',
  'autoHonor.closeAfter': 'Close honor screen after honoring',
  'autoHonor.choosePlayers': 'Choose players to honor',
  'autoHonor.filterPlaceholder': 'Filter by name#tag',
  'autoHonor.clickHint':
    'Click to select/deselect — selected players float to the top and light up.',
  'autoHonor.noMatches': 'No matches.',
  'autoHonor.noPlayers': 'No players yet — open a lobby or click Refresh.',
  'autoHonor.unknownPlayer': 'Unknown',
  'autoHonor.summonerPlaceholder': 'Summoner {id}',

  // Auto Play-Again.
  'autoPlayAgain.title': 'Auto Play-Again',
  'autoPlayAgain.returnToLobby': 'Return to lobby after game',
  'autoPlayAgain.autoQueue': 'Auto-queue (leader only)',
  'autoPlayAgain.returnDelay': 'Return delay',

  // About section.
  'about.title': 'About',
  'about.version': 'Version',
  'about.openSettings': 'Open settings',
  'about.description': 'Quality-of-life automation for the League Client.',
  'about.language': 'Language',
  'about.debug': 'Debug',
  'about.debugLog': 'Debug logging (DevTools console)',
  'about.logsHint': 'Logs are captured automatically for export below.',
  'about.copyLogs': 'Copy logs',
  'about.downloadLogs': 'Download .log',
  'about.clearLogs': 'Clear logs',
  'about.logsCopied': 'Copied!',
  'about.logsCleared': 'Cleared',
  'about.features': 'Features',
  'about.author': 'Author',
  'about.name': 'Name',
  'about.contact': 'Contact',
  'about.repository': 'Repository',
  'about.credits': 'Credits',
  'about.creditsLine': 'Built on ideas from: {list}.',
};
