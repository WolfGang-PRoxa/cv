// Identifiants stables des éléments du CV.
// Chaque élément masquable (bloc, entrée de liste, composant…) porte un identifiant unique :
// les CV générés mémorisent la liste des identifiants masqués.

export function newId(prefix = 'el') {
  const random = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}-${time}${random}`;
}

/** Copie profonde d'une valeur JSON. */
export function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

/**
 * Copie profonde qui attribue de nouveaux identifiants à tous les éléments copiés
 * (utile pour dupliquer un bloc sans créer de doublons d'identifiants).
 */
export function cloneWithNewIds(value) {
  const copy = clone(value);
  const visit = node => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object') return;
    if (typeof node.id === 'string') {
      const prefix = node.id.includes('-') ? node.id.slice(0, node.id.indexOf('-')) : 'el';
      node.id = newId(prefix);
    }
    Object.values(node).forEach(visit);
  };
  visit(copy);
  return copy;
}
