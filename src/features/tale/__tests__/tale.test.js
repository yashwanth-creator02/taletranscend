// src/features/tale/__tests__/tale.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initAuth } from '@fb/index.js';
import * as index from '../index.js';

vi.mock('@fb/index.js', () => ({
  initAuth: vi.fn(),
}));

vi.mock('../index.js', () => ({
  initAuth: vi.fn(),
  loadTale: vi.fn(() => Promise.resolve({ title: 'Tale' })),
  loadChapters: vi.fn(() => Promise.resolve([])),
  renderTale: vi.fn(),
  renderChapters: vi.fn(),
  showArchiveSkeletons: vi.fn(),
  bindChapterClicks: vi.fn(),
  setupTabs: vi.fn(),
  setupStartReading: vi.fn(),
  setupResumeReading: vi.fn(),
  setupShelfButton: vi.fn(),
  setupShareButton: vi.fn(),
  setupResonance: vi.fn(),
  initHeaderScroll: vi.fn(),
  listenToComments: vi.fn(),
  postComment: vi.fn(),
  initIcons: vi.fn(),
}));

vi.mock('@shared/components/nav/nav.js', () => ({
  initNav: vi.fn(),
}));

vi.mock('@/utils', () => ({
  initPageReveal: vi.fn(),
  readyReveal: vi.fn(),
  setupAuthTimeout: vi.fn(() => 123),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('@services/index.js', () => ({
  addToBookmarks: vi.fn(),
  removeFromBookmarks: vi.fn(),
  isBookmarked: vi.fn(),
}));

describe('Tale Page Controller', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock URL with id param
    delete window.location;
    window.location = new URL('http://localhost/tale.html?id=tale123');
    window.location.replace = vi.fn();
  });

  async function initPage() {
    await import('../tale.js');
  }

  it('redirects to library if no id in URL', async () => {
    window.location = new URL('http://localhost/tale.html');
    window.location.replace = vi.fn();

    // It will throw "No taleId in URL" but we want to check replace call
    await expect(initPage()).rejects.toThrow('No taleId in URL');
    expect(window.location.replace).toHaveBeenCalledWith('library.html');
  });

  it('hydrates data on auth resolve', async () => {
    const mockUser = { uid: 'u1' };
    vi.mocked(index.initAuth).mockImplementation((cb) => cb(mockUser));

    await initPage();

    expect(index.showArchiveSkeletons).toHaveBeenCalled();
    expect(index.loadTale).toHaveBeenCalledWith('tale123', mockUser);
    expect(index.renderTale).toHaveBeenCalled();
    expect(index.listenToComments).toHaveBeenCalledWith('tale123');
  });
});
