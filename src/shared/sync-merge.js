// Fusion à trois versions utilisée par la synchronisation entre postes.
//
// Chaque élément synchronisé (la base, chaque CV généré) est identifié par une clé et
// représenté par l'empreinte de son contenu :
//   local  : empreintes sur ce poste ;
//   remote : empreintes dans la copie distante ;
//   synced : empreintes lors de la dernière synchronisation réussie de ce poste.
// Un élément absent vaut `undefined` (jamais créé, ou supprimé).
//
// `pristine` liste les clés dont la version locale n'a jamais été modifiée par
// l'utilisateur (la base d'exemple livrée avec l'application) : la version distante
// l'emporte alors toujours.

/**
 * Action à mener pour chaque clé :
 *   'push'          la version locale est envoyée ;
 *   'pull'          la version distante remplace la version locale ;
 *   'delete-remote' l'élément, supprimé sur ce poste, est supprimé à distance ;
 *   'delete-local'  l'élément, supprimé ailleurs, est supprimé sur ce poste ;
 *   'conflict'      modifié des deux côtés depuis la dernière synchronisation.
 * Une modification l'emporte toujours sur une suppression : rien n'est perdu.
 */
export function planSync({ local = {}, remote = {}, synced = {}, pristine = [] }) {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(synced)]);
  const untouched = new Set(pristine);
  const plan = {};
  for (const key of keys) {
    const l = local[key];
    const r = remote[key];
    const s = synced[key];
    let action = null;
    if (l === r) action = null;
    else if (untouched.has(key) && r !== undefined) action = 'pull';
    else if (l === s) action = r === undefined ? 'delete-local' : 'pull';
    else if (r === s) action = l === undefined ? 'delete-remote' : 'push';
    else if (l === undefined) action = 'pull';
    else if (r === undefined) action = 'push';
    else action = 'conflict';
    if (action) plan[key] = action;
  }
  return plan;
}
