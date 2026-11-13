// Publication des CV en releases GitHub.
//
// Les CV sont publiés dans le même dépôt que l'application. Pour ne jamais perturber
// les mises à jour automatiques (qui lisent la release marquée « Latest ») :
// - les tags des CV commencent par « cv- » et ne ressemblent jamais à une version (vX.Y.Z) ;
// - chaque release de CV est créée avec make_latest = false, la release « Latest »
//   reste donc toujours celle de l'application.
//
// Connexion : jeton enregistré dans les paramètres (chiffré par Windows via safeStorage),
// sinon jeton de l'outil GitHub CLI (`gh auth token`) s'il est installé et connecté.
// Le jeton ne quitte jamais le processus principal.

import { app, net, safeStorage } from 'electron';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as storage from './storage.js';
import { CV_TAG_PREFIX, validateCvTag } from '../shared/github-tags.js';

export { CV_TAG_PREFIX };

const here = path.dirname(fileURLToPath(import.meta.url));
// Adresse de l'API remplaçable en développement seulement (tests sur un faux serveur).
const API = (!app.isPackaged && process.env.CV_STUDIO_GITHUB_API) || 'https://api.github.com';
/** Repère placé dans la description des releases pour les relier à un CV de l'application. */
const MARKER = /<!--\s*cv-studio\s+(\{.*?\})\s*-->/;

/* -- Dépôt ------------------------------------------------------------ */

let defaultRepoCache = null;

/** Dépôt de l'application, lu dans package.json (champ repository). */
export async function defaultRepo() {
  if (defaultRepoCache) return defaultRepoCache;
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(here, '..', '..', 'package.json'), 'utf8'));
    const url = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
    const match = /github\.com[/:]([^/]+)\/([^/.]+)/i.exec(url || '');
    defaultRepoCache = match ? `${match[1]}/${match[2]}` : '';
  } catch {
    defaultRepoCache = '';
  }
  return defaultRepoCache;
}

export function parseRepo(value) {
  const text = String(value || '').trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  const match = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/.exec(text);
  return match ? { owner: match[1], repo: match[2], full: `${match[1]}/${match[2]}` } : null;
}

async function targetRepo() {
  const settings = await storage.readSettings();
  const repo = parseRepo(settings.github?.repo || (await defaultRepo()));
  if (!repo) throw new Error('Dépôt GitHub invalide : indiquer « propriétaire/nom » dans les paramètres.');
  return repo;
}

/* -- Jeton ------------------------------------------------------------ */

function ghToken() {
  return new Promise(resolve => {
    execFile('gh', ['auth', 'token'], { timeout: 8000, windowsHide: true }, (error, stdout) => {
      const token = String(stdout || '').trim();
      resolve(!error && token ? token : null);
    });
  });
}

async function decryptStoredToken(settings) {
  const stored = settings.github?.token;
  if (!stored) return null;
  try {
    if (stored.startsWith('enc:')) return (await safeStorage.decryptStringAsync(Buffer.from(stored.slice(4), 'base64'))).result;
    if (stored.startsWith('raw:')) return Buffer.from(stored.slice(4), 'base64').toString('utf8');
  } catch {
    return null;
  }
  return null;
}

/** Jeton à utiliser et sa provenance : 'token' (paramètres) ou 'gh' (GitHub CLI). */
export async function resolveToken() {
  const settings = await storage.readSettings();
  const stored = await decryptStoredToken(settings);
  if (stored) return { token: stored, source: 'token' };
  const fromGh = await ghToken();
  if (fromGh) return { token: fromGh, source: 'gh' };
  return { token: null, source: null };
}

export async function saveToken(token) {
  const value = String(token || '').trim();
  let stored = '';
  if (value) {
    stored = (await safeStorage.isAsyncEncryptionAvailable())
      ? `enc:${(await safeStorage.encryptStringAsync(value)).toString('base64')}`
      : `raw:${Buffer.from(value, 'utf8').toString('base64')}`;
  }
  const settings = await storage.readSettings();
  await storage.writeSettings({ github: { ...settings.github, token: stored } });
  return status();
}

/* -- Requêtes --------------------------------------------------------- */

export async function request(token, method, url, { body, headers = {}, raw = false } = {}) {
  const response = await net.fetch(url.startsWith('http') ? url : `${API}${url}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': `CV-Studio/${app.getVersion()}`,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !raw ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  if (response.status === 204) return null;
  const text = await response.text();
  const data = text ? safeJson(text) : null;
  if (!response.ok) {
    const error = new Error(describeHttpError(response.status, data));
    error.status = response.status;
    throw error;
  }
  return data;
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return { message: text }; }
}

function describeHttpError(status, data) {
  const detail = data?.errors?.map(item => item.message || item.code).filter(Boolean).join(', ');
  if (status === 401) return 'jeton GitHub refusé (expiré ou invalide).';
  if (status === 403) return `accès refusé par GitHub${data?.message ? ` : ${data.message}` : ''}.`;
  if (status === 404) return 'dépôt introuvable, ou jeton sans accès à ce dépôt.';
  if (status === 422 && /already_exists/i.test(JSON.stringify(data?.errors || ''))) return 'une release porte déjà ce tag.';
  return `GitHub a répondu ${status}${data?.message ? ` : ${data.message}` : ''}${detail ? ` (${detail})` : ''}.`;
}

export function networkMessage(error) {
  if (error?.status) return error.message;
  return /net::|fetch failed|ENOTFOUND|ECONN|ETIMEDOUT/i.test(String(error?.message))
    ? 'connexion à GitHub impossible.'
    : String(error?.message || error);
}

/* -- État de la connexion --------------------------------------------- */

/**
 * État de la connexion pour l'interface (sans jamais renvoyer le jeton).
 * { repo, defaultRepo, hasToken, source, connected, login, canPush, error }
 */
export async function status() {
  const settings = await storage.readSettings();
  const fallbackRepo = await defaultRepo();
  const result = {
    repo: settings.github?.repo || fallbackRepo,
    defaultRepo: fallbackRepo,
    hasToken: Boolean(settings.github?.token),
    encrypted: String(settings.github?.token || '').startsWith('enc:'),
    source: null,
    connected: false,
    login: null,
    canPush: false,
    error: null,
  };
  const { token, source } = await resolveToken();
  result.source = source;
  if (!token) {
    result.error = 'aucun jeton : coller un jeton personnel, ou se connecter avec GitHub CLI (gh auth login).';
    return result;
  }
  try {
    const user = await request(token, 'GET', '/user');
    result.login = user?.login || null;
    const repo = parseRepo(result.repo);
    if (!repo) throw new Error('dépôt invalide : indiquer « propriétaire/nom ».');
    const info = await request(token, 'GET', `/repos/${repo.owner}/${repo.repo}`);
    result.canPush = Boolean(info?.permissions?.push || info?.permissions?.admin);
    result.connected = true;
    if (!result.canPush) result.error = `le compte ${result.login} n’a pas le droit de publier dans ${repo.full}.`;
  } catch (error) {
    result.error = networkMessage(error);
  }
  return result;
}

/* -- Releases des CV -------------------------------------------------- */

function toRelease(item) {
  let meta = null;
  const match = MARKER.exec(item.body || '');
  if (match) meta = safeJson(match[1]);
  return {
    id: item.id,
    tag: item.tag_name,
    name: item.name || item.tag_name,
    url: item.html_url,
    draft: item.draft,
    publishedAt: item.published_at || item.created_at,
    cvId: meta?.cvId || null,
    revision: meta?.revision ?? null,
    notes: (item.body || '').replace(MARKER, '').trim(),
    assets: (item.assets || []).map(asset => ({ name: asset.name, url: asset.browser_download_url, size: asset.size })),
  };
}

/** Releases de CV publiées dans le dépôt (les releases de l'application sont ignorées). */
export async function listReleases() {
  const { token } = await resolveToken();
  if (!token) throw new Error('aucun jeton GitHub configuré.');
  const repo = await targetRepo();
  const releases = [];
  for (let page = 1; page <= 10; page += 1) {
    const items = await request(token, 'GET', `/repos/${repo.owner}/${repo.repo}/releases?per_page=100&page=${page}`).catch(error => { throw new Error(networkMessage(error)); });
    releases.push(...items.filter(item => item.tag_name.startsWith(CV_TAG_PREFIX) && !item.draft).map(toRelease));
    if (items.length < 100) break;
  }
  return releases;
}

/**
 * Publie une release de CV.
 * payload : { cvId, revision, tag, name, notes, files: [{ name, kind: 'pdf' | 'html', html }] }
 * Le PDF est produit par `makePdf(html)` (moteur d'impression de Chromium).
 *
 * La release est d'abord créée en brouillon, les fichiers sont joints, puis elle est
 * publiée : en cas d'échec, le brouillon est supprimé et rien n'apparaît sur GitHub.
 */
export async function publishRelease(payload, { makePdf, onProgress = () => {} }) {
  const tagError = validateCvTag(payload.tag);
  if (tagError) throw new Error(tagError);
  if (!payload.files?.length) throw new Error('aucun fichier à publier.');

  const { token } = await resolveToken();
  if (!token) throw new Error('aucun jeton GitHub configuré (voir Paramètres › Publication sur GitHub).');
  const repo = await targetRepo();
  const base = `/repos/${repo.owner}/${repo.repo}`;

  // Tag déjà utilisé ?
  try {
    await request(token, 'GET', `${base}/releases/tags/${encodeURIComponent(payload.tag)}`);
    throw Object.assign(new Error('une release porte déjà ce tag : en choisir un autre.'), { status: 409 });
  } catch (error) {
    if (error.status !== 404) throw new Error(networkMessage(error));
  }

  // Fichiers préparés avant toute création sur GitHub.
  onProgress({ step: 'files' });
  const assets = [];
  for (const file of payload.files) {
    if (file.kind === 'pdf') assets.push({ name: file.name, type: 'application/pdf', data: await makePdf(file.html) });
    else assets.push({ name: file.name, type: 'text/html; charset=utf-8', data: Buffer.from(file.html, 'utf8') });
  }

  const marker = `<!-- cv-studio ${JSON.stringify({ cvId: payload.cvId, revision: payload.revision ?? null })} -->`;
  const body = `${String(payload.notes || '').trim()}\n\n${marker}`.trim();

  onProgress({ step: 'release' });
  let release;
  try {
    release = await request(token, 'POST', `${base}/releases`, {
      body: {
        tag_name: payload.tag,
        name: payload.name || payload.tag,
        body,
        draft: true,
        prerelease: false,
        make_latest: 'false',
      },
    });
  } catch (error) {
    throw new Error(networkMessage(error));
  }

  try {
    const uploadBase = release.upload_url.replace(/\{.*\}$/, '');
    for (const [index, asset] of assets.entries()) {
      onProgress({ step: 'upload', index, total: assets.length, name: asset.name });
      await request(token, 'POST', `${uploadBase}?name=${encodeURIComponent(asset.name)}`, {
        body: asset.data,
        raw: true,
        headers: { 'Content-Type': asset.type },
      });
    }
    onProgress({ step: 'publish' });
    const published = await request(token, 'PATCH', `${base}/releases/${release.id}`, {
      body: { draft: false, make_latest: 'false' },
    });
    return toRelease(published);
  } catch (error) {
    await request(token, 'DELETE', `${base}/releases/${release.id}`).catch(() => {});
    throw new Error(networkMessage(error));
  }
}

/** Supprime une release de CV, et son tag. */
export async function deleteRelease({ id, tag }) {
  if (!String(tag || '').startsWith(CV_TAG_PREFIX)) throw new Error('seules les releases de CV peuvent être supprimées ici.');
  const { token } = await resolveToken();
  if (!token) throw new Error('aucun jeton GitHub configuré.');
  const repo = await targetRepo();
  const base = `/repos/${repo.owner}/${repo.repo}`;
  try {
    await request(token, 'DELETE', `${base}/releases/${id}`);
    await request(token, 'DELETE', `${base}/git/refs/tags/${encodeURIComponent(tag)}`).catch(error => {
      if (error.status !== 404 && error.status !== 422) throw error;
    });
  } catch (error) {
    throw new Error(networkMessage(error));
  }
  return true;
}
