// Petits utilitaires d'interface : création d'éléments, icônes, notifications, dialogues.

/**
 * Crée un élément DOM.
 * h('button', { class: 'btn', onClick: fn }, 'Libellé')
 */
export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') element.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(element.style, value);
    else if (key === 'dataset') Object.assign(element.dataset, value);
    else if (key === 'html') element.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2).toLowerCase(), value);
    else if (['value', 'checked', 'disabled', 'selected', 'indeterminate', 'open'].includes(key)) element[key] = value;
    else if (value === true) element.setAttribute(key, '');
    else element.setAttribute(key, String(value));
  }
  append(element, children);
  return element;
}

function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function clear(element) {
  element.replaceChildren();
  return element;
}

/* ------------------------------------------------------------------ */
/* Icônes de l'interface                                              */
/* ------------------------------------------------------------------ */

const UI_ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/><path d="M10 11v6M14 11v6"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a10.4 10.4 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  files: '<path d="M15 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z"/><path d="M15 2v5h5"/><path d="M4 6v14a2 2 0 0 0 2 2h10"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 12A9 9 0 0 1 18.5 5.7L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  pointer: '<path d="m4 4 7 17 2.5-7.5L21 11Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  moon: '<path d="M20.8 14.1A8.7 8.7 0 0 1 9.9 3.2 8.8 8.8 0 1 0 20.8 14.1Z"/>',
  play: '<path d="M6 4v16l14-8Z"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/>',
  external: '<path d="M14 4h6v6m-11 4L20 4"/><path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"/>',
  window: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  upload: '<path d="M12 21V9m0 0 4 4m-4-4-4 4"/><path d="M5 8V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/>',
  arrowLeft: '<path d="M19 12H5m7 7-7-7 7-7"/>',
  shortcut: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 15V12a3 3 0 0 1 3-3h4m-2.5-2.5L16 9l-2.5 2.5"/>',
  cloud: '<path d="M17.5 19H7a5 5 0 1 1 1.1-9.9A6.5 6.5 0 0 1 20.6 11 4 4 0 0 1 17.5 19Z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  menu: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
};

export function uiIcon(name, size = 18) {
  const span = document.createElement('span');
  span.className = 'ui-icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${UI_ICONS[name] || ''}</svg>`;
  return span;
}

/** Bouton avec icône et libellé facultatif. */
export function button(label, { icon, variant = 'secondary', onClick, title, disabled, size } = {}) {
  return h('button', {
    type: 'button',
    class: ['btn', `btn--${variant}`, size ? `btn--${size}` : '', !label ? 'btn--icon' : ''].filter(Boolean).join(' '),
    title: title || (!label ? undefined : null),
    'aria-label': !label ? title : null,
    disabled,
    onClick,
  }, icon ? uiIcon(icon, size === 'small' ? 15 : 17) : null, label ? h('span', {}, label) : null);
}

/* ------------------------------------------------------------------ */
/* Notifications                                                      */
/* ------------------------------------------------------------------ */

export function toast(message, { type = 'info', duration = 3200 } = {}) {
  let host = document.getElementById('toasts');
  if (!host) {
    host = h('div', { id: 'toasts', class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(host);
  }
  const item = h('div', { class: `toast toast--${type}` }, uiIcon(type === 'error' ? 'x' : 'check', 16), h('span', {}, message));
  host.append(item);
  requestAnimationFrame(() => item.classList.add('is-visible'));
  setTimeout(() => {
    item.classList.remove('is-visible');
    setTimeout(() => item.remove(), 300);
  }, duration);
}

/* ------------------------------------------------------------------ */
/* Dialogues                                                          */
/* ------------------------------------------------------------------ */

export function openDialog(build) {
  return new Promise(resolve => {
    const dialog = h('dialog', { class: 'app-dialog' });
    const close = value => {
      dialog.close();
      dialog.remove();
      resolve(value);
    };
    dialog.append(build(close));
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(null); });
    document.body.append(dialog);
    dialog.showModal();
    const focusTarget = dialog.querySelector('[autofocus]') || dialog.querySelector('input, textarea, select, .btn--primary, .btn--danger');
    focusTarget?.focus();
  });
}

export function confirmDialog({ title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false }) {
  return openDialog(close => h('form', { method: 'dialog', class: 'dialog-body', onSubmit: event => { event.preventDefault(); close(true); } },
    h('h2', {}, title),
    message ? h('p', {}, message) : null,
    h('div', { class: 'dialog-actions' },
      button(cancelLabel, { onClick: () => close(false) }),
      h('button', { type: 'submit', class: `btn ${danger ? 'btn--danger' : 'btn--primary'}` }, confirmLabel),
    ),
  )).then(Boolean);
}

export function promptDialog({ title, label, value = '', confirmLabel = 'Valider', multiline = false }) {
  return openDialog(close => {
    const input = multiline
      ? h('textarea', { class: 'input', rows: 3, value, autofocus: true })
      : h('input', { class: 'input', type: 'text', value, autofocus: true });
    return h('form', { method: 'dialog', class: 'dialog-body', onSubmit: event => { event.preventDefault(); close(input.value.trim() || null); } },
      h('h2', {}, title),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), input),
      h('div', { class: 'dialog-actions' },
        button('Annuler', { onClick: () => close(null) }),
        h('button', { type: 'submit', class: 'btn btn--primary' }, confirmLabel),
      ),
    );
  });
}

/** Choix parmi plusieurs options présentées en cartes. */
export function choiceDialog({ title, message, choices }) {
  return openDialog(close => h('div', { class: 'dialog-body' },
    h('h2', {}, title),
    message ? h('p', {}, message) : null,
    h('div', { class: 'choice-list' },
      choices.map(choice => h('button', { type: 'button', class: 'choice', onClick: () => close(choice.value) },
        h('strong', {}, choice.label),
        choice.description ? h('span', {}, choice.description) : null,
      )),
    ),
    h('div', { class: 'dialog-actions' }, button('Annuler', { onClick: () => close(null) })),
  ));
}

/* ------------------------------------------------------------------ */
/* Divers                                                             */
/* ------------------------------------------------------------------ */

export function debounce(fn, delay) {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  debounced.flush = (...args) => { clearTimeout(timer); fn(...args); };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/** Message d'une erreur renvoyée par le processus principal, sans le préfixe d'Electron. */
export function errorMessage(error) {
  return String(error?.message || error || 'erreur inconnue').replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '');
}

export function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
