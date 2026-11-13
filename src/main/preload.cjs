// Pont sécurisé entre l'interface (renderer) et le processus principal.
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('studio', {
  getAppInfo: () => invoke('app:info'),
  getTemplate: () => invoke('template:get'),

  getBase: () => invoke('base:get'),
  saveBase: cv => invoke('base:save', cv),
  getBundledBase: () => invoke('base:bundled'),
  exportBaseJson: (data, name) => invoke('base:export-json', { data, name }),
  importBaseJson: () => invoke('base:import-json'),

  listCvs: () => invoke('cvs:list'),
  saveCv: cv => invoke('cvs:save', cv),
  deleteCv: id => invoke('cvs:delete', id),

  exportHtml: (html, name) => invoke('export:html', { html, name }),
  exportPdf: (html, name) => invoke('export:pdf', { html, name }),
  openInBrowser: (html, name) => invoke('export:browser', { html, name }),
  openDataFolder: () => invoke('data:open-folder'),

  getSettings: () => invoke('settings:get'),
  saveSettings: partial => invoke('settings:save', partial),
  getDisplays: () => invoke('window:displays'),
  getWindowBounds: () => invoke('window:bounds'),

  github: {
    status: () => invoke('github:status'),
    saveToken: token => invoke('github:save-token', token),
    releases: () => invoke('github:releases'),
    publish: payload => invoke('github:publish', payload),
    deleteRelease: release => invoke('github:delete-release', release),
    open: url => invoke('github:open', url),
    onProgress: callback => {
      const listener = (_event, progress) => callback(progress);
      ipcRenderer.on('github:progress', listener);
      return () => ipcRenderer.removeListener('github:progress', listener);
    },
  },

  sync: {
    status: () => invoke('sync:status'),
    chooseFolder: () => invoke('sync:choose-folder'),
    enableGist: passphrase => invoke('sync:enable-gist', passphrase),
    disable: () => invoke('sync:disable'),
    now: () => invoke('sync:now'),
    onStatus: callback => {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on('sync:status', listener);
      return () => ipcRenderer.removeListener('sync:status', listener);
    },
    onDataChanged: callback => {
      const listener = () => callback();
      ipcRenderer.on('sync:data-changed', listener);
      return () => ipcRenderer.removeListener('sync:data-changed', listener);
    },
  },

  shortcuts: {
    status: () => invoke('shortcuts:status'),
    create: (id, options) => invoke('shortcuts:create', id, options),
    remove: id => invoke('shortcuts:remove', id),
    reveal: id => invoke('shortcuts:reveal', id),
  },

  checkForUpdates: () => invoke('update:check'),
  getUpdateStatus: () => invoke('update:status'),
  installUpdate: () => invoke('update:install'),
  onUpdateStatus: callback => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
});
