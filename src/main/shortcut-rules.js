// Règles des raccourcis Windows (Bureau, menu Démarrer), sans dépendance à Electron
// pour pouvoir être vérifiées par scripts/check.mjs.
//
// Un emplacement (dossier) est classé dans l'un de ces états :
//   missing     aucun raccourci vers l'application ;
//   ok          « CV Studio.lnk » ouvre bien cette installation ;
//   other-name  pas de « CV Studio.lnk », mais un autre raccourci ouvre l'application ;
//   outdated    « CV Studio.lnk » ouvre une autre copie de l'application (ancien emplacement) ;
//   broken      « CV Studio.lnk » ouvre un fichier qui n'existe plus ;
//   foreign     « CV Studio.lnk » ouvre un autre programme, ou n'est pas un raccourci lisible.

import path from 'node:path';

export const SHORTCUT_NAME = 'CV Studio';
export const SHORTCUT_FILE = `${SHORTCUT_NAME}.lnk`;

const win = path.win32;

/** Chemin Windows comparable : séparateurs unifiés, casse ignorée, sans guillemets. */
export function normalizePath(value) {
  const text = String(value || '').trim().replace(/^"(.*)"$/, '$1');
  if (!text) return '';
  return win.normalize(text).replace(/[\\]+$/, '').toLowerCase();
}

/** Arguments comparables : guillemets et espaces superflus retirés, chemins normalisés. */
export function normalizeArgs(value) {
  return String(value || '').trim().split(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/).filter(Boolean).map(normalizePath).join(' ');
}

/** Le raccourci lance-t-il exactement cette installation (même exécutable, mêmes arguments) ? */
export function launchesApp(link, expected) {
  if (!link?.target || normalizePath(link.target) !== normalizePath(expected.target)) return false;
  return normalizeArgs(link.args) === normalizeArgs(expected.args);
}

/** Le raccourci vise-t-il une copie de l'application (même nom d'exécutable) ailleurs ? */
export function looksLikeApp(link, expected) {
  if (!link?.target) return false;
  return win.basename(normalizePath(link.target)) === win.basename(normalizePath(expected.target));
}

/**
 * État d'un emplacement.
 * @param {object} found
 * @param {{ target?: string, args?: string, error?: string } | null} found.primary  lecture de « CV Studio.lnk » (null s'il n'existe pas)
 * @param {boolean} found.primaryTargetExists  la cible de « CV Studio.lnk » existe-t-elle ?
 * @param {string[]} found.others  autres raccourcis du dossier qui lancent l'application
 * @param {{ target: string, args?: string }} expected
 */
export function classify({ primary, primaryTargetExists = true, others = [] }, expected) {
  if (!primary) return others.length ? 'other-name' : 'missing';
  if (primary.error || !primary.target) return 'foreign';
  if (launchesApp(primary, expected)) return 'ok';
  if (!primaryTargetExists) return 'broken';
  if (looksLikeApp(primary, expected)) return 'outdated';
  return 'foreign';
}

/** Un raccourci vers l'application existe-t-il déjà dans l'emplacement ? */
export const PRESENT = new Set(['ok', 'other-name']);

/**
 * Action à mener pour obtenir un raccourci valide.
 *   create   aucun fichier : création ;
 *   repair   « CV Studio.lnk » est à nous mais périmé : il est remplacé ;
 *   replace  « CV Studio.lnk » ouvre autre chose : remplacement après confirmation ;
 *   none     un raccourci valide existe déjà, rien à faire.
 */
export function plannedAction(status) {
  switch (status) {
    case 'missing': return 'create';
    case 'outdated':
    case 'broken': return 'repair';
    case 'foreign': return 'replace';
    default: return 'none';
  }
}

/** Le raccourci trouvé peut-il être mis à la corbeille par l'application ? */
export function canRemove(status) {
  return ['ok', 'other-name', 'outdated', 'broken'].includes(status);
}
