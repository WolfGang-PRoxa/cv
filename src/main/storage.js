// Stockage local des données de l'application.
//   base.json      CV de référence                                    ┐ dossier de données :
//   cvs/<id>.json  CV générés (instantané de la base + éléments masqués) ┘ AppData, ou dossier synchronisé
//   settings.json  paramètres de l'application (toujours dans AppData : propres à chaque poste)
//   sync-state.json état de la dernière synchronisation GitHub (AppData)

import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SHARED_DIR = path.join(here, '..', 'shared');
const BUNDLED_BASE = path.join(SHARED_DIR, 'cv', 'sample-cv.json');

export const DEFAULT_SETTINGS = {
  autoUpdate: true,
  appTheme: 'system',
  // Publication des CV en releases GitHub. `repo` vide : dépôt de l'application.
  // `token` : jeton chiffré (« enc:… »), jamais transmis à l'interface.
  github: { repo: '', token: '' },
  // Synchronisation entre postes : 'off', 'folder' (dossier synchronisé, ex. OneDrive)
  // ou 'gist' (Gist secret chiffré). `key` : clé de chiffrement protégée (« enc:… »),
  // jamais transmise à l'interface.
  sync: { mode: 'off', folder: '', gistId: '', salt: '', key: '', login: '' },
  window: {
    mode: 'maximized',
    bounds: { x: 120, y: 80, width: 1400, height: 900 },
  },
};

function appDataDir() {
  return app.getPath('userData');
}

/** Dossier de la base et des CV : AppData, ou le dossier synchronisé choisi. */
let dataRoot = null;
function dataDir() {
  return dataRoot || appDataDir();
}

/** Redirige la base et les CV vers un autre dossier (null : retour à AppData). */
export function setDataRoot(dir) {
  dataRoot = dir || null;
}

export function getAppDataDir() {
  return appDataDir();
}

const cvFile = (root, id) => path.join(root, 'cvs', `${String(id).replace(/[^\w-]/g, '')}.json`);

const paths = {
  base: () => path.join(dataDir(), 'base.json'),
  cvs: () => path.join(dataDir(), 'cvs'),
  cv: id => cvFile(dataDir(), id),
  settings: () => path.join(appDataDir(), 'settings.json'),
  syncState: () => path.join(appDataDir(), 'sync-state.json'),
};

export function getDataDir() {
  return dataDir();
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

/** Écriture atomique : fichier temporaire puis renommage. */
async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(temporary, file);
}

/* -- CV de référence ------------------------------------------------ */

export async function readBundledBase() {
  return JSON.parse(await fs.readFile(BUNDLED_BASE, 'utf8'));
}

export async function readBase() {
  const base = await readJson(paths.base(), null);
  if (base) return base;
  const seeded = await readBundledBase();
  await writeJson(paths.base(), seeded);
  return seeded;
}

export async function writeBase(cv) {
  const current = await readJson(paths.base(), null);
  const next = { ...cv, revision: (current?.revision || cv.revision || 0) + 1, savedAt: new Date().toISOString() };
  await writeJson(paths.base(), next);
  return next;
}

/* -- CV générés ----------------------------------------------------- */

export async function listCvs() {
  await fs.mkdir(paths.cvs(), { recursive: true });
  const files = (await fs.readdir(paths.cvs())).filter(name => name.endsWith('.json'));
  const cvs = [];
  for (const name of files) {
    try {
      cvs.push(JSON.parse(await fs.readFile(path.join(paths.cvs(), name), 'utf8')));
    } catch {
      // Un fichier illisible est ignoré plutôt que de bloquer toute la liste.
    }
  }
  return cvs.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function writeCv(cv) {
  if (!cv?.id) throw new Error('CV sans identifiant');
  const now = new Date().toISOString();
  // contentUpdatedAt ne change que si le contenu affiché change (instantané ou éléments
  // masqués) : renommer ou enregistrer une publication ne compte pas comme une modification.
  const previous = await readJson(paths.cv(cv.id), null);
  const contentKey = value => JSON.stringify([value?.snapshot ?? null, [...(value?.hidden || [])].sort()]);
  const contentChanged = !previous || contentKey(previous) !== contentKey(cv);
  const saved = {
    ...cv,
    updatedAt: now,
    contentUpdatedAt: contentChanged ? now : (previous.contentUpdatedAt || previous.updatedAt || now),
  };
  await writeJson(paths.cv(cv.id), saved);
  return saved;
}

export async function deleteCv(id) {
  await fs.rm(paths.cv(id), { force: true });
}

/* -- Paramètres ----------------------------------------------------- */

export async function readSettings() {
  const stored = await readJson(paths.settings(), {});
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    github: { ...DEFAULT_SETTINGS.github, ...(stored.github || {}) },
    sync: { ...DEFAULT_SETTINGS.sync, ...(stored.sync || {}) },
    window: {
      ...DEFAULT_SETTINGS.window,
      ...(stored.window || {}),
      bounds: { ...DEFAULT_SETTINGS.window.bounds, ...(stored.window?.bounds || {}) },
    },
  };
}

export async function writeSettings(partial) {
  const current = await readSettings();
  const next = {
    ...current,
    ...partial,
    github: { ...current.github, ...(partial.github || {}) },
    sync: { ...current.sync, ...(partial.sync || {}) },
    window: {
      ...current.window,
      ...(partial.window || {}),
      bounds: { ...current.window.bounds, ...(partial.window?.bounds || {}) },
    },
  };
  await writeJson(paths.settings(), next);
  return next;
}

/* -- Synchronisation ------------------------------------------------ */

/**
 * Tous les éléments synchronisés, par clé : « base » et « cv:<id> ».
 * `pristine` : la base est encore celle livrée avec l'application (jamais enregistrée).
 */
export async function readSyncItems() {
  const items = { base: await readBase() };
  for (const cv of await listCvs()) items[`cv:${cv.id}`] = cv;
  return { items, pristine: items.base.savedAt ? [] : ['base'] };
}

/** Écrit (ou supprime, si `value` est null) un élément tel quel, sans changer ses dates. */
export async function writeSyncItem(key, value) {
  if (key === 'base') {
    if (value) await writeJson(paths.base(), value);
    return;
  }
  const id = key.slice(3);
  if (value) await writeJson(paths.cv(id), value);
  else await deleteCv(id);
}

export async function readSyncState() {
  return readJson(paths.syncState(), null);
}

export async function writeSyncState(value) {
  if (value) await writeJson(paths.syncState(), value);
  else await fs.rm(paths.syncState(), { force: true });
}

/** Le dossier contient-il déjà des données de CV Studio ? */
export async function hasDataIn(dir) {
  try {
    await fs.access(path.join(dir, 'base.json'));
    return true;
  } catch {
    return false;
  }
}

/** Copie la base et les CV d'un dossier de données vers un autre (les fichiers présents sont remplacés). */
export async function copyData(fromDir, toDir) {
  await fs.mkdir(path.join(toDir, 'cvs'), { recursive: true });
  const base = await readJson(path.join(fromDir, 'base.json'), null);
  if (base) await writeJson(path.join(toDir, 'base.json'), base);
  let names = [];
  try { names = (await fs.readdir(path.join(fromDir, 'cvs'))).filter(name => name.endsWith('.json')); } catch { /* aucun CV */ }
  for (const name of names) {
    const cv = await readJson(path.join(fromDir, 'cvs', name), null);
    if (cv?.id) await writeJson(cvFile(toDir, cv.id), cv);
  }
}

/* -- Modèle du CV (styles et script intégrés aux pages générées) ---- */

export async function readTemplate() {
  const dir = path.join(SHARED_DIR, 'cv', 'template');
  const [css, runtime] = await Promise.all([
    fs.readFile(path.join(dir, 'cv.css'), 'utf8'),
    fs.readFile(path.join(dir, 'cv-runtime.js'), 'utf8'),
  ]);
  return { css, runtime };
}
