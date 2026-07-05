/**
 * Global hotkey registration. A document-level keydown listener always fires,
 * which sidesteps the click/drag-region issues of injected buttons.
 */

export function registerHotkey({ ctrl = false, shift = false, alt = false, code }, handler) {
  const onKey = (e) => {
    // Ignore while typing in an input field.
    const tag = (e.target && e.target.tagName ? e.target.tagName : '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;

    if (
      !e.repeat &&
      !!e.ctrlKey === ctrl &&
      !!e.shiftKey === shift &&
      !!e.altKey === alt &&
      e.code === code
    ) {
      e.preventDefault();
      handler();
    }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}
