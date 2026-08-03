// src/features/library/__tests__/library.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initAuth } from '@fb/index.js';
import * as content from '../content.js';
import * as filters from '../filters.js';
import { libraryState } from '../state.js';

vi.mock('@fb/index.js', () => ({
  initAuth: vi.fn(),
}));

vi.mock('@shared/components/nav/nav.js', () => ({
  initNav: vi.fn(),
}));

vi.mock('@/utils', () => ({
  initPageReveal: vi.fn(),
  readyReveal: vi.fn(),
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  })),
}));

vi.mock('../content.js', () => ({
  loadTalesPage: vi.fn(),
  nextPage: vi.fn(),
  prevPage: vi.fn(),
}));

vi.mock('../filters.js', () => ({
  applyAllFilters: vi.fn(),
  setupSearch: vi.fn(),
  setupEraFilter: vi.fn(),
  setupToneFilter: vi.fn(),
  setupLengthFilter: vi.fn(),
  setupSidebarFilter: vi.fn(),
}));

vi.mock('../ui.js', () => ({
  setupSidebarToggle: vi.fn(),
  updateSidebarUser: vi.fn(),
  showGridSkeleton: vi.fn(),
  showGridError: vi.fn(),
}));

vi.mock('../interactions.js', () => ({
  setupCardInteractions: vi.fn(),
}));

vi.mock('@shared/icons.js', () => ({
  initIcons: vi.fn(),
}));

describe('Library Page Controller', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    document.body.innerHTML = `
      <button id="pagination-prev"></button>
      <button id="pagination-next"></button>
      <div id="pagination-info"></div>
    `;
    libraryState.currentPage = 1;
    libraryState.totalTales = 100;
    libraryState.talesPerPage = 20;
    libraryState.isLoading = false;
  });

  async function initPage() {
    await import('../library.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  }

  it('initializes UI on DOMContentLoaded', async () => {
    await initPage();
    const { setupSidebarToggle } = await import('../ui.js');
    expect(setupSidebarToggle).toHaveBeenCalled();
  });

  it('handles auth callback and loads data', async () => {
    const mockUser = { uid: 'u1' };
    vi.mocked(initAuth).mockImplementation((cb) => cb(mockUser));

    await import('../library.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(content.loadTalesPage).toHaveBeenCalledWith(1);
    expect(filters.applyAllFilters).toHaveBeenCalled();
  });

  it.skip('handles next page click', async () => {
    const mockUser = { uid: 'u1' };
    vi.mocked(initAuth).mockImplementation((cb) => cb(mockUser));

    const { libraryState: stateInTest } = await import('../state.js');
    await import('../library.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    // Set state AFTER both are imported (ensure we have the right instance)
    stateInTest.totalTales = 100;
    stateInTest.talesPerPage = 20;
    stateInTest.currentPage = 1;
    stateInTest.isLoading = false;

    const nextBtn = document.getElementById('pagination-next');
    nextBtn.click();

    await vi.waitFor(
      () => {
        expect(content.nextPage).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    expect(filters.applyAllFilters).toHaveBeenCalled();
  });
});
