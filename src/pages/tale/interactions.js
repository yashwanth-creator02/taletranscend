// src/pages/tale/interactions.js
// Handles user interactions for the Tale Archive page.

import { resolveResumePoint, toggleResonance, getResonanceStatus } from '@services/index.js';
import { showToast } from '@ui/components/toast.js';
import { initIcons } from '@ui/components/icons.js';

/**
 * Sets up the Soul Resonance (like) interaction.
 */
export async function setupResonance(taleId) {
  const btn = document.getElementById('resonance-btn');
  const countEl = document.getElementById('resonance-count');
  if (!btn || !countEl) return;

  // Initial state
  const isActive = await getResonanceStatus(taleId);
  _updateResonanceUI(btn, countEl, isActive);

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const { active, count } = await toggleResonance(taleId);
      _updateResonanceUI(btn, countEl, active, count);
      showToast(active ? 'Souls Aligned.' : 'Resonance Decoupled.', 'success');
    } catch (err) {
      console.error('[resonance] Failed:', err);
      showToast('Neural resonance failed. Authentication required.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

function _updateResonanceUI(btn, countEl, active, count) {
  if (count !== undefined) countEl.textContent = count;

  const icon = btn.querySelector('i');
  const label = btn.querySelector('span');

  if (active) {
    btn.classList.add('border-orange-500/30', 'bg-orange-500/5');
    icon?.setAttribute('data-lucide', 'flame');
    icon?.classList.add('text-orange-500');
    if (label) label.textContent = 'Souls Aligned';
  } else {
    btn.classList.remove('border-orange-500/30', 'bg-orange-500/5');
    icon?.setAttribute('data-lucide', 'heart');
    icon?.classList.remove('text-orange-500');
    if (label) label.textContent = 'Align Souls';
  }
  initIcons(btn);
}
export function bindChapterClicks(taleId) {
  const list = document.getElementById('chapter-list');
  if (!list) return;

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.chapter-item');
    if (!item) return;

    const chapterId = item.dataset.chapterIndex;
    _fadeAndGo(`reader.html?taleId=${taleId}&chapterId=${chapterId}`);
  });
}

/**
 * Sets up the tab system for Synopsis, Chronicles, and Echoes.
 */
export function setupTabs() {
  const tabs = document.querySelectorAll('[data-tab]');
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      // Update buttons
      tabs.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Update panes
      document.querySelectorAll('.tab-content').forEach((pane) => pane.classList.add('hidden'));
      document.getElementById(`content-${target}`)?.classList.remove('hidden');
    });
  });
}

/**
 * Starts the reading experience from fragment 0.
 */
export function setupStartReading(taleId, chapters) {
  const btn = document.getElementById('start-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!chapters?.length) return;
    _fadeAndGo(`reader.html?taleId=${taleId}&chapterId=0`);
  });
}

/**
 * Resumes reading from the last recorded neural fragment.
 */
export function setupResumeReading(userId, taleId) {
  const btn = document.getElementById('resume-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const resume = await resolveResumePoint({ userId, taleId });
    const chapterId = resume?.chapterIndex ?? 0;
    _fadeAndGo(`reader.html?taleId=${taleId}&chapterId=${chapterId}`);
  });
}

/**
 * Handles the sticky header scroll effect and floating action bar visibility.
 */
export function initHeaderScroll() {
  const bar = document.getElementById('tale-action-bar');
  const hero = document.getElementById('hero-section');

  const onScroll = () => {
    const scrollY = window.scrollY;

    // Toggle bar visibility based on hero exit
    if (hero) {
      const heroBottom = hero.offsetTop + hero.offsetHeight - 100;
      bar?.classList.toggle('is-hidden', scrollY < heroBottom);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Set initial state
}

function _fadeAndGo(url) {
  document.body.style.transition = 'opacity 0.25s ease';
  document.body.style.opacity = '0';
  setTimeout(() => {
    window.location.href = url;
  }, 250);
}
