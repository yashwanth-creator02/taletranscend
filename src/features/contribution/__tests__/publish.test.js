// src/features/contribution/__tests__/publish.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { publishFullTale } from '../publish.js';
import { auth, setDoc, updateDoc } from '@fb/index.js';
import { state } from '../state.js';
import { saveAllChapters, syncMetadataFromDom } from '../cloud.js';

vi.mock('../cloud.js', () => ({
  saveAllChapters: vi.fn(),
  syncMetadataFromDom: vi.fn(),
}));

// Mock @/utils barrel
vi.mock('@/utils', () => ({
  navigateTo: vi.fn(),
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

    document.body.innerHTML = `
      <div id="stat-status"></div>
      <button id="publish-btn"><span>Publish</span></button>
      <button id="publish-btn-mobile"><span>Publish</span></button>
    `;

    // Reset state
    state.title = 'Test Tale';
    state.chapters = [{ title: 'C1', content: 'Content 1' }];
    state.draftId = 'd1';

    // Mock auth
    auth.currentUser = { uid: 'u1', displayName: 'Test User' };
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

  it.skip('handles publish failure gracefully', async () => {
    vi.mocked(saveAllChapters).mockRejectedValue(new Error('Save failed'));

    await publishFullTale();

    expect(document.getElementById('stat-status').textContent).toContain('Publish failed');
    expect(document.getElementById('publish-btn').disabled).toBe(false);
  });
});
