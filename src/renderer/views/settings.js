// Vue « Paramètres » : mises à jour, publication, synchronisation, raccourcis, fenêtre au lancement, apparence, données.

import { h, button, uiIcon, toast, confirmDialog, debounce, errorMessage } from '../lib/dom.js';
import { state, api, on, saveSettings, saveBase } from '../lib/state.js';
import { createWindowFrame } from '../components/window-frame.js';
import { normalizeCv } from '../../shared/cv/schema.js';

const MIN = { width: 960, height: 640 };

export function describeUpdate(status) {
  switch (status?.state) {
    case 'checking': return 'Recherche d’une mise à jour…';
    case 'available': return `Version ${status.version} disponible : téléchargement en cours…`;
    case 'downloading': return `Téléchargement de la mise à jour : ${status.percent ?? 0} %`;
    case 'downloaded': return `Version ${status.version} prête : installation à la fermeture de l’application.`;
    case 'up-to-date': return 'L’application est à jour.';
    case 'unavailable': return status.message;
    case 'error': return `Échec de la recherche de mise à jour : ${status.message}`;
    default: return 'Aucune recherche effectuée depuis le lancement.';
  }
}

export function mount(container) {
  const settings = state.settings;
  const cleanups = [];

  /* -- Mises à jour --------------------------------------------------- */
  const updateStatus = h('p', { class: 'muted' }, describeUpdate(state.update));
  const installButton = button('Redémarrer et installer', { icon: 'refresh', variant: 'primary', size: 'small', onClick: () => api.installUpdate() });
  installButton.hidden = state.update.state !== 'downloaded';
  cleanups.push(on('update', status => {
    updateStatus.textContent = describeUpdate(status);
    installButton.hidden = status.state !== 'downloaded';
  }));

  const autoUpdate = h('input', { type: 'checkbox', class: 'switch', checked: settings.autoUpdate, onChange: async event => {
    await saveSettings({ autoUpdate: event.target.checked });
    toast(event.target.checked ? 'Mises à jour automatiques activées' : 'Mises à jour automatiques désactivées');
  } });

  const updatesCard = h('section', { class: 'card' },
    h('div', { class: 'card-head' }, uiIcon('refresh', 20), h('div', {}, h('h2', {}, 'Mises à jour'), h('p', { class: 'muted' }, `Version installée : ${state.info.version}`))),
    h('label', { class: 'field field--inline' }, autoUpdate, h('span', { class: 'field-label' }, 'Rechercher et installer automatiquement les mises à jour au lancement')),
    h('p', { class: 'field-hint' }, 'La nouvelle version est téléchargée en arrière-plan puis installée à la fermeture de l’application.'),
    h('div', { class: 'row' },
      button('Rechercher maintenant', { icon: 'search', size: 'small', onClick: () => api.checkForUpdates() }),
      installButton,
    ),
    updateStatus,
  );

  /* -- Fenêtre au lancement ------------------------------------------ */
  const windowSettings = settings.window;
  const frameHost = h('div', { class: 'frame-host' });
  const inputs = {};
  let frame = null;

  const persistBounds = debounce(bounds => saveSettings({ window: { mode: 'custom', bounds } }), 250);

  function syncInputs(bounds) {
    for (const key of ['width', 'height', 'x', 'y']) {
      if (document.activeElement !== inputs[key]) inputs[key].value = bounds[key];
    }
  }

  const numberInput = (key, label) => {
    inputs[key] = h('input', { class: 'input input--number', type: 'number', step: 1, value: windowSettings.bounds[key], onInput: event => {
      const value = Number.parseInt(event.target.value, 10);
      if (!Number.isFinite(value) || !frame) return;
      const bounds = frame.setBounds({ [key]: value });
      persistBounds(bounds);
    }, onBlur: () => frame && syncInputs(frame.getBounds()) });
    return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), h('div', { class: 'input-with-unit' }, inputs[key], h('span', { class: 'unit' }, 'px')));
  };

  const customPanel = h('div', { class: 'custom-window' },
    h('p', { class: 'muted' }, 'Déplacer le cadre bleu pour choisir la position, tirer ses bords ou ses coins pour choisir la taille. Les valeurs sont exprimées en pixels Windows (mise à l’échelle comprise).'),
    frameHost,
    h('div', { class: 'grid-4' }, numberInput('width', 'Largeur'), numberInput('height', 'Hauteur'), numberInput('x', 'Position X'), numberInput('y', 'Position Y')),
    h('div', { class: 'row' },
      button('Reprendre la fenêtre actuelle', { icon: 'window', size: 'small', onClick: async () => {
        const bounds = await api.getWindowBounds();
        if (!bounds || !frame) return;
        const applied = frame.setBounds(bounds);
        syncInputs(applied);
        await saveSettings({ window: { mode: 'custom', bounds: applied } });
        toast('Taille et position de la fenêtre actuelle enregistrées');
      } }),
    ),
  );

  const modeRadio = (value, label, description) => h('label', { class: 'radio-card' },
    h('input', { type: 'radio', name: 'window-mode', value, checked: windowSettings.mode === value, onChange: async () => {
      await saveSettings({ window: { mode: value } });
      customPanel.hidden = value !== 'custom';
      if (value === 'custom') ensureFrame();
    } }),
    h('span', {}, h('strong', {}, label), h('span', { class: 'muted' }, description)),
  );

  async function ensureFrame() {
    if (frame) return;
    const displays = await api.getDisplays();
    frame = createWindowFrame({
      displays,
      bounds: state.settings.window.bounds,
      min: MIN,
      onChange: syncInputs,
      onCommit: bounds => persistBounds(bounds),
    });
    frameHost.replaceChildren(frame.element);
    syncInputs(frame.getBounds());
    cleanups.push(() => frame.destroy());
  }

  customPanel.hidden = windowSettings.mode !== 'custom';
  if (windowSettings.mode === 'custom') ensureFrame();

  const windowCard = h('section', { class: 'card' },
    h('div', { class: 'card-head' }, uiIcon('monitor', 20), h('div', {}, h('h2', {}, 'Fenêtre au lancement'), h('p', { class: 'muted' }, 'Taille et position de la fenêtre lors des prochaines ouvertures.'))),
    h('div', { class: 'radio-group' },
      modeRadio('maximized', 'Grande fenêtre', 'La fenêtre s’ouvre agrandie sur l’écran principal (réglage par défaut).'),
      modeRadio('custom', 'Taille et position personnalisées', 'La fenêtre s’ouvre exactement à l’endroit choisi ci-dessous.'),
    ),
    customPanel,
  );

  /* -- Publication sur GitHub ---------------------------------------- */
  const githubCard = createGithubCard(settings);

  /* -- Synchronisation entre postes ---------------------------------- */
  const syncCard = createSyncCard(cleanups);

  /* -- Raccourcis ----------------------------------------------------- */
  const shortcutsCard = createShortcutsCard(cleanups);

  /* -- Apparence ------------------------------------------------------ */
  const themeSelect = h('select', { class: 'input', onChange: async event => {
    await saveSettings({ appTheme: event.target.value });
  } },
  [['system', 'Selon Windows'], ['light', 'Clair'], ['dark', 'Sombre']].map(([value, label]) => h('option', { value, selected: settings.appTheme === value }, label)));

  const appearanceCard = h('section', { class: 'card' },
    h('div', { class: 'card-head' }, uiIcon('sun', 20), h('div', {}, h('h2', {}, 'Apparence'), h('p', { class: 'muted' }, 'Thème de l’application (les CV gardent leur propre thème).'))),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Thème'), themeSelect),
  );

  /* -- Données -------------------------------------------------------- */
  const dataDirLine = h('p', { class: 'muted' });
  const renderDataDir = sync => {
    dataDirLine.textContent = sync?.mode === 'folder' && sync.folder && sync.state !== 'error' ? sync.folder : state.info.dataDir;
  };
  renderDataDir(state.sync);
  cleanups.push(on('sync', renderDataDir));
  const dataCard = h('section', { class: 'card' },
    h('div', { class: 'card-head' }, uiIcon('folder', 20), h('div', {}, h('h2', {}, 'Données'), dataDirLine)),
    h('p', { class: 'muted' }, 'Le CV de référence et les CV générés sont enregistrés dans ce dossier. Rien n’est envoyé ailleurs, sauf par la synchronisation si elle est activée, ou quand un CV est publié.'),
    h('div', { class: 'row row--wrap' },
      button('Ouvrir le dossier', { icon: 'folder', size: 'small', onClick: () => api.openDataFolder() }),
      button('Exporter la base (JSON)', { icon: 'download', size: 'small', onClick: async () => {
        const result = await api.exportBaseJson(state.base, 'cv-reference');
        if (!result.canceled) toast(`Base exportée : ${result.filePath}`);
      } }),
      button('Importer une base (JSON)', { icon: 'upload', size: 'small', onClick: importBase }),
      button('Restaurer la base d’origine', { icon: 'refresh', size: 'small', variant: 'ghost-danger', onClick: restoreBundled }),
    ),
  );

  async function importBase() {
    if (state.dirtyGuards.size) { toast('Enregistrer ou abandonner d’abord les modifications en cours.', { type: 'error' }); return; }
    const result = await api.importBaseJson();
    if (result.canceled) return;
    if (!result.data?.zones || !result.data?.hero) { toast('Ce fichier ne contient pas un CV valide.', { type: 'error' }); return; }
    const ok = await confirmDialog({ title: 'Remplacer le CV de référence ?', message: 'La base actuelle sera remplacée par le fichier importé. Les CV générés conservent leur contenu.', confirmLabel: 'Remplacer', danger: true });
    if (!ok) return;
    await saveBase(normalizeCv(result.data));
    toast('Base importée');
  }

  async function restoreBundled() {
    if (state.dirtyGuards.size) { toast('Enregistrer ou abandonner d’abord les modifications en cours.', { type: 'error' }); return; }
    const ok = await confirmDialog({ title: 'Restaurer la base d’origine ?', message: 'Le CV de référence revient à celui livré avec l’application. Les CV générés conservent leur contenu.', confirmLabel: 'Restaurer', danger: true });
    if (!ok) return;
    await saveBase(normalizeCv(await api.getBundledBase()));
    toast('Base d’origine restaurée');
  }

  container.append(
    h('header', { class: 'view-header' }, h('div', {}, h('h1', {}, 'Paramètres'), h('p', { class: 'muted' }, 'Réglages de l’application.'))),
    h('div', { class: 'settings' }, updatesCard, syncCard, githubCard, shortcutsCard, windowCard, appearanceCard, dataCard),
  );

  return () => cleanups.forEach(fn => fn());
}

/** Carte « Publication sur GitHub » : dépôt cible et connexion (jeton ou GitHub CLI). */
function createGithubCard(settings) {
  const statusLine = h('div', { class: 'github-status muted' }, 'Vérification de la connexion…');
  const tokenActions = h('div', { class: 'row row--wrap' });
  let current = null;

  const repoInput = h('input', {
    class: 'input',
    type: 'text',
    value: settings.github?.repo || '',
    placeholder: 'propriétaire/dépôt',
    spellcheck: false,
    onChange: async event => {
      const value = event.target.value.trim();
      if (value && !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(value.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, ''))) {
        toast('Dépôt invalide : indiquer « propriétaire/nom ».', { type: 'error' });
        return;
      }
      await saveSettings({ github: { repo: value } });
      toast(value ? `Dépôt de publication : ${value}` : 'Dépôt de l’application utilisé pour les publications');
      refresh();
    },
  });

  const tokenInput = h('input', { class: 'input', type: 'password', placeholder: 'github_pat_…', autocomplete: 'off', spellcheck: false });

  async function saveToken() {
    const value = tokenInput.value.trim();
    if (!value) { toast('Coller d’abord un jeton.', { type: 'error' }); return; }
    tokenInput.value = '';
    render(await api.github.saveToken(value));
    toast('Jeton enregistré');
  }

  async function removeToken() {
    const ok = await confirmDialog({ title: 'Supprimer le jeton ?', message: 'Le jeton enregistré est effacé de cet ordinateur. GitHub CLI sera utilisé s’il est connecté.', confirmLabel: 'Supprimer', danger: true });
    if (!ok) return;
    render(await api.github.saveToken(''));
    toast('Jeton supprimé');
  }

  function render(status) {
    current = status;
    repoInput.placeholder = status.defaultRepo ? `${status.defaultRepo} (dépôt de l’application)` : 'propriétaire/dépôt';
    const source = status.source === 'gh' ? 'GitHub CLI' : status.source === 'token' ? 'le jeton enregistré' : null;
    statusLine.className = `github-status ${status.connected && status.canPush ? 'is-ok' : 'is-error'}`;
    statusLine.replaceChildren(
      uiIcon(status.connected && status.canPush ? 'check' : 'x', 16),
      h('span', {}, status.connected && status.canPush
        ? `Connecté à ${status.repo} en tant que ${status.login}, via ${source}.`
        : `Publication impossible : ${status.error}`),
    );
    tokenActions.replaceChildren(...[
      button('Enregistrer le jeton', { icon: 'save', size: 'small', variant: 'primary', onClick: saveToken }),
      status.hasToken ? button('Supprimer le jeton', { icon: 'trash', size: 'small', variant: 'ghost-danger', onClick: removeToken }) : null,
      button('Tester la connexion', { icon: 'refresh', size: 'small', onClick: refresh }),
    ].filter(Boolean));
  }

  async function refresh() {
    statusLine.className = 'github-status muted';
    statusLine.textContent = 'Vérification de la connexion…';
    try {
      render(await api.github.status());
    } catch (error) {
      render({ ...(current || {}), connected: false, error: errorMessage(error) });
    }
  }

  refresh();

  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, uiIcon('upload', 20), h('div', {}, h('h2', {}, 'Publication sur GitHub'), h('p', { class: 'muted' }, 'Publier les CV générés en releases GitHub, avec leur PDF et leur page HTML.'))),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Dépôt'), repoInput),
    h('p', { class: 'field-hint' }, 'Vide : dépôt de l’application. Les releases de CV ont des tags « cv-… » et ne sont jamais marquées « Latest », les mises à jour de l’application ne sont donc pas affectées. Si le dépôt est public, les CV publiés le sont aussi.'),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Jeton personnel (facultatif si GitHub CLI est connecté)'), tokenInput),
    h('p', { class: 'field-hint' },
      'Jeton à accès précis limité au dépôt, avec la permission « Contents » en lecture et écriture (et la permission de compte « Gists » en lecture et écriture pour la synchronisation). Il est chiffré par Windows et ne quitte pas cet ordinateur. ',
      h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, 'Créer un jeton sur GitHub'),
      '. Sans jeton, l’application utilise celui de GitHub CLI (gh auth login).',
    ),
    tokenActions,
    statusLine,
  );
}

/* ------------------------------------------------------------------ */
/* Synchronisation                                                    */
/* ------------------------------------------------------------------ */

/** Phrase d'état de la synchronisation et sa tonalité. */
export function describeSync(sync) {
  const time = sync?.lastSync ? new Date(sync.lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;
  if (sync?.state === 'error') return { tone: 'error', text: `Synchronisation impossible : ${sync.error}` };
  if (sync?.mode === 'folder') return { tone: 'ok', text: `Données enregistrées dans ${sync.folder}.` };
  if (sync?.mode === 'gist') {
    if (sync.state === 'syncing') return { tone: 'muted', text: 'Synchronisation en cours…' };
    const who = sync.login ? ` (compte ${sync.login})` : '';
    return { tone: 'ok', text: time ? `Synchronisé avec GitHub${who} à ${time}.` : `Synchronisation GitHub active${who}.` };
  }
  return { tone: 'muted', text: 'Les données restent sur ce poste.' };
}

/** Carte « Synchronisation » : aucune, dossier synchronisé ou Gist secret chiffré. */
function createSyncCard(cleanups) {
  const statusLine = h('div', { class: 'github-status' });
  const body = h('div', { class: 'sync-body' });
  let pendingMode = null; // mode choisi mais pas encore activé (formulaire du mot de passe)
  let busy = false;

  const radios = {};
  const modeRadio = (value, label, description) => {
    radios[value] = h('input', { type: 'radio', name: 'sync-mode', value, onChange: () => choose(value) });
    return h('label', { class: 'radio-card' }, radios[value], h('span', {}, h('strong', {}, label), h('span', { class: 'muted' }, description)));
  };

  async function guarded(task) {
    if (busy) return;
    if (state.dirtyGuards.size) { toast('Enregistrer ou abandonner d’abord les modifications en cours.', { type: 'error' }); render(); return; }
    busy = true;
    try {
      await task();
    } catch (error) {
      toast(`Synchronisation : ${errorMessage(error)}`, { type: 'error', duration: 7000 });
    } finally {
      busy = false;
      render();
    }
  }

  async function choose(mode) {
    const current = state.sync.mode;
    if (mode === current) { pendingMode = null; render(); return; }
    if (mode === 'gist') { pendingMode = 'gist'; render(); return; }
    pendingMode = null;
    if (mode === 'folder' || mode === 'folder-change') {
      // « Changer de dossier » repasse par le même choix.
      await guarded(async () => {
        const result = await api.sync.chooseFolder();
        if (result.canceled) return;
        state.sync = result.status;
        toast(result.adopted ? 'Données du dossier synchronisé utilisées' : 'Données copiées dans le dossier synchronisé');
      });
      return;
    }
    const ok = await confirmDialog({
      title: 'Désactiver la synchronisation ?',
      message: current === 'folder'
        ? 'Les données du dossier synchronisé sont recopiées sur ce poste, puis l’application les enregistre de nouveau dans son propre dossier.'
        : 'Ce poste n’enverra plus ses modifications et ne recevra plus celles des autres postes. Les données synchronisées sur GitHub ne sont pas supprimées.',
      confirmLabel: 'Désactiver',
      danger: true,
    });
    if (!ok) { render(); return; }
    await guarded(async () => { state.sync = await api.sync.disable(); toast('Synchronisation désactivée'); });
  }

  function gistForm() {
    const pass = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'Au moins 8 caractères' });
    const confirm = h('input', { class: 'input', type: 'password', autocomplete: 'new-password' });
    const enable = async () => {
      if (pass.value.length < 8) { toast('Le mot de passe doit contenir au moins 8 caractères.', { type: 'error' }); return; }
      if (pass.value !== confirm.value) { toast('Les deux mots de passe sont différents.', { type: 'error' }); return; }
      await guarded(async () => {
        state.sync = await api.sync.enableGist(pass.value);
        pendingMode = null;
        if (state.sync.state === 'error') toast(`Synchronisation : ${state.sync.error}`, { type: 'error', duration: 7000 });
        else toast('Synchronisation GitHub activée');
      });
    };
    return h('div', { class: 'sync-form' },
      h('div', { class: 'grid-2' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Mot de passe de synchronisation'), pass),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Confirmation'), confirm),
      ),
      h('p', { class: 'field-hint' },
        'Utiliser le même mot de passe sur chaque poste. Il chiffre les données avant leur envoi et n’est jamais transmis : GitHub ne voit que des données illisibles, dans un Gist secret de votre compte. ',
        'Sans lui, les données synchronisées ne peuvent pas être relues ; celles de vos postes restent intactes. Le jeton de « Publication sur GitHub » (ou GitHub CLI) est utilisé.'),
      h('div', { class: 'row row--wrap' },
        button('Activer la synchronisation', { icon: 'lock', size: 'small', variant: 'primary', onClick: enable }),
        button('Annuler', { size: 'small', onClick: () => { pendingMode = null; render(); } }),
      ),
    );
  }

  function render() {
    const sync = state.sync;
    const shown = pendingMode || sync.mode || 'off';
    Object.entries(radios).forEach(([value, input]) => { input.checked = value === shown; });
    const { tone, text } = describeSync(sync);
    statusLine.className = `github-status ${tone === 'ok' ? 'is-ok' : tone === 'error' ? 'is-error' : 'muted'}`;
    statusLine.replaceChildren(tone === 'ok' ? uiIcon('check', 16) : tone === 'error' ? uiIcon('x', 16) : uiIcon('cloud', 16), h('span', {}, text));
    const parts = [];
    if (pendingMode === 'gist') parts.push(gistForm());
    else if (sync.mode === 'folder') {
      parts.push(h('div', { class: 'row row--wrap' },
        button('Changer de dossier…', { icon: 'folder', size: 'small', onClick: () => choose('folder-change') }),
        button('Ouvrir le dossier', { icon: 'external', size: 'small', onClick: () => api.openDataFolder() }),
      ));
    } else if (sync.mode === 'gist') {
      parts.push(h('div', { class: 'row row--wrap' },
        button('Synchroniser maintenant', { icon: 'refresh', size: 'small', disabled: sync.state === 'syncing', onClick: () => guarded(async () => { state.sync = await api.sync.now(); }) }),
      ));
    }
    body.replaceChildren(...parts);
  }

  cleanups.push(on('sync', () => render()));
  const card = h('section', { class: 'card' },
    h('div', { class: 'card-head' }, uiIcon('cloud', 20), h('div', {}, h('h2', {}, 'Synchronisation entre postes'), h('p', { class: 'muted' }, 'Retrouver automatiquement le CV de référence et les CV générés sur chacun de vos ordinateurs.'))),
    h('div', { class: 'radio-group radio-group--3' },
      modeRadio('off', 'Désactivée', 'Les données restent uniquement sur ce poste.'),
      modeRadio('folder', 'Dossier synchronisé', 'Les données sont enregistrées dans un dossier de OneDrive, Dropbox ou Google Drive, que ce service synchronise.'),
      modeRadio('gist', 'GitHub, chiffré', 'Les données sont chiffrées par mot de passe puis envoyées dans un Gist secret de votre compte GitHub.'),
    ),
    body,
    statusLine,
  );
  render();
  return card;
}

/* ------------------------------------------------------------------ */
/* Raccourcis                                                         */
/* ------------------------------------------------------------------ */

const SHORTCUT_PLACES = {
  desktop: { icon: 'monitor', where: 'sur le Bureau' },
  startMenu: { icon: 'menu', where: 'dans le menu Démarrer' },
};

/** Phrase d'état d'un emplacement et sa tonalité (ok, warning ou neutre). */
export function describeShortcut(location) {
  const name = `« ${location.name || 'CV Studio.lnk'} »`;
  const target = location.currentTarget ? ` (${location.currentTarget})` : '';
  switch (location.status) {
    case 'ok': return { tone: 'ok', text: `Raccourci présent : ${name}.` };
    case 'other-name': return { tone: 'ok', text: `Un raccourci vers l’application existe déjà sous un autre nom : ${name}.` };
    case 'outdated': return { tone: 'warning', text: `${name} ouvre une autre copie de l’application${target}. Il peut être réparé pour ouvrir cette installation.` };
    case 'broken': return { tone: 'warning', text: `${name} ne fonctionne plus : le programme qu’il ouvre n’existe plus${target}.` };
    case 'foreign': return { tone: 'warning', text: location.currentTarget
      ? `Un fichier ${name} existe déjà, mais il ouvre un autre programme${target}.`
      : `Un fichier ${name} existe déjà, mais ce n’est pas un raccourci lisible.` };
    default: return { tone: 'muted', text: 'Aucun raccourci.' };
  }
}

/** Message affiché après une création, une réparation ou un remplacement. */
export function describeShortcutResult(result, label) {
  const where = SHORTCUT_PLACES[result.location?.id]?.where || label;
  switch (result.outcome) {
    case 'created': return { type: 'info', text: `Raccourci créé ${where}.` };
    case 'repaired': return { type: 'info', text: `Le raccourci existant ${where} a été réparé : il ouvre maintenant cette installation.` };
    case 'replaced': return { type: 'info', text: `L’ancien fichier « CV Studio.lnk » ${where} a été remplacé par un raccourci vers CV Studio.` };
    case 'already': return { type: 'info', text: `Un raccourci existe déjà ${where} (« ${result.location.name} ») : rien n’a été modifié.` };
    case 'removed': return { type: 'info', text: `Raccourci mis à la corbeille (${where}).` };
    case 'missing': return { type: 'info', text: `Il n’y a déjà plus de raccourci ${where}.` };
    default: return { type: 'error', text: `Opération impossible ${where}.` };
  }
}

/** Carte « Raccourcis » : création, réparation et suppression des raccourcis Windows. */
function createShortcutsCard(cleanups) {
  const list = h('div', { class: 'shortcut-list' }, h('p', { class: 'muted' }, 'Recherche des raccourcis…'));
  const footer = h('p', { class: 'field-hint' });
  const rows = new Map();
  let busy = false;

  function renderRow(location) {
    const place = SHORTCUT_PLACES[location.id] || { icon: 'shortcut' };
    const { tone, text } = describeShortcut(location);
    const actions = [];
    if (location.action === 'create') actions.push(button('Créer le raccourci', { icon: 'plus', size: 'small', variant: 'primary', onClick: () => run(location, 'create') }));
    if (location.action === 'repair') actions.push(button('Réparer', { icon: 'refresh', size: 'small', variant: 'primary', onClick: () => run(location, 'create') }));
    if (location.action === 'replace') actions.push(button('Remplacer…', { icon: 'refresh', size: 'small', onClick: () => run(location, 'create') }));
    if (location.file) actions.push(button('', { icon: 'folder', size: 'small', variant: 'ghost', title: 'Afficher dans l’Explorateur', onClick: () => api.shortcuts.reveal(location.id) }));
    if (location.removable) actions.push(button('', { icon: 'trash', size: 'small', variant: 'ghost-danger', title: 'Supprimer le raccourci', onClick: () => run(location, 'remove') }));

    const others = location.others?.length
      ? h('span', { class: 'shortcut-extra muted' }, `Autre${location.others.length > 1 ? 's' : ''} raccourci${location.others.length > 1 ? 's' : ''} vers l’application : ${location.others.map(name => `« ${name} »`).join(', ')}.`)
      : null;

    const row = h('div', { class: `shortcut-row is-${tone}` },
      uiIcon(place.icon, 18),
      h('div', { class: 'shortcut-text' },
        h('strong', {}, location.label),
        h('span', { class: 'shortcut-state' }, tone === 'ok' ? uiIcon('check', 14) : null, h('span', {}, text)),
        others,
        h('span', { class: 'shortcut-dir muted', title: location.dir }, location.dir),
      ),
      h('div', { class: 'row' }, actions),
    );
    const previous = rows.get(location.id);
    if (previous?.isConnected) previous.replaceWith(row);
    else list.append(row);
    rows.set(location.id, row);
  }

  async function run(location, kind) {
    if (busy) return;
    busy = true;
    try {
      let result;
      if (kind === 'remove') {
        const ok = await confirmDialog({
          title: 'Supprimer le raccourci ?',
          message: `« ${location.name} » (${location.label}) sera mis à la corbeille. L’application n’est pas désinstallée.`,
          confirmLabel: 'Supprimer',
          danger: true,
        });
        if (!ok) return;
        result = await api.shortcuts.remove(location.id);
      } else {
        result = await api.shortcuts.create(location.id);
        if (result.outcome === 'conflict') {
          renderRow(result.location);
          const ok = await confirmDialog({
            title: 'Remplacer le fichier existant ?',
            message: `${describeShortcut(result.location).text} Le remplacer par un raccourci vers CV Studio ? L’ancien fichier sera écrasé.`,
            confirmLabel: 'Remplacer',
            danger: true,
          });
          if (!ok) { toast('Le fichier existant a été conservé.'); return; }
          result = await api.shortcuts.create(location.id, { confirmReplace: true });
        }
      }
      renderRow(result.location);
      const message = describeShortcutResult(result, location.label);
      toast(message.text, { type: message.type, duration: 5000 });
    } catch (error) {
      toast(`Raccourci : ${errorMessage(error)}`, { type: 'error', duration: 6000 });
      refresh();
    } finally {
      busy = false;
    }
  }

  async function refresh() {
    try {
      const status = await api.shortcuts.status();
      if (!status.supported) {
        list.replaceChildren(h('p', { class: 'muted' }, 'Les raccourcis ne sont disponibles que sous Windows.'));
        return;
      }
      if (!rows.size) list.replaceChildren();
      status.locations.forEach(renderRow);
      footer.textContent = status.packaged
        ? 'Les raccourcis portent le même nom que ceux de l’installeur : la désinstallation les retire aussi.'
        : 'Version de développement : le raccourci lance Electron avec ce projet.';
    } catch (error) {
      list.replaceChildren(h('p', { class: 'form-error' }, `Lecture des raccourcis impossible : ${errorMessage(error)}`));
    }
  }

  // Un raccourci supprimé ou déplacé depuis l'Explorateur est pris en compte au retour dans l'application.
  const onFocus = () => { if (!busy) refresh(); };
  window.addEventListener('focus', onFocus);
  cleanups.push(() => window.removeEventListener('focus', onFocus));
  refresh();

  return h('section', { class: 'card' },
    h('div', { class: 'card-head' }, uiIcon('shortcut', 20), h('div', {}, h('h2', {}, 'Raccourcis'), h('p', { class: 'muted' }, 'Ouvrir CV Studio depuis le Bureau ou le menu Démarrer.'))),
    list,
    h('div', { class: 'row row--wrap' }, button('Actualiser', { icon: 'refresh', size: 'small', onClick: refresh })),
    footer,
  );
}
