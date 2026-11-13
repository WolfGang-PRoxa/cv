// Mise en forme minimale du texte saisi dans l'éditeur.
// - Le HTML saisi est toujours échappé.
// - **texte** produit du gras.
// - Un retour à la ligne produit un saut de ligne (<br>).

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const escapeAttr = escapeHtml;

/** Texte enrichi : gras (**…**) et retours à la ligne. */
export function rich(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
    .replace(/\r?\n/g, '<br>');
}

/** Texte brut sur une ligne (les retours à la ligne deviennent des espaces). */
export function plain(value) {
  return escapeHtml(String(value ?? '').replace(/\s*\r?\n\s*/g, ' '));
}

/** Version texte (sans balisage) pour les libellés d'accessibilité et l'éditeur. */
export function textOnly(value) {
  return String(value ?? '').replace(/\*\*(.+?)\*\*/gs, '$1').replace(/\s*\r?\n\s*/g, ' ').trim();
}

