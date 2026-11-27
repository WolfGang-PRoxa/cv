// Prépare la publication d'une version de l'application : `npm run release`.
//
// Le script ne construit ni ne publie rien : il vérifie que tout est prêt, puis crée
// et envoie le tag `vX.Y.Z`. Le workflow GitHub Actions « Release »
// (.github/workflows/release.yml) construit alors l'installeur et publie la release.
//
// 1. Vérifie la version (`X.Y.Z` dans package.json) et le dépôt local : branche main,
//    aucune modification, ni retard ni avance sur GitHub.
// 2. Vérifie l'entrée `## [X.Y.Z] - AAAA-MM-JJ` dans CHANGELOG.md et CHANGELOG.fr.md.
// 3. Vérifie que le tag `vX.Y.Z` n'existe ni en local ni sur GitHub.
// 4. Lance `npm run check` et `npm test`.
// 5. Crée le tag annoté `vX.Y.Z`, l'envoie sur GitHub et affiche le lien vers le workflow.
//
// Aucun jeton GitHub ni GitHub CLI n'est nécessaire : seul `git push` est utilisé.
// `npm run dist` reste disponible pour construire un installeur de test sur le PC.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildReleaseNotes } from './changelog-notes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const tag = `v${version}`;
const { owner, repo } = pkg.build.publish[0];
const actionsUrl = `https://github.com/${owner}/${repo}/actions/workflows/release.yml`;

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function step(message) {
  console.log(`\n▸ ${message}`);
}

/** Exécute une commande. `capture` : renvoie la sortie au lieu de l'afficher. */
function run(command, args, { capture = false, allowFailure = false, shell = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) fail(`Impossible de lancer « ${command} » : ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    fail(`« ${command} ${args.join(' ')} » a échoué.${capture && result.stderr ? `\n${result.stderr.trim()}` : ''}`);
  }
  return { ok: result.status === 0, out: (result.stdout || '').trim(), err: (result.stderr || '').trim() };
}

/** Lance un script npm. Sous `npm run`, npm est relancé avec Node ; sinon via le shell (npm.cmd sous Windows). */
function npm(...args) {
  const npmCli = process.env.npm_execpath;
  if (npmCli && /\.c?js$/.test(npmCli)) return run(process.execPath, [npmCli, ...args]);
  return run('npm', args, { shell: process.platform === 'win32' });
}

console.log(`CV Studio ${version} → ${owner}/${repo} (${tag})`);

/* 1. Version et dépôt local -------------------------------------------- */
step('Vérification de la version et du dépôt local');
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  fail(`Version « ${version} » invalide dans package.json : format attendu X.Y.Z (par exemple 1.2.0).`);
}

const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { capture: true }).out;
if (branch !== 'main') fail(`Branche actuelle : ${branch}. Publier depuis main : \`git checkout main\`.`);

const changes = run('git', ['status', '--porcelain'], { capture: true }).out;
if (changes) {
  fail(
    `Modifications locales non enregistrées :\n${changes}\n` +
      'Les annuler (`git checkout -- <fichier>`) ou les committer et les envoyer avant de publier.',
  );
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
console.log('  ✓ main, propre et à jour avec GitHub');

/* 2. Journaux des modifications ---------------------------------------- */
step('Vérification des journaux des modifications');
try {
  buildReleaseNotes(version, { root });
} catch (error) {
  fail(error.message);
}
console.log(`  ✓ entrée ${version} dans CHANGELOG.md et CHANGELOG.fr.md`);

/* 3. Tag ---------------------------------------------------------------- */
step(`Vérification du tag ${tag}`);
if (run('git', ['rev-parse', '--quiet', '--verify', `refs/tags/${tag}`], { capture: true, allowFailure: true }).ok) {
  fail(
    `Le tag ${tag} existe déjà en local. S'il ne correspond à aucune release, le supprimer : \`git tag -d ${tag}\`. ` +
      'Sinon, augmenter `version` dans package.json.',
  );
}
if (run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], { capture: true }).out) {
  fail(
    `Le tag ${tag} existe déjà sur GitHub : la version ${version} est déjà publiée ou en cours de publication ` +
      `(${actionsUrl}). Augmenter \`version\` dans package.json pour en publier une nouvelle.`,
  );
}
console.log(`  ✓ ${tag} n'existe ni en local ni sur GitHub`);

/* 4. Vérifications et tests -------------------------------------------- */
step('Vérifications (npm run check)');
npm('run', 'check');
step('Tests (npm test)');
npm('test');

/* 5. Tag et envoi -------------------------------------------------------- */
step(`Création et envoi du tag ${tag}`);
run('git', ['tag', '-a', tag, '-m', `CV Studio ${version}`]);
const push = run('git', ['push', 'origin', tag], { allowFailure: true });
if (!push.ok) {
  run('git', ['tag', '-d', tag], { capture: true, allowFailure: true });
  fail(`L'envoi du tag ${tag} a échoué : le tag local a été supprimé. Corriger le problème, puis relancer.`);
}

console.log(`\n✓ Tag ${tag} envoyé. GitHub Actions construit et publie la release :\n  ${actionsUrl}`);
