// Cadre de réglage de la fenêtre au lancement : les écrans sont représentés à l'échelle,
// et un rectangle (la future fenêtre) se déplace et se redimensionne à la souris.

import { h } from '../lib/dom.js';

const HANDLES = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

/**
 * @param {object} options
 * @param {object[]} options.displays  Écrans ({ bounds, workArea, primary, index }).
 * @param {{x:number,y:number,width:number,height:number}} options.bounds
 * @param {{width:number,height:number}} options.min
 * @param {(bounds) => void} options.onChange  Appelé à chaque mouvement.
 * @param {(bounds) => void} options.onCommit  Appelé à la fin d'un geste.
 */
export function createWindowFrame({ displays, bounds, min, onChange, onCommit }) {
  let rect = { ...bounds };

  // Étendue de l'ensemble des écrans (coordonnées du bureau virtuel).
  const desk = displays.reduce((acc, d) => ({
    left: Math.min(acc.left, d.bounds.x),
    top: Math.min(acc.top, d.bounds.y),
    right: Math.max(acc.right, d.bounds.x + d.bounds.width),
    bottom: Math.max(acc.bottom, d.bounds.y + d.bounds.height),
  }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
  const deskWidth = desk.right - desk.left;
  const deskHeight = desk.bottom - desk.top;

  const surface = h('div', { class: 'frame-surface' });
  const windowBox = h('div', { class: 'frame-window', tabindex: '0', 'aria-label': 'Fenêtre de l’application (déplacer ou redimensionner)' },
    h('div', { class: 'frame-window-bar' }, h('span', {}), h('span', {}), h('span', {})),
    h('div', { class: 'frame-window-label' }),
    HANDLES.map(dir => h('span', { class: `frame-handle frame-handle--${dir}`, dataset: { dir } })),
  );
  const screens = displays.map(display => h('div', { class: `frame-screen${display.primary ? ' is-primary' : ''}` },
    h('span', { class: 'frame-screen-label' }, `Écran ${display.index}${display.primary ? ' (principal)' : ''} · ${display.bounds.width}×${display.bounds.height}`),
  ));
  surface.append(...screens, windowBox);
  const element = h('div', { class: 'frame' }, surface);

  let scale = 1;

  function layout() {
    const available = element.clientWidth || 560;
    scale = Math.min(available / deskWidth, 300 / deskHeight);
    surface.style.width = `${deskWidth * scale}px`;
    surface.style.height = `${deskHeight * scale}px`;
    displays.forEach((display, i) => {
      Object.assign(screens[i].style, {
        left: `${(display.bounds.x - desk.left) * scale}px`,
        top: `${(display.bounds.y - desk.top) * scale}px`,
        width: `${display.bounds.width * scale}px`,
        height: `${display.bounds.height * scale}px`,
      });
    });
    paint();
  }

  function paint() {
    Object.assign(windowBox.style, {
      left: `${(rect.x - desk.left) * scale}px`,
      top: `${(rect.y - desk.top) * scale}px`,
      width: `${rect.width * scale}px`,
      height: `${rect.height * scale}px`,
    });
    windowBox.querySelector('.frame-window-label').textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
  }

  function clampRect(next) {
    const width = Math.min(Math.max(next.width, min.width), deskWidth);
    const height = Math.min(Math.max(next.height, min.height), deskHeight);
    const x = Math.min(Math.max(next.x, desk.left), desk.right - width);
    const y = Math.min(Math.max(next.y, desk.top), desk.bottom - height);
    return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
  }

  windowBox.addEventListener('pointerdown', event => {
    event.preventDefault();
    const dir = event.target.dataset.dir || 'move';
    const start = { px: event.clientX, py: event.clientY, rect: { ...rect } };
    windowBox.setPointerCapture(event.pointerId);
    windowBox.classList.add('is-active');

    const onMove = moveEvent => {
      const dx = (moveEvent.clientX - start.px) / scale;
      const dy = (moveEvent.clientY - start.py) / scale;
      const r = { ...start.rect };
      if (dir === 'move') {
        r.x += dx; r.y += dy;
      } else {
        if (dir.includes('e')) r.width = start.rect.width + dx;
        if (dir.includes('s')) r.height = start.rect.height + dy;
        if (dir.includes('w')) {
          const width = Math.max(min.width, start.rect.width - dx);
          r.x = start.rect.x + (start.rect.width - width);
          r.width = width;
        }
        if (dir.includes('n')) {
          const height = Math.max(min.height, start.rect.height - dy);
          r.y = start.rect.y + (start.rect.height - height);
          r.height = height;
        }
      }
      rect = clampRect(r);
      paint();
      onChange?.(rect);
    };
    const onUp = () => {
      windowBox.removeEventListener('pointermove', onMove);
      windowBox.removeEventListener('pointerup', onUp);
      windowBox.removeEventListener('pointercancel', onUp);
      windowBox.classList.remove('is-active');
      onCommit?.(rect);
    };
    windowBox.addEventListener('pointermove', onMove);
    windowBox.addEventListener('pointerup', onUp);
    windowBox.addEventListener('pointercancel', onUp);
  });

  // Déplacement au clavier (flèches ; Maj = pas de 50 px ; Alt = redimensionner).
  windowBox.addEventListener('keydown', event => {
    const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!keys[event.key]) return;
    event.preventDefault();
    const step = event.shiftKey ? 50 : 10;
    const [dx, dy] = keys[event.key];
    const r = { ...rect };
    if (event.altKey) { r.width += dx * step; r.height += dy * step; } else { r.x += dx * step; r.y += dy * step; }
    rect = clampRect(r);
    paint();
    onChange?.(rect);
    onCommit?.(rect);
  });

  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(element);

  return {
    element,
    setBounds(next) {
      rect = clampRect({ ...rect, ...next });
      paint();
      return rect;
    },
    getBounds: () => ({ ...rect }),
    destroy: () => resizeObserver.disconnect(),
  };
}
