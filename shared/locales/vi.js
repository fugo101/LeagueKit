/**
 * Vietnamese locale.
 *
 * Only keys present here are translated; anything omitted falls back to the
 * English source in ./en.js. Some terms are intentionally left out so they stay
 * in English even in Vietnamese mode: Credits (about.credits / about.creditsLine),
 * Debug (about.debug / about.debugLog), Version (about.version), and the feature
 * names (autoAccept.title / autoHonor.title / autoPlayAgain.title — brand-like).
 */

export const vi = {
  // Shared / reusable labels. (DONE mirrors the native client's "XONG".)
  'common.enable': 'Bật',
  'common.done': 'XONG',
  'common.refresh': 'Làm mới',

  // Sidebar group titles.
  'group.features': 'Tính năng',
  'group.info': 'Thông tin',

  // Auto Accept. (title kept in English)
  'autoAccept.acceptDelay': 'Thời gian chờ chấp nhận',
  'autoAccept.requeue': 'Vào lại hàng đợi khi bị hủy',

  // Auto Honor. (title kept in English)
  'autoHonor.onlyPreferred': 'Chỉ vinh danh người ưu tiên',
  'autoHonor.closeAfter': 'Đóng màn hình vinh danh sau khi vinh danh',
  'autoHonor.choosePlayers': 'Chọn người chơi để vinh danh',
  'autoHonor.filterPlaceholder': 'Lọc theo tên#tag',
  'autoHonor.clickHint': 'Nhấn để chọn/bỏ chọn — người đã chọn sẽ nổi lên đầu và sáng lên.',
  'autoHonor.noMatches': 'Không khớp.',
  'autoHonor.noPlayers': 'Chưa có người chơi — mở lobby hoặc bấm Làm mới.',
  'autoHonor.unknownPlayer': 'Không rõ',
  'autoHonor.summonerPlaceholder': 'Người chơi {id}',

  // Auto Play-Again. (title kept in English)
  'autoPlayAgain.returnToLobby': 'Về sảnh sau trận',
  'autoPlayAgain.autoQueue': 'Tự vào hàng (chỉ chủ phòng)',
  'autoPlayAgain.returnDelay': 'Thời gian chờ về sảnh',

  // About section. (version/debug/credits kept in English)
  'about.title': 'Giới thiệu',
  'about.openSettings': 'Mở cài đặt',
  'about.description': 'Tự động hóa tiện ích cho League Client.',
  'about.language': 'Ngôn ngữ',
  'about.logsHint': 'Log được ghi lại tự động để xuất bên dưới.',
  'about.copyLogs': 'Copy log',
  'about.downloadLogs': 'Tải .log',
  'about.clearLogs': 'Xoá log',
  'about.logsCopied': 'Đã copy!',
  'about.logsCleared': 'Đã xoá',
  'about.features': 'Tính năng',
  'about.author': 'Tác giả',
  'about.name': 'Tên',
  'about.contact': 'Liên hệ',
  'about.repository': 'Kho mã nguồn',
};
