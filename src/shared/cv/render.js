// Génération du HTML d'un CV à partir de ses données.
// Le résultat est une page autonome (styles et script intégrés), identique en
// structure au CV d'origine écrit à la main.

import { iconSvg } from './icons.js';
import { escapeAttr, escapeHtml, plain, rich, textOnly } from './markup.js';
import { normalizeCv } from './schema.js';
import { clone } from './ids.js';

/* ------------------------------------------------------------------ */
/* Masquage                                                           */
/* ------------------------------------------------------------------ */

/**
 * Renvoie une copie du CV sans les éléments masqués.
 * Une fenêtre détaillée masquée est simplement désactivée.
 */
export function pruneHidden(cv, hiddenIds = []) {
  const hidden = hiddenIds instanceof Set ? hiddenIds : new Set(hiddenIds);
  const copy = clone(cv);
  if (!hidden.size) return copy;
  const visit = node => {
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i -= 1) {
        const item = node[i];
        if (item && typeof item === 'object' && hidden.has(item.id)) node.splice(i, 1);
        else visit(item);
      }
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && hidden.has(value.id)) {
        if (key === 'detail') node.detail = { ...value, enabled: false };
        else if (key !== 'hero') delete node[key];
      } else {
        visit(value);
      }
    }
  };
  visit(copy);
  return copy;
}

/* ------------------------------------------------------------------ */
/* Outils de rendu                                                    */
/* ------------------------------------------------------------------ */

function createContext(options) {
  const preview = options.preview || null;
  return {
    preview,
    instant: Boolean(options.instant || preview?.instant),
    /** Attribut d'identification, seulement dans l'aperçu de l'éditeur. */
    mark: id => (preview && id ? ` data-cv-id="${escapeAttr(id)}"` : ''),
  };
}

const join = parts => parts.filter(Boolean).join('\n');

function revealAttr(block, cv) {
  const value = block.animation && block.animation !== 'inherit' ? block.animation : cv.animations.reveal;
  return value && value !== 'fade-up' ? ` data-reveal="${escapeAttr(value)}"` : '';
}

function textItems(items, tag = 'span', className = '') {
  const cls = className ? ` class="${className}"` : '';
  return (items || []).map(item => `<${tag}${cls}>${rich(item.text)}</${tag}>`).join('');
}

/* ------------------------------------------------------------------ */
/* En-tête                                                            */
/* ------------------------------------------------------------------ */

function renderContact(contact, ctx) {
  const icon = `<span class="contact-icon" aria-hidden="true">${iconSvg(contact.icon, { strokeWidth: 2 })}</span>`;
  const value = plain(contact.value);
  const mark = ctx.mark(contact.id);
  switch (contact.type) {
    case 'phone':
    case 'email': {
      const label = contact.type === 'phone' ? 'Copier le numéro de téléphone' : 'Copier l’adresse e-mail';
      return `<button class="contact-item copy-button" type="button" data-copy="${escapeAttr(textOnly(contact.value))}" aria-label="${label}" title="Cliquer pour copier"${mark}>
            ${icon}
            <span class="contact-value">${value}</span>
            <span class="copy-feedback" aria-hidden="true">Copié !</span>
          </button>`;
    }
    case 'location': {
      const query = contact.url?.trim() || `${textOnly(contact.value)}, France`;
      const href = /^https?:\/\//i.test(query) ? query : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      return `<a class="contact-item location-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir la localisation de ${escapeAttr(textOnly(contact.value))} dans Google Maps" title="Ouvrir dans Google Maps"${mark}>
            ${icon}
            <span class="contact-value">${value}</span>
            <span class="location-arrow" aria-hidden="true">↗</span>
          </a>`;
    }
    case 'link':
      return `<a class="contact-item location-link" href="${escapeAttr(contact.url || '#')}" target="_blank" rel="noopener noreferrer"${mark}>
            ${icon}
            <span class="contact-value">${value}</span>
            <span class="location-arrow" aria-hidden="true">↗</span>
          </a>`;
    default:
      return `<div class="contact-item"${mark}>
            ${icon}
            <span>${value}</span>
          </div>`;
  }
}

function renderHero(cv, ctx) {
  const hero = cv.hero;
  const contacts = hero.contacts || [];
  const photo = hero.photo
    ? `<div class="portrait-wrap">
          <img class="portrait" src="${escapeAttr(hero.photo)}" alt="${escapeAttr(hero.photoAlt || '')}">
        </div>`
    : '';
  return `<header class="hero"${ctx.mark(hero.id)}>
        ${photo}
        <div class="identity">
          <h1 id="cv-name">${plain(hero.firstName)}${hero.firstName && hero.lastName ? '<br>' : ''}${plain(hero.lastName)}</h1>
          ${hero.subtitle ? `<p class="subtitle">${plain(hero.subtitle)}</p>` : ''}
        </div>
        ${contacts.length ? `<nav class="contact-grid" aria-label="Coordonnées">
          ${contacts.map(c => renderContact(c, ctx)).join('\n          ')}
        </nav>` : ''}
      </header>`;
}

/* ------------------------------------------------------------------ */
/* Composants                                                         */
/* ------------------------------------------------------------------ */

function renderSummaryComponent(component, ctx) {
  const mark = ctx.mark(component.id);
  switch (component.type) {
    case 'bullets': {
      const hasLead = (component.items || []).some(item => item.lead);
      return `<ul class="plain-list${hasLead ? ' interests-list' : ''}"${mark}>
              ${(component.items || []).map(item => `<li${ctx.mark(item.id)}>${item.lead ? `<strong>${plain(item.lead)}</strong> ` : ''}${rich(item.text)}</li>`).join('\n              ')}
            </ul>`;
    }
    case 'subheading':
      return `<h3 class="section-heading"${mark}><span class="heading-mark"></span>${plain(component.text)}</h3>`;
    case 'divider':
      return `<div class="panel-divider"${mark}></div>`;
    case 'keyvalues':
      return (component.items || []).map(item => `<div class="language-line"${ctx.mark(item.id)}><strong>${plain(item.key)}</strong><span>${plain(item.value)}</span></div>`).join('\n            ');
    case 'tags':
      return `<div class="software"${mark}>${(component.items || []).map(item => `<span${ctx.mark(item.id)}>${plain(item.text)}</span>`).join('')}</div>`;
    case 'paragraph':
      return `<p class="panel-text"${mark}>${rich(component.text)}</p>`;
    case 'image':
      return component.src ? `<img class="pix-image" src="${escapeAttr(component.src)}" alt="${escapeAttr(component.alt || '')}"${mark}>` : '';
    default:
      return '';
  }
}

function renderPills(items, ctx) {
  if (!items?.length) return '';
  return `<div class="interest-pills">${items.map(item => `<span${ctx.mark(item.id)}>${plain(item.text)}</span>`).join('')}</div>`;
}

function renderDetailComponent(component, ctx) {
  const mark = ctx.mark(component.id);
  switch (component.type) {
    case 'bullets':
      return `<ul class="plain-list${(component.items || []).some(i => i.lead) ? ' interests-list' : ''}"${mark}>
        ${(component.items || []).map(item => `<li${ctx.mark(item.id)}>${item.lead ? `<strong>${plain(item.lead)}</strong> ` : ''}${rich(item.text)}</li>`).join('\n        ')}
      </ul>`;
    case 'keyvalues':
      return `<div class="language-detail"${mark}>
        ${(component.items || []).map(item => `<div class="language-detail-item"${ctx.mark(item.id)}><strong>${plain(item.key)}</strong><span>${plain(item.value)}</span></div>`).join('\n        ')}
      </div>`;
    case 'tags':
      return `<div class="interest-pills"${mark}>${(component.items || []).map(item => `<span${ctx.mark(item.id)}>${plain(item.text)}</span>`).join('')}</div>`;
    case 'paragraph':
      return `<p class="detail-paragraph"${mark}>${rich(component.text)}</p>`;
    case 'note':
      return `<p class="detail-note"${mark}>${rich(component.text)}</p>`;
    case 'label':
      return `<h3 class="detail-section-label"${mark}>${plain(component.text)}</h3>`;
    case 'image':
      return component.src ? `<div class="detail-image-wrap"${mark}><img class="pix-detail-image" src="${escapeAttr(component.src)}" alt="${escapeAttr(component.alt || '')}"></div>` : '';
    case 'score':
      return `<div class="pix-detail-score"${mark}>${plain(component.label)} <strong>${plain(component.value)}</strong></div>`;
    case 'profile':
      return `<div class="detail-profile-strip"${mark}>
        <span class="detail-profile-mark" aria-hidden="true">
          ${iconSvg(component.icon, { strokeWidth: 1.8 })}
        </span>
        <div class="detail-profile-name"><strong>${plain(component.name)}</strong><span>${plain(component.subtitle)}</span></div>
        ${component.url ? `<a class="detail-external-link" href="${escapeAttr(component.url)}" target="_blank" rel="noopener noreferrer">${plain(component.linkLabel || 'Ouvrir')} ${iconSvg('external', { strokeWidth: 2 })}</a>` : ''}
      </div>`;
    case 'projects':
      return `<div class="detail-projects"${mark}>
        ${(component.items || []).map(project => `<article class="detail-project"${ctx.mark(project.id)}>
          <div class="project-top">
            <span class="project-mark${project.accent === 'violet' ? ' project-mark--undercover' : ''}" aria-hidden="true">
              ${iconSvg(project.icon, { strokeWidth: 1.75 })}
            </span>
            <div>${project.kind ? `<span class="project-kind">${plain(project.kind)}</span>` : ''}<h3 class="project-title">${plain(project.title)}</h3></div>
          </div>
          ${project.text ? `<p>${rich(project.text)}</p>` : ''}
          ${project.tags?.length ? `<div class="project-tags">${project.tags.map(tag => `<span${ctx.mark(tag.id)}>${plain(tag.text)}</span>`).join('')}</div>` : ''}
          ${project.url ? `<a class="project-link" href="${escapeAttr(project.url)}" target="_blank" rel="noopener noreferrer">${plain(project.linkLabel || 'Voir le projet')} ${iconSvg('arrow-up-right', { strokeWidth: 2 })}</a>` : ''}
        </article>`).join('\n        ')}
      </div>`;
    case 'tiles':
      return `<div class="software-grid"${mark}>
        ${(component.items || []).map(tile => `<article class="software-tile"${ctx.mark(tile.id)}>
          <span class="software-logo" aria-hidden="true">
            ${iconSvg(tile.logo, { strokeWidth: 1.8 })}
          </span>
          <div class="software-copy"><strong>${plain(tile.title)}</strong>${tile.subtitle ? `<span>${plain(tile.subtitle)}</span>` : ''}</div>
        </article>`).join('\n        ')}
      </div>`;
    case 'infopanels':
      return `<div class="skills-detail-grid"${mark}>
        ${(component.items || []).map(panel => `<section class="detail-info-panel"${ctx.mark(panel.id)}>
          <h3>${iconSvg(panel.icon, { strokeWidth: 1.9 })}${plain(panel.title)}</h3>
          ${panel.chips?.length ? `<div class="skill-chip-list">
            ${panel.chips.map(chip => `<span class="skill-chip"${ctx.mark(chip.id)}>${plain(chip.text)}</span>`).join('')}
          </div>` : ''}
          ${panel.lines?.length ? `<div class="language-detail">
            ${panel.lines.map(line => `<div class="language-detail-item"${ctx.mark(line.id)}><strong>${plain(line.key)}</strong><span>${plain(line.value)}</span></div>`).join('\n            ')}
          </div>` : ''}
          ${panel.note ? `<p class="detail-context">${rich(panel.note)}</p>` : ''}
        </section>`).join('\n        ')}
      </div>`;
    case 'cards':
      return `<div class="interest-detail-grid"${mark}>
        ${(component.items || []).map(card => `<article class="interest-detail-card${card.wide ? ' interest-detail-card--wide' : ''}"${ctx.mark(card.id)}>
          <span class="interest-icon" aria-hidden="true">${iconSvg(card.icon, { strokeWidth: 1.8 })}</span>
          <h3>${plain(card.title)}</h3>
          ${card.text ? `<p>${rich(card.text)}</p>` : ''}
          ${card.timeline?.length ? `<ol class="interest-timeline">
            ${card.timeline.map(step => `<li${ctx.mark(step.id)}><span class="interest-years">${plain(step.period)}</span><strong>${plain(step.label)}</strong></li>`).join('\n            ')}
          </ol>` : ''}
          ${renderPills(card.pills, ctx)}
          ${card.entries?.length ? `<div class="volunteer-list">
            ${card.entries.map(entry => `<div class="volunteer-item"${ctx.mark(entry.id)}>
              <div class="volunteer-head"><strong>${plain(entry.title)}</strong>${entry.badge ? `<span class="volunteer-badge">${plain(entry.badge)}</span>` : ''}</div>
              ${entry.text ? `<p>${rich(entry.text)}</p>` : ''}
              ${renderPills(entry.pills, ctx)}
            </div>`).join('\n            ')}
          </div>` : ''}
        </article>`).join('\n        ')}
      </div>`;
    default:
      return '';
  }
}

/* ------------------------------------------------------------------ */
/* Blocs                                                              */
/* ------------------------------------------------------------------ */

function hasDetail(block) {
  return Boolean(block.detail && block.detail.enabled !== false && block.detail.components?.length);
}

function interactiveAttrs(block, labelText) {
  if (!hasDetail(block)) return '';
  const title = textOnly(block.detail.title || labelText);
  return ` role="button" tabindex="0" aria-haspopup="dialog" aria-controls="detail-modal" aria-expanded="false" aria-label="Ouvrir le détail : ${escapeAttr(title)}" data-detail="${escapeAttr(block.id)}"`;
}

function renderBlock(block, cv, ctx, zone) {
  const mark = ctx.mark(block.id);
  const reveal = revealAttr(block, cv);
  const interactive = hasDetail(block);
  switch (block.type) {
    case 'banner':
      return `<section class="availability reveal"${reveal} aria-label="${escapeAttr(textOnly(block.label) || 'Information')}"${mark}>
        <div class="availability-icon" aria-hidden="true">${iconSvg(block.icon, { strokeWidth: 2 })}</div>
        <div>${block.label ? `<span class="availability-label">${plain(block.label)}</span>` : ''}<p>${rich(block.text)}</p></div>
      </section>`;
    case 'timeline':
      return `<section class="section reveal"${reveal} aria-labelledby="${block.id}-title"${mark}>
            <h2 class="section-heading" id="${block.id}-title"><span class="heading-mark"></span>${plain(block.title)}</h2>
            <div class="timeline">
              ${(block.items || []).map(item => `<article class="timeline-item"${ctx.mark(item.id)}>
                <div class="date">${rich(item.date)}</div>
                <div class="item-body">
                  <h3 class="item-title">${plain(item.title)}</h3>
                  ${item.meta ? `<p class="item-meta">${plain(item.meta)}</p>` : ''}
                  ${item.details?.length ? `<div class="item-extra">${item.details.map(d => `<p${ctx.mark(d.id)}>${rich(d.text)}</p>`).join('')}</div>` : ''}
                </div>
              </article>`).join('\n              ')}
            </div>
          </section>`;
    case 'panel':
      return `<section class="side-panel reveal${interactive ? ' interactive-box' : ''}"${reveal}${interactiveAttrs(block, block.title)} aria-labelledby="${block.id}-title"${mark}>
            <h2 class="section-heading" id="${block.id}-title"><span class="heading-mark"></span>${plain(block.title)}</h2>
            ${(block.components || []).map(c => renderSummaryComponent(c, ctx)).filter(Boolean).join('\n            ')}
          </section>`;
    case 'linkcard': {
      const inner = `
            <span class="github-label">${block.kicker ? `<small>${plain(block.kicker)}</small>` : ''}<strong>${plain(block.label)}</strong></span>
            <span class="github-icon" aria-hidden="true">${iconSvg(block.icon, { strokeWidth: 1.9 })}</span>
          `;
      if (interactive) {
        return `<div class="side-panel github-card reveal interactive-box"${reveal}${interactiveAttrs(block, block.label)}${mark}>${inner}</div>`;
      }
      if (block.url) {
        return `<a class="side-panel github-card reveal"${reveal} href="${escapeAttr(block.url)}" target="_blank" rel="noopener noreferrer"${mark}>${inner}</a>`;
      }
      return `<div class="side-panel github-card reveal"${reveal}${mark}>${inner}</div>`;
    }
    case 'score':
      return `<section class="side-panel reveal${interactive ? ' interactive-box' : ''}"${reveal}${interactiveAttrs(block, block.title)} aria-labelledby="${block.id}-title"${mark}>
            <div class="pix-head"><h3 id="${block.id}-title">${plain(block.title)}</h3>${block.score ? `<span class="pix-score">${plain(block.score)}</span>` : ''}</div>
            ${block.image ? `<img class="pix-image" src="${escapeAttr(block.image)}" alt="${escapeAttr(block.imageAlt || '')}">` : ''}
          </section>`;
    default:
      return '';
  }
}

function renderZone(cv, zone, ctx) {
  return (cv.zones[zone] || []).map(block => renderBlock(block, cv, ctx, zone)).filter(Boolean);
}

function renderTopZone(cv, ctx) {
  // Les bandeaux gardent leur placement d'origine ; les autres blocs sont alignés
  // sur les marges de la carte.
  const parts = [];
  let group = [];
  const flush = () => {
    if (group.length) parts.push(`<div class="zone-top">\n${group.join('\n')}\n</div>`);
    group = [];
  };
  for (const block of cv.zones.top || []) {
    const html = renderBlock(block, cv, ctx, 'top');
    if (!html) continue;
    if (block.type === 'banner') { flush(); parts.push(html); } else group.push(html);
  }
  flush();
  return parts.join('\n');
}

function renderTemplates(cv, ctx) {
  const blocks = [...cv.zones.top, ...cv.zones.main, ...cv.zones.side].filter(hasDetail);
  return blocks.map(block => {
    const detail = block.detail;
    return `<template id="detail-${escapeAttr(block.id)}" data-kicker="${escapeAttr(detail.kicker || '')}" data-title="${escapeAttr(detail.title || '')}" data-subtitle="${escapeAttr(detail.subtitle || '')}">
      ${(detail.components || []).map(c => renderDetailComponent(c, ctx)).filter(Boolean).join('\n      ')}
    </template>`;
  }).join('\n\n    ');
}

const MODAL = `<div class="detail-overlay" id="detail-modal" aria-hidden="true">
      <section class="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title" aria-describedby="detail-subtitle" tabindex="-1">
        <header class="detail-header">
          <div class="detail-heading-copy">
            <span class="detail-kicker" id="detail-kicker">Vue détaillée</span>
            <h2 class="detail-title" id="detail-title">Détails</h2>
            <p class="detail-subtitle" id="detail-subtitle">Informations complémentaires</p>
          </div>
          <button class="detail-close" id="detail-close" type="button" aria-label="Fermer la fenêtre de détail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m18 6-12 12M6 6l12 12"/></svg>
          </button>
        </header>
        <div class="detail-body" id="detail-body"></div>
        <footer class="detail-footer">
          <span></span>
          <button class="detail-back" id="detail-back" type="button">
            Retour au CV
          </button>
        </footer>
      </section>
    </div>`;

function renderRail(cv) {
  const { download, theme } = cv.actions;
  if (!download && !theme) return '';
  return `<aside class="action-rail" aria-label="Actions de la page">
        ${download ? `<button class="rail-button" id="download-pdf" type="button" title="Télécharger / Imprimer" aria-label="Télécharger / Imprimer">
          <span class="rail-label">Télécharger / Imprimer</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/></svg>
        </button>` : ''}
        ${theme ? `<button class="rail-button theme-button" id="toggle-theme" type="button" title="Activer le mode nuit" aria-label="Activer le mode nuit" aria-pressed="false">
          <span class="rail-label">Mode nuit</span>
          <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 14.1A8.7 8.7 0 0 1 9.9 3.2 8.8 8.8 0 1 0 20.8 14.1Z"/></svg>
          <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" hidden><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>
        </button>` : ''}
      </aside>`;
}

function htmlAttributes(cv, ctx) {
  const a = cv.animations;
  const attrs = [`lang="${escapeAttr(cv.document.lang || 'fr')}"`];
  const data = {
    reveal: a.reveal,
    'reveal-stagger': a.revealStagger,
    tilt: a.tilt ? null : 'off',
    'tilt-x': a.tilt ? a.tiltX : null,
    'tilt-y': a.tilt ? a.tiltY : null,
    'card-arrive': a.cardArrive ? null : 'off',
    hover: a.hover ? null : 'off',
    'modal-anim': a.modal && a.modal !== 'depth' ? a.modal : null,
  };
  const theme = ctx.preview?.theme || (cv.actions.defaultTheme === 'dark' ? 'dark' : null);
  if (theme) data.theme = theme;
  if (ctx.preview) {
    if (ctx.preview.initialScroll) data['initial-scroll'] = Math.round(ctx.preview.initialScroll);
    if (ctx.preview.focusId) data['focus-id'] = ctx.preview.focusId;
    if (ctx.preview.scrollToFocus) data['scroll-to-focus'] = 'yes';
  }
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined && value !== '') attrs.push(`data-${key}="${escapeAttr(value)}"`);
  }
  const classes = [];
  if (ctx.preview) classes.push('cv-preview');
  if (ctx.instant) classes.push('cv-instant');
  if (ctx.preview?.selectMode) classes.push('cv-preview-select');
  if (classes.length) attrs.push(`class="${classes.join(' ')}"`);
  attrs.push(`style="--reveal-duration: ${Number(a.revealDuration) || 650}ms; --card-arrive-duration: ${Number(a.cardArriveDuration) || 850}ms"`);
  return attrs.join(' ');
}

/**
 * Produit la page HTML complète d'un CV.
 * @param {object} cvInput   Données du CV (base ou instantané d'un CV généré).
 * @param {object} options
 * @param {string[]} [options.hidden]  Identifiants des éléments à masquer.
 * @param {string} options.css         Feuille de style du modèle.
 * @param {string} options.runtime     Script du modèle.
 * @param {object} [options.preview]   Réglages de l'aperçu dans l'application.
 * @param {boolean} [options.instant]  Désactive les animations d'entrée (export PDF).
 */
export function renderCvHtml(cvInput, { hidden = [], css = '', runtime = '', preview = null, instant = false } = {}) {
  const cv = pruneHidden(normalizeCv(cvInput), hidden);
  const ctx = createContext({ preview, instant });
  const anyDetail = [...cv.zones.top, ...cv.zones.main, ...cv.zones.side].some(hasDetail);
  const footer = cv.document.footerLeft || cv.document.footerRight
    ? `<footer class="footer"><span class="footer-mark">${plain(cv.document.footerLeft)}</span><span>${plain(cv.document.footerRight)}</span></footer>`
    : '';

  return `<!doctype html>
<html ${htmlAttributes(cv, ctx)}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  ${cv.document.description ? `<meta name="description" content="${escapeAttr(cv.document.description)}">` : ''}
  <title>${escapeHtml(cv.document.title || 'CV')}</title>
  <style>
${css}
  </style>
</head>
<body>
  <main class="page">
    <div class="cv-layout">
      <article class="resume" aria-labelledby="cv-name">
      ${renderHero(cv, ctx)}

      ${renderTopZone(cv, ctx)}

      <div class="content">
        <div class="main-column">
          ${join(renderZone(cv, 'main', ctx))}
        </div>

        <aside class="side-column" aria-label="Compétences et informations complémentaires">
          ${join(renderZone(cv, 'side', ctx))}
        </aside>
      </div>
      ${footer}
      </article>
      ${renderRail(cv)}
    </div>

    ${anyDetail ? MODAL : ''}

    ${renderTemplates(cv, ctx)}
  </main>
  <script>
${runtime}
  </script>
</body>
</html>
`;
}
