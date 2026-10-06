// src/pages/contribution/__tests__/publish.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { publishFullTale } from '../publish.js';
import { auth, setDoc, updateDoc } from '@fb/index.js';
import { state } from '../state.js';
import { saveAllChapters, syncMetadataFromDom } from '../cloud.js';

vi.mock('../cloud.js', () => ({
  saveAllChapters: vi.fn(),
  syncMetadataFromDom: vi.fn(),
}));

vi.mock('@services/cache.service.js', () => ({
  cacheService: {
    invalidateTale: vi.fn(),
    invalidateTales: vi.fn(),
  },
}));

vi.mock('@services/author.service.js', () => ({
  getAuthorStatus: vi.fn(),
  registerAuthor: vi.fn(),
}));

import { getAuthorStatus, registerAuthor } from '@services/author.service.js';

// Mock @/utils barrel
vi.mock('@/utils', () => ({
  navigateTo: vi.fn(),
  taleUrl: vi.fn((id) => `/tale.html?id=${id}`),
  countWords: vi.fn((s) => (s ? s.split(' ').length : 0)),
  estimateReadMins: vi.fn(() => 1),
  safeAsync: vi.fn(async (p, options = {}) => {
    try {
      return await p;
    } catch (e) {
      if (options.fallback !== undefined) return options.fallback;
      return null;
    }
  }),
  guardOffline: vi.fn(() => false),
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  initPageReveal: vi.fn(),
  readyReveal: vi.fn(),
  escapeText: vi.fn((s) => s),
  validateData: vi.fn((schema, data) => ({ success: true, data })),
  TaleSchema: {},
  DraftChapterSchema: {},
}));

import * as utils from '@/utils';

describe('Publish Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock defaults
    vi.mocked(utils.guardOffline).mockReturnValue(false);
    vi.mocked(getAuthorStatus).mockResolvedValue({
      isAuthor: true,
      penName: 'Test User',
      authorEmail: 'test@example.com',
      authorBio: 'Bio',
    });

    document.body.innerHTML = `
      <div id="stat-status"></div>
      <button id="publish-btn"><span>Publish</span></button>
      <button id="publish-btn-mobile"><span>Publish</span></button>
      <div id="author-registration-wall-modal" class="hidden">
        <form id="author-registration-wall-form">
          <input id="wall-pen-name" value="" />
          <input id="wall-author-email" value="" />
          <textarea id="wall-author-bio"></textarea>
          <p id="wall-form-error" class="hidden"></p>
          <button type="button" id="btn-cancel-wall">Cancel</button>
          <button type="submit" id="btn-confirm-wall"><span id="wall-submit-text">Register & Publish</span></button>
        </form>
      </div>
    `;

    // Reset state
    state.title = 'Test Tale';
    state.chapters = [{ title: 'C1', content: 'Content 1' }];
    state.draftId = 'd1';
    state.publishedTaleId = null;

    // Mock auth
    auth.currentUser = { uid: 'u1', displayName: 'Test User', email: 'test@example.com' };
  });

  afterEach(() => {
    auth.currentUser = null;
  });

  it('fails if user is not signed in', async () => {
    auth.currentUser = null;
    await publishFullTale();
    expect(document.getElementById('stat-status').textContent).toContain('must be signed in');
  });

  it('fails if offline', async () => {
    vi.mocked(utils.guardOffline).mockReturnValue(true);
    await publishFullTale();
    expect(document.getElementById('stat-status').textContent).toContain('offline');
  });

  it('fails if title is missing', async () => {
    state.title = '';
    await publishFullTale();
    expect(document.getElementById('stat-status').textContent).toContain('Add a title');
  });

  it('fails if no chapters', async () => {
    state.chapters = [];
    await publishFullTale();
    expect(document.getElementById('stat-status').textContent).toContain('at least one chapter');
  });

  it('successfully publishes a tale', async () => {
    vi.mocked(setDoc).mockResolvedValue(undefined);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
    vi.mocked(saveAllChapters).mockResolvedValue(undefined);

    await publishFullTale();

    expect(syncMetadataFromDom).toHaveBeenCalled();
    expect(saveAllChapters).toHaveBeenCalledWith('u1');
    expect(setDoc).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalled();
    expect(document.getElementById('stat-status').textContent).toContain('Published successfully');
  });

  it('successfully updates an already published tale', async () => {
    vi.mocked(setDoc).mockResolvedValue(undefined);
    vi.mocked(updateDoc).mockResolvedValue(undefined);

    state.publishedTaleId = 'existing-tale-123';
    state.publicationStatus = 'completed';

    await publishFullTale();

    expect(syncMetadataFromDom).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalled();
    expect(setDoc).toHaveBeenCalled(); // For chapters
    expect(document.getElementById('stat-status').textContent).toContain('Updated successfully');
  });

  it('halts publishing if unregistered author cancels registration wall', async () => {
    vi.mocked(getAuthorStatus).mockResolvedValue({
      isAuthor: false,
      penName: '',
      authorEmail: '',
      authorBio: '',
    });

    const publishPromise = publishFullTale();
    await Promise.resolve();
    await Promise.resolve();

    // Modal should have opened
    const modal = document.getElementById('author-registration-wall-modal');
    expect(modal.classList.contains('flex')).toBe(true);

    // Click cancel
    document.getElementById('btn-cancel-wall').click();

    await publishPromise;

    expect(document.getElementById('stat-status').textContent).toContain(
      'Author registration required'
    );
    expect(saveAllChapters).not.toHaveBeenCalled();
  });

  it('registers author via wall and continues publishing', async () => {
    vi.mocked(getAuthorStatus).mockResolvedValue({
      isAuthor: false,
      penName: '',
      authorEmail: '',
      authorBio: '',
    });
    vi.mocked(registerAuthor).mockResolvedValue({
      isAuthor: true,
      penName: 'Scribe Jane',
      authorEmail: 'jane@example.com',
      authorBio: 'Chronicler of old.',
    });
    vi.mocked(setDoc).mockResolvedValue(undefined);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
    vi.mocked(saveAllChapters).mockResolvedValue(undefined);

    const publishPromise = publishFullTale();
    await Promise.resolve();
    await Promise.resolve();

    const penNameInput = document.getElementById('wall-pen-name');
    const emailInput = document.getElementById('wall-author-email');
    const form = document.getElementById('author-registration-wall-form');

    penNameInput.value = 'Scribe Jane';
    emailInput.value = 'jane@example.com';

    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    await publishPromise;

    expect(registerAuthor).toHaveBeenCalledWith('u1', {
      penName: 'Scribe Jane',
      authorEmail: 'jane@example.com',
      authorBio: '',
    });
    expect(saveAllChapters).toHaveBeenCalledWith('u1');
    expect(setDoc).toHaveBeenCalled();
  });

  it.skip('handles publish failure gracefully', async () => {
    vi.mocked(saveAllChapters).mockRejectedValue(new Error('Save failed'));

    await publishFullTale();

    expect(document.getElementById('stat-status').textContent).toContain('Publish failed');
    expect(document.getElementById('publish-btn').disabled).toBe(false);
  });
});
