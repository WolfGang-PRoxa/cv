[English](README.md)

# CV Studio

Application de bureau Windows pour tenir à jour un **CV de référence** et en générer des **variantes** : chaque CV généré reprend la base en masquant certains éléments (une rubrique, une expérience, une coordonnée, une fenêtre détaillée…). Les CV s'exportent en PDF ou en page HTML autonome, avec les animations et le mode jour / nuit.

L'interface de l'application est en français.

![Icône de CV Studio](build/icon.png)

## Fonctionnalités

### Mes CV

- Liste des CV générés, avec aperçu en direct.
- Export en **PDF** (format A4, mise en page d'impression) ou en **page HTML** autonome, ouverture dans le navigateur.
- Renommage, duplication, suppression.
- **Publication sur GitHub** : le bouton « Publier » crée une release GitHub contenant le PDF et la page HTML du CV, avec un titre, un tag (`cv-<nom>-v<n>`, proposé automatiquement) et une description facultative. Les publications de chaque CV sont listées avec leurs fichiers, peuvent être relues depuis GitHub (« Actualiser ») ou supprimées. Un badge signale un CV modifié depuis sa dernière publication.
- Signalement des CV créés avant une modification de la base, et mise à jour en un clic : le contenu de la base est repris, les éléments masqués sont conservés.

### Nouveau CV

- Nom et notes personnelles (destinataire, offre visée…).
- Arbre de tous les éléments du CV de référence : une case décochée masque l'élément et tout ce qu'il contient.
- Filtre de recherche dans l'arbre et aperçu instantané du résultat.

### CV de référence (éditeur)

- **Structure** : en-tête, puis trois zones (haut de page, colonne principale, colonne latérale). Les blocs se déplacent par glisser-déposer, y compris d'une zone à l'autre. Ils s'ajoutent, se dupliquent et se suppriment.
- **Types de blocs** : rubrique chronologique (formations, expériences), encadré libre, carte lien, encadré de certification, bandeau.
- **Contenu** : formulaires générés pour chaque bloc. Les listes d'entrées se réordonnent par glisser-déposer. Le sélecteur d'icônes et le choix d'image sont intégrés.
- **Fenêtres détaillées** : chaque encadré peut ouvrir une fenêtre détaillée, composée librement (projets, tuiles avec logo, panneaux d'information, cartes avec frise ou sous-cartes, score, image, notes…).
- **Animations** : arrivée de la carte, apparition des rubriques (fondu, zoom, glissement ou aucune), durées, inclinaison 3D selon la souris, effets de survol, ouverture des fenêtres détaillées. Chaque bloc peut choisir sa propre animation d'apparition.
- **Aperçu** : rendu à la largeur d'un vrai écran (grand écran, portable, tablette, mobile), en mode jour ou nuit. Le mode « Sélectionner » ouvre directement dans le formulaire l'élément cliqué dans l'aperçu.
- Annuler / rétablir (Ctrl+Z, Ctrl+Y) et enregistrement (Ctrl+S). Chaque enregistrement crée une nouvelle version de la base.

### Mise en forme du texte

Dans les champs de texte long :

- `**texte**` affiche le texte en gras ;
- un retour à la ligne est conservé dans le CV.

### Paramètres

- **Mises à jour automatiques** (activées par défaut) : au lancement, l'application vérifie les releases GitHub, télécharge la nouvelle version en arrière-plan et l'installe à la fermeture. Un bouton permet aussi de redémarrer immédiatement pour l'installer.
- **Synchronisation entre postes** : le CV de référence et les CV générés se retrouvent automatiquement sur chacun de ses ordinateurs. Trois choix :
  - _Désactivée_ (par défaut) : les données restent sur le poste ;
  - _Dossier synchronisé_ : les données sont enregistrées dans un dossier choisi (OneDrive, Dropbox, Google Drive…), que ce service synchronise. Un dossier qui contient déjà des données (créées sur un autre poste) est utilisé tel quel ; sinon les données du poste y sont copiées. Une modification faite ailleurs est rechargée aussitôt ;
  - _GitHub, chiffré_ : les données sont chiffrées par un mot de passe (AES-256-GCM, clé dérivée par scrypt) puis envoyées dans un Gist secret du compte GitHub de l'utilisateur. GitHub ne reçoit que des données illisibles, y compris les noms de fichiers ; le mot de passe n'est jamais transmis et sa clé est gardée chiffrée par Windows. Envoi trois secondes après chaque enregistrement, récupération au lancement, au retour sur la fenêtre et toutes les dix minutes. Le même mot de passe est demandé sur chaque poste (un mot de passe différent est refusé). Un CV modifié sur deux postes entre deux synchronisations est conservé en deux exemplaires ; pour le CV de référence, l'application demande quelle version garder et enregistre l'autre dans le dossier de l'application.

  Les paramètres (fenêtre, thème, jeton) restent propres à chaque poste. Le jeton utilisé est celui de « Publication sur GitHub » ou de GitHub CLI ; un jeton à accès précis doit avoir la permission de compte « Gists » en lecture et écriture.

- **Raccourcis** : création d'un raccourci « CV Studio » sur le Bureau et dans le menu Démarrer. Pour chaque emplacement, l'application indique ce qu'elle trouve et agit en conséquence :
  - aucun raccourci : bouton « Créer le raccourci » ;
  - raccourci valide (y compris sous un autre nom, ou dans un sous-dossier du menu Démarrer) : il est signalé et rien n'est recréé ; il peut être affiché dans l'Explorateur ou mis à la corbeille ;
  - raccourci cassé ou vers une ancienne copie de l'application : bouton « Réparer », qui le fait pointer vers l'installation actuelle ;
  - fichier « CV Studio.lnk » qui ouvre un autre programme : remplacement uniquement après confirmation.

  Les raccourcis portent le nom de ceux de l'installeur : la désinstallation les retire aussi. L'état est relu à chaque retour dans l'application (raccourci supprimé depuis l'Explorateur, par exemple).

- **Fenêtre au lancement** : grande fenêtre (agrandie, par défaut) ou taille et position personnalisées. Le réglage personnalisé se fait dans un cadre qui représente les écrans à l'échelle : le rectangle de la fenêtre s'y déplace et s'y redimensionne à la souris (ou au clavier : flèches, Maj pour un pas plus grand, Alt pour redimensionner). Quatre champs (largeur, hauteur, position X, position Y) permettent un réglage précis. Si l'emplacement enregistré n'est plus visible (écran débranché), la fenêtre s'ouvre agrandie.
- **Publication sur GitHub** : dépôt cible (par défaut, celui de l'application) et connexion. L'application utilise le jeton personnel enregistré (chiffré par Windows, jamais transmis à l'interface), sinon celui de GitHub CLI (`gh auth login`). Un jeton à accès précis limité au dépôt, avec la permission « Contents » en lecture et écriture, suffit.
- **Apparence** : thème de l'application (selon Windows, clair ou sombre).
- **Données** : ouverture du dossier de données, export et import de la base en JSON, restauration de la base d'origine.

## Installation

1. Télécharger `CV-Studio-Setup-<version>.exe` depuis la page [Releases](https://github.com/WolfGang-PRoxa/cv/releases/latest).
2. Lancer l'installeur. L'application n'étant pas signée, Windows SmartScreen affiche un avertissement : choisir « Informations complémentaires » puis « Exécuter quand même ».

L'installation se fait pour l'utilisateur courant, sans droits administrateur.

## Mise à jour

Au lancement, l'application vérifie les releases GitHub, télécharge la nouvelle version en arrière-plan et l'installe à la fermeture (ou tout de suite avec « Redémarrer et installer »). Ce comportement se désactive dans les paramètres ; il suffit alors de télécharger et lancer le nouvel installeur depuis la page [Releases](https://github.com/WolfGang-PRoxa/cv/releases/latest). Les nouveautés de chaque version sont décrites dans le [CHANGELOG](CHANGELOG.fr.md).

## Données

Les données sont enregistrées dans `%APPDATA%\CV Studio` (la base et les CV peuvent être placés dans un dossier synchronisé, voir « Synchronisation entre postes ») :

| Fichier           | Contenu                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `base.json`       | CV de référence (avec son numéro de version)                                                |
| `cvs/<id>.json`   | CV générés : nom, notes, éléments masqués et instantané de la base au moment de la création |
| `settings.json`   | Paramètres de l'application (propres au poste)                                              |
| `sync-state.json` | État de la dernière synchronisation GitHub (empreintes des éléments)                        |

Au premier lancement, la base est initialisée avec un CV d'exemple fictif (Camille Martin) livré dans l'application. Pour partir de son propre CV, utiliser « Importer une base (JSON) » dans les paramètres. Aucune donnée personnelle n'est livrée dans l'application ni dans ce dépôt public. La désinstallation conserve ce dossier.

Un CV généré conserve une copie de la base au moment de sa création : modifier la base ne change pas un CV déjà envoyé. La mise à jour depuis la base se fait sur demande, CV par CV.

## Développement

Prérequis : Node.js 22 ou plus récent.

```bash
npm ci             # dépendances, sans modifier package-lock.json
npm start          # lance l'application en mode développement
npm run format     # met en forme tout le code avec Prettier
npm run lint       # analyse le code avec ESLint
npm run check      # Prettier (vérification), ESLint, puis scripts/check.mjs : syntaxe, identifiants, rendu, masquage
npm test           # tests unitaires (node --test, dossier test/)
npm run dist       # construit l'installeur dans dist/ sans le publier
```

La CI GitHub (`.github/workflows/ci.yml`) lance `npm run check` et `npm test` à chaque push et sur chaque pull request. Les releases ont leur propre workflow (voir plus bas).

### Publication d'une version

Les releases sont construites et publiées par GitHub Actions (`.github/workflows/release.yml`) à l'envoi d'un tag `vX.Y.Z`. Rien n'est construit sur le PC, et la publication d'une version ne demande ni jeton GitHub ni GitHub CLI.

1. Augmenter `version` dans `package.json` (format `X.Y.Z`, seule source du numéro : les mises à jour automatiques le comparent).
2. Déplacer les entrées de `[Unreleased]` vers une nouvelle section `## [X.Y.Z] - AAAA-MM-JJ` dans `CHANGELOG.md` et `CHANGELOG.fr.md`.
3. Committer et envoyer sur `main`.
4. Lancer le script de publication :

   ```bash
   npm ci             # seulement si les dépendances ont changé depuis la dernière installation
   npm run release
   ```

5. Suivre le workflow « Release » dans l'[onglet Actions](https://github.com/WolfGang-PRoxa/cv/actions/workflows/release.yml) du dépôt.

`npm run release` (`scripts/release.mjs`) ne construit rien : il vérifie que la branche est `main`, qu'il ne reste aucune modification locale et que `main` n'a ni retard ni avance sur GitHub, que la version est au format `X.Y.Z`, que les deux journaux des modifications ont une entrée pour elle, et que le tag `vX.Y.Z` n'existe ni en local ni sur GitHub. Il lance ensuite `npm run check` et `npm test`, crée le tag annoté `vX.Y.Z`, l'envoie et affiche le lien vers le workflow.

Le workflow, ensuite :

- vérifie que le tag correspond à `package.json` et pointe sur un commit de `main`, puis lance `npm ci`, `npm run check` et `npm test` sous Windows ;
- tire les notes de version des deux journaux des modifications (`scripts/changelog-notes.mjs` : anglais, puis français) ;
- construit l'installeur avec electron-builder, sans le publier ;
- dans un job séparé, le seul autorisé à écrire dans le dépôt, crée la release `vX.Y.Z` en brouillon avec l'installeur, sa carte de blocs (`.blockmap`, pour les mises à jour différentielles) et `latest.yml`, que les applications installées consultent, puis la publie et la marque « Latest » ;
- vérifie que les trois fichiers sont présents dans la release et non vides.

`npm run dist` construit toujours un installeur dans `dist/` pour le tester sur le PC.

En cas d'échec du workflow :

1. Corriger le problème, committer et envoyer sur `main`.
2. Supprimer le tag sur GitHub et en local :

   ```bash
   git push --delete origin vX.Y.Z
   git tag -d vX.Y.Z
   ```

3. Si une release `vX.Y.Z` en brouillon a été créée, la supprimer depuis la page Releases du dépôt.
4. Relancer `npm run release`.

### Releases des CV et mises à jour de l'application

Les CV sont publiés dans le même dépôt que l'application. Les mises à jour automatiques lisent la release marquée « Latest » sur GitHub ; pour qu'une release de CV ne la remplace jamais :

- les tags des CV commencent par `cv-` (jamais `v<version>`) ;
- chaque release de CV est créée avec `make_latest: false`. Elle est d'abord créée en brouillon, les fichiers y sont joints, puis elle est publiée ; en cas d'échec, le brouillon est supprimé.

Une nouvelle version de l'application publiée par le workflow de release redevient « Latest » comme d'habitude. La description de chaque release de CV contient un repère invisible (`<!-- cv-studio {"cvId":…} -->`) qui la relie au CV de l'application.

### Structure du projet

```
src/
  main/                 Processus principal Electron
    main.js             Fenêtre, communication avec l'interface
    storage.js          Lecture et écriture des données
    exporter.js         Exports PDF, HTML, JSON
    updater.js          Mises à jour automatiques (electron-updater)
    github.js           Publication des CV en releases GitHub
    sync.js             Synchronisation entre postes (dossier ou Gist chiffré)
    sync-crypto.js      Chiffrement des données synchronisées (vérifié par check.mjs)
    window-bounds.js    Taille et position de la fenêtre au lancement
    shortcuts.js        Raccourcis Bureau et menu Démarrer
    shortcut-rules.js   Détection d'un raccourci existant (vérifiée par check.mjs et les tests)
    preload.cjs         Pont sécurisé vers l'interface
  renderer/             Interface de l'application
    app.js              Navigation entre les vues
    views/              Mes CV, génération, éditeur, paramètres
    components/         Aperçu, formulaires, cadre de position de la fenêtre
    lib/                Utilitaires d'interface, état partagé
  shared/github-tags.js Règles des tags de releases de CV
  shared/sync-merge.js  Fusion à trois versions de la synchronisation (vérifiée par check.mjs et les tests)
  shared/cv/            Moteur de CV, commun à l'interface et aux exports
    schema.js           Types de blocs et de composants, champs éditables
    render.js           Génération du HTML d'un CV
    icons.js            Bibliothèque d'icônes et de logos
    sample-cv.json      CV d'exemple fictif livré avec l'application
    template/           Feuille de style et script intégrés à chaque CV
scripts/check.mjs       Vérifications automatiques
scripts/release.mjs     Publication d'une version : vérifications, puis envoi du tag vX.Y.Z
scripts/changelog-notes.mjs  Notes de version tirées des deux journaux des modifications
test/                   Tests unitaires (node --test)
build/                  Icône de l'application
.github/workflows/      CI (vérifications et tests à chaque push) et release (tags vX.Y.Z)
```

### Fonctionnement du moteur de CV

Le CV est décrit par des données (voir `sample-cv.json`) : un en-tête, puis des blocs répartis dans trois zones. Chaque élément masquable porte un identifiant unique. `render.js` produit une page HTML autonome, en retirant les éléments masqués. Le schéma (`schema.js`) décrit chaque type de bloc et de composant ; l'éditeur en déduit automatiquement ses formulaires, et le générateur son arbre d'éléments. Ajouter un type de bloc consiste donc à le déclarer dans le schéma et à écrire son rendu.

## Licence

CV Studio est distribué sous licence [MIT](LICENSE).

## Crédits

Les logos d'IntelliJ IDEA et de GIMP proviennent de [Simple Icons](https://simpleicons.org) (licence CC0). Les autres logos de logiciels sont des dessins simplifiés. Les marques citées appartiennent à leurs détenteurs respectifs.
