/**
 * Shared DOM helpers for LeagueKit features. Rows reuse the client's native
 * settings markup/classes so they match the real Settings window.
 */

// Create an element with an optional class and text content.
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Create a native League Client flat-button so it inherits the client styling.
export function makeFlatButton({ text, className, onClick } = {}) {
  const btn = document.createElement('lol-uikit-flat-button');
  if (className) btn.className = className;
  if (text != null) btn.textContent = text;
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

// A native settings checkbox row (the label lives inside the checkbox).
export function makeCheckboxRow({ label, checked, onChange }) {
  const row = document.createElement('div');
  row.className = 'lol-settings-general-row';

  const checkbox = document.createElement('lol-uikit-flat-checkbox');
  checkbox.classList.toggle('checked', checked);

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('slot', 'input');
  input.checked = checked;
  input.addEventListener('change', () => {
    checkbox.classList.toggle('checked', input.checked);
    onChange(input.checked);
  });

  const labelEl = document.createElement('label');
  labelEl.setAttribute('slot', 'label');
  labelEl.textContent = label;

  checkbox.appendChild(input);
  checkbox.appendChild(labelEl);
  row.appendChild(checkbox);
  return row;
}

// A native settings row with a left label and a right framed dropdown, like
// the client's "Window size" row. `options` is [{ label, value }]; `value` is
// the current value; `onChange(value)` fires on selection.
export function makeDropdownRow({ label, options, value, onChange }) {
  const row = document.createElement('div');
  row.className = 'lol-settings-general-row';

  const text = document.createElement('div');
  text.className = 'lol-settings-window-size-text';
  text.textContent = label;

  const dropdown = document.createElement('lol-uikit-framed-dropdown');
  dropdown.className = 'lol-settings-window-size-dropdown';
  dropdown.setAttribute('tabindex', '0');

  options.forEach((opt) => {
    const option = document.createElement('lol-uikit-dropdown-option');
    option.setAttribute('slot', 'lol-uikit-dropdown-option');
    option.className = 'framed-dropdown-type';
    option.textContent = opt.label;
    if (opt.value === value) option.setAttribute('selected', '');
    option.addEventListener('click', () => onChange(opt.value));
    dropdown.appendChild(option);
  });

  row.appendChild(text);
  row.appendChild(dropdown);
  return row;
}
