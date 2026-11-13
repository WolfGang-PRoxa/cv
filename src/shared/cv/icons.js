// Bibliothèque d'icônes du CV.
// - kind "stroke" : icône au trait (24×24), couleur héritée du texte.
// - kind "fill"   : icône pleine (24×24), couleur héritée du texte.
// - kind "logo"   : logo en couleurs, SVG complet.
// Les logos d'IntelliJ IDEA et de GIMP proviennent de Simple Icons (licence CC0).

export const ICONS = {
  "phone": {
    "label": "Téléphone",
    "kind": "stroke",
    "body": "<path d=\"M6.6 3.8 9 3l2.1 5-2 1.6a15 15 0 0 0 5.3 5.3l1.6-2 5 2.1-.8 2.4a3 3 0 0 1-3.2 2.1A17 17 0 0 1 4.5 7a3 3 0 0 1 2.1-3.2Z\"/>"
  },
  "pin": {
    "label": "Localisation",
    "kind": "stroke",
    "body": "<path d=\"M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z\"/><circle cx=\"12\" cy=\"10\" r=\"2.5\"/>"
  },
  "mail": {
    "label": "E-mail",
    "kind": "stroke",
    "body": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m3 7 9 6 9-6\"/>"
  },
  "license": {
    "label": "Validation / permis",
    "kind": "stroke",
    "body": "<path d=\"M4 12.5 9 17l11-11\"/><path d=\"M12 3h7a2 2 0 0 1 2 2v7\"/>"
  },
  "calendar-check": {
    "label": "Calendrier",
    "kind": "stroke",
    "body": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M16 3v4M8 3v4M3 10h18\"/><path d=\"m9 15 2 2 4-4\"/>"
  },
  "download": {
    "label": "Téléchargement",
    "kind": "stroke",
    "body": "<path d=\"M12 3v12m0 0 4-4m-4 4-4-4\"/><path d=\"M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3\"/>"
  },
  "external": {
    "label": "Lien externe",
    "kind": "stroke",
    "body": "<path d=\"M14 4h6v6m-11 4L20 4\"/><path d=\"M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6\"/>"
  },
  "cube": {
    "label": "Cube / paquet",
    "kind": "stroke",
    "body": "<path d=\"m12 2 9 5v10l-9 5-9-5V7l9-5Z\"/><path d=\"m3 7 9 5 9-5M12 12v10\"/><path d=\"m7.5 4.5 9 5\" opacity=\".8\"/>"
  },
  "arrow-up-right": {
    "label": "Flèche diagonale",
    "kind": "stroke",
    "body": "<path d=\"M7 17 17 7M7 7h10v10\"/>"
  },
  "eye-off": {
    "label": "Œil barré",
    "kind": "stroke",
    "body": "<path d=\"M3 11.5S6.2 6 12 6s9 5.5 9 5.5-3.2 5.5-9 5.5-9-5.5-9-5.5Z\"/><circle cx=\"12\" cy=\"11.5\" r=\"2.7\"/><path d=\"M4 4 20 20\" opacity=\".75\"/>"
  },
  "users": {
    "label": "Personnes",
    "kind": "stroke",
    "body": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75\"/>"
  },
  "book": {
    "label": "Livre",
    "kind": "stroke",
    "body": "<path d=\"M2 4.5h6a4 4 0 0 1 4 4V20a3 3 0 0 0-3-3H2Z\"/><path d=\"M22 4.5h-6a4 4 0 0 0-4 4V20a3 3 0 0 1 3-3h7Z\"/>"
  },
  "ball": {
    "label": "Ballon / sport",
    "kind": "stroke",
    "body": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m8 4 4 4 5-1 2 5-4 4 1 4M4 9l5 1 2 5-3 4\"/>"
  },
  "code": {
    "label": "Code",
    "kind": "stroke",
    "body": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"m8 9-3 3 3 3m8-6 3 3-3 3m-3-7-2 8\"/>"
  },
  "user-plus": {
    "label": "Bénévolat / ajout de personne",
    "kind": "stroke",
    "body": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M19 8v6m-3-3h6\"/>"
  },
  "briefcase": {
    "label": "Mallette",
    "kind": "stroke",
    "body": "<rect x=\"2\" y=\"7\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"/>"
  },
  "graduation": {
    "label": "Diplôme",
    "kind": "stroke",
    "body": "<path d=\"M22 10 12 5 2 10l10 5 10-5Z\"/><path d=\"M6 12v5c3 3 9 3 12 0v-5\"/>"
  },
  "star": {
    "label": "Étoile",
    "kind": "stroke",
    "body": "<path d=\"m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z\"/>"
  },
  "heart": {
    "label": "Cœur",
    "kind": "stroke",
    "body": "<path d=\"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z\"/>"
  },
  "globe": {
    "label": "Globe / langues",
    "kind": "stroke",
    "body": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z\"/>"
  },
  "award": {
    "label": "Récompense",
    "kind": "stroke",
    "body": "<circle cx=\"12\" cy=\"8\" r=\"7\"/><path d=\"M8.21 13.89 7 23l5-3 5 3-1.21-9.12\"/>"
  },
  "link": {
    "label": "Lien",
    "kind": "stroke",
    "body": "<path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\"/><path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\"/>"
  },
  "info": {
    "label": "Information",
    "kind": "stroke",
    "body": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4M12 8h.01\"/>"
  },
  "car": {
    "label": "Voiture",
    "kind": "stroke",
    "body": "<path d=\"M5 17H3v-5l2-5h14l2 5v5h-2\"/><circle cx=\"7.5\" cy=\"17\" r=\"2\"/><circle cx=\"16.5\" cy=\"17\" r=\"2\"/><path d=\"M9.5 17h5M3 12h18\"/>"
  },
  "music": {
    "label": "Musique",
    "kind": "stroke",
    "body": "<path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/>"
  },
  "camera": {
    "label": "Appareil photo",
    "kind": "stroke",
    "body": "<path d=\"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/>"
  },
  "folder": {
    "label": "Dossier",
    "kind": "stroke",
    "body": "<path d=\"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z\"/>"
  },
  "tool": {
    "label": "Outil",
    "kind": "stroke",
    "body": "<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z\"/>"
  },
  "monitor": {
    "label": "Écran",
    "kind": "stroke",
    "body": "<rect x=\"2\" y=\"3\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M8 21h8M12 17v4\"/>"
  },
  "github": {
    "label": "GitHub",
    "kind": "fill",
    "body": "<path d=\"M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.31-3.76-1.31-.5-1.28-1.24-1.62-1.24-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1.77 2.05 3.4 1.45.1-.72.39-1.21.7-1.49-2.48-.28-5.08-1.24-5.08-5.53 0-1.22.44-2.21 1.15-2.99-.12-.28-.5-1.42.11-2.95 0 0 .94-.3 3.08 1.14a10.7 10.7 0 0 1 5.6 0c2.14-1.44 3.08-1.14 3.08-1.14.61 1.53.23 2.67.11 2.95.72.78 1.15 1.77 1.15 2.99 0 4.3-2.6 5.25-5.09 5.53.4.35.75 1.03.75 2.08v3.07c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z\"/>"
  },
  "excel": {
    "label": "Microsoft Excel",
    "kind": "logo",
    "svg": "<svg viewBox=\"0 0 64 64\"><defs><clipPath id=\"sw-excel-doc\"><rect x=\"17\" y=\"5\" width=\"43\" height=\"54\" rx=\"7\"/></clipPath></defs><g clip-path=\"url(#sw-excel-doc)\"><rect x=\"17\" y=\"5\" width=\"43\" height=\"27\" fill=\"#21A366\"/><rect x=\"38.5\" y=\"5\" width=\"21.5\" height=\"27\" fill=\"#33C481\"/><rect x=\"17\" y=\"32\" width=\"43\" height=\"27\" fill=\"#107C41\"/><rect x=\"38.5\" y=\"32\" width=\"21.5\" height=\"27\" fill=\"#185C37\"/></g><rect x=\"4\" y=\"18\" width=\"31\" height=\"29\" rx=\"5\" fill=\"#107C41\"/><path d=\"m13.5 26 12 13m0-13-12 13\" fill=\"none\" stroke=\"#fff\" stroke-width=\"3.6\" stroke-linecap=\"round\"/></svg>"
  },
  "word": {
    "label": "Microsoft Word",
    "kind": "logo",
    "svg": "<svg viewBox=\"0 0 64 64\"><defs><clipPath id=\"sw-word-doc\"><rect x=\"17\" y=\"5\" width=\"43\" height=\"54\" rx=\"7\"/></clipPath></defs><g clip-path=\"url(#sw-word-doc)\"><rect x=\"17\" y=\"5\" width=\"43\" height=\"14\" fill=\"#41A5EE\"/><rect x=\"17\" y=\"19\" width=\"43\" height=\"13\" fill=\"#2B7CD3\"/><rect x=\"17\" y=\"32\" width=\"43\" height=\"14\" fill=\"#185ABD\"/><rect x=\"17\" y=\"46\" width=\"43\" height=\"13\" fill=\"#103F91\"/></g><rect x=\"4\" y=\"18\" width=\"31\" height=\"29\" rx=\"5\" fill=\"#185ABD\"/><path d=\"m10.5 26 3.6 13 5.4-10.5 5.4 10.5 3.6-13\" fill=\"none\" stroke=\"#fff\" stroke-width=\"3.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>"
  },
  "powerpoint": {
    "label": "Microsoft PowerPoint",
    "kind": "logo",
    "svg": "<svg viewBox=\"0 0 64 64\"><circle cx=\"37\" cy=\"32\" r=\"25\" fill=\"#ED6C47\"/><path d=\"M37 7a25 25 0 0 1 25 25H37Z\" fill=\"#FF8F6B\"/><path d=\"M12 32a25 25 0 0 1 25-25v25Z\" fill=\"#D35230\"/><rect x=\"4\" y=\"18\" width=\"31\" height=\"29\" rx=\"5\" fill=\"#C43E1C\"/><path d=\"M14.5 40V25h6.2c3.7 0 5.8 1.8 5.8 4.9s-2.1 4.9-5.8 4.9h-2.6V40Zm3.6-8.1h2.4c1.7 0 2.5-.7 2.5-2s-.8-2-2.5-2h-2.4Z\" fill=\"#fff\"/></svg>"
  },
  "vscode": {
    "label": "Visual Studio Code",
    "kind": "logo",
    "svg": "<svg viewBox=\"0 0 100 100\"><path d=\"M70.9 99.3a6.2 6.2 0 0 0 5-.2l20.6-9.9A6.2 6.2 0 0 0 100 83.6V16.4a6.2 6.2 0 0 0-3.5-5.6L75.9.9a6.2 6.2 0 0 0-7.1 1.2L29.4 38 12.2 25a4.2 4.2 0 0 0-5.3.2l-5.5 5a4.2 4.2 0 0 0 0 6.2L16.2 50 1.4 63.6a4.2 4.2 0 0 0 0 6.2l5.5 5a4.2 4.2 0 0 0 5.3.2l17.2-13 39.4 35.9c.6.6 1.4 1.1 2.1 1.4ZM75 27.3 45.1 50 75 72.7Z\" fill=\"#0065A9\"/><path d=\"M96.5 10.8 75.9.9a6.2 6.2 0 0 0-7.1 1.2L1.4 63.6a4.2 4.2 0 0 0 0 6.2l5.5 5a4.2 4.2 0 0 0 5.3.2L93.4 13.4c2.7-2.1 6.6-.1 6.6 3.3v-.3a6.2 6.2 0 0 0-3.5-5.6Z\" fill=\"#007ACC\"/><path d=\"M75.9 99.1a6.2 6.2 0 0 1-7.1-1.2c2.3 2.3 6.2.7 6.2-2.6V4.7c0-3.3-3.9-4.9-6.2-2.6A6.2 6.2 0 0 1 75.9.9l20.6 9.9a6.2 6.2 0 0 1 3.5 5.6v67.2a6.2 6.2 0 0 1-3.5 5.6Z\" fill=\"#1F9CF0\"/></svg>"
  },
  "intellij": {
    "label": "IntelliJ IDEA",
    "kind": "logo",
    "svg": "<svg viewBox=\"0 0 64 64\"><defs><linearGradient id=\"sw-idea-grad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#FE315D\"/><stop offset=\".5\" stop-color=\"#F97A12\"/><stop offset=\"1\" stop-color=\"#087CFA\"/></linearGradient></defs><path d=\"M6 4h44l10 20-6 36H8L4 34Z\" fill=\"url(#sw-idea-grad)\"/><g transform=\"translate(14 14) scale(1.5)\"><path d=\"M0 0v24h24V0zm3.723 3.111h5v1.834h-1.39v6.277h1.39v1.834h-5v-1.834h1.444V4.945H3.723zm11.055 0H17v6.5c0 .612-.055 1.111-.222 1.556-.167.444-.39.777-.723 1.11-.277.279-.666.557-1.11.668a3.933 3.933 0 0 1-1.445.278c-.778 0-1.444-.167-1.944-.445a4.81 4.81 0 0 1-1.279-1.056l1.39-1.555c.277.334.555.555.833.722.277.167.611.278.945.278.389 0 .721-.111 1-.389.221-.278.333-.667.333-1.278zM2.222 19.5h9V21h-9z\" fill=\"#000\"/></g></svg>"
  },
  "gimp": {
    "label": "GIMP",
    "kind": "logo",
    "svg": "<svg viewBox=\"-1.5 -1.5 27 27\"><path fill=\"#5C5543\" d=\"M19.848 1.636c-.106-.016-.228.107-.324.397-.157.47-1.073 3.203-5.504 4.326.596.512.976 1.242.976 2.059 0 1.547-1.344 2.8-3 2.8-1.655 0-2.997-1.254-2.998-2.8 0-.603.208-1.158.555-1.616-3.135-.322-4.490-3.123-4.490-3.123l-.096 4.163c-.025.564-.009 1.111-.27 1.636a3.335 2.365 54.527 0 0-.05-.072 3.335 2.365 54.527 0 0-2.849-1.654 3.335 2.365 54.527 0 0-1.013.334 3.335 2.365 54.527 0 0 .029 4.095 3.335 2.365 54.527 0 0 3.291 1.59c2.997 2.22 8.482 4.148 12.231 1.885l-2.025-1.629c-1.064.345-2.604.34-4.397-.295 2.9.582 4.47-.053 5.334-.722-.228-.296-.71-.526-.71-.526s.563.107.93.496c.147.155.198.387.218.653.553.298 1.183.656 1.875 1.062 2.06-2.06 3.253-5.933 2.52-12.617-.035-.269-.127-.425-.233-.442zM6.855 7.096c1.051-.001 1.903.795 1.903 1.777 0 .98-.853 1.776-1.903 1.775-1.05 0-1.9-.795-1.9-1.775 0-.981.85-1.777 1.9-1.778zm5.776.482a1.325 1.325 0 1 0-.002 2.65 1.325 1.325 0 0 0 .002-2.65zm-10.942.639a.964.947 0 0 1 .002 0 .964.947 0 0 1 .021 0 .964.947 0 0 1 .965.949.964.947 0 0 1-.965.947.964.947 0 0 1-.962-.947.964.947 0 0 1 .94-.95zm5.559.123a.84.84 0 1 0 .02 1.68.84.84 0 0 0-.02-1.68zm8.26 4.964c-.043.053-.103.099-.156.147l.21.115c-.017-.1-.033-.21-.054-.262zm-.55.1l-.733.361.06.05.198.157 1.994 1.606.015.012a81.760 81.760 0 0 0 1.952 1.513.543.543 0 0 0-.008.127l.26-.04.103.152 2.317 1.472c-.12.41-.065.953.207 1.457.79 1.465 2.677 2.094 2.677 2.094-.771-1.968-.209-3.569-1.73-4.133-.242-.09-.453-.093-.629-.033l-2.047-1.895-.174-.052-.025-.262a.839.839 0 0 0-.12.059c-.306-.26-.687-.537-1.09-.815-1.364-.835-2.257-1.3-3.228-1.83z\"/></svg>"
  }
};

/** Liste des icônes proposées dans l'éditeur, triées par libellé. */
export function iconChoices({ logos = true } = {}) {
  return Object.entries(ICONS)
    .filter(([, icon]) => logos || icon.kind !== 'logo')
    .map(([value, icon]) => ({ value, label: icon.label, kind: icon.kind }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/**
 * Renvoie le SVG d'une icône.
 * `name` est soit le nom d'une icône de la bibliothèque, soit un SVG personnalisé (« <svg… »).
 */
export function iconSvg(name, { strokeWidth = 2, className = '', ariaHidden = false } = {}) {
  const extraAttrs = (className ? ` class="${className}"` : '') + (ariaHidden ? ' aria-hidden="true"' : '');
  if (typeof name === 'string' && name.trim().startsWith('<svg')) {
    return extraAttrs ? name.trim().replace(/^<svg/, `<svg${extraAttrs}`) : name.trim();
  }
  const icon = ICONS[name];
  if (!icon) return '';
  if (icon.kind === 'logo') return extraAttrs ? icon.svg.replace(/^<svg/, `<svg${extraAttrs}`) : icon.svg;
  if (icon.kind === 'fill') return `<svg${extraAttrs} viewBox="0 0 24 24">${icon.body}</svg>`;
  return `<svg${extraAttrs} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${icon.body}</svg>`;
}
