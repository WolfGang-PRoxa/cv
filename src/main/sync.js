// Synchronisation des données (base et CV générés) entre les postes d'un même utilisateur.
//
// Deux modes, au choix dans les paramètres :
// - « folder » : la base et les CV sont enregistrés dans un dossier choisi par
//   l'utilisateur (OneDrive, Dropbox…), que son service de stockage synchronise.
//   L'application surveille le dossier et recharge les données modifiées ailleurs.
// - « gist » : les données sont chiffrées (AES-256-GCM, clé tirée d'un mot de passe)
//   puis envoyées dans un Gist secret du compte GitHub de l'utilisateur. GitHub ne
//   reçoit que des données illisibles ; le mot de passe ne quitte jamais le poste.
//   Envoi quelques secondes après chaque enregistrement, récupération au lancement,
//   au retour sur la fenêtre et toutes les dix minutes.
//
// Les paramètres (fenêtre, thème, jeton…) restent propres à chaque poste.

import { app, dialog, safeStorage } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as storage from './storage.js';
import { networkMessage, request, resolveToken } from './github.js';
import { deriveKey, fileNameFor, hashValue, KDF, newSalt, open, seal } from './sync-crypto.js';
import { planSync } from '../shared/sync-merge.js';

const MANIFEST = 'cv-studio-sync.json';
const DESCRIPTION = 'CV Studio — données synchronisées (chiffrées)';
const PUSH_DELAY = 3000;
const FOCUS_INTERVAL = 30 * 1000;
const PERIODIC_INTERVAL = 10 * 60 * 1000;

let getWindow = () => null;
let status = { mode: 'off', state: 'idle', lastSync: null, error: null, login: null, folder: '' };
let pushTimer = null;
let periodicTimer = null;
let watcher = null;
let lastFocusSync = 0;
let running = Promise.resolve();

/* -- État ------------------------------------------------------------- */

function setStatus(patch) {
  status = { ...status, ...patch };
  getWindow()?.webContents.send('sync:status', status);
}

/** Boîte de dialogue rattachée à la fenêtre si elle existe. */
function showDialog(kind, options) {
  const win = getWindow();
  return win ? dialog[kind](win, options) : dialog[kind](options);
}

function dataChanged() {
  getWindow()?.webContents.send('sync:data-changed');
}

export function getStatus() {
  return status;
}

/** Démarrage : rétablit le mode enregistré. */
export async function init(windowGetter) {
  getWindow = windowGetter;
  const { sync } = await storage.readSettings();
  if (sync.mode === 'folder' && sync.folder) {
    if (fs.existsSync(sync.folder)) {
      storage.setDataRoot(sync.folder);
      startWatcher(sync.folder);
      setStatus({ mode: 'folder', folder: sync.folder, state: 'ok', error: null });
    } else {
      // Dossier indisponible (disque débranché, service arrêté) : les données locales sont utilisées.
      setStatus({ mode: 'folder', folder: sync.folder, state: 'error', error: `dossier introuvable : ${sync.folder}. Les données de ce poste sont utilisées en attendant.` });
    }
  } else if (sync.mode === 'gist' && sync.gistId && sync.key) {
    setStatus({ mode: 'gist', login: sync.login || null });
    startPeriodic(); // première synchronisation lancée une fois la fenêtre chargée (main.js)
  }
}

/* -- Protection de la clé sur le poste ------------------------------ */

async function protect(buffer) {
  return (await safeStorage.isAsyncEncryptionAvailable())
    ? `enc:${(await safeStorage.encryptStringAsync(buffer.toString('base64'))).toString('base64')}`
    : `raw:${buffer.toString('base64')}`;
}

async function reveal(stored) {
  if (stored?.startsWith('enc:')) return Buffer.from((await safeStorage.decryptStringAsync(Buffer.from(stored.slice(4), 'base64'))).result, 'base64');
  if (stored?.startsWith('raw:')) return Buffer.from(stored.slice(4), 'base64');
  throw new Error('clé de synchronisation absente : réactiver la synchronisation.');
}

/* -- Mode « dossier synchronisé » ------------------------------------ */

function startWatcher(folder) {
  stopWatcher();
  let timer = null;
  try {
    watcher = fs.watch(folder, { recursive: true }, (_event, name) => {
      if (name && /\.tmp$/.test(String(name))) return;
      clearTimeout(timer);
      timer = setTimeout(dataChanged, 800);
    });
    watcher.on('error', () => stopWatcher());
  } catch {
    watcher = null; // surveillance impossible : les données sont relues au prochain lancement
  }
}

function stopWatcher() {
  watcher?.close();
  watcher = null;
}

/**
 * Choix du dossier synchronisé. Un dossier qui contient déjà des données (créées sur
 * un autre poste) est utilisé tel quel ; sinon les données de ce poste y sont copiées.
 */
export async function chooseFolder() {
  const result = await showDialog('showOpenDialog', {
    title: 'Dossier de données synchronisé',
    buttonLabel: 'Utiliser ce dossier',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true, status };
  const folder = result.filePaths[0];
  const current = storage.getDataDir();
  const existing = await storage.hasDataIn(folder);
  if (existing && path.resolve(folder) !== path.resolve(current)) {
    const choice = await showDialog('showMessageBox', {
      type: 'question',
      buttons: ['Utiliser les données du dossier', 'Annuler'],
      defaultId: 0,
      cancelId: 1,
      title: 'Données déjà présentes',
      message: 'Ce dossier contient déjà des données CV Studio, sans doute venues d’un autre poste.',
      detail: 'L’application les utilisera. Les données actuelles de ce poste restent dans le dossier de l’application et réapparaissent si la synchronisation est désactivée.',
    });
    if (choice.response !== 0) return { canceled: true, status };
  } else if (!existing) {
    await storage.copyData(current, folder);
  }
  await disableGist();
  await storage.writeSettings({ sync: { mode: 'folder', folder } });
  storage.setDataRoot(folder);
  startWatcher(folder);
  setStatus({ mode: 'folder', folder, state: 'ok', error: null, login: null, lastSync: null });
  dataChanged();
  return { canceled: false, adopted: existing, status };
}

/* -- Mode « Gist secret chiffré » ------------------------------------ */

async function requireToken() {
  const { token } = await resolveToken();
  if (!token) throw new Error('aucun jeton GitHub : en enregistrer un dans « Publication sur GitHub », ou se connecter avec GitHub CLI (gh auth login).');
  return token;
}

function gistError(error) {
  if (error?.status === 404 || error?.status === 403) {
    return 'le jeton GitHub n’a pas accès aux Gists. Pour un jeton à accès précis, ajouter la permission de compte « Gists » en lecture et écriture.';
  }
  return networkMessage(error);
}

async function findGist(token) {
  for (let page = 1; page <= 10; page += 1) {
    const gists = await request(token, 'GET', `/gists?per_page=100&page=${page}`);
    const found = gists.find(gist => gist.files?.[MANIFEST]);
    // La liste ne donne pas le contenu des fichiers : le Gist complet est relu.
    if (found) return request(token, 'GET', `/gists/${found.id}`);
    if (gists.length < 100) return null;
  }
  return null;
}

async function fileContent(token, file) {
  if (!file.truncated && typeof file.content === 'string') return file.content;
  // Fichier volumineux : le contenu complet est lu à son adresse brute.
  const response = await fetch(file.raw_url, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': `CV-Studio/${app.getVersion()}` } });
  if (!response.ok) throw new Error(`lecture du Gist impossible (${response.status}).`);
  return response.text();
}

/**
 * Active la synchronisation par Gist. Si le compte possède déjà un Gist CV Studio
 * (créé sur un autre poste), le mot de passe doit être le même : il est vérifié.
 */
export async function enableGist(passphrase) {
  const secret = String(passphrase || '');
  if (secret.length < 8) throw new Error('le mot de passe doit contenir au moins 8 caractères.');
  let token;
  let login;
  let gist;
  try {
    token = await requireToken();
    login = (await request(token, 'GET', '/user'))?.login || null;
    gist = await findGist(token);
  } catch (error) {
    throw new Error(gistError(error));
  }
  let salt;
  let key;
  if (gist) {
    const manifest = JSON.parse(await fileContent(token, gist.files[MANIFEST]));
    salt = manifest.salt;
    key = await deriveKey(secret, salt, manifest.kdf || KDF);
    try {
      open(key, manifest.check);
    } catch {
      throw new Error('ce mot de passe ne correspond pas à celui choisi sur vos autres postes.');
    }
  } else {
    salt = newSalt();
    key = await deriveKey(secret, salt);
    const manifest = { app: 'CV Studio', format: 1, kdf: KDF, salt, check: seal(key, { check: 'cv-studio' }) };
    try {
      gist = await request(token, 'POST', '/gists', { body: { description: DESCRIPTION, public: false, files: { [MANIFEST]: { content: JSON.stringify(manifest, null, 2) } } } });
    } catch (error) {
      throw new Error(gistError(error));
    }
  }
  // Retour éventuel du mode dossier : les données redeviennent celles du dossier de l'application.
  if (status.mode === 'folder') await leaveFolder();
  await storage.writeSyncState(null);
  await storage.writeSettings({ sync: { mode: 'gist', folder: '', gistId: gist.id, salt, key: await protect(key), login } });
  setStatus({ mode: 'gist', login, folder: '', state: 'idle', error: null, lastSync: null });
  startPeriodic();
  await syncNow();
  return status;
}

async function disableGist() {
  stopPeriodic();
  clearTimeout(pushTimer);
  await storage.writeSyncState(null);
}

async function leaveFolder() {
  stopWatcher();
  const folder = storage.getDataDir();
  storage.setDataRoot(null);
  // Les données du dossier sont recopiées sur ce poste : rien n'est perdu en quittant ce mode.
  if (folder && fs.existsSync(folder) && path.resolve(folder) !== path.resolve(storage.getAppDataDir())) {
    await storage.copyData(folder, storage.getAppDataDir());
  }
}

/** Désactive la synchronisation sur ce poste (les données restent sur le poste). */
export async function disable() {
  if (status.mode === 'folder') await leaveFolder();
  await disableGist();
  await storage.writeSettings({ sync: { mode: 'off', folder: '', gistId: '', salt: '', key: '', login: '' } });
  setStatus({ mode: 'off', folder: '', state: 'idle', error: null, login: null, lastSync: null });
  dataChanged();
  return status;
}

/* -- Déclencheurs ----------------------------------------------------- */

/** Une donnée a été enregistrée sur ce poste : envoi différé. */
export function notifyLocalChange() {
  if (status.mode !== 'gist') return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => syncNow(), PUSH_DELAY);
}

export function notifyFocus() {
  if (status.mode === 'folder') { dataChanged(); return; }
  if (status.mode !== 'gist' || Date.now() - lastFocusSync < FOCUS_INTERVAL) return;
  lastFocusSync = Date.now();
  syncNow();
}

function startPeriodic() {
  stopPeriodic();
  periodicTimer = setInterval(() => syncNow(), PERIODIC_INTERVAL);
}

function stopPeriodic() {
  clearInterval(periodicTimer);
  periodicTimer = null;
}

/** Envoie immédiatement les modifications en attente (fermeture de l'application). */
export async function flush() {
  if (status.mode !== 'gist' || !pushTimer) return;
  clearTimeout(pushTimer);
  pushTimer = null;
  await syncNow().catch(() => {});
}

/** Synchronisation complète ; les appels successifs sont exécutés l'un après l'autre. */
export function syncNow() {
  running = running.then(runSync, runSync);
  return running.then(() => status);
}

/* -- Synchronisation par Gist ---------------------------------------- */

async function runSync() {
  pushTimer = null;
  const settings = await storage.readSettings();
  const sync = settings.sync;
  if (sync.mode !== 'gist' || !sync.gistId) return;
  setStatus({ state: 'syncing', error: null });
  try {
    const changedLocally = await gistSync(sync);
    setStatus({ state: 'ok', lastSync: new Date().toISOString(), error: null });
    if (changedLocally) dataChanged();
  } catch (error) {
    setStatus({ state: 'error', error: error?.code === 'BAD_KEY' ? error.message : gistError(error) });
  }
}

async function gistSync(sync) {
  const token = await requireToken();
  const key = await reveal(sync.key);
  const saved = (await storage.readSyncState()) || {};
  const synced = saved.gistId === sync.gistId ? saved.items || {} : {};

  // Données locales.
  const { items: localItems, pristine } = await storage.readSyncItems();
  const local = Object.fromEntries(Object.entries(localItems).map(([itemKey, value]) => [itemKey, hashValue(value)]));

  // Données distantes : déchiffrées seulement si le Gist a changé depuis la dernière synchronisation.
  const gist = await request(token, 'GET', `/gists/${sync.gistId}`).catch(error => {
    if (error?.status === 404) throw new Error('Gist de synchronisation introuvable (supprimé ?) : désactiver puis réactiver la synchronisation.');
    throw error;
  });
  const version = gist.history?.[0]?.version || null;
  const remoteValues = {};
  let remote;
  if (version && version === saved.version && saved.gistId === sync.gistId) {
    remote = { ...synced };
  } else {
    remote = {};
    for (const [name, file] of Object.entries(gist.files || {})) {
      if (name === MANIFEST || !name.endsWith('.enc')) continue;
      const entry = open(key, await fileContent(token, file));
      if (!entry?.value || !(entry.key === 'base' || /^cv:[\w-]+$/.test(entry.key))) continue;
      remoteValues[entry.key] = entry.value;
      remote[entry.key] = hashValue(entry.value);
    }
  }

  const plan = planSync({ local, remote, synced, pristine });
  const files = {};
  const merged = { ...remote };
  let changedLocally = false;

  for (const [itemKey, action] of Object.entries(plan)) {
    if (action === 'push') {
      files[fileNameFor(key, itemKey)] = { content: seal(key, { key: itemKey, value: localItems[itemKey] }) };
      merged[itemKey] = local[itemKey];
    } else if (action === 'delete-remote') {
      files[fileNameFor(key, itemKey)] = null;
      delete merged[itemKey];
    } else if (action === 'pull') {
      await storage.writeSyncItem(itemKey, remoteValues[itemKey]);
      changedLocally = true;
    } else if (action === 'delete-local') {
      await storage.writeSyncItem(itemKey, null);
      changedLocally = true;
    } else if (action === 'conflict') {
      changedLocally = true;
      if (itemKey === 'base') {
        if (await keepLocalBase(localItems.base, remoteValues.base)) {
          files[fileNameFor(key, itemKey)] = { content: seal(key, { key: itemKey, value: localItems.base }) };
          merged.base = local.base;
        } else {
          await storage.writeSyncItem('base', remoteValues.base);
        }
      } else {
        // CV modifié sur deux postes : la version distante garde sa place, la version
        // de ce poste est conservée à côté, sous un nouveau nom. Rien n'est écrasé.
        await storage.writeSyncItem(itemKey, remoteValues[itemKey]);
        const copy = conflictCopy(localItems[itemKey]);
        const copyKey = `cv:${copy.id}`;
        await storage.writeSyncItem(copyKey, copy);
        files[fileNameFor(key, copyKey)] = { content: seal(key, { key: copyKey, value: copy }) };
        merged[copyKey] = hashValue(copy);
      }
    }
  }

  let newVersion = version;
  if (Object.keys(files).length) {
    const updated = await request(token, 'PATCH', `/gists/${sync.gistId}`, { body: { files } });
    newVersion = updated?.history?.[0]?.version || null;
  }
  await storage.writeSyncState({ gistId: sync.gistId, version: newVersion, items: merged });
  return changedLocally;
}

function conflictCopy(cv) {
  const suffix = Date.now().toString(36);
  return {
    ...cv,
    id: `${String(cv.id).replace(/[^\w-]/g, '')}-${suffix}`,
    name: `${cv.name || 'CV'} (copie de ${os.hostname()})`,
    releases: [],
  };
}

async function keepLocalBase(localBase, remoteBase) {
  const when = value => (value?.savedAt ? new Date(value.savedAt).toLocaleString('fr-FR') : 'date inconnue');
  const choice = await showDialog('showMessageBox', {
    type: 'question',
    buttons: ['Garder la version de ce poste', 'Garder la version de l’autre poste'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
    title: 'CV de référence modifié sur deux postes',
    message: 'Le CV de référence a été modifié sur ce poste et sur un autre depuis la dernière synchronisation.',
    detail: `Ce poste : version ${localBase?.revision || '?'}, enregistrée le ${when(localBase)}.\nAutre poste : version ${remoteBase?.revision || '?'}, enregistrée le ${when(remoteBase)}.\n\nLa version écartée est enregistrée dans le dossier de l’application (base-ecartee-….json).`,
  });
  const keepLocal = choice.response === 0;
  const discarded = keepLocal ? remoteBase : localBase;
  const file = path.join(storage.getAppDataDir(), `base-ecartee-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.promises.writeFile(file, JSON.stringify(discarded, null, 2), 'utf8');
  return keepLocal;
}
