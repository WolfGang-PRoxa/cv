[Français](README.fr.md)

# CV Studio

Windows desktop app to maintain a **reference CV** and generate **variants** of it: each generated CV reuses the base while hiding some elements (a section, a job, a contact detail, a detail window…). CVs export to PDF or to a standalone HTML page, with animations and light / dark mode.

The app interface is in French; labels below are given in English, with the French label in quotes where it helps.

![CV Studio icon](build/icon.png)

## Features

### My CVs

- List of generated CVs, with a live preview.
- Export to **PDF** (A4, print layout) or to a standalone **HTML page**, opened in the browser.
- Rename, duplicate, delete.
- **Publish to GitHub**: the “Publier” button creates a GitHub release holding the CV’s PDF and HTML page, with a title, a tag (`cv-<name>-v<n>`, suggested automatically) and an optional description. Each CV’s releases are listed with their files, can be reloaded from GitHub (“Actualiser”) or deleted. A badge flags a CV changed since its last release.
- CVs created before a change to the base are flagged and can be updated in one click: the base content is taken over and hidden elements are kept.

### New CV

- Name and personal notes (recipient, job offer…).
- Tree of every element of the reference CV: an unchecked box hides the element and everything inside it.
- Search filter in the tree and instant preview of the result.

### Reference CV (editor)

- **Structure**: header, then three zones (top of page, main column, side column). Blocks move by drag and drop, including from one zone to another. They can be added, duplicated and deleted.
- **Block types**: timeline section (education, experience), free box, link card, certification box, banner.
- **Content**: forms generated for each block. Entry lists are reordered by drag and drop. Icon picker and image chooser are built in.
- **Detail windows**: each box can open a detail window, freely composed (projects, logo tiles, information panels, cards with a timeline or sub-cards, score, image, notes…).
- **Animations**: card entrance, section reveal (fade, zoom, slide or none), durations, 3D tilt following the mouse, hover effects, opening of detail windows. Each block can choose its own reveal animation.
- **Preview**: rendered at the width of a real screen (desktop, laptop, tablet, mobile), in light or dark mode. “Select” mode opens the element clicked in the preview directly in the form.
- Undo / redo (Ctrl+Z, Ctrl+Y) and save (Ctrl+S). Each save creates a new version of the base.

### Text formatting

In long text fields:

- `**text**` shows the text in bold;
- a line break is kept in the CV.

### Settings

- **Automatic updates** (on by default): at launch, the app checks GitHub releases, downloads the new version in the background and installs it on exit. A button also lets you restart right away to install it.
- **Sync between computers**: the reference CV and generated CVs show up automatically on each of your computers. Three choices:
  - _Off_ (default): data stays on the computer;
  - _Synced folder_: data is saved in a chosen folder (OneDrive, Dropbox, Google Drive…) that this service syncs. A folder that already holds data (created on another computer) is used as is; otherwise the computer’s data is copied into it. A change made elsewhere is reloaded at once;
  - _GitHub, encrypted_: data is encrypted with a password (AES-256-GCM, key derived with scrypt) then sent to a secret Gist in the user’s GitHub account. GitHub only receives unreadable data, file names included; the password is never sent and its key is kept encrypted by Windows. Upload three seconds after each save, download at launch, when returning to the window and every ten minutes. The same password is asked on each computer (a different password is refused). A CV changed on two computers between two syncs is kept twice; for the reference CV, the app asks which version to keep and saves the other one in the app folder.

  Settings (window, theme, token) stay specific to each computer. The token used is the “Publish to GitHub” one or GitHub CLI’s; a fine-grained token needs the “Gists” account permission with read and write access.

- **Shortcuts**: creates a “CV Studio” shortcut on the Desktop and in the Start menu. For each location, the app shows what it finds and acts accordingly:
  - no shortcut: “Créer le raccourci” (create) button;
  - valid shortcut (including under another name, or in a Start menu subfolder): it is reported and nothing is recreated; it can be shown in Explorer or moved to the Recycle Bin;
  - broken shortcut, or one pointing to an old copy of the app: “Réparer” (repair) button, which points it to the current install;
  - a “CV Studio.lnk” file that opens another program: replaced only after confirmation.

  Shortcuts use the installer’s names, so uninstalling removes them too. Their state is read again each time you come back to the app (shortcut deleted from Explorer, for example).

- **Window at launch**: large window (maximized, default) or custom size and position. The custom setting is made in a frame that shows the screens to scale: the window rectangle moves and resizes there with the mouse (or the keyboard: arrows, Shift for a bigger step, Alt to resize). Four fields (width, height, X, Y) allow precise values. If the saved position is no longer visible (screen unplugged), the window opens maximized.
- **Publish to GitHub**: target repository (the app’s own by default) and sign-in. The app uses the saved personal token (encrypted by Windows, never sent to the interface), otherwise GitHub CLI’s (`gh auth login`). A fine-grained token limited to the repository, with the “Contents” permission in read and write, is enough.
- **Appearance**: app theme (follow Windows, light or dark).
- **Data**: open the data folder, export and import the base as JSON, restore the original base.

## Installation

1. Download `CV-Studio-Setup-<version>.exe` from the [Releases](https://github.com/WolfGang-PRoxa/cv/releases/latest) page.
2. Run the installer. Since the app is not signed, Windows SmartScreen shows a warning: choose “More info” then “Run anyway”.

The app is installed for the current user, without administrator rights.

## Updating

At launch, the app checks GitHub releases, downloads the new version in the background and installs it on exit (or right away with “Redémarrer et installer”, restart and install). This can be turned off in the settings; you then just download and run the new installer from the [Releases](https://github.com/WolfGang-PRoxa/cv/releases/latest) page. What changed in each version is described in the [CHANGELOG](CHANGELOG.md).

## Data

Data is saved in `%APPDATA%\CV Studio` (the base and CVs can be placed in a synced folder, see “Sync between computers”):

| File              | Content                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| `base.json`       | Reference CV (with its version number)                                 |
| `cvs/<id>.json`   | Generated CVs: name, notes, hidden elements and a snapshot of the base |
| `settings.json`   | App settings (specific to the computer)                                |
| `sync-state.json` | State of the last GitHub sync (fingerprints of the elements)           |

On first launch, the base is initialized with a fictional sample CV (Camille Martin) shipped with the app. To start from your own CV, use “Importer une base (JSON)” (import a base) in the settings. No personal data ships in the app or in this public repository. Uninstalling keeps this folder.

A generated CV keeps a copy of the base as it was when it was created: changing the base does not change a CV already sent. Updating from the base is done on request, CV by CV.

## Development

Requirements: Node.js 22 or later.

```bash
npm ci             # dependencies, without changing package-lock.json
npm start          # runs the app in development mode
npm run format     # formats all the code with Prettier
npm run lint       # analyzes the code with ESLint
npm run check      # Prettier (check), ESLint, then scripts/check.mjs: syntax, ids, rendering, hiding
npm test           # unit tests (node --test, test/ folder)
npm run dist       # builds the installer in dist/ without publishing it
```

GitHub CI (`.github/workflows/ci.yml`) runs `npm run check` and `npm test` on every push and on every pull request.

### Publishing a version

1. Bump `version` in `package.json` (`X.Y.Z` format, the only source of the number: automatic updates compare it), move the `[Unreleased]` entries to the new version in `CHANGELOG.md` and `CHANGELOG.fr.md`, commit and push to `main`.
2. Publish:

   ```bash
   git pull
   npm ci             # installs dependencies without changing package-lock.json
   npm run release
   ```

   Requirement: GitHub CLI signed in (`gh auth login`).

The script (`scripts/release.mjs`):

- refuses to publish if the branch is not `main`, if there are local changes, if `main` is not up to date with GitHub, or if the version is already published;
- builds the installer with electron-builder, without publishing it;
- creates the `v<version>` release with GitHub CLI: it stays a draft while the installer, its block map (`.blockmap`, for differential updates) and `latest.yml`, which installed apps read, are uploaded, then it is published and marked “Latest”;
- reads the release back from GitHub and checks that the three files are there with the right size.

If a release already exists but is missing files, running `npm run release` again repairs it: the three files are rebuilt and uploaded together (`latest.yml` holds the installer’s hash, so they must come from the same build).

### CV releases and app updates

CVs are published in the same repository as the app. Automatic updates read the release marked “Latest” on GitHub; so that a CV release never replaces it:

- CV tags start with `cv-` (never `v<version>`);
- each CV release is created with `make_latest: false`. It is first created as a draft, the files are attached, then it is published; if something fails, the draft is deleted.

A new app version published with `npm run release` becomes “Latest” again as usual. Each CV release description holds an invisible marker (`<!-- cv-studio {"cvId":…} -->`) that links it to the CV in the app.

### Project structure

```
src/
  main/                 Electron main process
    main.js             Window, communication with the interface
    storage.js          Reading and writing data
    exporter.js         PDF, HTML, JSON exports
    updater.js          Automatic updates (electron-updater)
    github.js           Publishing CVs as GitHub releases
    sync.js             Sync between computers (folder or encrypted Gist)
    sync-crypto.js      Encryption of synced data (checked by check.mjs)
    window-bounds.js    Window size and position at launch
    shortcuts.js        Desktop and Start menu shortcuts
    shortcut-rules.js   Detection of an existing shortcut (checked by check.mjs and tests)
    preload.cjs         Secure bridge to the interface
  renderer/             App interface
    app.js              Navigation between views
    views/              My CVs, generation, editor, settings
    components/         Preview, forms, window position frame
    lib/                Interface utilities, shared state
  shared/github-tags.js Rules for CV release tags
  shared/sync-merge.js  Three-way merge for sync (checked by check.mjs and tests)
  shared/cv/            CV engine, shared by the interface and the exports
    schema.js           Block and component types, editable fields
    render.js           HTML generation for a CV
    icons.js            Icon and logo library
    sample-cv.json      Fictional sample CV shipped with the app
    template/           Stylesheet and script embedded in each CV
scripts/check.mjs       Automatic checks
scripts/release.mjs     Publishing a version
test/                   Unit tests (node --test)
build/                  App icon
.github/workflows/      CI: checks and tests on every push
```

### How the CV engine works

A CV is described by data (see `sample-cv.json`): a header, then blocks spread over three zones. Each element that can be hidden has a unique id. `render.js` produces a standalone HTML page, leaving out hidden elements. The schema (`schema.js`) describes each block and component type; the editor derives its forms from it automatically, and the generator its element tree. Adding a block type therefore means declaring it in the schema and writing its rendering.

## License

CV Studio is released under the [MIT](LICENSE) license.

## Credits

The IntelliJ IDEA and GIMP logos come from [Simple Icons](https://simpleicons.org) (CC0 license). Other software logos are simplified drawings. Trademarks belong to their respective owners.
