// src/pages/tale/interactions.js
// User interactions for the Tale Archive page.

import {
  navigateTo,
  resolveHref,
  createLogger,
  getRemainingTime,
  applyButtonCooldown,
} from '@/utils';
import {
  resolveResumePoint,
  toggleResonance,
  getResonanceStatus,
  RESONANCE_COOLDOWN_MS,
  BOOKMARK_COOLDOWN_MS,
} from '@services/index.js';
import { auth } from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';
import { initIcons } from '@ui/components/icons.js';

const log = createLogger('TaleInteractions');

/* ─────────────────────────────────────────────
   Soul Resonance
   ───────────────────────────────────────────── */

/**
 * Sets up the Soul Resonance (reaction) interaction.
 *
 * @param {string} taleId
 */
export async function setupResonance(taleId) {
  log.info('Setting up resonance', { taleId });
  const btn = document.getElementById('resonance-btn');
  const countEl = document.getElementById('resonance-count');
  if (!btn || !countEl) return;

  const isActive = await getResonanceStatus(taleId);
  log.debug('Initial resonance status', { isActive });
  _updateResonanceUI(btn, countEl, isActive);

  btn.addEventListener('click', async () => {
    log.info('Resonance toggle clicked');
    btn.disabled = true;
    try {
      const result = await toggleResonance(taleId);

      if (result.status === 'rate-limited') {
        const rateLimitKey = `resonance:${auth.currentUser?.uid}:${taleId}`;
        const label = btn.querySelector('span');
        const currentText = label?.textContent || 'Align Souls';

        applyButtonCooldown(btn, RESONANCE_COOLDOWN_MS, currentText, () =>
          getRemainingTime(rateLimitKey, RESONANCE_COOLDOWN_MS)
        );
        return;
      }

      const { active, count } = result;
      log.info('Resonance toggled', { active, count });
      _updateResonanceUI(btn, countEl, active, count);
      showToast(active ? 'Souls Aligned.' : 'Resonance Decoupled.', 'success');

      // Start cooldown after success
      const rateLimitKey = `resonance:${auth.currentUser?.uid}:${taleId}`;
      const label = btn.querySelector('span');
      const currentText = label?.textContent || 'Align Souls';
      applyButtonCooldown(btn, RESONANCE_COOLDOWN_MS, currentText, () =>
        getRemainingTime(rateLimitKey, RESONANCE_COOLDOWN_MS)
      );
    } catch (err) {
      log.error('Resonance failed', err);
      showToast('Neural resonance failed. Authentication required.', 'error');
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

/* ─────────────────────────────────────────────
   Chapter List
   ───────────────────────────────────────────── */

/**
 * Wires chapter item clicks to navigate to the reader page.
 *
 * @param {string} taleId
 */
export function bindChapterClicks(taleId) {
  const list = document.getElementById('chapter-list');
  if (!list) return;

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.chapter-item');
    if (!item) return;

    // chapterIndex is the zero-based index stored on the element — use it directly
    const chapterId = item.dataset.chapterIndex ?? '0';
    _fadeAndGo(`reader.html?taleId=${taleId}&chapterId=${chapterId}`);
  });
}

/* ─────────────────────────────────────────────
   Tabs
   ───────────────────────────────────────────── */

/**
 * Sets up the tab system for Synopsis, Chronicles, and Echoes.
 */
export function setupTabs() {
  const tabs = document.querySelectorAll('[data-tab]');

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabs.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach((pane) => pane.classList.add('hidden'));
      document.getElementById(`content-${target}`)?.classList.remove('hidden');
    });
  });
}

/* ─────────────────────────────────────────────
   Start Reading
   ───────────────────────────────────────────── */

/**
 * Starts reading from chapter 0.
 *
 * @param {string} taleId
 * @param {import('@state/schemas/tale.schema.js').Chapter[]} chapters
 */
export function setupStartReading(taleId, chapters) {
  const btn = document.getElementById('start-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!chapters?.length) return;
    // chapterId=0 is always the first chapter by convention — never use chapters[0].id
    _fadeAndGo(`reader.html?taleId=${taleId}&chapterId=0`);
  });
}

/* ─────────────────────────────────────────────
   Resume Reading
   ───────────────────────────────────────────── */

/**
 * Resumes reading from the last recorded chapter.
 *
 * @param {string} userId
 * @param {string} taleId
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

/* ─────────────────────────────────────────────
   Add to Shelf (Bookmark)
   ───────────────────────────────────────────── */

/**
 * Wires the Add to Shelf button.
 * Bug fix: button had no id="shelf-btn" in tale.html — this targets it by id once the HTML is updated.
 *
 * @param {string} userId
 * @param {string} taleId
 * @param {import('@state/schemas/tale.schema.js').Tale} tale
 * @param {{ addToBookmarks: Function, removeFromBookmarks: Function, isBookmarked: Function }} bookmarkService
 */
export async function setupShelfButton(userId, taleId, tale, bookmarkService) {
  const btn = document.getElementById('shelf-btn');
  if (!btn) return;

  // Set initial state
  const alreadyShelved = await bookmarkService.isBookmarked({ userId, taleId });
  _updateShelfUI(btn, alreadyShelved);

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const rateLimitKey = `bookmark:${userId}`;

    try {
      const current = btn.dataset.shelved === 'true';
      if (current) {
        // Remove from bookmarks (now rate limited)
        const result = await bookmarkService.removeFromBookmarks({ userId, taleId });

        if (result?.status === 'rate-limited') {
          const label = btn.querySelector('span');
          const currentText = label?.textContent || 'On Your Shelf';
          applyButtonCooldown(btn, BOOKMARK_COOLDOWN_MS, currentText, () =>
            getRemainingTime(rateLimitKey, BOOKMARK_COOLDOWN_MS)
          );
          return;
        }

        _updateShelfUI(btn, false);
        showToast('Removed from your shelf.', 'info');

        // Start cooldown after success
        const label = btn.querySelector('span');
        const currentText = label?.textContent || 'Add to Shelf';
        applyButtonCooldown(btn, BOOKMARK_COOLDOWN_MS, currentText, () =>
          getRemainingTime(rateLimitKey, BOOKMARK_COOLDOWN_MS)
        );
      } else {
        // Add to bookmarks (rate limited)
        const result = await bookmarkService.addToBookmarks({ userId, taleId, tale });

        if (result?.status === 'rate-limited') {
          const label = btn.querySelector('span');
          const currentText = label?.textContent || 'Add to Shelf';
          applyButtonCooldown(btn, BOOKMARK_COOLDOWN_MS, currentText, () =>
            getRemainingTime(rateLimitKey, BOOKMARK_COOLDOWN_MS)
          );
          return;
        }

        _updateShelfUI(btn, true);
        showToast('Added to your shelf.', 'success');

        // Start cooldown after success
        const label = btn.querySelector('span');
        const currentText = label?.textContent || 'Add to Shelf';
        applyButtonCooldown(btn, BOOKMARK_COOLDOWN_MS, currentText, () =>
          getRemainingTime(rateLimitKey, BOOKMARK_COOLDOWN_MS)
        );
      }
    } catch (err) {
      log.error('Shelf operation failed', err);
      showToast('Could not update shelf.', 'error');
      btn.disabled = false;
    }
  });
}

function _updateShelfUI(btn, shelved) {
  btn.dataset.shelved = String(shelved);
  const label = btn.querySelector('span');
  const icon = btn.querySelector('i');
  if (label) label.textContent = shelved ? 'On Your Shelf' : 'Add to Shelf';
  if (icon) icon.setAttribute('data-lucide', shelved ? 'bookmark-check' : 'bookmark-plus');
  btn.classList.toggle('active', shelved);
  initIcons(btn);
}

/* ─────────────────────────────────────────────
   Share
   ───────────────────────────────────────────── */

/**
 * Wires the Share button.
 * Bug fix: button had no id="share-btn" in tale.html — targets it by id once HTML is updated.
 * Bug fix: copy link was using a wrong URL path after the refactor.
 *
 * @param {string} taleId
 */
export function setupShareButton(taleId) {
  const btn = document.getElementById('share-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    // Build the canonical tale URL using resolveHref for cross-environment compatibility
    const url = `${window.location.origin}${resolveHref(`tale.html?id=${taleId}`)}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
      } catch {
        // User cancelled or share failed — fall back to clipboard
        _copyToClipboard(url);
      }
    } else {
      _copyToClipboard(url);
    }
  });
}

async function _copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Link copied to clipboard.', 'success');
  } catch {
    showToast('Could not copy link.', 'error');
  }
}

/* ─────────────────────────────────────────────
   Header Scroll
   ───────────────────────────────────────────── */

/**
 * Handles sticky header scroll effect and floating action bar visibility.
 */
export function initHeaderScroll() {
  const bar = document.getElementById('tale-action-bar');
  const hero = document.getElementById('hero-section');

  const onScroll = () => {
    if (!hero) return;
    const heroBottom = hero.offsetTop + hero.offsetHeight - 100;
    bar?.classList.toggle('is-hidden', window.scrollY < heroBottom);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ─────────────────────────────────────────────
   Internal
   ───────────────────────────────────────────── */

function _fadeAndGo(url) {
  navigateTo(url);
}
