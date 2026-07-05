/**
 * Feature factory. Turns a declarative descriptor into the feature object the
 * registry expects ({ id, name, init }), wiring settings persistence, the
 * background engine, and the settings section from a `fields` schema.
 *
 * Descriptor:
 *   { id, name, storageKey, defaults, log?, engine, fields, renderExtra? }
 *   - log?: a logger ({ debug, info, warn, error }) from shared/log createLogger.
 *   - engine(socket, settings) -> { destroy } : starts the background logic.
 *   - fields: [{ type: 'toggle'|'select', key, label, options?, requires? }]
 *     - requires: '<otherKey>' : this row is greyed out + locked while
 *       settings[otherKey] is falsy. Toggling the controlling field re-renders
 *       the section so dependents update.
 *   - renderExtra(container, settings, persist, rerender)? : optional custom UI
 *     appended after the declarative `fields` rows in the settings section.
 */

import * as store from './store';
import { makeCheckboxRow, makeDropdownRow } from './dom';
import { t } from './i18n';

export function renderFields(container, fields, settings, persist, rerender) {
  for (const f of fields) {
    // Whether changing this field affects other fields' enabled state.
    const controls = fields.some((o) => o.requires === f.key);
    const onChange = (value) => {
      settings[f.key] = value;
      persist();
      if (controls && rerender) rerender();
    };
    // Locked while its controlling field is off.
    const disabled = !!(f.requires && !settings[f.requires]);
    let row = null;
    if (f.type === 'toggle') {
      row = makeCheckboxRow({ label: t(f.label), checked: settings[f.key], onChange });
    } else if (f.type === 'select') {
      row = makeDropdownRow({
        label: t(f.label),
        options: f.options,
        value: settings[f.key],
        onChange,
      });
    }
    if (row) {
      if (disabled) row.classList.add('lk-row-disabled');
      container.appendChild(row);
    }
  }
}

export function defineFeature({
  id,
  name,
  storageKey,
  defaults,
  log,
  engine,
  fields,
  renderExtra,
}) {
  return {
    id,
    name,
    init(context) {
      const settings = store.load(storageKey, defaults);
      const persist = () => store.save(storageKey, settings);
      const inst = engine(context.socket, settings);
      if (log) log.info('ready', settings);
      return {
        destroy: inst && inst.destroy,
        settings: {
          title: name,
          render: (container) => {
            // draw() re-renders the whole section so dependent fields (see
            // `requires`) re-evaluate their locked state when a controller changes.
            const draw = () => {
              container.innerHTML = '';
              renderFields(container, fields, settings, persist, draw);
              // Optional feature-specific UI appended after the declarative rows.
              if (renderExtra) renderExtra(container, settings, persist, draw);
            };
            draw();
          },
        },
      };
    },
  };
}
