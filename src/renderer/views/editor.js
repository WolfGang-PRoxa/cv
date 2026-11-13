// Vue « CV de référence » : édition complète de la base.
// - Structure : en-tête, zones et blocs (glisser-déposer entre zones).
// - Formulaire : contenu du bloc sélectionné (listes réordonnables, composants…).
// - Animations et réglages du document.
// - Aperçu en direct, avec sélection d'un élément par clic.

import { h, button, uiIcon, toast, confirmDialog, choiceDialog, debounce } from '../lib/dom.js';
import { state, saveBase, on } from '../lib/state.js';
import { createPreview } from '../components/preview.js';
import { renderFields, makeSortable, makeDropZone, moveItem } from '../components/form.js';
import {
  ACTION_FIELDS, ANIMATION_FIELDS, BLOCK_TYPES, DOCUMENT_FIELDS, HERO_FIELDS, ZONES,
  blockChoices, findPathById, getAtPath,
} from '../../shared/cv/schema.js';
import { clone, cloneWithNewIds } from '../../shared/cv/ids.js';

const BLOCK_ICONS = { timeline: 'doc', panel: 'layers', linkcard: 'external', score: 'check', banner: 'sparkles' };
const HISTORY_LIMIT = 80;

let lastSelection = { kind: 'hero' };

export function mount(container, _params, { setDirty }) {
  let draft = clone(state.base);
  let selection = findSelectionTarget(lastSelection) ? lastSelection : { kind: 'hero' };
  const expanded = new Set();
  let focusId = null;
  let dirty = false;

  /* -- Historique (annuler / rétablir) ------------------------------- */
  const history = { stack: [snapshot()], index: 0 };

  function snapshot() {
    return JSON.stringify({ draft, selection });
  }
  function pushHistory() {
    const current = snapshot();
    if (history.stack[history.index] === current) return;
    history.stack = history.stack.slice(0, history.index + 1);
    history.stack.push(current);
    if (history.stack.length > HISTORY_LIMIT) history.stack.shift();
    history.index = history.stack.length - 1;
    syncToolbar();
  }
  const pushHistoryLater = debounce(pushHistory, 600);
  function restore(entry) {
    const parsed = JSON.parse(entry);
    draft = parsed.draft;
    selection = findSelectionTarget(parsed.selection, parsed.draft) ? parsed.selection : { kind: 'hero' };
    markDirty(JSON.stringify(draft) !== JSON.stringify(state.base));
    renderAll();
  }
  function undo() {
    pushHistoryLater.flush();
    if (history.index <= 0) return;
    history.index -= 1;
    restore(history.stack[history.index]);
  }
  function redo() {
    if (history.index >= history.stack.length - 1) return;
    history.index += 1;
    restore(history.stack[history.index]);
  }

  /* -- Éléments de l'interface --------------------------------------- */
  const preview = createPreview({ selectable: true, onSelect: selectFromPreview });
  const treeEl = h('nav', { class: 'structure', 'aria-label': 'Structure du CV' });
  const formEl = h('section', { class: 'form-panel' });
  const undoButton = button('', { icon: 'undo', title: 'Annuler (Ctrl+Z)', onClick: undo });
  const redoButton = button('', { icon: 'redo', title: 'Rétablir (Ctrl+Y)', onClick: redo });
  const revertButton = button('Abandonner', { icon: 'x', variant: 'ghost', title: 'Revenir à la dernière version enregistrée', onClick: revert });
  const saveButton = button('Enregistrer', { icon: 'save', variant: 'primary', title: 'Enregistrer (Ctrl+S)', onClick: save });
  const statusEl = h('span', { class: 'save-status' });

  container.append(
    h('header', { class: 'view-header view-header--compact' },
      h('div', {},
        h('h1', {}, 'CV de référence'),
        h('p', { class: 'muted' }, 'Contenu, organisation et animations de la base commune à tous les CV générés.'),
      ),
      h('div', { class: 'view-actions' }, statusEl, undoButton, redoButton, revertButton, saveButton),
    ),
    h('div', { class: 'editor' }, treeEl, formEl, preview.element),
  );

  function syncToolbar() {
    undoButton.disabled = history.index <= 0;
    redoButton.disabled = history.index >= history.stack.length - 1;
    revertButton.disabled = !dirty;
    saveButton.disabled = !dirty;
    statusEl.textContent = dirty ? 'Modifications non enregistrées' : `Enregistré · version ${state.base.revision || 1}`;
    statusEl.classList.toggle('is-dirty', dirty);
  }

  function markDirty(value) {
    dirty = value;
    setDirty(value);
    syncToolbar();
  }

  /* -- Sélection ----------------------------------------------------- */
  function findSelectionTarget(sel, cv = draft) {
    if (!sel) return null;
    if (sel.kind !== 'block') return true;
    for (const zone of ZONES) {
      const index = cv.zones[zone.key].findIndex(block => block.id === sel.id);
      if (index >= 0) return { zone: zone.key, index, block: cv.zones[zone.key][index] };
    }
    return null;
  }

  function select(next, { scrollPreview = true } = {}) {
    selection = next;
    lastSelection = next;
    focusId = next.kind === 'block' ? next.id : next.kind === 'hero' ? draft.hero.id : null;
    renderTree();
    renderForm({ resetScroll: true });
    updatePreview({ scrollToFocus: scrollPreview });
  }

  function selectFromPreview(id) {
    const path = findPathById(draft, id);
    if (!path) return;
    let next;
    if (path[0] === 'hero') next = { kind: 'hero' };
    else if (path[0] === 'zones') next = { kind: 'block', id: getAtPath(draft, path.slice(0, 3)).id };
    else return;
    // Déplie toutes les fiches qui mènent à l'élément.
    for (let i = 1; i <= path.length; i += 1) {
      const value = getAtPath(draft, path.slice(0, i));
      if (value && !Array.isArray(value) && typeof value === 'object' && value.id) expanded.add(value.id);
    }
    selection = next;
    lastSelection = next;
    focusId = id;
    formCtx.focusAfterRender = id;
    renderTree();
    renderForm({ resetScroll: true });
    updatePreview();
  }

  /* -- Modifications -------------------------------------------------- */
  const formCtx = {
    expanded,
    focusAfterRender: null,
    onChange(kind) {
      markDirty(true);
      if (kind === 'structure') {
        pushHistoryLater.cancel();
        pushHistory();
        renderForm();
      } else {
        pushHistoryLater();
      }
      renderTree();
      updatePreview();
    },
  };

  const updatePreview = ({ scrollToFocus = false } = {}) => {
    preview.update(draft, { focusId, scrollToFocus });
  };

  /* -- Structure (colonne de gauche) ---------------------------------- */
  function treeButton({ kind, label, sub, icon, active }) {
    return h('button', { type: 'button', class: `structure-item${active ? ' is-active' : ''}`, onClick: () => select({ kind }) },
      uiIcon(icon, 16), h('span', { class: 'structure-text' }, h('strong', {}, label), sub ? h('span', {}, sub) : null));
  }

  function renderTree() {
    const scroll = treeEl.scrollTop;
    treeEl.replaceChildren(
      h('div', { class: 'structure-group' },
        treeButton({ kind: 'document', label: 'Document et boutons', sub: 'Titre, pied de page, actions', icon: 'settings', active: selection.kind === 'document' }),
        treeButton({ kind: 'animations', label: 'Animations', sub: 'Arrivée, apparition, inclinaison 3D', icon: 'sparkles', active: selection.kind === 'animations' }),
        treeButton({ kind: 'hero', label: 'En-tête', sub: [draft.hero.firstName, draft.hero.lastName].filter(Boolean).join(' '), icon: 'user', active: selection.kind === 'hero' }),
      ),
      ...ZONES.map(zone => renderZone(zone)),
    );
    treeEl.scrollTop = scroll;
  }

  function renderZone(zone) {
    const list = draft.zones[zone.key];
    const items = list.map((block, index) => {
      const def = BLOCK_TYPES[block.type];
      const grip = h('span', { class: 'grip', title: 'Glisser pour déplacer (y compris vers une autre zone)' }, uiIcon('grip', 15));
      const row = h('div', {
        class: `structure-block${selection.kind === 'block' && selection.id === block.id ? ' is-active' : ''}`,
        onClick: event => { if (!event.target.closest('.item-actions, .grip')) select({ kind: 'block', id: block.id }); },
      },
        grip,
        uiIcon(BLOCK_ICONS[block.type] || 'doc', 15),
        h('span', { class: 'structure-text' }, h('strong', {}, def?.describe(block) || def?.label || block.type), h('span', {}, def?.label || '')),
        h('div', { class: 'item-actions' },
          h('button', { type: 'button', class: 'icon-btn', title: 'Dupliquer', onClick: () => duplicateBlock(zone.key, index) }, uiIcon('copy', 14)),
          h('button', { type: 'button', class: 'icon-btn icon-btn--danger', title: 'Supprimer', onClick: () => deleteBlock(zone.key, index) }, uiIcon('trash', 14)),
        ),
      );
      makeSortable(row, { list, index, group: 'zones', handle: grip, onMove: (...args) => { moveItem(...args); formCtx.onChange('structure'); } });
      return row;
    });
    const dropZone = h('button', { type: 'button', class: 'structure-add', onClick: () => addBlock(zone.key) }, uiIcon('plus', 14), h('span', {}, 'Ajouter un bloc'));
    makeDropZone(dropZone, { list, group: 'zones', onMove: (...args) => { moveItem(...args); formCtx.onChange('structure'); } });
    return h('div', { class: 'structure-group' },
      h('div', { class: 'structure-zone' }, h('strong', {}, zone.label), h('span', {}, zone.hint)),
      items.length ? items : h('p', { class: 'structure-empty' }, 'Aucun bloc. Déposer un bloc ici ou en ajouter un.'),
      dropZone,
    );
  }

  async function addBlock(zoneKey) {
    const type = await choiceDialog({
      title: 'Ajouter un bloc',
      message: `Zone : ${ZONES.find(z => z.key === zoneKey).label}`,
      choices: blockChoices().map(choice => ({ value: choice.value, label: choice.label, description: choice.description })),
    });
    if (!type) return;
    const block = BLOCK_TYPES[type].create();
    draft.zones[zoneKey].push(block);
    formCtx.onChange('structure');
    select({ kind: 'block', id: block.id });
  }

  function duplicateBlock(zoneKey, index) {
    const copy = cloneWithNewIds(draft.zones[zoneKey][index]);
    draft.zones[zoneKey].splice(index + 1, 0, copy);
    formCtx.onChange('structure');
    select({ kind: 'block', id: copy.id });
  }

  async function deleteBlock(zoneKey, index) {
    const block = draft.zones[zoneKey][index];
    const label = BLOCK_TYPES[block.type]?.describe(block) || 'ce bloc';
    const ok = await confirmDialog({ title: 'Supprimer le bloc ?', message: `« ${label} » et tout son contenu seront retirés de la base (annulable avec Ctrl+Z tant que l’éditeur est ouvert).`, confirmLabel: 'Supprimer', danger: true });
    if (!ok) return;
    draft.zones[zoneKey].splice(index, 1);
    if (selection.kind === 'block' && selection.id === block.id) selection = { kind: 'hero' };
    formCtx.onChange('structure');
    renderForm({ resetScroll: true });
  }

  /* -- Formulaire (colonne centrale) ---------------------------------- */
  function section(title, description, fields, target) {
    return h('section', { class: 'form-section' },
      h('h2', {}, title),
      description ? h('p', { class: 'muted' }, description) : null,
      h('div', { class: 'fields' }, renderFields(fields, target, formCtx)),
    );
  }

  function renderForm({ resetScroll = false } = {}) {
    const scroll = formEl.scrollTop;
    formEl.replaceChildren();
    preview.extraSlot.replaceChildren();

    if (selection.kind === 'document') {
      formEl.append(
        section('Document', 'Informations de la page générée.', DOCUMENT_FIELDS, draft.document),
        section('Boutons de la page', 'Boutons flottants à côté de la carte du CV.', ACTION_FIELDS, draft.actions),
      );
    } else if (selection.kind === 'animations') {
      formEl.append(
        section('Animations', 'Réglages appliqués à tout le CV. Chaque bloc peut aussi choisir sa propre animation d’apparition.', ANIMATION_FIELDS, draft.animations),
        h('div', { class: 'form-section' },
          h('p', { class: 'muted' }, 'Pendant l’édition, l’aperçu s’affiche sans animation d’entrée pour rester lisible. Le bouton ci-dessous rejoue l’ouverture complète du CV.'),
          button('Rejouer les animations dans l’aperçu', { icon: 'play', onClick: () => preview.replay() }),
        ),
      );
    } else if (selection.kind === 'hero') {
      formEl.append(section('En-tête', 'Photo, nom, sous-titre et coordonnées.', HERO_FIELDS, draft.hero));
    } else {
      const target = findSelectionTarget(selection);
      if (!target) {
        selection = { kind: 'hero' };
        renderForm({ resetScroll: true });
        return;
      }
      const { block, zone } = target;
      const def = BLOCK_TYPES[block.type];
      const zoneSelect = h('select', { class: 'input input--small', 'aria-label': 'Zone du bloc', onChange: event => {
        const to = event.target.value;
        const from = findSelectionTarget(selection);
        moveItem(draft.zones[from.zone], from.index, draft.zones[to], draft.zones[to].length);
        formCtx.onChange('structure');
      } }, ZONES.map(z => h('option', { value: z.key, selected: z.key === zone }, z.label)));

      formEl.append(h('div', { class: 'block-head' },
        h('div', {}, h('span', { class: 'kicker' }, def.label), h('h2', {}, def.describe(block) || def.label)),
        h('label', { class: 'zone-picker' }, h('span', {}, 'Zone'), zoneSelect),
      ));
      formEl.append(h('div', { class: 'fields' }, renderFields(def.fields, block, formCtx)));
      if (block.detail?.enabled && block.detail.components?.length) {
        preview.extraSlot.append(button('Fenêtre détaillée', { icon: 'window', size: 'small', variant: 'ghost', title: 'Ouvrir la fenêtre détaillée de ce bloc dans l’aperçu', onClick: () => preview.openDetail(block.id) }));
      }
    }

    formEl.scrollTop = resetScroll ? 0 : scroll;
    if (formCtx.focusAfterRender) {
      const target = formEl.querySelector(`[data-item-id="${CSS.escape(formCtx.focusAfterRender)}"]`);
      formCtx.focusAfterRender = null;
      if (target) {
        target.scrollIntoView({ block: 'center' });
        target.classList.add('flash');
        setTimeout(() => target.classList.remove('flash'), 1400);
      }
    }
  }

  /* -- Enregistrement ------------------------------------------------- */
  async function save() {
    pushHistoryLater.flush();
    saving = true;
    try {
      const saved = await saveBase(draft);
      draft = clone(saved);
      history.stack = [snapshot()];
      history.index = 0;
      markDirty(false);
      toast(`CV de référence enregistré (version ${saved.revision})`);
    } catch (error) {
      toast(`Enregistrement impossible : ${error.message}`, { type: 'error', duration: 6000 });
    } finally {
      saving = false;
    }
  }

  async function revert() {
    const ok = await confirmDialog({ title: 'Abandonner les modifications ?', message: 'Le CV de référence revient à sa dernière version enregistrée.', confirmLabel: 'Abandonner', danger: true });
    if (!ok) return;
    draft = clone(state.base);
    history.stack = [snapshot()];
    history.index = 0;
    markDirty(false);
    renderAll();
  }

  function renderAll() {
    renderTree();
    renderForm();
    updatePreview();
    syncToolbar();
  }

  const isTextField = el => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'file'].includes(el.type)));
  function onKey(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 's') { event.preventDefault(); if (dirty) save(); return; }
    if (isTextField(document.activeElement)) return; // annulation native dans les champs de saisie
    if (key === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
    if (key === 'y' || (key === 'z' && event.shiftKey)) { event.preventDefault(); redo(); }
  }
  window.addEventListener('keydown', onKey);

  // Base modifiée depuis un autre poste (synchronisation) : rechargée si rien n'est en cours
  // d'édition, sinon signalée (l'enregistrement de ce poste l'emportera).
  let saving = false;
  const offBase = on('base', base => {
    if (saving || JSON.stringify(draft) === JSON.stringify(base)) return;
    if (dirty) {
      toast('Le CV de référence a été modifié sur un autre poste. Enregistrer ici remplacera cette version.', { type: 'error', duration: 7000 });
      return;
    }
    draft = clone(base);
    if (!findSelectionTarget(selection)) selection = { kind: 'hero' };
    history.stack = [snapshot()];
    history.index = 0;
    renderAll();
    toast('CV de référence mis à jour depuis un autre poste');
  });

  select(selection, { scrollPreview: false });
  syncToolbar();

  return () => {
    offBase();
    pushHistoryLater.cancel();
    window.removeEventListener('keydown', onKey);
    preview.destroy();
  };
}
