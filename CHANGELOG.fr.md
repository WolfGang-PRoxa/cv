[English](CHANGELOG.md)

# Journal des modifications

Toutes les modifications notables de CV Studio sont décrites dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/spec/v2.0.0.html). Le numéro de version se trouve uniquement dans `package.json`, et chaque release porte le tag `vX.Y.Z`.

## [Unreleased]

### Ajouts

- Licence MIT.
- README en anglais (`README.md`), avec la version française dans `README.fr.md`.
- Journal des modifications en anglais (`CHANGELOG.md`) et en français (`CHANGELOG.fr.md`).
- Prettier et ESLint, lancés par `npm run check` avant les vérifications existantes ; scripts `npm run format` et `npm run lint`.
- Tests unitaires (`npm test`, `node --test`) pour la détection des raccourcis, les tags des releases de CV et la fusion de la synchronisation.
- CI GitHub qui lance `npm run check` et `npm test` à chaque push et sur chaque pull request.

### Améliorations

- Tout le code est mis en forme avec Prettier.
- Les erreurs réseau renvoyées par la publication GitHub et la synchronisation conservent l'erreur d'origine comme cause.

### Suppressions

- Code inutilisé dans le rendu des CV.

## [0.5.0] - 2026-11-09

Première version décrite dans ce journal : elle résume ce que fait l'application à ce stade.

### Ajouts

- Éditeur du CV de référence : en-tête et trois zones (haut de page, colonne principale, colonne latérale), blocs déplacés par glisser-déposer, types de blocs (rubrique chronologique, encadré libre, carte lien, encadré de certification, bandeau), formulaires générés, fenêtres détaillées, animations, aperçu à la largeur de vrais écrans en mode jour ou nuit, annuler / rétablir et enregistrements versionnés.
- CV générés : arbre des éléments de la base à masquer, notes, aperçu en direct, mise à jour depuis une base plus récente en conservant les éléments masqués.
- Exports PDF (A4) et page HTML autonome.
- Publication d'un CV en release GitHub (PDF et page HTML, tags `cv-<nom>-v<n>`, jamais marquée « Latest »).
- Synchronisation entre postes, au choix dans les paramètres : dossier synchronisé (OneDrive, Dropbox…) ou Gist GitHub secret chiffré par un mot de passe (AES-256-GCM, scrypt), avec fusion à trois versions.
- Raccourcis Bureau et menu Démarrer : détection, création, réparation et remplacement.
- Taille et position de la fenêtre au lancement, réglées dans un cadre des écrans à l'échelle.
- Mises à jour automatiques depuis les releases GitHub (electron-updater), et script `npm run release` qui publie et vérifie une release.
- CV d'exemple fictif (Camille Martin) livré avec l'application : aucune donnée personnelle n'est livrée dans l'application ni dans le dépôt.
