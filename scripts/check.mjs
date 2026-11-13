// Vérifications rapides sans lancer l'application :
// - syntaxe de tous les fichiers JavaScript ;
// - identifiants uniques dans le CV de référence livré ;
// - rendu du CV de référence et de chaque type de bloc ou de composant ;
// - masquage d'éléments.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

/* Syntaxe */
const jsFiles = [];
const walk = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(c?m?js)$/.test(entry.name)) jsFiles.push(full);
  }
};
walk(path.join(root, 'src'));
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failures.push(`Syntaxe : ${path.relative(root, file)}\n${error.stderr}`);
  }
}

/* Données et rendu */
const cvDir = path.join(root, 'src', 'shared', 'cv');
const load = file => import(pathToFileURL(path.join(cvDir, file)).href);
const { renderCvHtml } = await load('render.js');
const { BLOCK_TYPES, COMPONENT_TYPES, buildTree, indexTree } = await load('schema.js');

const base = JSON.parse(fs.readFileSync(path.join(cvDir, 'sample-cv.json'), 'utf8'));
const css = fs.readFileSync(path.join(cvDir, 'template', 'cv.css'), 'utf8');
const runtime = fs.readFileSync(path.join(cvDir, 'template', 'cv-runtime.js'), 'utf8');

const ids = [];
const collect = node => {
  if (Array.isArray(node)) return node.forEach(collect);
  if (!node || typeof node !== 'object') return;
  if (typeof node.id === 'string') ids.push(node.id);
  Object.values(node).forEach(collect);
};
collect(base);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
check(!duplicates.length, `Identifiants en double : ${[...new Set(duplicates)].join(', ')}`);

const html = renderCvHtml(base, { css, runtime });
check(html.includes('Camille<br>Martin'), 'Le nom n’apparaît pas dans le rendu.');
check(html.includes('id="detail-modal"'), 'La fenêtre détaillée est absente du rendu.');
check(!html.includes('undefined'), 'Le rendu contient « undefined ».');

const tree = indexTree(buildTree(base));
check(tree.size > 50, `Arbre des éléments incomplet (${tree.size} nœuds).`);

const hidden = renderCvHtml(base, { css, runtime, hidden: ['blk-pix', 'item-vendanges', 'detail-github'] });
check(!hidden.includes('Certification numérique'), 'Le bloc masqué apparaît encore.');
check(!hidden.includes('Vendanges'), 'L’entrée masquée apparaît encore.');
check(!hidden.includes('data-detail="blk-github"'), 'La fenêtre détaillée masquée est encore active.');

/* Chaque type de bloc et de composant, avec ses valeurs par défaut */
const blocks = Object.values(BLOCK_TYPES).map(def => def.create());
for (const block of blocks) {
  if (block.detail) {
    block.detail.enabled = true;
    block.detail.components = Object.values(COMPONENT_TYPES).filter(def => def.contexts.includes('detail')).map(def => def.create());
  }
  if (block.components) block.components = Object.values(COMPONENT_TYPES).filter(def => def.contexts.includes('summary')).map(def => def.create());
}
const sample = { ...base, zones: { top: blocks, main: blocks, side: blocks } };
const sampleHtml = renderCvHtml(sample, { css, runtime, preview: { instant: true } });
check(!sampleHtml.includes('undefined'), 'Le rendu des blocs par défaut contient « undefined ».');

/* Tags des releases de CV : jamais confondus avec une version de l'application */
const tags = await import(pathToFileURL(path.join(root, 'src', 'shared', 'github-tags.js')).href);
check(tags.suggestTag('Développeur web — Alternance').tag === 'cv-developpeur-web-alternance-v1', 'Tag proposé inattendu.');
check(tags.suggestTag('CV', ['cv-cv-v1']).tag !== 'cv-cv-v1', 'Le tag proposé est déjà pris.');
check(tags.suggestTag('X', ['cv-x-v1', 'cv-x-v2']).tag === 'cv-x-v3', 'Numérotation des tags incorrecte.');
check(tags.validateCvTag('v0.2.0') && tags.validateCvTag('cv/a') && !tags.validateCvTag('cv-dev-v1'), 'Validation des tags incorrecte.');

/* Raccourcis Windows : détection d'un raccourci existant */
const sc = await import(pathToFileURL(path.join(root, 'src', 'main', 'shortcut-rules.js')).href);
const app = { target: 'C:\\Users\\r\\AppData\\Local\\Programs\\cv-studio\\CV Studio.exe', args: '' };
const dev = { target: 'C:\\cv\\node_modules\\electron\\dist\\electron.exe', args: '"C:\\cv"' };
const classify = (primary, extra = {}) => sc.classify({ primary, ...extra }, app);
check(classify(null) === 'missing', 'Raccourci absent mal détecté.');
check(classify(null, { others: ['Mon CV.lnk'] }) === 'other-name', 'Raccourci sous un autre nom non détecté.');
check(classify({ target: app.target.toUpperCase().replace(/\\/g, '/') }) === 'ok', 'Raccourci valide non reconnu (casse, séparateurs).');
check(classify({ target: 'D:\\Ancien\\CV Studio.exe' }) === 'outdated', 'Raccourci vers une ancienne copie non détecté.');
check(classify({ target: 'D:\\Ancien\\CV Studio.exe' }, { primaryTargetExists: false }) === 'broken', 'Raccourci cassé non détecté.');
check(classify({ target: 'C:\\Windows\\notepad.exe' }) === 'foreign', 'Raccourci vers un autre programme non détecté.');
check(classify({ error: 'illisible' }) === 'foreign', 'Fichier illisible non signalé.');
check(sc.classify({ primary: { target: dev.target, args: ' "c:\\cv\\" ' } }, dev) === 'ok', 'Raccourci de développement non reconnu.');
check(sc.classify({ primary: { target: dev.target, args: '"C:\\autre"' } }, dev) === 'outdated', 'Arguments différents non détectés.');
check(['missing', 'outdated', 'broken', 'foreign', 'ok'].map(sc.plannedAction).join() === 'create,repair,repair,replace,none', 'Actions prévues incorrectes.');
check(!sc.canRemove('foreign') && sc.canRemove('broken'), 'Règle de suppression incorrecte.');

/* Synchronisation : fusion à trois versions */
const { planSync } = await import(pathToFileURL(path.join(root, 'src', 'shared', 'sync-merge.js')).href);
const plan = planSync({
  local:  { same: 'a', mine: 'b2', theirs: 'c', both: 'd2', newHere: 'e', delHere: undefined, delThere: 'g', modDel: 'h2', delMod: undefined },
  remote: { same: 'a', mine: 'b', theirs: 'c2', both: 'd3', newThere: 'f', delHere: 'x', modDel: undefined, delMod: 'i2' },
  synced: { same: 'a', mine: 'b', theirs: 'c', both: 'd', delHere: 'x', delThere: 'g', modDel: 'h', delMod: 'i' },
});
const expected = { mine: 'push', theirs: 'pull', both: 'conflict', newHere: 'push', newThere: 'pull', delHere: 'delete-remote', delThere: 'delete-local', modDel: 'push', delMod: 'pull' };
check(JSON.stringify(Object.entries(plan).sort()) === JSON.stringify(Object.entries(expected).sort()), `Plan de synchronisation inattendu : ${JSON.stringify(plan)}`);
check(planSync({ local: { base: 'sample' }, remote: { base: 'real' }, pristine: ['base'] }).base === 'pull', 'La base d’exemple doit céder la place à la base synchronisée.');
check(planSync({ local: { base: 'mine' }, remote: { base: 'real' } }).base === 'conflict', 'Deux bases différentes au premier essai doivent être signalées.');

/* Synchronisation : chiffrement */
const sc2 = await import(pathToFileURL(path.join(root, 'src', 'main', 'sync-crypto.js')).href);
const kdf = { ...sc2.KDF, N: 2 ** 10 }; // paramètres allégés pour le test
const salt = sc2.newSalt();
const key = await sc2.deriveKey('mot de passe', salt, kdf);
const sealed = sc2.seal(key, { key: 'base', value: base });
check(!sealed.includes('Camille') && JSON.stringify(sc2.open(key, sealed).value) === JSON.stringify(base), 'Chiffrement ou déchiffrement incorrect.');
const wrongKey = await sc2.deriveKey('autre mot de passe', salt, kdf);
let refused = false;
try { sc2.open(wrongKey, sealed); } catch (error) { refused = error.code === 'BAD_KEY'; }
check(refused, 'Un mauvais mot de passe n’est pas détecté.');
check(sc2.fileNameFor(key, 'cv:abc') === sc2.fileNameFor(key, 'cv:abc') && sc2.fileNameFor(key, 'cv:abc') !== sc2.fileNameFor(wrongKey, 'cv:abc') && !sc2.fileNameFor(key, 'cv:abc').includes('abc'), 'Noms de fichiers distants incorrects.');

if (failures.length) {
  console.error(`✗ ${failures.length} problème(s) :\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`✓ ${jsFiles.length} fichiers JavaScript, ${ids.length} identifiants, ${tree.size} éléments, rendu OK.`);
