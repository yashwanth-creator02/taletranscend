// src/pages/shelf/__tests__/shelf.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initAuth } from '@fb/index.js';
import * as index from '../index.js';
import { shelfState } from '../state.js';

vi.mock('@fb/index.js', () => ({
  initAuth: vi.fn(),
}));

vi.mock('../index.js', () => ({
  initAuth: vi.fn(),
  shelfState: {},
  setGridLoading: vi.fn(),
  setActiveTab: vi.fn(),
  loadBookmarkedTales: vi.fn(),
  loadDrafts: vi.fn(),
  computeAndRenderHeroStats: vi.fn(),
  initShelfInteractions: vi.fn(),
  initNav: vi.fn(),
  initIcons: vi.fn(),
}));

vi.mock('@/utils', () => ({
  initPageReveal: vi.fn(),
  readyReveal: vi.fn(),
  setupAuthTimeout: vi.fn(() => 123),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('Shelf Page Controller', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    document.body.innerHTML = '<div id="studio-grid"></div>';
  });

  async function initPage() {
    await import('../shelf.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  }

  it('initializes interactions on DOMContentLoaded', async () => {
    await initPage();
    expect(index.initShelfInteractions).toHaveBeenCalled();
  });

  it('loads data when auth resolves', async () => {
    const mockUser = { uid: 'u1' };
    vi.mocked(index.initAuth).mockImplementation((cb) => cb(mockUser));

    await initPage();

    expect(index.setGridLoading).toHaveBeenCalled();
    expect(index.loadBookmarkedTales).toHaveBeenCalledWith('u1');
    expect(index.loadDrafts).toHaveBeenCalledWith('u1');
    expect(index.computeAndRenderHeroStats).toHaveBeenCalled();
  });
});
