// Raccourcis Windows vers l'application : Bureau et menu Démarrer.
//
// Le nom (« CV Studio.lnk ») et les emplacements sont ceux de l'installeur : un raccourci
// créé ici est donc aussi retiré par la désinstallation. Avant chaque opération,
// l'emplacement est relu (voir shortcut-rules.js) : l'interface ne transmet que
// l'identifiant de l'emplacement, jamais un chemin de fichier.

import { app, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

import { canRemove, classify, launchesApp, plannedAction, SHORTCUT_FILE } from './shortcut-rules.js';

const APP_ID = 'fr.wolfgangproxa.cvstudio';
const DESCRIPTION = 'Éditer le CV de référence et générer des CV';

// Version de développement uniquement : raccourcis simulés (fichiers JSON) dans ce dossier,
// pour tester l'interface hors de Windows.
const SANDBOX = !app.isPackaged && process.env.CV_STUDIO_SHORTCUT_SANDBOX;

const LOCATIONS = [
  {
    id: 'desktop',
    label: 'Bureau',
    dir: () => (SANDBOX ? path.join(SANDBOX, 'Desktop') : app.getPath('desktop')),
    depth: 0,
  },
  {
    id: 'startMenu',
    label: 'Menu Démarrer',
    dir: () => (SANDBOX ? path.join(SANDBOX, 'Programs') : path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs')),
    // Les programmes sont souvent rangés dans un sous-dossier du menu Démarrer.
    depth: 1,
  },
];

/* -- Lecture et écriture des fichiers .lnk -------------------------- */

const linkIo = SANDBOX
  ? {
    read: async file => JSON.parse(await fs.readFile(file, 'utf8')),
    write: async (file, options) => {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(options, null, 2), 'utf8');
      return true;
    },
    remove: file => fs.rm(file),
  }
  : {
    read: async file => shell.readShortcutLink(file),
    write: async (file, options, operation) => shell.writeShortcutLink(file, operation, options),
    remove: file => shell.trashItem(file),
  };

export function isSupported() {
  return process.platform === 'win32' || Boolean(SANDBOX);
}

/** Ce que doit lancer le raccourci : l'exécutable installé, ou Electron et le projet en développement. */
function expectedLaunch() {
  const target = process.execPath;
  const args = app.isPackaged ? '' : `"${app.getAppPath()}"`;
  return { target, args };
}

function shortcutOptions() {
  const { target, args } = expectedLaunch();
  return {
    target,
    args,
    cwd: path.dirname(target),
    description: DESCRIPTION,
    icon: target,
    iconIndex: 0,
    appUserModelId: APP_ID,
  };
}

async function readLink(file) {
  try {
    return await linkIo.read(file);
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

async function exists(file) {
  if (!file) return false;
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/** Fichiers .lnk du dossier (et de ses sous-dossiers jusqu'à `depth`), sauf « CV Studio.lnk » à la racine. */
async function listLinks(dir, depth, prefix = '') {
  let entries = [];
  try {
    entries = await fs.readdir(path.join(dir, prefix), { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory() && depth > 0) files.push(...await listLinks(dir, depth - 1, relative));
    else if (entry.isFile() && /\.lnk$/i.test(entry.name) && relative.toLowerCase() !== SHORTCUT_FILE.toLowerCase()) files.push(relative);
  }
  return files;
}

/** État d'un emplacement, avec le raccourci trouvé. */
async function inspect(location) {
  const dir = location.dir();
  const expected = expectedLaunch();
  const primaryFile = path.join(dir, SHORTCUT_FILE);
  const primary = (await exists(primaryFile)) ? await readLink(primaryFile) : null;

  const others = [];
  for (const relative of await listLinks(dir, location.depth)) {
    const link = await readLink(path.join(dir, relative));
    if (launchesApp(link, expected)) others.push(relative);
  }

  const status = classify({ primary, primaryTargetExists: await exists(primary?.target), others }, expected);
  const file = primary ? primaryFile : others.length ? path.join(dir, others[0]) : null;
  return {
    id: location.id,
    label: location.label,
    dir,
    status,
    file,
    name: file ? path.relative(dir, file) : null,
    currentTarget: primary?.target || null,
    others: primary ? others : others.slice(1),
    action: plannedAction(status),
    removable: canRemove(status),
  };
}

function findLocation(id) {
  const location = LOCATIONS.find(item => item.id === id);
  if (!location) throw new Error('Emplacement de raccourci inconnu.');
  return location;
}

function ensureSupported() {
  if (!isSupported()) throw new Error('Les raccourcis ne sont disponibles que sous Windows.');
}

/* -- API utilisée par main.js --------------------------------------- */

export async function status() {
  if (!isSupported()) return { supported: false, packaged: app.isPackaged, locations: [] };
  return {
    supported: true,
    packaged: app.isPackaged,
    locations: await Promise.all(LOCATIONS.map(inspect)),
  };
}

/**
 * Crée le raccourci d'un emplacement, ou le répare s'il est périmé. Un fichier
 * « CV Studio.lnk » qui ouvre un autre programme n'est remplacé qu'avec `confirmReplace`.
 * @returns {Promise<{ outcome: 'created'|'repaired'|'replaced'|'already'|'conflict', before: object, location: object }>}
 */
export async function create(id, { confirmReplace = false } = {}) {
  ensureSupported();
  const location = findLocation(id);
  const before = await inspect(location);

  if (before.action === 'none') return { outcome: 'already', before, location: before };
  if (before.action === 'replace' && !confirmReplace) return { outcome: 'conflict', before, location: before };

  const file = path.join(before.dir, SHORTCUT_FILE);
  await fs.mkdir(before.dir, { recursive: true });
  const operation = before.action === 'create' ? 'create' : 'replace';
  const written = await linkIo.write(file, shortcutOptions(), operation);
  if (!written) throw new Error(`Windows n’a pas pu écrire le raccourci dans ${before.dir}.`);

  const after = await inspect(location);
  if (after.status !== 'ok') throw new Error('Le raccourci a été écrit, mais il n’ouvre pas l’application.');
  const outcome = { create: 'created', repair: 'repaired', replace: 'replaced' }[before.action];
  return { outcome, before, location: after };
}

/** Met à la corbeille le raccourci de l'application trouvé dans un emplacement. */
export async function remove(id) {
  ensureSupported();
  const location = findLocation(id);
  const before = await inspect(location);
  if (!before.file || before.status === 'missing') return { outcome: 'missing', before, location: before };
  if (!before.removable) return { outcome: 'refused', before, location: before };
  await linkIo.remove(before.file);
  return { outcome: 'removed', before, location: await inspect(location) };
}

/** Affiche le raccourci dans l'Explorateur. */
export async function reveal(id) {
  ensureSupported();
  const current = await inspect(findLocation(id));
  if (current.file) shell.showItemInFolder(current.file);
  else await shell.openPath(current.dir);
  return true;
}
