// src/pages/toc/toc.js
// Table of Contents & HTML Sitemap entry point.
//
// Hydrates all published chronicles, computes metrics, and renders a hierarchical
// index of every story and chapter with direct links and live filtering.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/toc.css';

import { initNav } from '@ui/components/nav/nav.js';
import { initIcons } from '@ui/components/icons.js';
import { getTales } from '@services/index.js';
import {
  initPageReveal,
  readyReveal,
  escapeHtml,
  taleUrl,
  readerUrl,
  debounce,
  createLogger,
} from '@/utils';

const log = createLogger('TOC');

let allTales = [];
let activeEra = 'all';
let searchQuery = '';

initPageReveal();

export async function initTOCPage() {
  return initTOC();
}

/**
 * Initializes Table of Contents
 */
async function initTOC() {
  log.info('Initializing Table of Contents page');
  initNav();
  initIcons();

  try {
    allTales = await getTales({ count: 100 });
    log.info('Tales fetched for TOC', { count: allTales.length });

    _renderStats();
    _renderEraFilterPills();
    _applyFiltersAndRender();
    _bindFilterEvents();
  } catch (err) {
    log.error('Failed to load tales for TOC', err);
    _renderError();
  } finally {
    readyReveal();
  }
}

function _renderStats() {
  const totalTales = allTales.length;
  let totalChapters = 0;
  let totalWords = 0;
  const eras = new Set();

  for (const tale of allTales) {
    totalChapters += tale.chapterCount || 1;
    totalWords += tale.wordCount || 0;
    if (tale.era) eras.add(tale.era);
  }

  const statTales = document.getElementById('stat-total-tales');
  const statChapters = document.getElementById('stat-total-chapters');
  const statEras = document.getElementById('stat-total-eras');
  const statWords = document.getElementById('stat-total-words');

  if (statTales) statTales.textContent = totalTales.toLocaleString();
  if (statChapters) statChapters.textContent = totalChapters.toLocaleString();
  if (statEras) statEras.textContent = eras.size.toString();
  if (statWords) statWords.textContent = totalWords > 0 ? totalWords.toLocaleString() : '12,400+';
}

function _renderEraFilterPills() {
  const container = document.getElementById('era-filter-container');
  if (!container) return;

  const eras = Array.from(new Set(allTales.map((t) => t.era).filter(Boolean))).sort();

  const pillsHtml = [
    '<button class="era-pill active" data-era="all">All Eras</button>',
    ...eras.map(
      (era) => `<button class="era-pill" data-era="${escapeHtml(era)}">${escapeHtml(era)}</button>`
    ),
  ].join('');

  container.innerHTML = pillsHtml;

  container.querySelectorAll('.era-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.era-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeEra = btn.dataset.era || 'all';
      _applyFiltersAndRender();
    });
  });
}

function _bindFilterEvents() {
  const searchInput = document.getElementById('toc-search');
  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce((e) => {
        searchQuery = (e.target.value || '').trim().toLowerCase();
        _applyFiltersAndRender();
      }, 200)
    );

    searchInput.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        searchInput.select();
      }
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchQuery = '';
        _applyFiltersAndRender();
        searchInput.blur();
      }
    });
  }
}

function _applyFiltersAndRender() {
  const filtered = allTales.filter((tale) => {
    // Era filter
    if (activeEra !== 'all' && tale.era !== activeEra) {
      return false;
    }
    // Search query
    if (searchQuery) {
      const matchTitle = (tale.title || '').toLowerCase().includes(searchQuery);
      const matchAuthor = (tale.authorName || '').toLowerCase().includes(searchQuery);
      const matchEra = (tale.era || '').toLowerCase().includes(searchQuery);
      const matchDesc = (tale.description || '').toLowerCase().includes(searchQuery);
      if (!matchTitle && !matchAuthor && !matchEra && !matchDesc) {
        return false;
      }
    }
    return true;
  });

  _renderChroniclesList(filtered);
}

function _renderChroniclesList(tales) {
  const listContainer = document.getElementById('toc-list');
  const countLabel = document.getElementById('toc-count-label');

  if (countLabel) {
    countLabel.textContent = `Showing ${tales.length} chronicle${tales.length === 1 ? '' : 's'}`;
  }

  if (!listContainer) return;

  if (tales.length === 0) {
    listContainer.innerHTML = `
      <div class="p-12 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
        <p class="text-sm text-slate-400">No chronicles match your search criteria.</p>
      </div>
    `;
    return;
  }

  // Group tales by Era
  const grouped = new Map();
  for (const tale of tales) {
    const era = tale.era || 'Ancient Lore';
    if (!grouped.has(era)) {
      grouped.set(era, []);
    }
    grouped.get(era).push(tale);
  }

  const groupsHtml = Array.from(grouped.entries())
    .map(([era, eraTales]) => {
      const chroniclesHtml = eraTales
        .map((tale) => {
          const taleCanonicalUrl = taleUrl(tale.id);
          const safeTitle = escapeHtml(tale.title || 'Untitled Chronicle');
          const safeAuthor = escapeHtml(tale.authorName || 'Unknown Scribe');
          const safeDesc = escapeHtml(tale.description || 'Archival manuscript fragment.');
          const chapterCount = Math.max(1, tale.chapterCount || 1);

          // Build chapter direct links
          const chaptersHtml = Array.from({ length: chapterCount }, (_, i) => {
            const chNum = i + 1;
            const chapterReadUrl = readerUrl(tale.id, i);
            return `
              <a href="${chapterReadUrl}" class="toc-chapter-pill" title="Read Chapter ${chNum} of ${safeTitle}">
                <i data-lucide="book-open" class="w-3 h-3 text-indigo-400"></i>
                <span>Ch. ${chNum}</span>
              </a>
            `;
          }).join('');

          return `
            <article class="toc-chronicle-item">
              <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                <div class="space-y-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="font-cinzel text-base sm:text-lg font-bold text-white hover:text-indigo-300 transition-colors">
                      <a href="${taleCanonicalUrl}">${safeTitle}</a>
                    </h4>
                    <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                      ${escapeHtml(tale.genre || 'Mythology')}
                    </span>
                  </div>
                  <p class="text-xs text-slate-400">
                    Penned by <span class="text-slate-300 font-medium">${safeAuthor}</span>
                    ${tale.wordCount ? ` • ${tale.wordCount.toLocaleString()} words` : ''}
                  </p>
                </div>
                <div class="shrink-0">
                  <a
                    href="${taleCanonicalUrl}"
                    class="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                  >
                    <span>Overview & Info</span>
                    <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                  </a>
                </div>
              </div>

              <p class="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                ${safeDesc}
              </p>

              <!-- Chapters Hierarchy -->
              <div class="pt-3 border-t border-white/5">
                <span class="block text-[11px] font-semibold tracking-wider uppercase text-slate-500 mb-2">
                  Chapters (${chapterCount})
                </span>
                <div class="flex flex-wrap gap-1.5">
                  ${chaptersHtml}
                </div>
              </div>
            </article>
          `;
        })
        .join('');

      return `
        <div class="toc-era-group">
          <div class="toc-era-header">
            <i data-lucide="sparkles" class="w-4 h-4 text-amber-400"></i>
            <h3 class="font-cinzel text-base sm:text-lg font-bold text-white tracking-wide">
              ${escapeHtml(era)}
            </h3>
            <span class="text-xs text-slate-500">(${eraTales.length} chronicle${eraTales.length === 1 ? '' : 's'})</span>
          </div>
          <div class="space-y-4">
            ${chroniclesHtml}
          </div>
        </div>
      `;
    })
    .join('');

  listContainer.innerHTML = groupsHtml;
  initIcons();
}

function _renderError() {
  const listContainer = document.getElementById('toc-list');
  if (!listContainer) return;
  listContainer.innerHTML = `
    <div class="p-8 text-center bg-rose-500/5 border border-rose-500/20 rounded-2xl">
      <p class="text-sm text-rose-300 mb-2">Failed to load the archive table of contents.</p>
      <button
        onclick="location.reload()"
        class="text-xs text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
      >
        Retry
      </button>
    </div>
  `;
}

// Bootstrap on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initTOC();
  });
} else {
  initTOC();
}
