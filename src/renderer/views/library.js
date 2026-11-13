// Vue « Mes CV » : consultation des CV générés, aperçu et exports.

import { h, button, uiIcon, toast, confirmDialog, promptDialog, formatDate, openDialog, errorMessage } from '../lib/dom.js';
import { state, api, on, saveCv, deleteCv, renderExport, renderPdf } from '../lib/state.js';
import { createPreview } from '../components/preview.js';
import { buildTree, indexTree } from '../../shared/cv/schema.js';
import { clone, newId } from '../../shared/cv/ids.js';
import { slugify, suggestTag, validateCvTag } from '../../shared/github-tags.js';

let selectedId = null;

function isOutdated(cv) {
  return (cv.baseRevision || 0) < (state.base.revision || 0);
}

/** Met à jour l'instantané d'un CV à partir de la base actuelle, en conservant les éléments masqués. */
export function refreshFromBase(cv) {
  const snapshot = clone(state.base);
  const known = indexTree(buildTree(snapshot));
  return {
    ...cv,
    snapshot,
    baseRevision: state.base.revision,
    hidden: (cv.hidden || []).filter(id => known.has(id)),
  };
}

export function mount(container, params, { navigate }) {
  if (params?.cvId) selectedId = params.cvId;
  const preview = createPreview();
  const listEl = h('div', { class: 'cv-list' });
  const detailHead = h('div', { class: 'cv-detail-head' });
  const detailEl = h('div', { class: 'cv-detail' }, detailHead, preview.element);

  const header = h('header', { class: 'view-header' },
    h('div', {},
      h('h1', {}, 'Mes CV'),
      h('p', { class: 'muted' }, 'Variantes générées à partir du CV de référence, en masquant certains éléments.'),
    ),
    h('div', { class: 'view-actions' },
      button('Modifier le CV de référence', { icon: 'edit', onClick: () => navigate('editor') }),
      button('Nouveau CV', { icon: 'plus', variant: 'primary', onClick: () => navigate('generator') }),
    ),
  );

  container.append(header, h('div', { class: 'library' }, h('aside', { class: 'library-list' }, listEl), detailEl));

  function renderList() {
    listEl.replaceChildren();
    const base = state.base;
    listEl.append(h('button', {
      type: 'button',
      class: `cv-card cv-card--base${selectedId === 'base' ? ' is-selected' : ''}`,
      onClick: () => select('base'),
    },
      h('span', { class: 'cv-card-icon' }, uiIcon('layers', 18)),
      h('span', { class: 'cv-card-body' },
        h('strong', {}, 'CV de référence'),
        h('span', {}, `Version ${base.revision || 1}${base.savedAt ? ` · ${formatDate(base.savedAt)}` : ''}`),
      ),
    ));

    if (!state.cvs.length) {
      listEl.append(h('div', { class: 'empty' },
        uiIcon('files', 28),
        h('p', {}, 'Aucun CV généré pour l’instant.'),
        button('Créer un premier CV', { icon: 'plus', variant: 'primary', size: 'small', onClick: () => navigate('generator') }),
      ));
      return;
    }
    for (const cv of state.cvs) {
      listEl.append(h('button', {
        type: 'button',
        class: `cv-card${selectedId === cv.id ? ' is-selected' : ''}`,
        onClick: () => select(cv.id),
      },
        h('span', { class: 'cv-card-icon' }, uiIcon('doc', 18)),
        h('span', { class: 'cv-card-body' },
          h('strong', {}, cv.name),
          h('span', {}, `${cv.hidden?.length || 0} élément(s) masqué(s) · ${formatDate(cv.updatedAt)}`),
          isOutdated(cv) ? h('span', { class: 'badge badge--warning' }, 'Base modifiée depuis') : null,
        ),
      ));
    }
  }

  function select(id) {
    selectedId = id;
    renderList();
    renderDetail();
  }

  function renderDetail() {
    detailHead.replaceChildren();
    preview.element.hidden = false;
    if (selectedId === 'base') {
      detailHead.append(h('div', { class: 'detail-head' },
        h('div', {}, h('h2', {}, 'CV de référence'), h('p', { class: 'muted' }, 'Base commune à tous les CV générés.')),
        h('div', { class: 'view-actions' },
          button('Exporter en PDF', { icon: 'download', onClick: () => exportCv(state.base, [], 'pdf', 'CV de référence') }),
          button('HTML', { icon: 'doc', onClick: () => exportCv(state.base, [], 'html', 'CV de référence') }),
          button('', { icon: 'external', title: 'Ouvrir dans le navigateur', onClick: () => openBrowser(state.base, [], 'CV de référence') }),
          button('Modifier', { icon: 'edit', variant: 'primary', onClick: () => navigate('editor') }),
        ),
      ));
      preview.update(state.base, { immediate: true });
      return;
    }
    const cv = state.cvs.find(item => item.id === selectedId);
    if (!cv) {
      preview.element.hidden = true;
      detailHead.append(h('div', { class: 'empty empty--large' },
        uiIcon('doc', 36),
        h('p', {}, state.cvs.length ? 'Sélectionner un CV dans la liste pour l’afficher.' : 'Les CV générés apparaîtront ici.'),
      ));
      return;
    }
    const outdated = isOutdated(cv);
    detailHead.append(...[
      h('div', { class: 'detail-head' },
        h('div', {},
          h('h2', {}, cv.name),
          h('p', { class: 'muted' }, `Créé le ${formatDate(cv.createdAt)} · modifié le ${formatDate(cv.updatedAt)}`),
          cv.notes ? h('p', { class: 'notes' }, cv.notes) : null,
        ),
        h('div', { class: 'view-actions' },
          button('Exporter en PDF', { icon: 'download', variant: 'primary', onClick: () => exportCv(cv.snapshot, cv.hidden, 'pdf', cv.name) }),
          button('Publier', { icon: 'upload', title: 'Publier ce CV en release GitHub (PDF et HTML)', onClick: () => publish(cv) }),
          button('HTML', { icon: 'doc', title: 'Exporter en page HTML autonome', onClick: () => exportCv(cv.snapshot, cv.hidden, 'html', cv.name) }),
          button('', { icon: 'external', title: 'Ouvrir dans le navigateur', onClick: () => openBrowser(cv.snapshot, cv.hidden, cv.name) }),
          button('Éléments affichés', { icon: 'eye', onClick: () => navigate('generator', { cvId: cv.id }) }),
          button('', { icon: 'edit', title: 'Renommer', onClick: () => rename(cv) }),
          button('', { icon: 'copy', title: 'Dupliquer', onClick: () => duplicate(cv) }),
          button('', { icon: 'trash', title: 'Supprimer', variant: 'ghost-danger', onClick: () => remove(cv) }),
        ),
      ),
      outdated ? h('div', { class: 'callout callout--warning' },
        uiIcon('refresh', 18),
        h('div', {},
          h('strong', {}, 'Le CV de référence a été modifié depuis la création de ce CV.'),
          h('p', {}, 'Ce CV conserve le contenu de la base au moment de sa création. La mise à jour reprend le contenu actuel de la base, en gardant les éléments masqués ; les nouveaux éléments de la base seront affichés.'),
        ),
        button('Mettre à jour depuis la base', { icon: 'refresh', size: 'small', onClick: () => updateFromBase(cv) }),
      ) : null,
      releasesSection(cv),
    ].filter(Boolean));
    preview.update(cv.snapshot, { hidden: cv.hidden, immediate: true });
  }

  async function exportCv(cv, hidden, format, name) {
    try {
      const result = format === 'pdf'
        ? await api.exportPdf(renderPdf(cv, hidden), name)
        : await api.exportHtml(renderExport(cv, hidden), name);
      if (!result.canceled) toast(`CV exporté : ${result.filePath}`);
    } catch (error) {
      toast(`Export impossible : ${error.message}`, { type: 'error', duration: 6000 });
    }
  }

  async function openBrowser(cv, hidden, name) {
    try {
      await api.openInBrowser(renderExport(cv, hidden), name);
    } catch (error) {
      toast(`Ouverture impossible : ${error.message}`, { type: 'error' });
    }
  }

  async function rename(cv) {
    const name = await promptDialog({ title: 'Renommer le CV', label: 'Nom', value: cv.name, confirmLabel: 'Renommer' });
    if (!name) return;
    await saveCv({ ...cv, name });
    toast('CV renommé');
  }

  async function duplicate(cv) {
    const copy = { ...clone(cv), id: newId('cv'), name: `${cv.name} (copie)`, createdAt: new Date().toISOString(), releases: [] };
    const saved = await saveCv(copy);
    select(saved.id);
    toast('CV dupliqué');
  }

  async function remove(cv) {
    const ok = await confirmDialog({ title: 'Supprimer ce CV ?', message: `« ${cv.name} » sera supprimé définitivement. Le CV de référence n’est pas affecté.`, confirmLabel: 'Supprimer', danger: true });
    if (!ok) return;
    await deleteCv(cv.id);
    selectedId = state.cvs[0]?.id || null;
    toast('CV supprimé');
  }

  /* -- Publication sur GitHub ------------------------------------------ */

  /** Moment de la dernière modification du contenu publié (nom exclu). */
  function contentChangedAfter(cv, iso) {
    return String(cv.contentUpdatedAt || cv.updatedAt) > String(iso);
  }

  function releasesSection(cv) {
    const releases = [...(cv.releases || [])].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
    const last = releases[0];
    const head = h('div', { class: 'releases-head' },
      h('strong', {}, uiIcon('upload', 15), ` Publications GitHub (${releases.length})`),
      last && contentChangedAfter(cv, last.publishedAt) ? h('span', { class: 'badge badge--warning' }, 'Modifié depuis la dernière publication') : null,
      button('Actualiser', { icon: 'refresh', size: 'small', title: 'Relire les releases de ce CV sur GitHub', onClick: () => syncReleases(cv) }),
    );
    if (!releases.length) {
      return h('section', { class: 'releases' }, head, h('p', { class: 'muted' }, 'Ce CV n’a pas encore été publié. Le bouton « Publier » crée une release avec son PDF et sa page HTML.'));
    }
    return h('section', { class: 'releases' }, head,
      h('ul', { class: 'release-list' }, releases.map(release => h('li', { class: 'release' },
        h('div', { class: 'release-body' },
          h('a', { href: release.url, target: '_blank', rel: 'noopener' }, release.name),
          h('span', { class: 'muted' }, `${release.tag} · ${formatDate(release.publishedAt)}`),
        ),
        h('div', { class: 'release-assets' },
          (release.assets || []).map(asset => h('a', { class: 'badge', href: asset.url, target: '_blank', rel: 'noopener', title: `Télécharger ${asset.name}` }, asset.name.split('.').pop().toUpperCase())),
          button('', { icon: 'trash', size: 'small', title: 'Supprimer cette release sur GitHub', variant: 'ghost-danger', onClick: () => removeRelease(cv, release) }),
        ),
      ))),
    );
  }

  async function publish(cv) {
    let remote = [];
    try {
      remote = await api.github.releases();
    } catch (error) {
      const ok = await confirmDialog({
        title: 'GitHub injoignable',
        message: `La liste des releases n’a pas pu être lue (${errorMessage(error)}). Vérifier la connexion dans Paramètres › Publication sur GitHub. Continuer quand même ?`,
        confirmLabel: 'Continuer',
      });
      if (!ok) return;
    }
    const taken = [...remote.map(release => release.tag), ...(cv.releases || []).map(release => release.tag)];
    const published = remote.filter(release => release.cvId === cv.id).length || (cv.releases || []).length;
    const { tag } = suggestTag(cv.name, taken);
    const fileStem = `CV-${slugify(cv.name)}`.replace(/^CV-cv-/i, 'CV-');

    const release = await openDialog(close => {
      const fields = {
        name: h('input', { class: 'input', type: 'text', value: `${cv.name} (version ${published + 1})` }),
        tag: h('input', { class: 'input', type: 'text', value: tag, spellcheck: false }),
        file: h('input', { class: 'input', type: 'text', value: fileStem, spellcheck: false }),
        notes: h('textarea', { class: 'input', rows: 3, placeholder: 'Facultatif : à qui ce CV est destiné, ce qui a changé…' }),
        pdf: h('input', { type: 'checkbox', checked: true }),
        html: h('input', { type: 'checkbox', checked: true }),
      };
      const errorLine = h('p', { class: 'form-error', hidden: true });
      const progressLine = h('p', { class: 'muted', hidden: true });
      const submit = h('button', { type: 'submit', class: 'btn btn--primary' }, uiIcon('upload', 17), h('span', {}, 'Publier'));
      const cancel = button('Annuler', { onClick: () => close(null) });
      const stepLabel = progress => ({
        files: 'Préparation des fichiers…',
        release: 'Création de la release…',
        upload: `Envoi de ${progress.name} (${progress.index + 1}/${progress.total})…`,
        publish: 'Publication…',
      })[progress.step] || '';

      async function onSubmit(event) {
        event.preventDefault();
        const tagValue = fields.tag.value.trim();
        const stem = fields.file.value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/\s+/g, '-') || fileStem;
        const problem = validateCvTag(tagValue)
          || (taken.includes(tagValue) ? 'une release porte déjà ce tag.' : null)
          || (!fields.pdf.checked && !fields.html.checked ? 'choisir au moins un fichier.' : null);
        if (problem) { errorLine.textContent = `Impossible de publier : ${problem}`; errorLine.hidden = false; return; }
        errorLine.hidden = true;
        submit.disabled = true;
        cancel.disabled = true;
        progressLine.hidden = false;
        const off = api.github.onProgress(progress => { progressLine.textContent = stepLabel(progress); });
        try {
          const files = [];
          if (fields.pdf.checked) files.push({ kind: 'pdf', name: `${stem}.pdf`, html: renderPdf(cv.snapshot, cv.hidden) });
          if (fields.html.checked) files.push({ kind: 'html', name: `${stem}.html`, html: renderExport(cv.snapshot, cv.hidden) });
          const result = await api.github.publish({
            cvId: cv.id,
            revision: cv.baseRevision ?? null,
            tag: tagValue,
            name: fields.name.value.trim() || tagValue,
            notes: fields.notes.value,
            files,
          });
          close(result);
        } catch (error) {
          errorLine.textContent = `Publication impossible : ${errorMessage(error)}`;
          errorLine.hidden = false;
          progressLine.hidden = true;
          submit.disabled = false;
          cancel.disabled = false;
        } finally {
          off();
        }
      }

      return h('form', { method: 'dialog', class: 'dialog-body dialog-body--wide', onSubmit },
        h('h2', {}, 'Publier sur GitHub'),
        h('p', { class: 'muted' }, 'Une release est créée dans le dépôt configuré, avec les fichiers choisis. Elle n’est jamais marquée « Latest », pour ne pas gêner les mises à jour de l’application.'),
        h('div', { class: 'fields' },
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Titre de la release'), fields.name),
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Tag'), fields.tag),
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Nom des fichiers'), fields.file),
          h('div', { class: 'row' },
            h('label', { class: 'field field--inline' }, fields.pdf, h('span', { class: 'field-label' }, 'PDF')),
            h('label', { class: 'field field--inline' }, fields.html, h('span', { class: 'field-label' }, 'Page HTML')),
          ),
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Description'), fields.notes),
        ),
        errorLine,
        progressLine,
        h('div', { class: 'dialog-actions' }, cancel, submit),
      );
    });
    if (!release) return;

    const latest = state.cvs.find(item => item.id === cv.id) || cv;
    await saveCv({ ...latest, releases: [...(latest.releases || []).filter(item => item.tag !== release.tag), release] });
    toast(`CV publié : ${release.tag}`);
  }

  async function syncReleases(cv) {
    try {
      const remote = (await api.github.releases()).filter(release => release.cvId === cv.id);
      await saveCv({ ...cv, releases: remote });
      toast(remote.length ? `${remote.length} publication(s) trouvée(s) sur GitHub` : 'Aucune publication de ce CV sur GitHub');
    } catch (error) {
      toast(`Lecture des releases impossible : ${errorMessage(error)}`, { type: 'error', duration: 6000 });
    }
  }

  async function removeRelease(cv, release) {
    const ok = await confirmDialog({
      title: 'Supprimer cette release ?',
      message: `« ${release.name} » (${release.tag}) et ses fichiers seront supprimés de GitHub. Les liens déjà envoyés ne fonctionneront plus.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.github.deleteRelease({ id: release.id, tag: release.tag });
      await saveCv({ ...cv, releases: (cv.releases || []).filter(item => item.tag !== release.tag) });
      toast('Release supprimée');
    } catch (error) {
      toast(`Suppression impossible : ${errorMessage(error)}`, { type: 'error', duration: 6000 });
    }
  }

  async function updateFromBase(cv) {
    await saveCv(refreshFromBase(cv));
    toast('CV mis à jour depuis la base');
  }

  if (!selectedId || (selectedId !== 'base' && !state.cvs.some(cv => cv.id === selectedId))) {
    selectedId = state.cvs[0]?.id || 'base';
  }
  renderList();
  renderDetail();

  const offCvs = on('cvs', () => { renderList(); renderDetail(); });
  const offBase = on('base', () => { renderList(); renderDetail(); });
  return () => { offCvs(); offBase(); preview.destroy(); };
}
