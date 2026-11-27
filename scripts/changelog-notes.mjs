// Notes de version d'une release, tirées des deux journaux des modifications :
// `node scripts/changelog-notes.mjs <X.Y.Z> <fichier-de-sortie>`.
//
// Lit la section `## [X.Y.Z] - AAAA-MM-JJ` de CHANGELOG.md et de CHANGELOG.fr.md,
// jusqu'au titre `## [` suivant, puis écrit le texte anglais, un séparateur `---`
// et le texte français sous un titre `### Français`.
// Échoue (code 1) si la section manque ou est vide dans l'un des deux fichiers.
//
// Utilisé par le workflow de release (.github/workflows/release.yml) et par
// `npm run release` (scripts/release.mjs), qui vérifie les entrées avant de créer le tag.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const CHANGELOGS = [
  { file: 'CHANGELOG.md', language: 'English' },
  { file: 'CHANGELOG.fr.md', language: 'Français' },
];

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Renvoie le contenu de la section `## [version] - AAAA-MM-JJ`, sans son titre ni
 * les lignes vides autour, ou `null` si la section n'existe pas. Une section sans
 * contenu renvoie une chaîne vide. Les définitions de liens Markdown en fin de
 * fichier (`[0.5.0]: https://…`) ne font pas partie de la dernière section.
 */
export function extractSection(markdown, version) {
  const lines = markdown.split(/\r?\n/);
  const heading = new RegExp(`^## \\[${escapeRegExp(version)}\\] - \\d{4}-\\d{2}-\\d{2}\\s*$`);
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return null;

  let end = lines.findIndex((line, index) => index > start && line.startsWith('## ['));
  if (end === -1) {
    end = lines.length;
    while (end > start + 1 && /^\s*(\[[^\]]+\]:\s*\S+.*)?$/.test(lines[end - 1])) end--;
  }
  return lines
    .slice(start + 1, end)
    .join('\n')
    .trim();
}

/** Vrai si le fichier a un titre `## [version]` mal daté (pour un message d'erreur précis). */
function hasUndatedHeading(markdown, version) {
  return new RegExp(`^## \\[${escapeRegExp(version)}\\]`, 'm').test(markdown);
}

/**
 * Construit les notes de version à partir des deux journaux. Lève une erreur au
 * message explicite si une section manque ou est vide.
 */
export function buildReleaseNotes(version, { root = defaultRoot } = {}) {
  const sections = CHANGELOGS.map(({ file }) => {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) throw new Error(`${file} est introuvable.`);
    const markdown = fs.readFileSync(filePath, 'utf8');
    const section = extractSection(markdown, version);
    if (section === null) {
      throw new Error(
        hasUndatedHeading(markdown, version)
          ? `${file} : le titre de la version ${version} doit être « ## [${version}] - AAAA-MM-JJ ».`
          : `${file} : section « ## [${version}] - AAAA-MM-JJ » absente. Déplacer les entrées de [Unreleased] vers cette version.`,
      );
    }
    if (!section) throw new Error(`${file} : la section de la version ${version} est vide.`);
    return section;
  });
  const [english, french] = sections;
  return `${english}\n\n---\n\n### Français\n\n${french}\n`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [version, output] = process.argv.slice(2);
  if (!version || !output) {
    console.error('Usage : node scripts/changelog-notes.mjs <X.Y.Z> <fichier-de-sortie>');
    process.exit(1);
  }
  try {
    fs.writeFileSync(output, buildReleaseNotes(version));
    console.log(`Notes de la version ${version} écrites dans ${output}.`);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
}
