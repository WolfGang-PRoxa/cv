// État partagé de l'interface et accès aux données (via le pont `window.studio`).

import { renderCvHtml } from '../../shared/cv/render.js';
import { normalizeCv } from '../../shared/cv/schema.js';

const api = window.studio;

export const state = {
  info: null,
  template: null,
  base: null,       // CV de référence enregistré
  cvs: [],          // CV générés
  settings: null,
  update: { state: 'idle' },
  sync: { mode: 'off', state: 'idle' },
  dirtyGuards: new Set(), // vues contenant des modifications non enregistrées
};

const listeners = new Map();

export function on(event, callback) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(callback);
  return () => listeners.get(event).delete(callback);
}

export function emit(event, payload) {
  listeners.get(event)?.forEach(callback => callback(payload));
}

export async function loadAll() {
  const [info, template, base, cvs, settings, update, sync] = await Promise.all([
    api.getAppInfo(),
    api.getTemplate(),
    api.getBase(),
    api.listCvs(),
    api.getSettings(),
    api.getUpdateStatus(),
    api.sync.status(),
  ]);
  Object.assign(state, { info, template, base: normalizeCv(base), cvs, settings, update, sync });
  api.onUpdateStatus(status => {
    state.update = status;
    emit('update', status);
  });
  api.sync.onStatus(status => {
    state.sync = status;
    emit('sync', status);
  });
  api.sync.onDataChanged(() => reloadData());
}

/** Relit la base et les CV (modifiés par la synchronisation depuis un autre poste). */
export async function reloadData() {
  const [base, cvs] = await Promise.all([api.getBase(), api.listCvs()]);
  const nextBase = normalizeCv(base);
  if (JSON.stringify(nextBase) !== JSON.stringify(state.base)) {
    state.base = nextBase;
    emit('base', state.base);
  }
  if (JSON.stringify(cvs) !== JSON.stringify(state.cvs)) {
    state.cvs = cvs;
    emit('cvs', state.cvs);
  }
}

/* -- CV de référence ------------------------------------------------ */

export async function saveBase(cv) {
  state.base = normalizeCv(await api.saveBase(cv));
  emit('base', state.base);
  return state.base;
}

/* -- CV générés ----------------------------------------------------- */

export async function refreshCvs() {
  state.cvs = await api.listCvs();
  emit('cvs', state.cvs);
  return state.cvs;
}

export async function saveCv(cv) {
  const saved = await api.saveCv(cv);
  await refreshCvs();
  return saved;
}

export async function deleteCv(id) {
  await api.deleteCv(id);
  await refreshCvs();
}

/* -- Paramètres ----------------------------------------------------- */

export async function saveSettings(partial) {
  state.settings = await api.saveSettings(partial);
  emit('settings', state.settings);
  return state.settings;
}

/* -- Rendu ---------------------------------------------------------- */

export function renderHtml(cv, options = {}) {
  return renderCvHtml(cv, { ...options, css: state.template.css, runtime: state.template.runtime });
}

/** Rendu destiné à l'export HTML (page autonome, animations comprises). */
export function renderExport(cv, hidden = []) {
  return renderHtml(cv, { hidden });
}

/** Rendu destiné au PDF : animations d'entrée désactivées pour une impression immédiate. */
export function renderPdf(cv, hidden = []) {
  return renderHtml(cv, { hidden, instant: true });
}

export { api };
