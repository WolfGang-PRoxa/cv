// Point d'entrée de l'interface : navigation entre les vues, bandeau de mise à jour.

import { h, uiIcon, confirmDialog, toast } from './lib/dom.js';
import { state, loadAll, on, api } from './lib/state.js';
import * as library from './views/library.js';
import * as generator from './views/generator.js';
import * as editor from './views/editor.js';
import * as settingsView from './views/settings.js';

const VIEWS = {
  library: { module: library, label: 'Mes CV', icon: 'files' },
  editor: { module: editor, label: 'CV de référence', icon: 'edit' },
  settings: { module: settingsView, label: 'Paramètres', icon: 'settings' },
  generator: { module: generator, parent: 'library' },
};

let current = { name: null, unmount: null };
const viewHost = document.getElementById('view');
const nav = document.getElementById('nav');
const updateBanner = document.getElementById('update-banner');

/* -- Garde des modifications non enregistrées ------------------------ */
function setDirty(viewName, dirty) {
  if (dirty) state.dirtyGuards.add(viewName); else state.dirtyGuards.delete(viewName);
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('has-changes', state.dirtyGuards.has(item.dataset.view)));
}

window.addEventListener('beforeunload', event => {
  if (state.dirtyGuards.size) {
    event.preventDefault();
    event.returnValue = '';
  }
});

async function navigate(name, params = {}) {
  if (current.name && state.dirtyGuards.has(current.name) && current.name !== name) {
    const ok = await confirmDialog({
      title: 'Quitter sans enregistrer ?',
      message: 'Les modifications en cours seront perdues.',
      confirmLabel: 'Quitter sans enregistrer',
      danger: true,
    });
    if (!ok) return;
    setDirty(current.name, false);
  }
  current.unmount?.();
  viewHost.replaceChildren();
  viewHost.className = `view view--${name}`;
  const view = VIEWS[name];
  current = { name, unmount: null };
  current.unmount = view.module.mount(viewHost, params, {
    navigate,
    setDirty: dirty => setDirty(name, dirty),
  }) || null;
  const active = view.parent || name;
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('is-active', item.dataset.view === active));
}

function renderNav() {
  nav.replaceChildren(...Object.entries(VIEWS)
    .filter(([, view]) => view.label)
    .map(([name, view]) => h('button', { type: 'button', class: 'nav-item', dataset: { view: name }, onClick: () => navigate(name) },
      uiIcon(view.icon, 18), h('span', {}, view.label), h('span', { class: 'nav-dot', title: 'Modifications non enregistrées' }))));
}

/* -- Mises à jour ------------------------------------------------------ */
function renderUpdateBanner(status) {
  const visible = ['available', 'downloading', 'downloaded'].includes(status?.state);
  updateBanner.hidden = !visible;
  if (!visible) return;
  updateBanner.replaceChildren(...[
    uiIcon('refresh', 16),
    h('span', {}, settingsView.describeUpdate(status)),
    status.state === 'downloaded'
      ? h('button', { type: 'button', class: 'btn btn--primary btn--small', onClick: () => api.installUpdate() }, 'Redémarrer et installer')
      : null,
  ].filter(Boolean));
}

/* -- Thème de l'application ------------------------------------------ */
function applyAppTheme() {
  const theme = state.settings?.appTheme;
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.appTheme = theme;
  else delete document.documentElement.dataset.appTheme;
}

async function start() {
  try {
    await loadAll();
  } catch (error) {
    viewHost.replaceChildren(h('div', { class: 'empty empty--large' }, h('p', {}, `Chargement impossible : ${error.message}`)));
    return;
  }
  applyAppTheme();
  on('settings', applyAppTheme);
  document.getElementById('app-version').textContent = `v${state.info.version}`;
  renderNav();
  renderUpdateBanner(state.update);
  on('update', status => {
    renderUpdateBanner(status);
    if (status.state === 'downloaded') toast(`Mise à jour ${status.version} téléchargée`);
  });
  const initial = new URLSearchParams(location.search).get('view');
  navigate(VIEWS[initial] ? initial : 'library');
  window.cvStudio = { navigate }; // utilisé par les captures d'écran automatiques
}

start();
