// Export des CV : fichier HTML autonome, PDF (moteur d'impression de Chromium)
// et ouverture dans le navigateur par défaut.

import { app, BrowserWindow, dialog, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

function safeFileName(name, extension) {
  const base = String(name || 'CV').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim() || 'CV';
  return `${base}.${extension}`;
}

async function writeTempHtml(html, name = 'apercu') {
  const dir = path.join(app.getPath('temp'), 'cv-studio');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, safeFileName(`${name}-${Date.now()}`, 'html'));
  await fs.writeFile(file, html, 'utf8');
  return file;
}

export async function exportHtml(parent, { html, name }) {
  const { canceled, filePath } = await dialog.showSaveDialog(parent, {
    title: 'Exporter le CV en HTML',
    defaultPath: path.join(app.getPath('documents'), safeFileName(name, 'html')),
    filters: [{ name: 'Page web', extensions: ['html'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  await fs.writeFile(filePath, html, 'utf8');
  return { canceled: false, filePath };
}

export async function exportPdf(parent, { html, name }) {
  const { canceled, filePath } = await dialog.showSaveDialog(parent, {
    title: 'Exporter le CV en PDF',
    defaultPath: path.join(app.getPath('documents'), safeFileName(name, 'pdf')),
    filters: [{ name: 'Document PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  await fs.writeFile(filePath, await renderPdfBuffer(html));
  return { canceled: false, filePath };
}

/** Produit le PDF d'une page HTML de CV avec le moteur d'impression de Chromium. */
export async function renderPdfBuffer(html) {
  const source = await writeTempHtml(html, 'export');
  const printer = new BrowserWindow({
    show: false,
    width: 1240,
    height: 1754,
    webPreferences: { sandbox: true, contextIsolation: true, javascript: true },
  });
  try {
    await printer.loadFile(source);
    // Laisse le temps aux images intégrées et aux polices de se décoder.
    await new Promise(resolve => setTimeout(resolve, 400));
    return await printer.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    printer.destroy();
    fs.rm(source, { force: true }).catch(() => {});
  }
}

export async function openInBrowser({ html, name }) {
  const file = await writeTempHtml(html, name);
  const error = await shell.openPath(file);
  if (error) throw new Error(error);
  return { filePath: file };
}

export async function exportJson(parent, { data, name }) {
  const { canceled, filePath } = await dialog.showSaveDialog(parent, {
    title: 'Exporter le CV de référence',
    defaultPath: path.join(app.getPath('documents'), safeFileName(name, 'json')),
    filters: [{ name: 'Données JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  return { canceled: false, filePath };
}

export async function importJson(parent) {
  const { canceled, filePaths } = await dialog.showOpenDialog(parent, {
    title: 'Importer un CV de référence',
    properties: ['openFile'],
    filters: [{ name: 'Données JSON', extensions: ['json'] }],
  });
  if (canceled || !filePaths?.length) return { canceled: true };
  const data = JSON.parse(await fs.readFile(filePaths[0], 'utf8'));
  return { canceled: false, data };
}
