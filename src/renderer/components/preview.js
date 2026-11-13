// Aperçu en direct d'un CV dans un cadre isolé (iframe sans accès à l'application).
// La page est rendue à la largeur d'un vrai écran puis réduite pour tenir dans le panneau.

import { h, uiIcon } from '../lib/dom.js';
import { renderHtml } from '../lib/state.js';

const DEVICES = [
  { value: 'wide', label: 'Grand écran', width: 1700 },
  { value: 'laptop', label: 'Portable', width: 1280 },
  { value: 'tablet', label: 'Tablette', width: 820 },
  { value: 'mobile', label: 'Mobile', width: 400 },
];

let preferredDevice = 'wide';
let preferredTheme = 'light';

/**
 * @param {object} options
 * @param {boolean} [options.selectable]  Affiche le bouton de sélection dans l'aperçu.
 * @param {(id: string) => void} [options.onSelect]
 */
export function createPreview({ selectable = false, onSelect } = {}) {
  let device = preferredDevice;
  let theme = preferredTheme;
  let selectMode = false;
  let lastScroll = 0;
  let current = null; // { cv, options }
  let pendingFocusScroll = false;
  let renderTimer = null;
  let renderCount = 0;

  const iframe = h('iframe', {
    class: 'preview-frame',
    title: 'Aperçu du CV',
    sandbox: 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-modals',
  });
  const stage = h('div', { class: 'preview-stage' }, iframe);
  const viewport = h('div', { class: 'preview-viewport' }, stage);

  const deviceSelect = h('select', { class: 'input input--small', title: 'Largeur d’écran simulée', onChange: event => {
    device = preferredDevice = event.target.value;
    layout();
  } }, DEVICES.map(d => h('option', { value: d.value, selected: d.value === device }, `${d.label} · ${d.width}px`)));

  const themeButton = h('button', { type: 'button', class: 'btn btn--ghost btn--small', title: 'Basculer jour / nuit dans l’aperçu', onClick: () => {
    theme = preferredTheme = theme === 'dark' ? 'light' : 'dark';
    syncThemeButton();
    post({ type: 'theme', theme });
  } });
  const syncThemeButton = () => themeButton.replaceChildren(uiIcon(theme === 'dark' ? 'sun' : 'moon', 15), h('span', {}, theme === 'dark' ? 'Jour' : 'Nuit'));
  syncThemeButton();

  const replayButton = h('button', { type: 'button', class: 'btn btn--ghost btn--small', title: 'Rejouer les animations d’ouverture', onClick: () => {
    lastScroll = 0;
    renderNow({ instant: false });
  } }, uiIcon('play', 14), h('span', {}, 'Animations'));

  const selectButton = selectable
    ? h('button', { type: 'button', class: 'btn btn--ghost btn--small', 'aria-pressed': 'false', title: 'Cliquer sur un élément de l’aperçu pour le modifier', onClick: () => setSelectMode(!selectMode) },
      uiIcon('pointer', 14), h('span', {}, 'Sélectionner'))
    : null;

  const extraSlot = h('div', { class: 'preview-extra' });
  const toolbar = h('div', { class: 'preview-toolbar' }, deviceSelect, themeButton, replayButton, selectButton, h('div', { class: 'spacer' }), extraSlot);
  const element = h('section', { class: 'preview' }, toolbar, viewport);

  function setSelectMode(enabled) {
    selectMode = enabled;
    selectButton?.setAttribute('aria-pressed', String(enabled));
    selectButton?.classList.toggle('is-active', enabled);
    post({ type: 'select-mode', enabled });
  }

  function post(message) {
    iframe.contentWindow?.postMessage(message, '*');
  }

  function layout() {
    const width = DEVICES.find(d => d.value === device)?.width || 1700;
    const available = Math.max(viewport.clientWidth - 2, 50);
    const scale = Math.min(1, available / width);
    const height = Math.max(viewport.clientHeight / scale, 300);
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
    iframe.style.transform = `scale(${scale})`;
    stage.style.width = `${width * scale}px`;
    stage.style.height = `${viewport.clientHeight}px`;
  }

  const resizeObserver = new ResizeObserver(() => layout());
  resizeObserver.observe(viewport);

  function onMessage(event) {
    if (event.source !== iframe.contentWindow || event.data?.source !== 'cv-preview') return;
    const data = event.data;
    if (data.type === 'scroll') lastScroll = data.y;
    if (data.type === 'select' && onSelect) onSelect(data.id);
    if (data.type === 'ready' && selectMode) post({ type: 'select-mode', enabled: true });
  }
  window.addEventListener('message', onMessage);

  function renderNow({ instant = true } = {}) {
    if (!current) return;
    const html = renderHtml(current.cv, {
      hidden: current.hidden,
      preview: {
        instant,
        theme,
        initialScroll: pendingFocusScroll ? 0 : lastScroll,
        focusId: current.focusId,
        scrollToFocus: pendingFocusScroll,
        selectMode,
      },
    });
    pendingFocusScroll = false;
    // Le marqueur unique force le rechargement, même si le contenu n'a pas changé
    // (par exemple quand le cadre a été retiré puis réinséré dans la page).
    renderCount += 1;
    iframe.srcdoc = `${html}<!-- rendu ${renderCount} -->`;
  }

  return {
    element,
    extraSlot,
    /**
     * Met à jour l'aperçu.
     * @param {object} cv
     * @param {object} [options]  { hidden, focusId, scrollToFocus, immediate }
     */
    update(cv, { hidden = [], focusId = null, scrollToFocus = false, immediate = false } = {}) {
      current = { cv, hidden, focusId };
      if (scrollToFocus) pendingFocusScroll = true;
      clearTimeout(renderTimer);
      if (immediate) renderNow();
      else renderTimer = setTimeout(() => renderNow(), 180);
      requestAnimationFrame(layout);
    },
    openDetail(key) {
      post({ type: 'open-detail', key });
    },
    replay() {
      lastScroll = 0;
      renderNow({ instant: false });
    },
    setSelectMode,
    destroy() {
      clearTimeout(renderTimer);
      resizeObserver.disconnect();
      window.removeEventListener('message', onMessage);
    },
  };
}
