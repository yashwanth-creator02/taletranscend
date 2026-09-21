import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { state } from '../state.js';
import {
  initDraftId,
  saveToCloud,
  loadDraft,
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
});
