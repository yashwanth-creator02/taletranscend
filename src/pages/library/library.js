// src/pages/library/library.js
// Library page with Previous/Next pagination.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/library.css';

import { initAuth } from '@fb/index.js';
import { initNav } from '@ui/components/nav/nav.js';
import { initIcons } from '@ui/components/icons.js';
import { initPageReveal, readyReveal } from '@/utils';

import { loadTalesPage, nextPage, prevPage } from './content.js';
import {
  applyAllFilters,
  setupSearch,
  setupEraFilter,
  setupToneFilter,
  setupLengthFilter,
  setupSidebarFilter,
} from './filters.js';
import { setupSidebarToggle, updateSidebarUser, showGridSkeleton, showGridError } from './ui.js';
import { setupCardInteractions } from './interactions.js';
import { libraryState } from './state.js';

initNav();
initPageReveal();

document.addEventListener('DOMContentLoaded', () => {
  setupSidebarToggle();
  setupSearch();
  setupToneFilter();
  setupLengthFilter();
  setupSidebarFilter();
  showGridSkeleton();
  initIcons();
  setupPagination();
});

initAuth(async (user) => {
  libraryState.userId = user.uid;
  updateSidebarUser(user);
  setupCardInteractions(user.uid);

  try {
    await loadTalesPage(1);

    if (!libraryState.eraChipsBuilt) {
      setupEraFilter(libraryState.allTales);
      libraryState.eraChipsBuilt = true;
    }

    await applyAllFilters();
    updatePaginationUI();
    readyReveal();
    initIcons();
  } catch (err) {
    console.error('[library] Init failed:', err);
    showGridError();
  }
});

function setupPagination() {
  const prevBtn = document.getElementById('pagination-prev');
  const nextBtn = document.getElementById('pagination-next');

  if (prevBtn) {
    prevBtn.addEventListener('click', async () => {
      if (libraryState.currentPage <= 1 || libraryState.isLoading) return;

      setPaginationLoading(true);
      await prevPage();
      await applyAllFilters();
      updatePaginationUI();
      setPaginationLoading(false);
      initIcons();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      if (libraryState.isLoading) return;

      const maxPage = Math.ceil(libraryState.totalTales / libraryState.talesPerPage);
      if (libraryState.currentPage >= maxPage) return;

      setPaginationLoading(true);
      await nextPage();
      await applyAllFilters();
      updatePaginationUI();
      setPaginationLoading(false);
      initIcons();
    });
  }
}

function updatePaginationUI() {
  const prevBtn = document.getElementById('pagination-prev');
  const nextBtn = document.getElementById('pagination-next');
  const pageInfo = document.getElementById('pagination-info');

  const maxPage = Math.max(1, Math.ceil(libraryState.totalTales / libraryState.talesPerPage));

  if (prevBtn) {
    prevBtn.disabled = libraryState.currentPage <= 1;
    prevBtn.classList.toggle('opacity-50', libraryState.currentPage <= 1);
    prevBtn.classList.toggle('cursor-not-allowed', libraryState.currentPage <= 1);
  }

  if (nextBtn) {
    nextBtn.disabled = libraryState.currentPage >= maxPage;
    nextBtn.classList.toggle('opacity-50', libraryState.currentPage >= maxPage);
    nextBtn.classList.toggle('cursor-not-allowed', libraryState.currentPage >= maxPage);
  }

  if (pageInfo) {
    pageInfo.textContent = `Page ${libraryState.currentPage} of ${maxPage} (${libraryState.totalTales} tales)`;
  }
}

function setPaginationLoading(loading) {
  const prevBtn = document.getElementById('pagination-prev');
  const nextBtn = document.getElementById('pagination-next');

  if (prevBtn) prevBtn.disabled = loading;
  if (nextBtn) nextBtn.disabled = loading;
}
