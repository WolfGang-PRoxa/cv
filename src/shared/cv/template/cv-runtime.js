(() => {
  const root = document.documentElement;
  const settings = root.dataset;
  root.classList.add('js');

  // Restaure le thème choisi lors d'une visite précédente.
  try {
    const savedTheme = localStorage.getItem('cv-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') root.dataset.theme = savedTheme;
  } catch (error) {
    // Le thème reste utilisable même si le stockage local est bloqué.
  }

  // Animations d'apparition des rubriques.
  const revealItems = document.querySelectorAll('.reveal');
  const revealStagger = Number(settings.revealStagger || 65);
  if ('IntersectionObserver' in window && settings.reveal !== 'none') {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index % 4, 3) * revealStagger}ms`;
      observer.observe(item);
    });
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }

  // Copie du téléphone et de l'adresse e-mail avec retour visuel.
  async function copyToClipboard(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const temporary = document.createElement('textarea');
    temporary.value = value;
    temporary.setAttribute('readonly', '');
    temporary.style.position = 'fixed';
    temporary.style.opacity = '0';
    document.body.appendChild(temporary);
    temporary.select();
    const copied = document.execCommand('copy');
    temporary.remove();
    if (!copied) throw new Error('Copie indisponible');
  }

  document.querySelectorAll('.copy-button').forEach(button => {
    const restingLabel = button.getAttribute('aria-label');
    button.addEventListener('click', async () => {
      const feedback = button.querySelector('.copy-feedback');
      try {
        await copyToClipboard(button.dataset.copy);
        button.classList.remove('copy-error');
        button.classList.add('is-copied');
        feedback.textContent = 'Copié !';
        button.setAttribute('aria-label', 'Information copiée dans le presse-papiers');
      } catch (error) {
        button.classList.remove('is-copied');
        button.classList.add('copy-error');
        feedback.textContent = 'Copie impossible';
      }
      window.clearTimeout(button.feedbackTimer);
      button.feedbackTimer = window.setTimeout(() => {
        button.classList.remove('is-copied', 'copy-error');
        feedback.textContent = 'Copié !';
        button.setAttribute('aria-label', restingLabel);
      }, 1600);
    });
  });

  // Bascule entre le mode jour et le mode nuit.
  const themeButton = document.getElementById('toggle-theme');
  if (themeButton) {
    const moonIcon = themeButton.querySelector('.moon-icon');
    const sunIcon = themeButton.querySelector('.sun-icon');
    const setTheme = (theme, save = true) => {
      const isDark = theme === 'dark';
      root.dataset.theme = isDark ? 'dark' : 'light';
      themeButton.setAttribute('aria-pressed', String(isDark));
      themeButton.setAttribute('aria-label', isDark ? 'Activer le mode jour' : 'Activer le mode nuit');
      themeButton.title = isDark ? 'Activer le mode jour' : 'Activer le mode nuit';
      themeButton.querySelector('.rail-label').textContent = isDark ? 'Mode jour' : 'Mode nuit';
      moonIcon.hidden = isDark;
      sunIcon.hidden = !isDark;
      if (save) {
        try { localStorage.setItem('cv-theme', isDark ? 'dark' : 'light'); } catch (error) {}
      }
    };
    setTheme(root.dataset.theme === 'dark' ? 'dark' : 'light', false);
    window.cvSetTheme = setTheme;
    themeButton.addEventListener('click', () => {
      setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  }

  // Légère inclinaison 3D de la carte du CV selon la position de la souris.
  // Réservée aux souris (pas au tactile) et désactivée si l'utilisateur réduit les animations.
  const resumeCard = document.querySelector('.resume');
  if (resumeCard && settings.tilt !== 'off') {
    const tiltQuery = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const TILT_MAX_X = Number(settings.tiltX || 1.6); // degrés : bascule haut / bas
    const TILT_MAX_Y = Number(settings.tiltY || 2.2); // degrés : bascule gauche / droite
    const tiltTarget = { x: 0, y: 0 };
    const tiltCurrent = { x: 0, y: 0 };
    let tiltPointer = null;
    let tiltOriginY = 0;
    let tiltFrame = null;
    let tiltLastTime = 0;
    let tiltReady = false; // attend la fin de l'animation d'arrivée de la carte

    const clamp01 = value => Math.min(Math.max(value, 0), 1);

    const updateTiltTarget = () => {
      tiltTarget.x = tiltTarget.y = 0;
      if (!tiltPointer || !tiltReady || !tiltQuery.matches || document.body.classList.contains('modal-open')) return;
      if (root.classList.contains('cv-preview-select')) return;
      const rect = resumeCard.getBoundingClientRect();
      // La carte est plus haute que l'écran : le calcul porte sur sa partie visible,
      // et elle pivote autour du centre de cette partie.
      const top = Math.max(rect.top, 0);
      const bottom = Math.min(rect.bottom, window.innerHeight);
      if (bottom <= top) return;
      const nx = clamp01((tiltPointer.x - rect.left) / rect.width) * 2 - 1;
      const ny = clamp01((tiltPointer.y - top) / (bottom - top)) * 2 - 1;
      tiltTarget.x = -ny * TILT_MAX_X;
      tiltTarget.y = nx * TILT_MAX_Y;
      tiltOriginY = (top + bottom) / 2 - rect.top;
    };

    const requestTilt = () => {
      if (tiltFrame === null) tiltFrame = requestAnimationFrame(renderTilt);
    };

    function renderTilt(time) {
      tiltFrame = null;
      updateTiltTarget();
      // Lissage indépendant de la fréquence de l'écran (60 Hz, 144 Hz…).
      const elapsed = tiltLastTime ? Math.min(time - tiltLastTime, 64) : 16.7;
      tiltLastTime = time;
      const ease = 1 - Math.pow(0.88, elapsed / 16.7);
      let settled = true;
      for (const key of ['x', 'y']) {
        tiltCurrent[key] += (tiltTarget[key] - tiltCurrent[key]) * ease;
        if (Math.abs(tiltTarget[key] - tiltCurrent[key]) > 0.005) settled = false;
        else tiltCurrent[key] = tiltTarget[key];
      }

      if (settled && !tiltTarget.x && !tiltTarget.y) {
        // Au repos : plus aucune transformation, pour garder un texte parfaitement net.
        resumeCard.style.transform = '';
        resumeCard.style.transformOrigin = '';
        resumeCard.style.willChange = '';
        tiltLastTime = 0;
        return;
      }

      resumeCard.style.willChange = 'transform';
      resumeCard.style.transformOrigin = `50% ${tiltOriginY.toFixed(1)}px`;
      resumeCard.style.transform = `perspective(1600px) rotateX(${tiltCurrent.x.toFixed(3)}deg) rotateY(${tiltCurrent.y.toFixed(3)}deg)`;

      if (settled) tiltLastTime = 0;
      else requestTilt();
    }

    resumeCard.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      tiltPointer = { x: event.clientX, y: event.clientY };
      requestTilt();
    });
    resumeCard.addEventListener('pointerleave', () => {
      tiltPointer = null;
      requestTilt();
    });
    // Au défilement, la souris reste immobile mais la carte bouge sous elle.
    window.addEventListener('scroll', () => { if (tiltPointer) requestTilt(); }, { passive: true });
    tiltQuery.addEventListener('change', requestTilt);

    const enableTilt = () => {
      if (tiltReady) return;
      tiltReady = true;
      requestTilt();
    };
    resumeCard.addEventListener('animationend', event => {
      if (event.target === resumeCard) enableTilt();
    });
    window.setTimeout(enableTilt, settings.cardArrive === 'off' ? 0 : 1000);
  }

  // Ouverture des fiches détaillées associées aux cartes.
  const detailModal = document.getElementById('detail-modal');
  if (detailModal) {
    const detailDialog = detailModal.querySelector('.detail-dialog');
    const detailBody = document.getElementById('detail-body');
    const detailClose = document.getElementById('detail-close');
    const detailBack = document.getElementById('detail-back');
    const detailTitle = document.getElementById('detail-title');
    const detailKicker = document.getElementById('detail-kicker');
    const detailSubtitle = document.getElementById('detail-subtitle');
    let activeDetailTrigger = null;
    let modalCloseTimer = null;

    const openDetail = trigger => {
      const template = document.getElementById(`detail-${trigger.dataset.detail}`);
      if (!template) return;
      window.clearTimeout(modalCloseTimer);
      activeDetailTrigger = trigger;
      detailKicker.textContent = template.dataset.kicker || '';
      detailKicker.hidden = !template.dataset.kicker;
      detailTitle.textContent = template.dataset.title || '';
      detailSubtitle.textContent = template.dataset.subtitle || '';
      detailSubtitle.hidden = !template.dataset.subtitle;
      detailBody.replaceChildren(template.content.cloneNode(true));
      document.querySelectorAll('[data-detail]').forEach(card => card.setAttribute('aria-expanded', String(card === trigger)));
      detailModal.setAttribute('aria-hidden', 'false');
      detailModal.classList.add('is-open');
      document.body.classList.add('modal-open');
      window.setTimeout(() => detailClose.focus(), 80);
    };

    const closeDetail = () => {
      if (!detailModal.classList.contains('is-open')) return;
      detailModal.classList.remove('is-open');
      detailModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      document.querySelectorAll('[data-detail]').forEach(card => card.setAttribute('aria-expanded', 'false'));
      const triggerToRestore = activeDetailTrigger;
      activeDetailTrigger = null;
      modalCloseTimer = window.setTimeout(() => {
        detailBody.replaceChildren();
        if (triggerToRestore && document.contains(triggerToRestore)) triggerToRestore.focus();
      }, 360);
    };

    document.querySelectorAll('[data-detail]').forEach(card => {
      card.addEventListener('click', event => {
        if (root.classList.contains('cv-preview-select')) return;
        // Les éventuels contrôles placés dans une carte gardent leur propre comportement.
        if (event.target.closest('a, button, input, select, textarea')) return;
        openDetail(card);
      });
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDetail(card);
        }
      });
    });
    detailClose.addEventListener('click', closeDetail);
    detailBack.addEventListener('click', closeDetail);
    detailModal.addEventListener('click', event => {
      if (event.target === detailModal) closeDetail();
    });
    detailDialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDetail();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = [...detailDialog.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
          .filter(el => !el.hasAttribute('hidden'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    // Aperçu de l'éditeur : ouverture d'une fiche détaillée à la demande.
    window.cvOpenDetail = key => {
      const trigger = document.querySelector(`[data-detail="${key}"]`);
      if (trigger) openDetail(trigger);
    };
  }

  // Génère le PDF à partir de la page HTML et de ses styles @media print.
  // Dans la fenêtre d'impression, choisir « Enregistrer au format PDF ».
  const downloadButton = document.getElementById('download-pdf');
  if (downloadButton) downloadButton.addEventListener('click', () => window.print());

  // ------------------------------------------------------------------
  // Mode aperçu (uniquement dans l'application) : conserve la position de
  // défilement entre deux rendus et permet de sélectionner un élément.
  // ------------------------------------------------------------------
  if (root.classList.contains('cv-preview')) {
    const post = message => window.parent.postMessage({ source: 'cv-preview', ...message }, '*');
    const initialScroll = Number(settings.initialScroll || 0);
    if (initialScroll) window.scrollTo(0, initialScroll);
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => post({ type: 'scroll', y: window.scrollY }), 60);
    }, { passive: true });

    const focusId = settings.focusId;
    if (focusId) {
      const target = document.querySelector(`[data-cv-id="${CSS.escape(focusId)}"]`);
      if (target) {
        target.classList.add('cv-preview-focus');
        if (settings.scrollToFocus === 'yes') target.scrollIntoView({ block: 'center' });
      }
    }

    document.addEventListener('click', event => {
      if (!root.classList.contains('cv-preview-select')) return;
      const target = event.target.closest('[data-cv-id]');
      event.preventDefault();
      event.stopPropagation();
      if (target) post({ type: 'select', id: target.dataset.cvId });
    }, true);

    window.addEventListener('message', event => {
      const data = event.data || {};
      if (data.type === 'select-mode') root.classList.toggle('cv-preview-select', Boolean(data.enabled));
      if (data.type === 'open-detail' && window.cvOpenDetail) window.cvOpenDetail(data.key);
      if (data.type === 'theme') {
        if (window.cvSetTheme) window.cvSetTheme(data.theme, false);
        else root.dataset.theme = data.theme;
      }
    });
    post({ type: 'ready' });
  }
})();
