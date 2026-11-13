// Mises à jour automatiques à partir des releases GitHub du projet.
// Au lancement (si le paramètre est activé), la nouvelle version est téléchargée en
// arrière-plan puis installée à la fermeture de l'application, ou immédiatement
// sur demande.
//
// Le dépôt contient aussi les releases des CV (tags « cv-… »). electron-updater ne
// regarde que la release marquée « Latest » sur GitHub, et les releases de CV sont
// toujours créées avec make_latest = false (voir github.js) : elles sont donc ignorées.

import { app } from 'electron';
import updaterPackage from 'electron-updater';

const { autoUpdater } = updaterPackage;

let sendStatus = () => {};
let lastStatus = { state: 'idle' };
let configured = false;

/** Message d'erreur lisible : première ligne seulement, sans le détail HTTP. */
function shortMessage(error) {
  const text = String(error?.message || error || 'Erreur inconnue');
  if (/\b404\b/.test(text)) return 'aucune version publiée n’a été trouvée sur GitHub.';
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|net::ERR_/i.test(text)) return 'connexion à GitHub impossible.';
  const firstLine = text.split('\n')[0].trim();
  return firstLine.length > 160 ? `${firstLine.slice(0, 157)}…` : firstLine;
}

function emit(status) {
  lastStatus = { ...status, at: new Date().toISOString() };
  sendStatus(lastStatus);
}

function configure() {
  if (configured) return;
  configured = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => emit({ state: 'checking' }));
  autoUpdater.on('update-available', info => emit({ state: 'available', version: info.version }));
  autoUpdater.on('update-not-available', () => emit({ state: 'up-to-date' }));
  autoUpdater.on('download-progress', progress => emit({ state: 'downloading', percent: Math.round(progress.percent) }));
  autoUpdater.on('update-downloaded', info => emit({ state: 'downloaded', version: info.version }));
  autoUpdater.on('error', error => emit({ state: 'error', message: shortMessage(error) }));
}

export function initUpdater(send) {
  sendStatus = send;
}

export function getUpdateStatus() {
  return lastStatus;
}

export async function checkForUpdates() {
  if (!app.isPackaged) {
    emit({ state: 'unavailable', message: 'Les mises à jour ne concernent que la version installée de l’application.' });
    return lastStatus;
  }
  configure();
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    emit({ state: 'error', message: shortMessage(error) });
  }
  return lastStatus;
}

export function installUpdateNow() {
  if (lastStatus.state !== 'downloaded') return false;
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return true;
}
