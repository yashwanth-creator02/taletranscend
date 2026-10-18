// src/pages/reader/__tests__/reader.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as index from '../index.js';

vi.mock('@fb/index.js', () => ({
  initAuth: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  setDoc: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
  refs: {
    readerPrefs: vi.fn(),
    comments: vi.fn(),
    comment: vi.fn(),
    commentReplies: vi.fn(),
    commentReply: vi.fn(),
    commentLikes: vi.fn(),
    commentLike: vi.fn(),
    taleReaction: vi.fn(),
    follow: vi.fn(),
    follower: vi.fn(),
  },
}));

vi.mock('../index.js', () => ({
  initAuth: vi.fn((cb) => cb({ uid: 'u1', displayName: 'Hero' })),
  readerState: {
    taleId: '',
    chapterIndex: 0,
    openTool: null,
    settingsPanelOpen: false,
    theme: 'noir',
    fontSize: 18,
    chapters: [],
    highlights: [],
    comments: [],
    claps: 0,
    hasClapped: false,
    authorId: '',
    isFollowingAuthor: false,
    focusMode: false,
  },
  initTheme: vi.fn(),
  loadReaderMeta: vi.fn(() => Promise.resolve({ title: 'Tale' })),
  loadReaderChapter: vi.fn(() => Promise.resolve({ navigation: {} })),
  showReaderSkeletons: vi.fn(),
  initIcons: vi.fn(),
  applyNavigation: vi.fn(),
  bindScrollProgress: vi.fn(),
  restoreScrollProgress: vi.fn(),
  updateReaderProgress: vi.fn(),
  getChapterProgress: vi.fn(),
  saveReaderProgress: vi.fn(),
  scheduleProgressSync: vi.fn(),
  updateTOCScrollSpy: vi.fn(),
  goBackToTale: vi.fn(),
  setAppUser: vi.fn(),
  setAppReaderPrefs: vi.fn((data) => {
    index.appState.readerPrefs = { ...data };
  }),
  applyCloudPrefs: vi.fn(),
  appState: {
    user: null,
    readerPrefs: {},
  },
  saveReaderBookmark: vi.fn(),
  getReaderBookmark: vi.fn(() => null),
  removeReaderBookmark: vi.fn(),
  isChapterBookmarked: vi.fn(() => false),
  isBookmarked: vi.fn(() => Promise.resolve(false)),
  toggleResonance: vi.fn().mockResolvedValue({ active: true, count: 1 }),
  getResonanceStatus: vi.fn().mockResolvedValue(false),
  toggleFollowAuthor: vi.fn().mockResolvedValue(true),
  isFollowingAuthor: vi.fn().mockResolvedValue(false),
  renderThemePanel: vi.fn(),
  renderTypographyPanel: vi.fn(),
  renderSharePanel: vi.fn(),
  renderTocPanel: vi.fn(),
  renderHighlightsPanel: vi.fn(),
  renderCommentsPanel: vi.fn(),
  renderTTSPanel: vi.fn(),
  renderInfoPanel: vi.fn(),
  applyDOMHighlights: vi.fn(),
  jumpToHighlight: vi.fn(),
  openQuoteModal: vi.fn(),
  closeQuoteModal: vi.fn(),
}));

vi.mock('@/utils', () => ({
  initPageReveal: vi.fn(),
  readyReveal: vi.fn(),
  setupAuthTimeout: vi.fn(() => 123),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  navigateTo: vi.fn(),
  updatePageMeta: vi.fn(),
}));

describe('Reader Page Controller', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    delete window.location;
    window.location = new URL('http://localhost/reader.html?taleId=t1&chapterId=2');
  });

  async function initPage() {
    await import('../reader.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  }

  it('sets initial state from URL params', async () => {
    await initPage();
    expect(index.readerState.taleId).toBe('t1');
    expect(index.readerState.chapterIndex).toBe(2);
  });

  it('switches sidebar tools', async () => {
    const { initAuth: fbInitAuth } = await import('@fb/index.js');
    vi.mocked(fbInitAuth).mockImplementation((cb) => cb({ uid: 'u1', displayName: 'Hero' }));

    document.body.innerHTML = `
      <div id="article-body"></div>
      <div id="sidebar-tools"></div>
      <div id="tool-panel"></div>
      <div id="panel-title"></div>
      <div id="panel-content"></div>
      <div id="top-bar-pct"></div>
      <div id="progress-bar"></div>
      <div id="clap-count"></div>
      <div id="clap-label"></div>
      <div id="clap-icon-wrap"></div>
      <div id="selection-toolbar" class="hidden">
        <button data-color="gold"></button>
        <button id="sel-note"></button>
        <button id="sel-copy"></button>
      </div>
    `;

    await import('../reader.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    // SIDEBAR_TOOLS are rendered into #sidebar-tools after some async steps
    await vi.waitFor(
      () => {
        const typographyBtn = document.querySelector('[data-tool="type"]');
        expect(typographyBtn).toBeTruthy();
      },
      { timeout: 2000 }
    );

    const typographyBtn = document.querySelector('[data-tool="type"]');
    typographyBtn.click();
    expect(index.readerState.openTool).toBe('type');
  });

  it('applies cloud preferences on auth resolve', async () => {
    const { initAuth: fbInitAuth, getDoc } = await import('@fb/index.js');
    const mockUser = { uid: 'u1' };
    vi.mocked(fbInitAuth).mockImplementation((cb) => cb(mockUser));

    const mockPrefs = { theme: 'sepia', fontSize: 24 };
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => mockPrefs,
    });

    await import('../reader.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    // Wait for the async auth/pref chain
    await vi.waitFor(() => {
      expect(index.applyCloudPrefs).toHaveBeenCalledWith(expect.objectContaining(mockPrefs));
    });
  });

  it('toggles focus mode from top bar', async () => {
    document.body.innerHTML = `
      <div id="top-bar"></div>
      <div id="sidebar"></div>
      <div id="mobile-toolbar"></div>
      <div id="focus-exit" class="hidden"></div>
      <button id="top-bar-focus"></button>
    `;

    await import('../reader.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const focusBtn = document.getElementById('top-bar-focus');
    focusBtn.click();
    expect(index.readerState.focusMode).toBe(true);
    expect(focusBtn.dataset.active).toBe('true');
  });
});
