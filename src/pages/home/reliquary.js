// src/pages/home/reliquary.js
// Interactive centerpiece for the hero section: The Archive Reliquary (Scholar's Tableau).
// Renders individual, animated mythic artifacts (grimoire, lamp, watch, map, spectacles, quill, spirits).
// Completely borderless, seamless blend with transparent SVGs and dynamic hover reveals.

import { getReliquaryArtifacts } from './reliquary.data.js';
import { escapeHtml, createLogger } from '@/utils';
import { initIcons } from '@ui/components/icons.js';

const log = createLogger('Reliquary');

let activeRelicId = null;
let cleanupFns = [];

/**
 * Initializes the Archive Reliquary tableau inside the designated container.
 *
 * @param {string} [containerId='archive-reliquary-container']
 * @param {import('@state/schemas/tale.schema.js').Tale[]} [tales=[]]
 */
export function initReliquary(containerId = 'archive-reliquary-container', tales = []) {
  const container = document.getElementById(containerId);
  if (!container) {
    log.warn(`Container #${containerId} not found in DOM`);
    return;
  }

  // Teardown previous listeners if re-initialized
  teardownReliquary();

  const artifacts = getReliquaryArtifacts(tales);
  activeRelicId = null;

  container.innerHTML = _buildReliquaryMarkup(artifacts);
  initIcons();

  _setupInteractivity(container, artifacts);
  _setupMotesCanvas(container);
  _setupParallax(container);

  log.info(`Archive Reliquary initialized with ${artifacts.length} transparent vector artifacts`);
}

/**
 * Tears down event handlers.
 */
export function teardownReliquary() {
  cleanupFns.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
  cleanupFns = [];
}

/**
 * Builds the HTML structure for the borderless reliquary tableau.
 *
 * @param {import('./reliquary.data.js').ReliquaryArtifact[]} artifacts
 * @returns {string}
 */
function _buildReliquaryMarkup(artifacts) {
  const defaultItem = artifacts[0];

  return `
    <div class="archive-reliquary" role="region" aria-label="The Archive Reliquary: Interactive Mythic Artifacts">
      <!-- Soft ambient warm glow behind lamp (seamless blend) -->
      <div class="reliquary-lamp-halo" aria-hidden="true"></div>

      <!-- Canvas for drifting memory spirit motes -->
      <canvas class="reliquary-motes-canvas" aria-hidden="true"></canvas>

      <!-- 3D Perspective Stage -->
      <div class="reliquary-stage">
        ${artifacts.map((artifact) => _buildArtifactNode(artifact)).join('')}
      </div>

      <!-- Discreet Hover Plaque (only appears when an artifact is hovered or focused) -->
      <div id="relic-inspector" class="relic-inspector relic-inspector--hover-only" role="status" aria-live="polite">
        <div class="relic-inspector__row">
          <span id="relic-inspector-era" class="relic-inspector__era">${escapeHtml(defaultItem.era)}</span>
          <span class="relic-inspector__divider" aria-hidden="true">&middot;</span>
          <h4 id="relic-inspector-title" class="relic-inspector__title">${escapeHtml(defaultItem.title)}</h4>
          <span class="relic-inspector__action">
            <span class="relic-inspector__action-text">Explore chronicle</span>
            <i data-lucide="arrow-right"></i>
          </span>
        </div>
        <p id="relic-inspector-tale" class="sr-only">
          Chronicle: ${escapeHtml(defaultItem.taleTitle)}
        </p>
        <p id="relic-inspector-lore" class="sr-only">${escapeHtml(defaultItem.lore)}</p>
        <a id="relic-inspector-link" href="${escapeHtml(defaultItem.readUrl)}" class="sr-only">
          Explore ${escapeHtml(defaultItem.title)}
        </a>
      </div>
    </div>
  `;
}

/**
 * Builds an individual artifact DOM link node with attached floating hover badge.
 *
 * @param {import('./reliquary.data.js').ReliquaryArtifact} artifact
 * @returns {string}
 */
function _buildArtifactNode(artifact) {
  const {
    id,
    type,
    title,
    era,
    taleTitle,
    asset,
    readUrl,
    position,
    zIndex,
    animation,
    pillPlacement,
  } = artifact;
  const isSelected = id === activeRelicId;
  const pillModifier =
    pillPlacement === 'top' ? 'reliquary-item__pill--top' : 'reliquary-item__pill--bottom';

  return `
    <a
      href="${escapeHtml(readUrl)}"
      class="reliquary-item ${animation} ${isSelected ? 'is-selected' : ''}"
      data-relic-id="${escapeHtml(id)}"
      data-relic-type="${escapeHtml(type)}"
      data-relic-title="${escapeHtml(title)}"
      data-relic-era="${escapeHtml(era)}"
      data-relic-tale="${escapeHtml(taleTitle)}"
      style="
        left: ${position.left};
        top: ${position.top};
        width: ${position.width};
        z-index: ${zIndex};
      "
      role="button"
      tabindex="0"
      aria-label="${escapeHtml(title)}: ${escapeHtml(era)} &middot; Explore ${escapeHtml(taleTitle)}"
      aria-expanded="${isSelected ? 'true' : 'false'}"
    >
      <div class="reliquary-item__glow" aria-hidden="true"></div>
      <img
        src="${asset}"
        alt="${escapeHtml(title)}"
        class="reliquary-item__asset reliquary-item__asset--${type}"
        loading="eager"
        draggable="false"
      />
      <!-- Contextual floating pill placed cleanly away from the artwork -->
      <span class="reliquary-item__pill ${pillModifier}" aria-hidden="true">
        <span class="reliquary-item__pill-text">${escapeHtml(title)}</span>
        <span class="reliquary-item__pill-arrow">&rarr;</span>
      </span>
    </a>
  `;
}

/**
 * Sets up click, hover (with dwell delay), keyboard, and layer hit-testing for artifact interaction.
 *
 * @param {HTMLElement} container
 * @param {import('./reliquary.data.js').ReliquaryArtifact[]} artifacts
 */
function _setupInteractivity(container, artifacts) {
  const stage = container.querySelector('.reliquary-stage');
  const items = container.querySelectorAll('.reliquary-item');
  const inspector = container.querySelector('#relic-inspector');
  const eraEl = container.querySelector('#relic-inspector-era');
  const titleEl = container.querySelector('#relic-inspector-title');
  const taleEl = container.querySelector('#relic-inspector-tale');
  const loreEl = container.querySelector('#relic-inspector-lore');
  const linkEl = container.querySelector('#relic-inspector-link');

  let hideTimer = null;
  let dwellTimer = null;
  let currentCandidateId = null;

  // In-memory offscreen canvases for alpha transparency hit testing
  const artifactBitmaps = new Map();

  artifacts.forEach((artifact) => {
    if (!artifact.asset) return;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = artifact.asset;
      img.onload = () => {
        try {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = 120;
          offCanvas.height =
            Math.round(120 * ((img.naturalHeight || 300) / (img.naturalWidth || 400))) || 120;
          const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
            artifactBitmaps.set(artifact.id, {
              ctx,
              width: offCanvas.width,
              height: offCanvas.height,
            });
          }
        } catch {
          // Gracefully fallback if canvas context is unavailable
        }
      };
    } catch {
      // Fallback
    }
  });

  function selectArtifact(artifact, showInspector = true) {
    if (!artifact) return;
    activeRelicId = artifact.id;

    items.forEach((item) => {
      const match = item.dataset.relicId === artifact.id;
      item.classList.toggle('is-selected', match);
      item.setAttribute('aria-expanded', match ? 'true' : 'false');
    });

    if (eraEl) eraEl.textContent = artifact.era;
    if (titleEl) titleEl.textContent = artifact.title;
    if (taleEl) {
      taleEl.textContent = `Chronicle: ${artifact.taleTitle}`;
    }
    if (loreEl) loreEl.textContent = artifact.lore;
    if (linkEl) linkEl.setAttribute('href', artifact.readUrl);

    if (inspector && showInspector) {
      if (hideTimer) clearTimeout(hideTimer);
      inspector.classList.add('is-visible');
    }
  }

  function hideInspector() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (inspector) inspector.classList.remove('is-visible');
    }, 400);
  }

  /**
   * Identifies which artifact lies beneath the viewport coordinate (clientX, clientY)
   * using z-index layering and alpha transparency inspection so overlapping empty areas don't trigger.
   *
   * @param {number} clientX
   * @param {number} clientY
   * @returns {import('./reliquary.data.js').ReliquaryArtifact|null}
   */
  function identifyArtifactAtPoint(clientX, clientY) {
    // Check items sorted by zIndex descending (top visual layer first)
    const sorted = [...artifacts].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

    for (const artifact of sorted) {
      const itemEl = container.querySelector(`[data-relic-id="${artifact.id}"]`);
      if (!itemEl) continue;

      const rect = itemEl.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        continue;
      }

      // Check pixel alpha bitmap if available
      const bitmap = artifactBitmaps.get(artifact.id);
      if (bitmap && bitmap.ctx) {
        const relX = (clientX - rect.left) / rect.width;
        const relY = (clientY - rect.top) / rect.height;
        const px = Math.min(bitmap.width - 1, Math.max(0, Math.floor(relX * bitmap.width)));
        const py = Math.min(bitmap.height - 1, Math.max(0, Math.floor(relY * bitmap.height)));

        try {
          const pixel = bitmap.ctx.getImageData(px, py, 1, 1).data;
          // Alpha > 25 indicates non-transparent drawn artwork on this layer
          if (pixel[3] > 25) {
            return artifact;
          }
          // Transparent pixel on this layer: continue down to lower layers
          continue;
        } catch {
          // Fall through to geometric fallback
        }
      }

      // Fallback: Inset geometric hit zone (12% inset avoids outer bounding overlaps)
      const insetX = rect.width * 0.12;
      const insetY = rect.height * 0.12;
      if (
        clientX >= rect.left + insetX &&
        clientX <= rect.right - insetX &&
        clientY >= rect.top + insetY &&
        clientY <= rect.bottom - insetY
      ) {
        return artifact;
      }
    }

    return null;
  }

  // Pointer move on stage: Layer identification + Dwell Delay (~280ms)
  function onStagePointerMove(e) {
    const hitArtifact = identifyArtifactAtPoint(e.clientX, e.clientY);

    if (stage) {
      stage.style.cursor = hitArtifact ? 'pointer' : 'default';
    }

    if (!hitArtifact) {
      if (dwellTimer) {
        clearTimeout(dwellTimer);
        dwellTimer = null;
      }
      currentCandidateId = null;
      return;
    }

    // Already awaiting or hovering this same artifact
    if (currentCandidateId === hitArtifact.id) {
      return;
    }

    // New candidate artifact hovered: start dwell timer
    if (dwellTimer) {
      clearTimeout(dwellTimer);
    }
    currentCandidateId = hitArtifact.id;
    dwellTimer = setTimeout(() => {
      selectArtifact(hitArtifact, true);
    }, 280);
  }

  function onStagePointerLeave() {
    if (dwellTimer) {
      clearTimeout(dwellTimer);
      dwellTimer = null;
    }
    currentCandidateId = null;
    if (stage) stage.style.cursor = 'default';
    hideInspector();
  }

  function onStageClick(e) {
    if (e.target && e.target.closest('.reliquary-item')) {
      return;
    }
    const hitArtifact = identifyArtifactAtPoint(e.clientX, e.clientY);
    if (hitArtifact) {
      if (activeRelicId !== hitArtifact.id) {
        selectArtifact(hitArtifact, true);
      } else if (hitArtifact.readUrl) {
        window.location.href = hitArtifact.readUrl;
      }
    }
  }

  if (stage) {
    stage.addEventListener('pointermove', onStagePointerMove);
    stage.addEventListener('pointerleave', onStagePointerLeave);
    stage.addEventListener('click', onStageClick);

    cleanupFns.push(() => {
      stage.removeEventListener('pointermove', onStagePointerMove);
      stage.removeEventListener('pointerleave', onStagePointerLeave);
      stage.removeEventListener('click', onStageClick);
    });
  }

  // Individual item listeners for keyboard accessibility and direct DOM events
  items.forEach((item) => {
    const relicId = item.dataset.relicId;
    const artifact = artifacts.find((a) => a.id === relicId);

    const onFocus = () => selectArtifact(artifact, true);
    const onBlur = () => hideInspector();
    const onClick = () => selectArtifact(artifact, true);
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectArtifact(artifact, true);
        if (artifact?.readUrl) {
          window.location.href = artifact.readUrl;
        }
      }
    };

    item.addEventListener('focus', onFocus);
    item.addEventListener('blur', onBlur);
    item.addEventListener('click', onClick);
    item.addEventListener('keydown', onKey);

    cleanupFns.push(() => {
      item.removeEventListener('focus', onFocus);
      item.removeEventListener('blur', onBlur);
      item.removeEventListener('click', onClick);
      item.removeEventListener('keydown', onKey);
    });
  });
}

/**
 * 3D Parallax tilt reacting to cursor motion on desktop.
 *
 * @param {HTMLElement} container
 */
function _setupParallax(container) {
  const stage = container.querySelector('.reliquary-stage');
  if (!stage) return;

  // Skip on touch/mobile or reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let rafId = null;

  function onMouseMove(e) {
    if (window.innerWidth < 768) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtle max rotation: +/- 5 degrees
    const rotateY = ((x - centerX) / centerX) * 5;
    const rotateX = -((y - centerY) / centerY) * 5;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      stage.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    });
  }

  function onMouseLeave() {
    if (rafId) cancelAnimationFrame(rafId);
    stage.style.transform = 'rotateX(0deg) rotateY(0deg)';
  }

  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('mouseleave', onMouseLeave);

  cleanupFns.push(() => {
    if (rafId) cancelAnimationFrame(rafId);
    container.removeEventListener('mousemove', onMouseMove);
    container.removeEventListener('mouseleave', onMouseLeave);
  });
}

/**
 * Ambient particle canvas: Ethereal memory spirits drifting upward from grimoire toward the lamp.
 *
 * @param {HTMLElement} container
 */
function _setupMotesCanvas(container) {
  const canvas = container.querySelector('.reliquary-motes-canvas');
  if (!canvas || typeof canvas.getContext !== 'function') return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let animId = null;
  let width = 0;
  let height = 0;

  function resize() {
    const parent = canvas.parentElement;
    width = canvas.width = parent?.clientWidth || container.clientWidth || 400;
    height = canvas.height = parent?.clientHeight || container.clientHeight || 340;
  }

  resize();
  window.addEventListener('resize', resize);
  cleanupFns.push(() => window.removeEventListener('resize', resize));

  // Particle pool
  const PARTICLE_COUNT = 18;
  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.8 + 0.8,
    speedY: Math.random() * 0.4 + 0.15,
    speedX: (Math.random() - 0.5) * 0.25,
    alpha: Math.random() * 0.6 + 0.2,
    phase: Math.random() * Math.PI * 2,
  }));

  function render() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.y -= p.speedY;
      p.x += p.speedX;
      p.phase += 0.02;

      // Wrap around
      if (p.y < 0) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      const alpha = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));

      // Amber/gold starlight motes
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245, 158, 11, ${alpha.toFixed(3)})`;
      ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fill();
    });

    animId = requestAnimationFrame(render);
  }

  render();

  cleanupFns.push(() => {
    if (animId) cancelAnimationFrame(animId);
  });
}
