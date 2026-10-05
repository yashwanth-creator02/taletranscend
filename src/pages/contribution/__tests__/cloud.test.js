import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { state } from '../state.js';
import {
  initDraftId,
  saveToCloud,
  loadDraft,
  loadPublishedTale,
  updatePublicationStatusIndicator,
  syncMetadataFromDom,
  syncMetadataToDom,
} from '../cloud.js';

// Mock Firebase
vi.mock('@fb/index.js', () => ({
  auth: {
    currentUser: { uid: 'user123' },
  },
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-draft-id' })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
  refs: {
    drafts: vi.fn((uid) => `refs/drafts/${uid}`),
    draft: vi.fn((uid, id) => `refs/draft/${uid}/${id}`),
    draftChapters: vi.fn((uid, id) => `refs/draft/${uid}/${id}/chapters`),
    draftChapter: vi.fn((uid, id, chId) => `refs/draft/${uid}/${id}/chapters/${chId}`),
    tale: vi.fn((id) => `refs/tale/${id}`),
    chapters: vi.fn((id) => `refs/tale/${id}/chapters`),
    chapter: vi.fn((id, chId) => `refs/tale/${id}/chapters/${chId}`),
  },
}));

vi.mock('@services/cache.service.js', () => ({
  cacheService: {
    invalidateTale: vi.fn(),
    invalidateTales: vi.fn(),
  },
}));

// Mock toast
vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

// Mock utils
vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  countWords: vi.fn((s) => (s ? s.trim().split(/\s+/).length : 0)),
  estimateReadMins: vi.fn(() => 1),
  setInput: vi.fn(),
  getInput: vi.fn((id) => {
    const el = document.getElementById(id);
    return el ? el.value || el.textContent : '';
  }),
  setSelect: vi.fn(),
  validateData: vi.fn((schema, data) => ({ success: true, data })),
  DraftMetadataSchema: {},
  DraftChapterSchema: {},
}));

describe('Contribution Cloud', () => {
  beforeEach(() => {
    // Reset state
    state.draftId = 'new';
    state.title = '';
    state.chapters = [{ title: 'Chapter 1', content: 'Hello world' }];
    state.currentChapterIndex = 0;
    state.isDirty = false;

    // Mock history
    global.history.replaceState = vi.fn();

    // Mock location
    delete window.location;
    window.location = new URL('http://localhost/contribution');

    document.body.innerHTML = `
      <input id="tale-title" value="My Tale" />
      <textarea id="tale-synopsis">Once upon a time</textarea>
      <input id="cover-url" value="http://example.com/cover.jpg" />
      <input id="tale-era" value="Modern" />
      <input id="genre-tags" value="Fantasy, Magic" />
      <input id="content-warnings" value="None" />
      <input id="world-setting" value="Earth" />
      <textarea id="story-notes">Notes</textarea>
      <select id="story-tone"><option value="Mythic">Mythic</option></select>
      <select id="story-language"><option value="English">English</option></select>
      <select id="story-visibility"><option value="public">public</option></select>
      <select id="target-audience"><option value="General">General</option></select>
      <div id="stat-status"></div>
    `;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes draft ID from URL', () => {
    window.location = new URL('http://localhost/contribution?draft=draft123');
    initDraftId();
    expect(state.draftId).toBe('draft123');
  });

  it('syncs metadata from DOM to state', () => {
    syncMetadataFromDom();
    expect(state.title).toBe('My Tale');
    expect(state.synopsis).toBe('Once upon a time');
    expect(state.tags).toEqual(['Fantasy', 'Magic']);
  });

  it('syncs metadata from state to DOM', async () => {
    const { setInput, setSelect } = await import('@/utils');
    state.title = 'Title in State';
    state.publicationStatus = 'hiatus';
    syncMetadataToDom();
    expect(setInput).toHaveBeenCalledWith('tale-title', 'Title in State');
    expect(setSelect).toHaveBeenCalledWith('story-publication-status', 'hiatus');
  });

  it('saves new draft to cloud', async () => {
    const { addDoc, setDoc } = await import('@fb/index.js');

    state.draftId = 'new';
    state.title = 'New Tale';

    await saveToCloud();

    expect(addDoc).toHaveBeenCalled();
    expect(state.draftId).toBe('new-draft-id');
    expect(setDoc).toHaveBeenCalled(); // For the chapter
    expect(global.history.replaceState).toHaveBeenCalled();
    expect(document.getElementById('stat-status').textContent).toBe('Saved to cloud');
  });

  it('updates existing draft in cloud', async () => {
    const { setDoc } = await import('@fb/index.js');

    state.draftId = 'existing-id';

    await saveToCloud();

    expect(setDoc).toHaveBeenCalledTimes(2); // One for metadata, one for chapter
  });

  it('loads draft from cloud', async () => {
    const { getDoc, getDocs } = await import('@fb/index.js');

    state.draftId = 'draft123';

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        title: 'Loaded Tale',
        tags: ['Sci-Fi'],
      }),
    });

    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          data: () => ({ chapterNum: 1, title: 'Ch 1', content: 'Content' }),
        },
      ],
    });

    const success = await loadDraft();

    expect(success).toBe(true);
    expect(state.title).toBe('Loaded Tale');
    expect(state.chapters).toHaveLength(1);
    expect(state.chapters[0].title).toBe('Ch 1');
  });

  it('sorts chapters by chapterNum when loading draft', async () => {
    const { getDoc, getDocs } = await import('@fb/index.js');
    state.draftId = 'draft123';

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ title: 'Tale' }),
    });

    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        { data: () => ({ chapterNum: 2, title: 'Ch 2' }) },
        { data: () => ({ chapterNum: 1, title: 'Ch 1' }) },
      ],
    });

    await loadDraft();

    expect(state.chapters[0].title).toBe('Ch 1');
    expect(state.chapters[1].title).toBe('Ch 2');
  });

  it('initializes published tale ID from URL', () => {
    window.location = new URL('http://localhost/contribution?taleId=tale999');
    initDraftId();
    expect(state.publishedTaleId).toBe('tale999');
  });

  it('loads published tale from cloud', async () => {
    const { getDoc, getDocs } = await import('@fb/index.js');

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        title: 'Ancient Chronicles',
        synopsis: 'A glorious era.',
        authorId: 'user123',
        publicationStatus: 'completed',
      }),
    });

    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ chapterNum: 1, title: 'Fragment 1', content: 'Once...' }) }],
    });

    const success = await loadPublishedTale('tale999', 'user123');

    expect(success).toBe(true);
    expect(state.publishedTaleId).toBe('tale999');
    expect(state.title).toBe('Ancient Chronicles');
    expect(state.publicationStatus).toBe('completed');
    expect(state.chapters).toHaveLength(1);
  });

  it('rejects loading published tale if author does not match', async () => {
    const { getDoc } = await import('@fb/index.js');

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        title: 'Secret Story',
        authorId: 'other-user',
      }),
    });

    const success = await loadPublishedTale('tale888', 'user123');

    expect(success).toBe(false);
  });

  it('updates published tale in saveToCloud when publishedTaleId is set', async () => {
    const { setDoc } = await import('@fb/index.js');
    const { cacheService } = await import('@services/cache.service.js');

    state.publishedTaleId = 'tale777';
    state.title = 'Updated Title';
    state.chapters = [{ title: 'Ch 1', content: 'New words' }];
    state.currentChapterIndex = 0;

    await saveToCloud();

    expect(setDoc).toHaveBeenCalledTimes(2); // tale doc + chapter doc
    expect(cacheService.invalidateTale).toHaveBeenCalledWith('tale777');
    expect(cacheService.invalidateTales).toHaveBeenCalled();
  });

  it('updates publication status indicator elements', () => {
    document.body.innerHTML = `
      <div id="publication-status-indicator"></div>
      <div id="publication-status-dot"></div>
      <div id="publication-status-text"></div>
    `;

    updatePublicationStatusIndicator('completed');

    expect(document.getElementById('publication-status-text').textContent).toBe('Completed');
    expect(document.getElementById('publication-status-dot').className).toContain('bg-indigo-400');
    expect(document.getElementById('publication-status-indicator').className).toContain(
      'text-indigo-400'
    );
  });
});
