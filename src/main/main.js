// Processus principal de CV Studio.

import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as storage from './storage.js';
import * as exporter from './exporter.js';
import * as github from './github.js';
import * as shortcuts from './shortcuts.js';
import * as sync from './sync.js';
import { describeDisplays, initialWindowState, MIN_HEIGHT, MIN_WIDTH } from './window-bounds.js';
import { checkForUpdates, getUpdateStatus, initUpdater, installUpdateNow } from './updater.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// Dossier de données alternatif (tests, captures automatiques).
if (process.env.CV_STUDIO_USER_DATA) app.setPath('userData', process.env.CV_STUDIO_USER_DATA);

app.setAppUserModelId('fr.wolfgangproxa.cvstudio');

/** @type {BrowserWindow | null} */
let mainWindow = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(start);
}

app.on('window-all-closed', () => app.quit());

// Modifications pas encore envoyées à la synchronisation : envoi avant de quitter.
let flushedBeforeQuit = false;
app.on('before-quit', event => {
  if (flushedBeforeQuit) return;
  event.preventDefault();
  flushedBeforeQuit = true;
  Promise.race([sync.flush(), new Promise(resolve => setTimeout(resolve, 8000))]).finally(() => app.quit());
});

async function start() {
  Menu.setApplicationMenu(null);
  registerIpc();
  initUpdater(status => mainWindow?.webContents.send('update:status', status));
  const settings = await storage.readSettings();
  await sync.init(() => mainWindow);
  await createWindow(settings);
  sync.syncNow();
  if (settings.autoUpdate) checkForUpdates();
}

async function createWindow(settings) {
  const state = initialWindowState(settings.window);
  mainWindow = new BrowserWindow({
    ...state.bounds,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    title: 'CV Studio',
    backgroundColor: '#eef2f7',
    icon: path.join(here, '..', 'renderer', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(here, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (state.maximize) mainWindow.maximize();
    mainWindow.show();
  });

  // Les liens externes (CV, GitHub…) s'ouvrent dans le navigateur par défaut.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  // Modifications non enregistrées : l'interface bloque la fermeture (beforeunload),
  // une confirmation est alors demandée.
  mainWindow.webContents.on('will-prevent-unload', event => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Quitter sans enregistrer', 'Annuler'],
      defaultId: 1,
      cancelId: 1,
      title: 'Modifications non enregistrées',
      message: 'Le CV de référence contient des modifications non enregistrées.',
      detail: 'Elles seront perdues si l’application est fermée maintenant.',
    });
    if (choice === 0) event.preventDefault();
  });

  mainWindow.on('focus', () => sync.notifyFocus());
  mainWindow.on('closed', () => { mainWindow = null; });

  await mainWindow.loadFile(path.join(here, '..', 'renderer', 'index.html'));

  if (!app.isPackaged && process.env.CV_STUDIO_SCREENSHOT) captureAndQuit(process.env.CV_STUDIO_SCREENSHOT);
}

/**
 * Capture d'écran automatique de l'interface (version de développement uniquement).
 * CV_STUDIO_SCRIPT contient des étapes séparées par « ;; » : du JavaScript exécuté dans
 * l'interface, « wait:<ms> », ou « frame:<js> » exécuté dans l'aperçu du CV.
 */
async function captureAndQuit(target) {
  const steps = (process.env.CV_STUDIO_SCRIPT || '').split(';;').filter(Boolean);
  await new Promise(resolve => setTimeout(resolve, 1500));
  for (const step of steps) {
    if (step.startsWith('wait:')) {
      await new Promise(resolve => setTimeout(resolve, Number(step.slice(5))));
    } else if (step.startsWith('frame:')) {
      // Exécution dans le cadre d'aperçu du CV (iframe isolée).
      const frame = mainWindow.webContents.mainFrame.frames[0];
      await frame?.executeJavaScript(step.slice(6)).catch(error => console.error('Étape en échec :', error.message));
    } else {
      await mainWindow.webContents.executeJavaScript(step).catch(error => console.error('Étape en échec :', error.message));
    }
  }
  await new Promise(resolve => setTimeout(resolve, 900));
  const image = await mainWindow.webContents.capturePage();
  await fs.writeFile(target, image.toPNG());
  app.exit(0);
}

function registerIpc() {
  const handle = (channel, fn) => ipcMain.handle(channel, (_event, ...args) => fn(...args));

  handle('app:info', () => ({
    version: app.getVersion(),
    name: app.getName(),
    packaged: app.isPackaged,
    dataDir: storage.getDataDir(),
  }));
  handle('template:get', () => storage.readTemplate());

  handle('base:get', () => storage.readBase());
  // Chaque enregistrement est signalé à la synchronisation (envoi différé de quelques secondes).
  const changed = fn => async (...args) => {
    const result = await fn(...args);
    sync.notifyLocalChange();
    return result;
  };
  handle('base:save', changed(cv => storage.writeBase(cv)));
  handle('base:bundled', () => storage.readBundledBase());
  handle('base:export-json', payload => exporter.exportJson(mainWindow, payload));
  handle('base:import-json', () => exporter.importJson(mainWindow));

  handle('cvs:list', () => storage.listCvs());
  handle('cvs:save', changed(cv => storage.writeCv(cv)));
  handle('cvs:delete', changed(id => storage.deleteCv(id)));

  handle('export:html', payload => exporter.exportHtml(mainWindow, payload));
  handle('export:pdf', payload => exporter.exportPdf(mainWindow, payload));
  handle('export:browser', payload => exporter.openInBrowser(payload));
  handle('data:open-folder', () => shell.openPath(storage.getDataDir()));

  // Le jeton GitHub reste dans le processus principal : il est retiré des paramètres
  // envoyés à l'interface, et l'interface ne peut pas le modifier par ce biais.
  // Même chose pour la clé de synchronisation, et les réglages de synchronisation ne
  // changent que par les commandes « sync:… » ci-dessous.
  const publicSettings = ({ github: { token, ...githubRest } = {}, sync: { key, salt, ...syncRest } = {}, ...rest }) => ({ ...rest, github: githubRest, sync: syncRest });
  handle('settings:get', async () => publicSettings(await storage.readSettings()));
  handle('settings:save', async partial => {
    const { token, ...githubRest } = partial?.github || {};
    const { sync: _ignored, ...withoutSync } = partial || {};
    const safe = partial?.github ? { ...withoutSync, github: githubRest } : withoutSync;
    return publicSettings(await storage.writeSettings(safe));
  });
  handle('window:displays', () => describeDisplays());
  handle('window:bounds', () => (mainWindow ? mainWindow.getNormalBounds() : null));

  handle('github:status', () => github.status());
  handle('github:save-token', token => github.saveToken(token));
  handle('github:releases', () => github.listReleases());
  handle('github:publish', payload => github.publishRelease(payload, {
    makePdf: exporter.renderPdfBuffer,
    onProgress: progress => mainWindow?.webContents.send('github:progress', progress),
  }));
  handle('github:delete-release', release => github.deleteRelease(release));
  handle('github:open', url => {
    if (/^https:\/\/github\.com\//.test(String(url))) return shell.openExternal(url);
    return false;
  });

  handle('sync:status', () => sync.getStatus());
  handle('sync:choose-folder', () => sync.chooseFolder());
  handle('sync:enable-gist', passphrase => sync.enableGist(String(passphrase || '')));
  handle('sync:disable', () => sync.disable());
  handle('sync:now', () => sync.syncNow());

  handle('shortcuts:status', () => shortcuts.status());
  handle('shortcuts:create', (id, options) => shortcuts.create(String(id), { confirmReplace: options?.confirmReplace === true }));
  handle('shortcuts:remove', id => shortcuts.remove(String(id)));
  handle('shortcuts:reveal', id => shortcuts.reveal(String(id)));

  handle('update:check', () => checkForUpdates());
  handle('update:status', () => getUpdateStatus());
  handle('update:install', () => installUpdateNow());
}
