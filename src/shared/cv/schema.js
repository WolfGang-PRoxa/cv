// Schéma du CV : types de blocs, composants et champs éditables.
// Ce schéma sert à la fois :
// - à l'éditeur (formulaires générés automatiquement) ;
// - à l'arbre des éléments (sélection, masquage dans les CV générés) ;
// - à la création de nouveaux éléments avec des valeurs par défaut.

import { newId } from './ids.js';
import { textOnly } from './markup.js';

export const SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Options partagées                                                  */
/* ------------------------------------------------------------------ */

export const REVEAL_OPTIONS = [
  { value: 'fade-up', label: 'Fondu vers le haut' },
  { value: 'fade', label: 'Fondu' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'slide', label: 'Glissement depuis la gauche' },
  { value: 'none', label: 'Aucune' },
];

const BLOCK_ANIMATION_FIELD = {
  key: 'animation',
  label: 'Animation d’apparition',
  type: 'select',
  options: [{ value: 'inherit', label: 'Réglage général du CV' }, ...REVEAL_OPTIONS],
  default: 'inherit',
};

export const ZONES = [
  { key: 'top', label: 'Haut de page', hint: 'Pleine largeur, sous l’en-tête' },
  { key: 'main', label: 'Colonne principale', hint: 'Colonne large, à gauche' },
  { key: 'side', label: 'Colonne latérale', hint: 'Colonne étroite, à droite' },
];

/* ------------------------------------------------------------------ */
/* Fabriques de champs                                                */
/* ------------------------------------------------------------------ */

const textList = (key, label, itemLabel = 'Élément') => ({
  key,
  label,
  type: 'list',
  compact: true,
  itemLabel,
  fields: [{ key: 'text', label: 'Texte', type: 'text' }],
  create: () => ({ id: newId('t'), text: '' }),
  describe: item => textOnly(item.text) || '(vide)',
});

const keyValueList = (key, label) => ({
  key,
  label,
  type: 'list',
  itemLabel: 'Ligne',
  fields: [
    { key: 'key', label: 'Libellé', type: 'text' },
    { key: 'value', label: 'Valeur', type: 'text' },
  ],
  create: () => ({ id: newId('kv'), key: 'Libellé', value: 'Valeur' }),
  describe: item => [textOnly(item.key), textOnly(item.value)].filter(Boolean).join(' : ') || '(vide)',
});

/* ------------------------------------------------------------------ */
/* Composants (contenu des encadrés et des fenêtres détaillées)       */
/* ------------------------------------------------------------------ */

export const COMPONENT_TYPES = {
  /* -- Résumé (dans l'encadré du CV) -- */
  bullets: {
    label: 'Liste à puces',
    contexts: ['summary', 'detail'],
    fields: [{
      key: 'items',
      label: 'Puces',
      type: 'list',
      itemLabel: 'Puce',
      fields: [
        { key: 'lead', label: 'Début en gras (facultatif)', type: 'text', placeholder: 'Ex. : Sports :' },
        { key: 'text', label: 'Texte', type: 'rich' },
      ],
      create: () => ({ id: newId('b'), lead: '', text: 'Nouvelle puce' }),
      describe: item => [textOnly(item.lead), textOnly(item.text)].filter(Boolean).join(' ') || '(vide)',
    }],
    create: () => ({ id: newId('c'), type: 'bullets', items: [{ id: newId('b'), lead: '', text: 'Nouvelle puce' }] }),
    describe: c => `${c.items?.length || 0} puce(s)`,
  },
  keyvalues: {
    label: 'Lignes libellé / valeur',
    contexts: ['summary', 'detail'],
    fields: [keyValueList('items', 'Lignes')],
    create: () => ({ id: newId('c'), type: 'keyvalues', items: [{ id: newId('kv'), key: 'Libellé', value: 'Valeur' }] }),
    describe: c => (c.items || []).map(i => textOnly(i.key)).join(', '),
  },
  tags: {
    label: 'Étiquettes',
    contexts: ['summary', 'detail'],
    fields: [textList('items', 'Étiquettes', 'Étiquette')],
    create: () => ({ id: newId('c'), type: 'tags', items: [{ id: newId('t'), text: 'Étiquette' }] }),
    describe: c => (c.items || []).map(i => textOnly(i.text)).join(', '),
  },
  subheading: {
    label: 'Sous-titre',
    contexts: ['summary'],
    fields: [{ key: 'text', label: 'Texte', type: 'text' }],
    create: () => ({ id: newId('c'), type: 'subheading', text: 'Sous-titre' }),
    describe: c => textOnly(c.text),
  },
  divider: {
    label: 'Séparateur',
    contexts: ['summary'],
    fields: [],
    create: () => ({ id: newId('c'), type: 'divider' }),
    describe: () => '',
  },
  paragraph: {
    label: 'Paragraphe',
    contexts: ['summary', 'detail'],
    fields: [{ key: 'text', label: 'Texte', type: 'rich' }],
    create: () => ({ id: newId('c'), type: 'paragraph', text: 'Nouveau paragraphe' }),
    describe: c => textOnly(c.text).slice(0, 60),
  },
  image: {
    label: 'Image',
    contexts: ['summary', 'detail'],
    fields: [
      { key: 'src', label: 'Image', type: 'image' },
      { key: 'alt', label: 'Description de l’image (accessibilité)', type: 'text' },
    ],
    create: () => ({ id: newId('c'), type: 'image', src: '', alt: '' }),
    describe: c => textOnly(c.alt),
  },

  /* -- Fenêtre détaillée -- */
  label: {
    label: 'Intitulé de section',
    contexts: ['detail'],
    fields: [{ key: 'text', label: 'Texte', type: 'text' }],
    create: () => ({ id: newId('c'), type: 'label', text: 'Intitulé' }),
    describe: c => textOnly(c.text),
  },
  note: {
    label: 'Note discrète',
    contexts: ['detail'],
    fields: [{ key: 'text', label: 'Texte', type: 'rich' }],
    create: () => ({ id: newId('c'), type: 'note', text: 'Note' }),
    describe: c => textOnly(c.text).slice(0, 60),
  },
  profile: {
    label: 'Bandeau de profil',
    contexts: ['detail'],
    fields: [
      { key: 'icon', label: 'Icône', type: 'icon' },
      { key: 'name', label: 'Nom', type: 'text' },
      { key: 'subtitle', label: 'Sous-titre', type: 'text' },
      { key: 'url', label: 'Lien', type: 'url' },
      { key: 'linkLabel', label: 'Texte du lien', type: 'text' },
    ],
    create: () => ({ id: newId('c'), type: 'profile', icon: 'github', name: 'Nom du profil', subtitle: 'Profil public', url: 'https://', linkLabel: 'Ouvrir le profil' }),
    describe: c => textOnly(c.name),
  },
  projects: {
    label: 'Projets',
    contexts: ['detail'],
    fields: [{
      key: 'items',
      label: 'Projets',
      type: 'list',
      itemLabel: 'Projet',
      fields: [
        { key: 'icon', label: 'Icône', type: 'icon', logos: false },
        { key: 'accent', label: 'Couleur de l’icône', type: 'select', options: [{ value: 'blue', label: 'Bleu' }, { value: 'violet', label: 'Violet' }], default: 'blue' },
        { key: 'kind', label: 'Catégorie', type: 'text' },
        { key: 'title', label: 'Titre', type: 'text' },
        { key: 'text', label: 'Description', type: 'rich' },
        textList('tags', 'Étiquettes', 'Étiquette'),
        { key: 'url', label: 'Lien', type: 'url' },
        { key: 'linkLabel', label: 'Texte du lien', type: 'text' },
      ],
      create: () => ({ id: newId('p'), icon: 'cube', accent: 'blue', kind: 'Catégorie', title: 'Nouveau projet', text: '', tags: [], url: '', linkLabel: 'Voir le dépôt' }),
      describe: item => textOnly(item.title) || '(sans titre)',
    }],
    create: () => ({ id: newId('c'), type: 'projects', items: [] }),
    describe: c => (c.items || []).map(i => textOnly(i.title)).join(', '),
  },
  tiles: {
    label: 'Tuiles avec logo',
    contexts: ['detail'],
    fields: [{
      key: 'items',
      label: 'Tuiles',
      type: 'list',
      itemLabel: 'Tuile',
      fields: [
        { key: 'logo', label: 'Logo', type: 'icon', logos: true },
        { key: 'title', label: 'Titre', type: 'text' },
        { key: 'subtitle', label: 'Sous-titre', type: 'text' },
      ],
      create: () => ({ id: newId('tile'), logo: 'monitor', title: 'Nouveau logiciel', subtitle: '' }),
      describe: item => textOnly(item.title) || '(sans titre)',
    }],
    create: () => ({ id: newId('c'), type: 'tiles', items: [] }),
    describe: c => (c.items || []).map(i => textOnly(i.title)).join(', '),
  },
  infopanels: {
    label: 'Panneaux d’information',
    contexts: ['detail'],
    fields: [{
      key: 'items',
      label: 'Panneaux',
      type: 'list',
      itemLabel: 'Panneau',
      fields: [
        { key: 'icon', label: 'Icône', type: 'icon', logos: false },
        { key: 'title', label: 'Titre', type: 'text' },
        textList('chips', 'Pastilles', 'Pastille'),
        keyValueList('lines', 'Lignes libellé / valeur'),
        { key: 'note', label: 'Note (facultative)', type: 'rich' },
      ],
      create: () => ({ id: newId('ip'), icon: 'info', title: 'Nouveau panneau', chips: [], lines: [], note: '' }),
      describe: item => textOnly(item.title) || '(sans titre)',
    }],
    create: () => ({ id: newId('c'), type: 'infopanels', items: [] }),
    describe: c => (c.items || []).map(i => textOnly(i.title)).join(', '),
  },
  cards: {
    label: 'Cartes descriptives',
    contexts: ['detail'],
    fields: [{
      key: 'items',
      label: 'Cartes',
      type: 'list',
      itemLabel: 'Carte',
      fields: [
        { key: 'icon', label: 'Icône', type: 'icon', logos: false },
        { key: 'title', label: 'Titre', type: 'text' },
        { key: 'text', label: 'Texte', type: 'rich' },
        { key: 'wide', label: 'Pleine largeur', type: 'checkbox' },
        {
          key: 'timeline',
          label: 'Frise (période + intitulé)',
          type: 'list',
          itemLabel: 'Période',
          fields: [
            { key: 'period', label: 'Période', type: 'text' },
            { key: 'label', label: 'Intitulé', type: 'text' },
          ],
          create: () => ({ id: newId('tl'), period: '2020 – 2021', label: 'Intitulé' }),
          describe: item => [item.period, item.label].filter(Boolean).join(' · '),
        },
        textList('pills', 'Pastilles', 'Pastille'),
        {
          key: 'entries',
          label: 'Sous-cartes',
          type: 'list',
          itemLabel: 'Sous-carte',
          fields: [
            { key: 'title', label: 'Titre', type: 'text' },
            { key: 'badge', label: 'Badge', type: 'text' },
            { key: 'text', label: 'Texte', type: 'rich' },
            textList('pills', 'Pastilles', 'Pastille'),
          ],
          create: () => ({ id: newId('ent'), title: 'Nouvelle sous-carte', badge: '', text: '', pills: [] }),
          describe: item => textOnly(item.title) || '(sans titre)',
        },
      ],
      create: () => ({ id: newId('card'), icon: 'star', title: 'Nouvelle carte', text: '', wide: false, timeline: [], pills: [], entries: [] }),
      describe: item => textOnly(item.title) || '(sans titre)',
    }],
    create: () => ({ id: newId('c'), type: 'cards', items: [] }),
    describe: c => (c.items || []).map(i => textOnly(i.title)).join(', '),
  },
  score: {
    label: 'Score mis en avant',
    contexts: ['detail'],
    fields: [
      { key: 'label', label: 'Libellé', type: 'text' },
      { key: 'value', label: 'Valeur', type: 'text' },
    ],
    create: () => ({ id: newId('c'), type: 'score', label: 'Score', value: '100' }),
    describe: c => [c.label, c.value].filter(Boolean).join(' '),
  },
};

export function componentChoices(context) {
  return Object.entries(COMPONENT_TYPES)
    .filter(([, def]) => def.contexts.includes(context))
    .map(([value, def]) => ({ value, label: def.label }));
}

/* ------------------------------------------------------------------ */
/* Fenêtre détaillée                                                  */
/* ------------------------------------------------------------------ */

const DETAIL_FIELD = {
  key: 'detail',
  label: 'Fenêtre détaillée',
  type: 'group',
  hideable: true,
  fields: [
    { key: 'enabled', label: 'Ouvrir une fenêtre détaillée au clic', type: 'checkbox' },
    { key: 'kicker', label: 'Surtitre', type: 'text' },
    { key: 'title', label: 'Titre', type: 'text' },
    { key: 'subtitle', label: 'Sous-titre', type: 'text' },
    { key: 'components', label: 'Contenu de la fenêtre', type: 'components', context: 'detail' },
  ],
};

const newDetail = title => ({ id: newId('detail'), enabled: false, kicker: '', title, subtitle: '', components: [] });

/* ------------------------------------------------------------------ */
/* Blocs (rubriques placées dans les zones du CV)                     */
/* ------------------------------------------------------------------ */

export const BLOCK_TYPES = {
  timeline: {
    label: 'Rubrique chronologique',
    description: 'Formations, expériences… avec dates et intitulés.',
    fields: [
      { key: 'title', label: 'Titre de la rubrique', type: 'text' },
      {
        key: 'items',
        label: 'Entrées',
        type: 'list',
        itemLabel: 'Entrée',
        fields: [
          { key: 'date', label: 'Date (retour à la ligne possible)', type: 'textarea', rows: 2 },
          { key: 'title', label: 'Intitulé', type: 'text' },
          { key: 'meta', label: 'Lieu / précisions', type: 'text' },
          textList('details', 'Détails', 'Détail'),
        ],
        create: () => ({ id: newId('item'), date: 'Année', title: 'Nouvelle entrée', meta: '', details: [] }),
        describe: item => [textOnly(item.date), textOnly(item.title)].filter(Boolean).join(' · ') || '(vide)',
      },
      BLOCK_ANIMATION_FIELD,
    ],
    create: () => ({ id: newId('blk'), type: 'timeline', title: 'Nouvelle rubrique', items: [], animation: 'inherit' }),
    describe: b => textOnly(b.title),
  },
  panel: {
    label: 'Encadré',
    description: 'Encadré libre (listes, étiquettes, lignes…) avec fenêtre détaillée facultative.',
    fields: [
      { key: 'title', label: 'Titre de l’encadré', type: 'text' },
      { key: 'components', label: 'Contenu de l’encadré', type: 'components', context: 'summary' },
      DETAIL_FIELD,
      BLOCK_ANIMATION_FIELD,
    ],
    create: () => ({ id: newId('blk'), type: 'panel', title: 'Nouvel encadré', components: [], detail: newDetail('Nouvel encadré'), animation: 'inherit' }),
    describe: b => textOnly(b.title),
  },
  linkcard: {
    label: 'Carte lien',
    description: 'Carte colorée avec icône (profil GitHub, portfolio…).',
    fields: [
      { key: 'kicker', label: 'Petit intitulé', type: 'text' },
      { key: 'label', label: 'Texte principal', type: 'text' },
      { key: 'icon', label: 'Icône', type: 'icon', logos: false },
      { key: 'url', label: 'Lien (utilisé si aucune fenêtre détaillée)', type: 'url' },
      DETAIL_FIELD,
      BLOCK_ANIMATION_FIELD,
    ],
    create: () => ({ id: newId('blk'), type: 'linkcard', kicker: 'Profil', label: 'Nom ↗', icon: 'link', url: '', detail: newDetail('Profil'), animation: 'inherit' }),
    describe: b => [textOnly(b.kicker), textOnly(b.label)].filter(Boolean).join(' · '),
  },
  score: {
    label: 'Encadré certification',
    description: 'Titre, score et visuel (certification, diplôme…).',
    fields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'score', label: 'Score / mention', type: 'text' },
      { key: 'image', label: 'Visuel', type: 'image' },
      { key: 'imageAlt', label: 'Description du visuel (accessibilité)', type: 'text' },
      DETAIL_FIELD,
      BLOCK_ANIMATION_FIELD,
    ],
    create: () => ({ id: newId('blk'), type: 'score', title: 'Certification', score: '', image: '', imageAlt: '', detail: newDetail('Certification'), animation: 'inherit' }),
    describe: b => [textOnly(b.title), textOnly(b.score)].filter(Boolean).join(' · '),
  },
  banner: {
    label: 'Bandeau',
    description: 'Message mis en avant (disponibilité, objectif…).',
    fields: [
      { key: 'icon', label: 'Icône', type: 'icon', logos: false },
      { key: 'label', label: 'Intitulé', type: 'text' },
      { key: 'text', label: 'Texte', type: 'rich' },
      BLOCK_ANIMATION_FIELD,
    ],
    create: () => ({ id: newId('blk'), type: 'banner', icon: 'info', label: 'Intitulé', text: 'Texte du bandeau', animation: 'inherit' }),
    describe: b => textOnly(b.text).slice(0, 60),
  },
};

export function blockChoices() {
  return Object.entries(BLOCK_TYPES).map(([value, def]) => ({ value, label: def.label, description: def.description }));
}

/* ------------------------------------------------------------------ */
/* En-tête, document, animations, actions                             */
/* ------------------------------------------------------------------ */

export const CONTACT_TYPES = [
  { value: 'phone', label: 'Téléphone (copie au clic)', icon: 'phone' },
  { value: 'email', label: 'E-mail (copie au clic)', icon: 'mail' },
  { value: 'location', label: 'Localisation (ouvre Google Maps)', icon: 'pin' },
  { value: 'link', label: 'Lien', icon: 'link' },
  { value: 'text', label: 'Texte simple', icon: 'license' },
];

export const HERO_FIELDS = [
  { key: 'photo', label: 'Photo', type: 'image' },
  { key: 'photoAlt', label: 'Description de la photo (accessibilité)', type: 'text' },
  { key: 'firstName', label: 'Prénom (première ligne du titre)', type: 'text' },
  { key: 'lastName', label: 'Nom (deuxième ligne du titre)', type: 'text' },
  { key: 'subtitle', label: 'Sous-titre', type: 'text' },
  {
    key: 'contacts',
    label: 'Coordonnées',
    type: 'list',
    itemLabel: 'Coordonnée',
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: CONTACT_TYPES.map(({ value, label }) => ({ value, label })) },
      { key: 'value', label: 'Texte affiché', type: 'text' },
      { key: 'url', label: 'Lien ou recherche Google Maps (facultatif)', type: 'text', showIf: item => item.type === 'link' || item.type === 'location' },
      { key: 'icon', label: 'Icône', type: 'icon', logos: false },
    ],
    create: () => ({ id: newId('contact'), type: 'text', value: 'Nouvelle coordonnée', url: '', icon: 'info' }),
    describe: item => textOnly(item.value) || '(vide)',
  },
];

export const DOCUMENT_FIELDS = [
  { key: 'title', label: 'Titre de la page (onglet du navigateur)', type: 'text' },
  { key: 'description', label: 'Description (métadonnée)', type: 'textarea', rows: 2 },
  { key: 'lang', label: 'Langue du document', type: 'select', options: [{ value: 'fr', label: 'Français' }, { value: 'en', label: 'Anglais' }] },
  { key: 'footerLeft', label: 'Pied de page : texte à gauche (facultatif)', type: 'text' },
  { key: 'footerRight', label: 'Pied de page : texte à droite (facultatif)', type: 'text' },
];

export const ACTION_FIELDS = [
  { key: 'download', label: 'Afficher le bouton « Télécharger / Imprimer »', type: 'checkbox' },
  { key: 'theme', label: 'Afficher le bouton « Mode jour / nuit »', type: 'checkbox' },
  { key: 'defaultTheme', label: 'Thème à l’ouverture', type: 'select', options: [{ value: 'light', label: 'Jour' }, { value: 'dark', label: 'Nuit' }] },
];

export const ANIMATION_FIELDS = [
  { key: 'cardArrive', label: 'Arrivée de la carte à l’ouverture', type: 'checkbox' },
  { key: 'cardArriveDuration', label: 'Durée de l’arrivée', type: 'number', min: 100, max: 3000, step: 50, unit: 'ms', showIf: a => a.cardArrive },
  { key: 'reveal', label: 'Apparition des rubriques au défilement', type: 'select', options: REVEAL_OPTIONS },
  { key: 'revealDuration', label: 'Durée de l’apparition', type: 'number', min: 100, max: 3000, step: 50, unit: 'ms', showIf: a => a.reveal !== 'none' },
  { key: 'revealStagger', label: 'Décalage entre rubriques voisines', type: 'number', min: 0, max: 500, step: 5, unit: 'ms', showIf: a => a.reveal !== 'none' },
  { key: 'tilt', label: 'Inclinaison 3D de la carte selon la souris', type: 'checkbox' },
  { key: 'tiltX', label: 'Inclinaison maximale haut / bas', type: 'number', min: 0, max: 10, step: 0.1, unit: '°', showIf: a => a.tilt },
  { key: 'tiltY', label: 'Inclinaison maximale gauche / droite', type: 'number', min: 0, max: 10, step: 0.1, unit: '°', showIf: a => a.tilt },
  { key: 'hover', label: 'Effets de survol (soulèvement des cartes et boutons)', type: 'checkbox' },
  { key: 'modal', label: 'Ouverture des fenêtres détaillées', type: 'select', options: [{ value: 'depth', label: 'En profondeur' }, { value: 'fade', label: 'Fondu' }, { value: 'none', label: 'Instantanée' }] },
];

export const DEFAULT_ANIMATIONS = {
  cardArrive: true,
  cardArriveDuration: 850,
  reveal: 'fade-up',
  revealDuration: 650,
  revealStagger: 65,
  tilt: true,
  tiltX: 1.6,
  tiltY: 2.2,
  hover: true,
  modal: 'depth',
};

export const DEFAULT_ACTIONS = { download: true, theme: true, defaultTheme: 'light' };

/** CV vide, point de départ d'une nouvelle base. */
export function createEmptyCv() {
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 1,
    document: { title: 'CV', description: '', lang: 'fr', footerLeft: '', footerRight: '' },
    animations: { ...DEFAULT_ANIMATIONS },
    actions: { ...DEFAULT_ACTIONS },
    hero: { id: 'hero', photo: '', photoAlt: '', firstName: 'Prénom', lastName: 'Nom', subtitle: '', contacts: [] },
    zones: { top: [], main: [], side: [] },
  };
}

/** Complète un CV chargé avec les valeurs par défaut manquantes. */
export function normalizeCv(cv) {
  const base = createEmptyCv();
  const result = { ...base, ...cv };
  result.document = { ...base.document, ...(cv.document || {}) };
  result.animations = { ...DEFAULT_ANIMATIONS, ...(cv.animations || {}) };
  result.actions = { ...DEFAULT_ACTIONS, ...(cv.actions || {}) };
  result.hero = { ...base.hero, ...(cv.hero || {}) };
  result.zones = { top: [], main: [], side: [], ...(cv.zones || {}) };
  return result;
}

/* ------------------------------------------------------------------ */
/* Parcours de l'arbre des éléments                                   */
/* ------------------------------------------------------------------ */

/**
 * Construit l'arbre des éléments identifiés du CV.
 * Chaque nœud : { id, label, kind, path, children }.
 * `path` désigne l'objet dans le CV (suite de clés), ce qui permet de l'éditer.
 */
export function buildTree(cv) {
  const nodes = [];

  const listChildren = (fields, owner, path) => {
    const children = [];
    for (const field of fields || []) {
      const value = owner?.[field.key];
      if (field.type === 'list' && Array.isArray(value)) {
        value.forEach((item, index) => {
          if (!item?.id) return;
          children.push({
            id: item.id,
            label: field.describe ? field.describe(item) : field.itemLabel,
            kind: field.itemLabel,
            path: [...path, field.key, index],
            children: listChildren(field.fields, item, [...path, field.key, index]),
          });
        });
      } else if (field.type === 'components' && Array.isArray(value)) {
        value.forEach((component, index) => {
          const def = COMPONENT_TYPES[component.type];
          if (!def || !component.id) return;
          const componentPath = [...path, field.key, index];
          children.push({
            id: component.id,
            label: def.describe(component) || def.label,
            kind: def.label,
            path: componentPath,
            children: listChildren(def.fields, component, componentPath),
          });
        });
      } else if (field.type === 'group' && value && typeof value === 'object') {
        const groupPath = [...path, field.key];
        const groupChildren = listChildren(field.fields, value, groupPath);
        if (field.hideable && value.id) {
          if (value.enabled === false) continue;
          children.push({ id: value.id, label: value.title || field.label, kind: field.label, path: groupPath, children: groupChildren });
        } else {
          children.push(...groupChildren);
        }
      }
    }
    return children;
  };

  nodes.push({
    id: cv.hero.id || 'hero',
    label: [cv.hero.firstName, cv.hero.lastName].filter(Boolean).join(' ') || 'En-tête',
    kind: 'En-tête',
    locked: true, // l'en-tête reste toujours affiché ; ses coordonnées peuvent être masquées
    path: ['hero'],
    children: listChildren(HERO_FIELDS, cv.hero, ['hero']),
  });

  for (const zone of ZONES) {
    (cv.zones[zone.key] || []).forEach((block, index) => {
      const def = BLOCK_TYPES[block.type];
      if (!def) return;
      const path = ['zones', zone.key, index];
      nodes.push({
        id: block.id,
        label: def.describe(block) || def.label,
        kind: def.label,
        zone: zone.key,
        path,
        children: listChildren(def.fields, block, path),
      });
    });
  }
  return nodes;
}

/** Index id → nœud de l'arbre (avec parent). */
export function indexTree(nodes) {
  const index = new Map();
  const visit = (node, parent) => {
    index.set(node.id, { ...node, parent: parent?.id || null });
    node.children.forEach(child => visit(child, node));
  };
  nodes.forEach(node => visit(node, null));
  return index;
}

/** Lit la valeur désignée par un chemin. */
export function getAtPath(object, path) {
  return path.reduce((value, key) => (value == null ? undefined : value[key]), object);
}

/** Recherche le chemin d'un élément à partir de son identifiant. */
export function findPathById(cv, id) {
  let found = null;
  const visit = (node, path) => {
    if (found || !node || typeof node !== 'object') return;
    if (!Array.isArray(node) && node.id === id) { found = path; return; }
    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === 'object') visit(value, [...path, Array.isArray(node) ? Number(key) : key]);
    }
  };
  visit(cv, []);
  return found;
}
