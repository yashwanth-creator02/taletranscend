import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../state.js';
import { autoSaveLocal, updateStats } from '../editor.js';

// Mock utils
vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  debounce: vi.fn((fn) => fn),
  setText: vi.fn((id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }),
  countWords: vi.fn((s) => s.trim().split(/\s+/).filter(Boolean).length),
}));

describe('Contribution Editor', () => {
  beforeEach(() => {
    state.chapters = [{ title: 'Chapter 1', content: '' }];
    state.currentChapterIndex = 0;
    state.isDirty = false;

    document.body.innerHTML = `
      <textarea id="chapter-content"></textarea>
      <div id="stat-words"></div>
      <div id="stat-words-right"></div>
      <div id="stat-chars"></div>
      <div id="stat-reading-time"></div>
      <div id="stat-status"></div>
    `;

    vi.clearAllMocks();
  });

  it('updates stats correctly', () => {
    const content = 'Hello world this is a test'; // 6 words
    document.getElementById('chapter-content').value = content;

    updateStats();

    expect(document.getElementById('stat-words').textContent).toBe('6 Words');
    expect(document.getElementById('stat-chars').textContent).toBe('26 Characters');
    expect(document.getElementById('stat-reading-time').textContent).toBe('1m');
  });

  it('auto-saves locally', () => {
    document.getElementById('chapter-content').value = 'New content';

    autoSaveLocal();

    expect(state.chapters[0].content).toBe('New content');
    expect(state.isDirty).toBe(true);
    expect(document.getElementById('stat-status').textContent).toBe('Unsaved changes');
  });

  it('does nothing in autoSaveLocal if no chapter', () => {
    state.chapters = [];
    autoSaveLocal();
    expect(state.isDirty).toBe(false);
  });
});
