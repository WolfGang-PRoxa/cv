// Formulaires générés à partir du schéma du CV.
// Chaque modification met à jour l'objet ciblé puis appelle `ctx.onChange(kind)` :
//   kind = 'input'      saisie de texte (l'aperçu suit, l'historique est regroupé)
//   kind = 'structure'  ajout, suppression, déplacement, case à cocher… (le formulaire est reconstruit)

import { h, uiIcon, readFileAsDataUrl, toast } from '../lib/dom.js';
import { COMPONENT_TYPES, componentChoices } from '../../shared/cv/schema.js';
import { iconChoices, iconSvg } from '../../shared/cv/icons.js';
import { cloneWithNewIds } from '../../shared/cv/ids.js';

/* ------------------------------------------------------------------ */
/* Glisser-déposer dans une liste                                     */
/* ------------------------------------------------------------------ */

let drag = null; // { list, index, group }

/**
 * Rend un élément déplaçable par sa poignée, au sein de `list` (ou d'un groupe de listes).
 * `onMove(fromList, fromIndex, toList, toIndex)` effectue le déplacement.
 */
export function makeSortable(row, { list, index, group = null, handle, onMove }) {
  handle.addEventListener('pointerdown', () => { row.draggable = true; });
  handle.addEventListener('pointerup', () => { row.draggable = false; });
  row.addEventListener('dragstart', event => {
    if (!row.draggable) return;
    event.stopPropagation();
    drag = { list, index, group };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', '');
    requestAnimationFrame(() => row.classList.add('is-dragging'));
  });
  row.addEventListener('dragend', () => {
    row.draggable = false;
    row.classList.remove('is-dragging');
    document.querySelectorAll('.drop-before, .drop-after').forEach(el => el.classList.remove('drop-before', 'drop-after'));
    drag = null;
  });
  const accepts = () => drag && (drag.list === list || (group && drag.group === group));
  row.addEventListener('dragover', event => {
    if (!accepts()) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = row.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    row.classList.toggle('drop-after', after);
    row.classList.toggle('drop-before', !after);
  });
  row.addEventListener('dragleave', () => row.classList.remove('drop-before', 'drop-after'));
  row.addEventListener('drop', event => {
    if (!accepts()) return;
    event.preventDefault();
    event.stopPropagation();
    const after = row.classList.contains('drop-after');
    row.classList.remove('drop-before', 'drop-after');
    onMove(drag.list, drag.index, list, index + (after ? 1 : 0));
  });
}

/** Zone de dépôt en fin de liste (utile pour une liste vide). */
export function makeDropZone(zone, { list, group = null, onMove }) {
  const accepts = () => drag && (drag.list === list || (group && drag.group === group));
  zone.addEventListener('dragover', event => {
    if (!accepts()) return;
    event.preventDefault();
    zone.classList.add('is-drop-target');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-drop-target'));
  zone.addEventListener('drop', event => {
    if (!accepts()) return;
    event.preventDefault();
    zone.classList.remove('is-drop-target');
    onMove(drag.list, drag.index, list, list.length);
  });
}

/** Déplace un élément entre deux tableaux (ou dans le même). */
export function moveItem(fromList, fromIndex, toList, toIndex) {
  const [item] = fromList.splice(fromIndex, 1);
  let target = toIndex;
  if (fromList === toList && fromIndex < toIndex) target -= 1;
  toList.splice(target, 0, item);
}

/* ------------------------------------------------------------------ */
/* Champs simples                                                     */
/* ------------------------------------------------------------------ */

function fieldWrapper(field, control, { inline = false } = {}) {
  return h('label', { class: `field${inline ? ' field--inline' : ''}` },
    inline ? control : null,
    h('span', { class: 'field-label' }, field.label),
    inline ? null : control,
    field.hint ? h('span', { class: 'field-hint' }, field.hint) : null,
  );
}

function textField(field, target, ctx) {
  const input = h('input', {
    class: 'input',
    type: field.type === 'url' ? 'url' : 'text',
    value: target[field.key] ?? '',
    placeholder: field.placeholder || (field.type === 'url' ? 'https://…' : ''),
    spellcheck: field.type === 'url' ? 'false' : 'true',
    onInput: event => { target[field.key] = event.target.value; ctx.onChange('input'); },
  });
  return fieldWrapper(field, input);
}

function textareaField(field, target, ctx) {
  const area = h('textarea', {
    class: 'input',
    rows: field.rows || (field.type === 'rich' ? 3 : 2),
    value: target[field.key] ?? '',
    onInput: event => { target[field.key] = event.target.value; ctx.onChange('input'); },
  });
  const hint = field.type === 'rich' ? { ...field, hint: field.hint || '**texte** pour mettre en gras · Entrée pour revenir à la ligne' } : field;
  return fieldWrapper(hint, area);
}

function numberField(field, target, ctx) {
  const input = h('input', {
    class: 'input input--number',
    type: 'number',
    min: field.min, max: field.max, step: field.step || 1,
    value: target[field.key] ?? '',
    onInput: event => {
      const value = Number.parseFloat(event.target.value);
      if (Number.isFinite(value)) { target[field.key] = value; ctx.onChange('input'); }
    },
  });
  const control = h('div', { class: 'input-with-unit' }, input, field.unit ? h('span', { class: 'unit' }, field.unit) : null);
  return fieldWrapper(field, control);
}

function checkboxField(field, target, ctx) {
  const input = h('input', {
    type: 'checkbox',
    class: 'switch',
    checked: Boolean(target[field.key]),
    onChange: event => { target[field.key] = event.target.checked; ctx.onChange('structure'); },
  });
  return fieldWrapper(field, input, { inline: true });
}

function selectField(field, target, ctx) {
  const value = target[field.key] ?? field.default ?? field.options[0]?.value;
  const select = h('select', {
    class: 'input',
    onChange: event => { target[field.key] = event.target.value; ctx.onChange('structure'); },
  }, field.options.map(option => h('option', { value: option.value, selected: option.value === value }, option.label)));
  return fieldWrapper(field, select);
}

/* -- Icône ---------------------------------------------------------- */

function iconField(field, target, ctx) {
  const current = target[field.key] || '';
  const isCustom = current.trim().startsWith('<svg');
  const choices = iconChoices({ logos: field.logos !== false });
  const label = isCustom ? 'SVG personnalisé' : (choices.find(c => c.value === current)?.label || 'Aucune');

  const grid = h('div', { class: 'icon-grid' },
    choices.map(choice => h('button', {
      type: 'button',
      class: `icon-choice${choice.value === current ? ' is-selected' : ''}`,
      title: choice.label,
      'aria-label': choice.label,
      html: iconSvg(choice.value, { strokeWidth: 1.9 }),
      onClick: () => { target[field.key] = choice.value; ctx.onChange('structure'); },
    })),
  );
  const custom = h('textarea', {
    class: 'input input--code',
    rows: 3,
    placeholder: '<svg viewBox="0 0 24 24">…</svg>',
    value: isCustom ? current : '',
    onChange: event => {
      const value = event.target.value.trim();
      if (value && !value.startsWith('<svg')) { toast('Le code doit commencer par <svg', { type: 'error' }); return; }
      target[field.key] = value;
      ctx.onChange('structure');
    },
  });
  const details = h('details', { class: 'icon-picker' },
    h('summary', {},
      h('span', { class: 'icon-preview', html: iconSvg(current, { strokeWidth: 1.9 }) }),
      h('span', {}, label),
      h('span', { class: 'icon-picker-hint' }, 'Changer'),
    ),
    grid,
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Ou coller un SVG personnalisé'), custom),
  );
  return h('div', { class: 'field' }, h('span', { class: 'field-label' }, field.label), details);
}

/* -- Image ---------------------------------------------------------- */

function imageField(field, target, ctx) {
  const value = target[field.key] || '';
  const fileInput = h('input', {
    type: 'file',
    accept: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
    hidden: true,
    onChange: async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) { toast('Image trop lourde (4 Mo maximum).', { type: 'error' }); return; }
      target[field.key] = await readFileAsDataUrl(file);
      ctx.onChange('structure');
    },
  });
  const size = value ? `${Math.round(value.length * 0.75 / 1024)} Ko` : '';
  return h('div', { class: 'field' },
    h('span', { class: 'field-label' }, field.label),
    h('div', { class: 'image-field' },
      value ? h('img', { class: 'image-thumb', src: value, alt: '' }) : h('div', { class: 'image-thumb image-thumb--empty' }, uiIcon('upload', 20)),
      h('div', { class: 'image-actions' },
        h('button', { type: 'button', class: 'btn btn--secondary btn--small', onClick: () => fileInput.click() }, uiIcon('upload', 14), h('span', {}, value ? 'Remplacer' : 'Choisir une image')),
        value ? h('button', { type: 'button', class: 'btn btn--ghost btn--small', onClick: () => { target[field.key] = ''; ctx.onChange('structure'); } }, uiIcon('trash', 14), h('span', {}, 'Retirer')) : null,
        size ? h('span', { class: 'field-hint' }, size) : null,
      ),
      fileInput,
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Listes et composants                                               */
/* ------------------------------------------------------------------ */

function itemCard({ item, index, list, title, subtitle, body, ctx, compact = false, group = null }) {
  const id = item.id;
  const expanded = ctx.expanded.has(id);
  const grip = h('span', { class: 'grip', title: 'Glisser pour déplacer' }, uiIcon('grip', 16));
  const actions = h('div', { class: 'item-actions' },
    h('button', { type: 'button', class: 'icon-btn', title: 'Dupliquer', onClick: event => {
      event.stopPropagation();
      list.splice(index + 1, 0, cloneWithNewIds(item));
      ctx.onChange('structure');
    } }, uiIcon('copy', 15)),
    h('button', { type: 'button', class: 'icon-btn icon-btn--danger', title: 'Supprimer', onClick: event => {
      event.stopPropagation();
      list.splice(index, 1);
      ctx.onChange('structure');
    } }, uiIcon('trash', 15)),
  );

  if (compact) {
    const row = h('div', { class: 'item-row', dataset: { itemId: id } }, grip, body, actions);
    makeSortable(row, { list, index, handle: grip, onMove: (...args) => { moveItem(...args); ctx.onChange('structure'); } });
    return row;
  }

  const header = h('div', { class: 'item-header', onClick: event => {
    if (event.target.closest('.item-actions, .grip')) return;
    if (ctx.expanded.has(id)) ctx.expanded.delete(id); else ctx.expanded.add(id);
    card.classList.toggle('is-open');
  } },
    grip,
    h('span', { class: 'chevron' }, uiIcon('chevron', 14)),
    h('div', { class: 'item-title' }, h('strong', {}, title), subtitle ? h('span', {}, subtitle) : null),
    actions,
  );
  const card = h('div', { class: `item-card${expanded ? ' is-open' : ''}`, dataset: { itemId: id } }, header, h('div', { class: 'item-body' }, body));
  makeSortable(card, { list, index, group, handle: grip, onMove: (...args) => { moveItem(...args); ctx.onChange('structure'); } });
  return card;
}

function listField(field, target, ctx) {
  if (!Array.isArray(target[field.key])) target[field.key] = [];
  const list = target[field.key];
  const container = h('div', { class: `list${field.compact ? ' list--compact' : ''}` });

  list.forEach((item, index) => {
    if (field.compact) {
      const input = h('input', {
        class: 'input',
        value: item.text ?? '',
        onInput: event => { item.text = event.target.value; ctx.onChange('input'); },
      });
      container.append(itemCard({ item, index, list, body: input, ctx, compact: true }));
    } else {
      const body = h('div', { class: 'fields' }, renderFields(field.fields, item, ctx));
      container.append(itemCard({
        item, index, list, ctx, body,
        title: field.describe ? field.describe(item) : `${field.itemLabel} ${index + 1}`,
        subtitle: field.itemLabel,
      }));
    }
  });

  const addButton = h('button', { type: 'button', class: 'btn btn--dashed btn--small', onClick: () => {
    const item = field.create();
    list.push(item);
    if (!field.compact) ctx.expanded.add(item.id);
    ctx.focusAfterRender = item.id;
    ctx.onChange('structure');
  } }, uiIcon('plus', 14), h('span', {}, `Ajouter : ${field.itemLabel.toLowerCase()}`));
  makeDropZone(addButton, { list, onMove: (...args) => { moveItem(...args); ctx.onChange('structure'); } });

  return h('div', { class: 'field field--list' },
    h('span', { class: 'field-label' }, field.label, h('span', { class: 'count' }, String(list.length))),
    container,
    addButton,
  );
}

function componentsField(field, target, ctx) {
  if (!Array.isArray(target[field.key])) target[field.key] = [];
  const list = target[field.key];
  const container = h('div', { class: 'list list--components' });

  list.forEach((component, index) => {
    const def = COMPONENT_TYPES[component.type];
    if (!def) return;
    const body = def.fields.length
      ? h('div', { class: 'fields' }, renderFields(def.fields, component, ctx))
      : h('p', { class: 'muted' }, 'Ce composant n’a pas de réglage.');
    container.append(itemCard({
      item: component, index, list, ctx, body,
      title: def.label,
      subtitle: def.describe(component),
      group: `components-${field.context}`,
    }));
  });

  const choices = componentChoices(field.context);
  const select = h('select', { class: 'input input--small', 'aria-label': 'Type de composant à ajouter' },
    choices.map(choice => h('option', { value: choice.value }, choice.label)));
  const add = h('div', { class: 'add-component' },
    select,
    h('button', { type: 'button', class: 'btn btn--dashed btn--small', onClick: () => {
      const component = COMPONENT_TYPES[select.value].create();
      list.push(component);
      ctx.expanded.add(component.id);
      ctx.focusAfterRender = component.id;
      ctx.onChange('structure');
    } }, uiIcon('plus', 14), h('span', {}, 'Ajouter le composant')),
  );
  makeDropZone(add, { list, group: `components-${field.context}`, onMove: (...args) => { moveItem(...args); ctx.onChange('structure'); } });

  return h('div', { class: 'field field--list' },
    h('span', { class: 'field-label' }, field.label, h('span', { class: 'count' }, String(list.length))),
    container,
    add,
  );
}

function groupField(field, target, ctx) {
  if (!target[field.key] || typeof target[field.key] !== 'object') target[field.key] = {};
  const value = target[field.key];
  const enabledField = field.fields.find(f => f.key === 'enabled');
  const enabled = !enabledField || value.enabled !== false;
  const fields = enabledField && !enabled ? [enabledField] : field.fields;
  return h('fieldset', { class: `group${enabled ? '' : ' is-disabled'}`, dataset: value.id ? { itemId: value.id } : {} },
    h('legend', {}, field.label),
    h('div', { class: 'fields' }, renderFields(fields, value, ctx)),
  );
}

/* ------------------------------------------------------------------ */
/* Point d'entrée                                                     */
/* ------------------------------------------------------------------ */

const RENDERERS = {
  text: textField,
  url: textField,
  textarea: textareaField,
  rich: textareaField,
  number: numberField,
  checkbox: checkboxField,
  select: selectField,
  icon: iconField,
  image: imageField,
  list: listField,
  components: componentsField,
  group: groupField,
};

/**
 * Construit les champs d'un objet.
 * @param {object[]} fields  Définitions issues du schéma.
 * @param {object} target    Objet modifié directement.
 * @param {object} ctx       { onChange(kind), expanded: Set<string>, focusAfterRender? }
 */
export function renderFields(fields, target, ctx) {
  return fields
    .filter(field => !field.showIf || field.showIf(target))
    .map(field => (RENDERERS[field.type] || textField)(field, target, ctx));
}
