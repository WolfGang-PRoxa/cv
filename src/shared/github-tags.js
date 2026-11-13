// Règles communes (interface et processus principal) pour les releases de CV.
// Les tags des CV commencent par « cv- » : ils ne ressemblent jamais à une version
// de l'application (vX.Y.Z), dont les releases servent aux mises à jour automatiques.

export const CV_TAG_PREFIX = 'cv-';

/** Transforme un nom libre en segment de tag ou de nom de fichier (ASCII, tirets). */
export function slugify(text, fallback = 'cv') {
  const slug = String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug || fallback;
}

/** Message d'erreur si le tag n'est pas un tag de CV valide, sinon null. */
export function validateCvTag(tag) {
  const value = String(tag || '').trim();
  if (!value.startsWith(CV_TAG_PREFIX)) return `le tag doit commencer par « ${CV_TAG_PREFIX} ».`;
  if (!/^cv-[A-Za-z0-9._-]+$/.test(value)) return 'le tag ne peut contenir que des lettres sans accent, des chiffres, des points et des tirets.';
  if (/\.\.|\.lock$|\.$/.test(value)) return 'tag invalide.';
  return null;
}

/** Premier tag libre de la forme cv-<nom>-v<n>. */
export function suggestTag(name, takenTags = []) {
  const stem = `${CV_TAG_PREFIX}${slugify(name)}`.replace(/^cv-cv-/, 'cv-');
  const taken = new Set(takenTags);
  let n = 1;
  while (taken.has(`${stem}-v${n}`)) n += 1;
  return { tag: `${stem}-v${n}`, number: n };
}
