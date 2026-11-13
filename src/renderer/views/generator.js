// Vue de génération : création (ou modification) d'un CV à partir de la base,
// en choisissant les éléments à masquer.

import { h, button, uiIcon, toast, confirmDialog } from '../lib/dom.js';
import { state, saveCv } from '../lib/state.js';
import { createPreview } from '../components/preview.js';
import { buildTree } from '../../shared/cv/schema.js';
import { clone, newId } from '../../shared/cv/ids.js';

export function mount(container, params, { navigate, setDirty }) {
  const existing = params?.cvId ? state.cvs.find(cv => cv.id === params.cvId) : null;
  const snapshot = existing ? existing.snapshot : clone(state.base);
  const hidden = new Set(existing?.hidden || []);
  const tree = buildTree(snapshot);
  const collapsed = new Set();
  let filter = '';

  // Par défaut, seuls les blocs et l'en-tête sont dépliés.
  const collapseDeep = (nodes, depth) => nodes.forEach(node => {
    if (depth >= 1 && node.children.length) collapsed.add(node.id);
    collapseDeep(node.children, depth + 1);
  });
  collapseDeep(tree, 0);

  const nameInput = h('input', { class: 'input', type: 'text', value: existing?.name || '', placeholder: 'Ex. : Candidature job d’été — magasin', onInput: () => setDirty(true) });
  const notesInput = h('textarea', { class: 'input', rows: 2, value: existing?.notes || '', placeholder: 'Notes personnelles (facultatif) : destinataire, offre…', onInput: () => setDirty(true) });
  const treeEl = h('div', { class: 'hide-tree', role: 'tree' });
  const counter = h('span', { class: 'badge' });
  const preview = createPreview();

  const searchInput = h('input', { class: 'input input--small', type: 'search', placeholder: 'Filtrer les éléments…', onInput: event => {
    filter = event.target.value.trim().toLowerCase();
    renderTree();
  } });

  container.append(
    h('header', { class: 'view-header' },
      h('div', {},
        h('button', { type: 'button', class: 'back-link', onClick: () => navigate('library', existing ? { cvId: existing.id } : {}) }, uiIcon('arrowLeft', 15), h('span', {}, 'Mes CV')),
        h('h1', {}, existing ? `Éléments affichés · ${existing.name}` : 'Nouveau CV'),
        h('p', { class: 'muted' }, existing
          ? 'Les cases décochées masquent l’élément (et tout ce qu’il contient) dans ce CV.'
          : 'Le CV est généré à partir du CV de référence enregistré. Les cases décochées masquent l’élément et tout ce qu’il contient.'),
      ),
      h('div', { class: 'view-actions' },
        button('Annuler', { onClick: () => navigate('library', existing ? { cvId: existing.id } : {}) }),
        button(existing ? 'Enregistrer' : 'Créer le CV', { icon: 'save', variant: 'primary', onClick: save }),
      ),
    ),
    h('div', { class: 'generator' },
      h('section', { class: 'generator-form' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Nom du CV'), nameInput),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Notes'), notesInput),
        h('div', { class: 'tree-toolbar' },
          h('strong', {}, 'Éléments du CV'), counter,
          h('div', { class: 'spacer' }),
          button('Tout afficher', { size: 'small', variant: 'ghost', icon: 'eye', onClick: () => { hidden.clear(); changed(); } }),
          button('Tout replier', { size: 'small', variant: 'ghost', onClick: () => { tree.forEach(node => collapsed.add(node.id)); renderTree(); } }),
        ),
        searchInput,
        treeEl,
      ),
      preview.element,
    ),
  );

  function isEffectivelyHidden(node, ancestorsHidden) {
    return ancestorsHidden || hidden.has(node.id);
  }

  function matches(node) {
    if (!filter) return true;
    return `${node.label} ${node.kind}`.toLowerCase().includes(filter) || node.children.some(matches);
  }

  function renderNode(node, depth, ancestorsHidden) {
    if (!matches(node)) return null;
    const selfHidden = hidden.has(node.id);
    const effectivelyHidden = isEffectivelyHidden(node, ancestorsHidden);
    const isCollapsed = collapsed.has(node.id) && !filter;
    const hasChildren = node.children.length > 0;
    const checkbox = h('input', {
      type: 'checkbox',
      checked: !selfHidden,
      disabled: ancestorsHidden || node.locked,
      title: node.locked ? 'L’en-tête reste toujours affiché' : null,
      'aria-label': `Afficher : ${node.label}`,
      onChange: event => {
        if (event.target.checked) hidden.delete(node.id); else hidden.add(node.id);
        changed();
      },
    });
    const row = h('div', { class: `tree-row${effectivelyHidden ? ' is-hidden' : ''}`, style: { paddingLeft: `${8 + depth * 18}px` }, role: 'treeitem' },
      hasChildren
        ? h('button', { type: 'button', class: `tree-toggle${isCollapsed ? '' : ' is-open'}`, 'aria-label': isCollapsed ? 'Déplier' : 'Replier', onClick: () => {
          if (collapsed.has(node.id)) collapsed.delete(node.id); else collapsed.add(node.id);
          renderTree();
        } }, uiIcon('chevron', 13))
        : h('span', { class: 'tree-toggle-spacer' }),
      h('label', { class: 'tree-label' }, checkbox,
        h('span', { class: 'tree-text' }, node.label || '(sans titre)'),
        h('span', { class: 'tree-kind' }, node.kind)),
    );
    const children = hasChildren && !isCollapsed
      ? node.children.flatMap(child => renderNode(child, depth + 1, effectivelyHidden) || [])
      : [];
    return [row, ...children];
  }

  function renderTree() {
    treeEl.replaceChildren(...tree.flatMap(node => renderNode(node, 0, false) || []));
    counter.textContent = `${hidden.size} masqué(s)`;
  }

  function changed() {
    setDirty(true);
    renderTree();
    preview.update(snapshot, { hidden: [...hidden] });
  }

  async function save() {
    const name = nameInput.value.trim();
    if (!name) {
      toast('Un nom est nécessaire pour enregistrer le CV.', { type: 'error' });
      nameInput.focus();
      return;
    }
    if (!existing && state.cvs.some(cv => cv.name.toLowerCase() === name.toLowerCase())) {
      const ok = await confirmDialog({ title: 'Nom déjà utilisé', message: `Un CV nommé « ${name} » existe déjà. Créer quand même un second CV avec ce nom ?`, confirmLabel: 'Créer quand même' });
      if (!ok) return;
    }
    const now = new Date().toISOString();
    const record = existing
      ? { ...existing, name, notes: notesInput.value.trim(), hidden: [...hidden] }
      : {
        id: newId('cv'),
        name,
        notes: notesInput.value.trim(),
        createdAt: now,
        baseRevision: state.base.revision || 1,
        hidden: [...hidden],
        snapshot,
      };
    const saved = await saveCv(record);
    setDirty(false);
    toast(existing ? 'CV enregistré' : 'CV créé');
    navigate('library', { cvId: saved.id });
  }

  renderTree();
  preview.update(snapshot, { hidden: [...hidden], immediate: true });
  setTimeout(() => nameInput.focus(), 50);

  return () => preview.destroy();
}
