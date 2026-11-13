// Calcul de la taille et de la position de la fenêtre au lancement.

import { screen } from 'electron';

export const MIN_WIDTH = 960;
export const MIN_HEIGHT = 640;

/** Écrans disponibles, en pixels indépendants de la résolution (DIP). */
export function describeDisplays() {
  const primaryId = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    index: index + 1,
    primary: display.id === primaryId,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor,
  }));
}

function intersectionArea(a, b) {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

/**
 * Vérifie qu'une zone personnalisée reste utilisable : au moins 30 % de la fenêtre
 * doit être visible sur un écran (sinon, un écran a pu être débranché).
 */
export function sanitizeBounds(bounds) {
  if (!bounds) return null;
  const rect = {
    x: Math.round(Number(bounds.x)),
    y: Math.round(Number(bounds.y)),
    width: Math.max(MIN_WIDTH, Math.round(Number(bounds.width))),
    height: Math.max(MIN_HEIGHT, Math.round(Number(bounds.height))),
  };
  if (Object.values(rect).some(value => !Number.isFinite(value))) return null;
  const visible = screen.getAllDisplays().reduce((sum, display) => sum + intersectionArea(rect, display.workArea), 0);
  return visible >= rect.width * rect.height * 0.3 ? rect : null;
}

/** Options de création de la fenêtre selon les paramètres enregistrés. */
export function initialWindowState(windowSettings) {
  if (windowSettings?.mode === 'custom') {
    const bounds = sanitizeBounds(windowSettings.bounds);
    if (bounds) return { bounds, maximize: false };
  }
  const { workArea } = screen.getPrimaryDisplay();
  const width = Math.min(1400, workArea.width);
  const height = Math.min(900, workArea.height);
  return {
    bounds: {
      x: workArea.x + Math.round((workArea.width - width) / 2),
      y: workArea.y + Math.round((workArea.height - height) / 2),
      width,
      height,
    },
    maximize: true,
  };
}
