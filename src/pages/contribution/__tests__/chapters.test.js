import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../state.js';
import {
  addNewChapter,
  deleteChapter,
  moveChapter,
  renderChapterList,
  loadCurrentChapter,
  updateSidebarTitle,
} from '../chapters.js';

// Mock editor.js
vi.mock('../editor.js', () => ({
  updateStats: vi.fn(),
}));

// Mock initIcons
vi.mock('@ui/components/icons.js', () => ({
  initIcons: vi.fn(),
}));

// Mock utils
vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  escapeText: vi.fn((t) => t),
}));

describe('Contribution Chapters', () => {
  beforeEach(() => {
    // Reset state
    state.chapters = [
      { title: 'Chapter 1', content: 'Content 1' },
      { title: 'Chapter 2', content: 'Content 2' },
    ];
    state.currentChapterIndex = 0;
    state.isDirty = false;

    // Setup DOM
    document.body.innerHTML = `
      <div id="chapter-list"></div>
      <input id="current-chapter-title" />
      <textarea id="chapter-content"></textarea>
      <div id="studio-chapter-count"></div>
    `;

    vi.clearAllMocks();
  });

  it('adds a new chapter', () => {
    addNewChapter();
    expect(state.chapters).toHaveLength(3);
    expect(state.chapters[2].title).toBe('Untitled Chapter');
    expect(state.currentChapterIndex).toBe(2);
    expect(document.getElementById('studio-chapter-count').textContent).toBe('3');
  });

  it('deletes a chapter', () => {
    window.confirm = vi.fn(() => true);
    deleteChapter(0);
    expect(state.chapters).toHaveLength(1);
    expect(state.chapters[0].title).toBe('Chapter 2');
    expect(state.currentChapterIndex).toBe(0);
  });

  it('prevents deleting the last chapter', () => {
    state.chapters = [{ title: 'Last', content: '' }];
    deleteChapter(0);
    expect(state.chapters).toHaveLength(1);
  });

  it('moves a chapter up', () => {
    moveChapter(1, 'up');
    expect(state.chapters[0].title).toBe('Chapter 2');
    expect(state.chapters[1].title).toBe('Chapter 1');
  });

  it('moves a chapter down', () => {
    moveChapter(0, 'down');
    expect(state.chapters[0].title).toBe('Chapter 2');
    expect(state.chapters[1].title).toBe('Chapter 1');
  });

  it('renders the chapter list', () => {
    renderChapterList();
    const list = document.getElementById('chapter-list');
    expect(list.children).toHaveLength(2);
    expect(list.querySelector('.chapter-item--active').textContent).toContain('Chapter 1');
  });

  it('loads the current chapter into editor', () => {
    state.currentChapterIndex = 1;
    loadCurrentChapter();
    expect(document.getElementById('current-chapter-title').value).toBe('Chapter 2');
    expect(document.getElementById('chapter-content').value).toBe('Content 2');
  });

  it('updates sidebar title', () => {
    updateSidebarTitle('New Title');
    expect(state.chapters[0].title).toBe('New Title');
    const list = document.getElementById('chapter-list');
    expect(list.querySelector('.chapter-item--active').textContent).toContain('New Title');
  });

  it('switches chapters when clicked in sidebar', () => {
    renderChapterList();
    const list = document.getElementById('chapter-list');
    const secondChapterBtn = list.querySelectorAll('.chapter-item__select')[1];

    // Set some content to see if it saves
    document.getElementById('chapter-content').value = 'Updated Content 1';

    secondChapterBtn.click();

    expect(state.currentChapterIndex).toBe(1);
    expect(state.chapters[0].content).toBe('Updated Content 1');
    expect(document.getElementById('current-chapter-title').value).toBe('Chapter 2');
  });
});
