import { getReliquaryArtifacts } from './reliquary.data.js';
import { escapeHtml } from '@/utils/string.utils.ts';
import { createLogger } from '@/utils/logger.ts';

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
  activeRelicId = artifacts[0]?.id || null;

  container.innerHTML = _buildReliquaryMarkup(artifacts);

  _setupInteractivity(container, artifacts);
  _setupMotesCanvas(container);
  _setupParallax(container);

  log.info(`Archive Reliquary initialized with ${artifacts.length} artifacts`);
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
 * Builds the HTML structure for the reliquary tableau.
 *
 * @param {import('./reliquary.data.js').ReliquaryArtifact[]} artifacts
 * @returns {string}
 */
function _buildReliquaryMarkup(artifacts) {
  const defaultItem = artifacts[0];

  return `
    <div class="archive-reliquary" role="region" aria-label="The Archive Reliquary: Interactive Mythic Artifacts">
      <!-- Ambient light aura (emanating from the lamp position) -->
      <div class="reliquary-lamp-halo" aria-hidden="true"></div>

      <!-- Canvas for drifting memory spirit motes -->
      <canvas class="reliquary-motes-canvas" aria-hidden="true"></canvas>

      <!-- 3D Perspective Stage -->
      <div class="reliquary-stage">
        ${artifacts.map((artifact) => _buildArtifactNode(artifact)).join('')}
      </div>

      <!-- Relic Inspector HUD (displays active lore on hover/selection) -->
      <div id="relic-inspector" class="relic-inspector glass-strong" role="status" aria-live="polite">
        <div class="relic-inspector__header">
          <span id="relic-inspector-era" class="relic-inspector__era">${escapeHtml(defaultItem.era)}</span>
          <span class="relic-inspector__badge">Archive Relic</span>
        </div>
        <h4 id="relic-inspector-title" class="relic-inspector__title">${escapeHtml(defaultItem.title)}</h4>
        <p id="relic-inspector-tale" class="relic-inspector__tale">
          Chronicle: <strong class="text-accent-tint">${escapeHtml(defaultItem.taleTitle)}</strong>
        </p>
        <p id="relic-inspector-lore" class="relic-inspector__lore">${escapeHtml(defaultItem.lore)}</p>
        <div class="relic-inspector__footer">
          <a id="relic-inspector-link" href="${escapeHtml(defaultItem.readUrl)}" class="relic-inspector__cta btn btn-primary btn-sm">
            <span>Explore Chronicle</span>
            <i data-lucide="arrow-right"></i>
          </a>
        </div>
      </div>
    </div>
  `;
}

/**
 * Builds an individual artifact DOM element.
 *
 * @param {import('./reliquary.data.js').ReliquaryArtifact} artifact
 * @returns {string}
 */
function _buildArtifactNode(artifact) {
  const { id, type, title, asset, position, zIndex, animation } = artifact;
  const isSelected = id === activeRelicId;

  return `
    <div
      class="reliquary-item ${animation} ${isSelected ? 'is-selected' : ''}"
      data-relic-id="${escapeHtml(id)}"
      data-relic-type="${escapeHtml(type)}"
      style="
        left: ${position.left};
        top: ${position.top};
        width: ${position.width};
        z-index: ${zIndex};
      "
      role="button"
      tabindex="0"
      aria-label="${escapeHtml(title)}: Select to inspect lore"
      aria-expanded="${isSelected ? 'true' : 'false'}"
    >
      <div class="reliquary-item__glow" aria-hidden="true"></div>
      <img
        src="${asset}"
        alt="${escapeHtml(title)}"
        class="reliquary-item__asset reliquary-item__asset--${type}"
        loading="lazy"
        draggable="false"
      />
    </div>
  `;
}

/**
 * Sets up click, hover, and keyboard listeners for artifact interaction.
 *
 * @param {HTMLElement} container
 * @param {import('./reliquary.data.js').ReliquaryArtifact[]} artifacts
 */
function _setupInteractivity(container, artifacts) {
  const items = container.querySelectorAll('.reliquary-item');
  const inspector = container.querySelector('#relic-inspector');
  const eraEl = container.querySelector('#relic-inspector-era');
  const titleEl = container.querySelector('#relic-inspector-title');
  const taleEl = container.querySelector('#relic-inspector-tale');
  const loreEl = container.querySelector('#relic-inspector-lore');
  const linkEl = container.querySelector('#relic-inspector-link');

  function selectArtifact(artifact) {
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
      taleEl.innerHTML = `Chronicle: <strong class="text-accent-tint">${escapeHtml(artifact.taleTitle)}</strong>`;
    }
    if (loreEl) loreEl.textContent = artifact.lore;
    if (linkEl) linkEl.setAttribute('href', artifact.readUrl);

    if (inspector) {
      inspector.classList.remove('relic-inspector--pulse');
      void inspector.offsetWidth; // trigger reflow for pulse animation
      inspector.classList.add('relic-inspector--pulse');
    }
  }

  items.forEach((item) => {
    const relicId = item.dataset.relicId;
    const artifact = artifacts.find((a) => a.id === relicId);

    const onEnter = () => selectArtifact(artifact);
    const onClick = () => selectArtifact(artifact);
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectArtifact(artifact);
      }
    };

    item.addEventListener('mouseenter', onEnter);
    item.addEventListener('click', onClick);
    item.addEventListener('keydown', onKey);

    cleanupFns.push(() => {
      item.removeEventListener('mouseenter', onEnter);
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
    width = canvas.width = container.clientWidth || 400;
    height = canvas.height = container.clientHeight || 340;
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
