// Publie une version de l'application : `npm run release`.
//
// 1. Vérifie le dépôt local : branche main, aucune modification, à jour avec GitHub.
//    Une version déjà publiée (release complète) est refusée : augmenter d'abord
//    `version` dans package.json.
// 2. Construit l'installeur avec electron-builder, sans le publier.
// 3. Publie avec la GitHub CLI : la release est créée en brouillon, les trois fichiers
//    y sont envoyés, puis elle est publiée et marquée « Latest ». Les mises à jour
//    automatiques ne voient donc jamais une release incomplète.
// 4. Relit la release sur GitHub et vérifie la présence et la taille de chaque fichier.
//
// Si une release existe déjà mais qu'il lui manque des fichiers, le script la répare :
// il reconstruit et renvoie les trois fichiers (ils doivent venir de la même construction,
// latest.yml contenant l'empreinte de l'installeur).
//
// Prérequis : GitHub CLI connectée (`gh auth login`).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const tag = `v${version}`;
const { owner, repo } = pkg.build.publish[0];
const repoSlug = `${owner}/${repo}`;
const dist = path.join(root, 'dist');
const files = [
  `CV-Studio-Setup-${version}.exe`,
  `CV-Studio-Setup-${version}.exe.blockmap`,
  'latest.yml',
];

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function step(message) {
  console.log(`\n▸ ${message}`);
}

/** Exécute une commande. `capture` : renvoie la sortie au lieu de l'afficher. */
function run(command, args, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) fail(`Impossible de lancer « ${command} » : ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    fail(`« ${command} ${args.join(' ')} » a échoué.${capture && result.stderr ? `\n${result.stderr.trim()}` : ''}`);
  }
  return { ok: result.status === 0, out: (result.stdout || '').trim(), err: (result.stderr || '').trim() };
}

console.log(`CV Studio ${version} → ${repoSlug} (${tag})`);

/* 1. Vérifications ------------------------------------------------------ */
step('Vérification du dépôt local');
if (!run('gh', ['auth', 'status'], { capture: true, allowFailure: true }).ok) {
  fail('GitHub CLI n’est pas connectée : lancer `gh auth login`.');
}
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { capture: true }).out;
if (branch !== 'main') fail(`Branche actuelle : ${branch}. Publier depuis main : \`git checkout main\`.`);

const changes = run('git', ['status', '--porcelain'], { capture: true }).out;
if (changes) {
  fail(`Modifications locales non enregistrées :\n${changes}\n`
    + 'Les annuler (`git checkout -- <fichier>`) ou les committer avant de publier.');
}

run('git', ['fetch', 'origin', 'main', '--quiet']);
const head = run('git', ['rev-parse', 'HEAD'], { capture: true }).out;
const remoteHead = run('git', ['rev-parse', 'origin/main'], { capture: true }).out;
if (head !== remoteHead) {
  const behind = run('git', ['rev-list', '--count', 'HEAD..origin/main'], { capture: true }).out;
  const ahead = run('git', ['rev-list', '--count', 'origin/main..HEAD'], { capture: true }).out;
  if (Number(behind)) fail(`main a ${behind} commit(s) de retard sur GitHub : lancer \`git pull\`, puis relancer.`);
  if (Number(ahead)) fail(`main a ${ahead} commit(s) non envoyé(s) sur GitHub : lancer \`git push\`, puis relancer.`);
}

const existing = run('gh', ['release', 'view', tag, '--repo', repoSlug, '--json', 'assets,isDraft'], { capture: true, allowFailure: true });
let repair = false;
if (existing.ok) {
  const names = JSON.parse(existing.out).assets.map(asset => asset.name);
  const missing = files.filter(name => !names.includes(name));
  if (!missing.length) {
    fail(`La version ${version} est déjà publiée et complète. Augmenter \`version\` dans package.json pour en publier une nouvelle.`);
  }
  repair = true;
  console.log(`La release ${tag} existe mais il lui manque : ${missing.join(', ')}. Elle va être réparée.`);
}

/* 2. Construction ------------------------------------------------------- */
step('Construction de l’installeur');
for (const name of files) fs.rmSync(path.join(dist, name), { force: true });
const require = createRequire(import.meta.url);
run(process.execPath, [require.resolve('electron-builder/cli.js'), '--win', '--publish', 'never']);

const paths = files.map(name => path.join(dist, name));
for (const file of paths) {
  if (!fs.existsSync(file)) fail(`Fichier attendu absent après la construction : ${path.relative(root, file)}`);
}
if (!fs.readFileSync(path.join(dist, 'latest.yml'), 'utf8').includes(`version: ${version}`)) {
  fail(`dist/latest.yml ne correspond pas à la version ${version}.`);
}

/* 3. Publication -------------------------------------------------------- */
if (repair) {
  step(`Envoi des fichiers dans la release existante ${tag}`);
  run('gh', ['release', 'upload', tag, ...paths, '--repo', repoSlug, '--clobber']);
  run('gh', ['release', 'edit', tag, '--repo', repoSlug, '--draft=false', '--latest']);
} else {
  step(`Création de la release ${tag}`);
  run('gh', ['release', 'create', tag, ...paths,
    '--repo', repoSlug,
    '--target', head,
    '--title', version,
    '--generate-notes',
    '--latest']);
}

/* 4. Vérification ------------------------------------------------------- */
step('Vérification de la release sur GitHub');
const published = JSON.parse(run('gh', ['release', 'view', tag, '--repo', repoSlug, '--json', 'assets,isDraft,url'], { capture: true }).out);
const problems = [];
if (published.isDraft) problems.push('la release est encore un brouillon');
for (const [index, name] of files.entries()) {
  const asset = published.assets.find(item => item.name === name);
  const size = fs.statSync(paths[index]).size;
  if (!asset) problems.push(`${name} absent`);
  else if (asset.size !== size) problems.push(`${name} incomplet (${asset.size} octets sur ${size})`);
  else console.log(`  ✓ ${name}`);
}
if (problems.length) {
  fail(`Release incomplète : ${problems.join(', ')}.\nRelancer \`npm run release\` : la release sera réparée.`);
}
console.log(`\n✓ Version ${version} publiée : ${published.url}`);
