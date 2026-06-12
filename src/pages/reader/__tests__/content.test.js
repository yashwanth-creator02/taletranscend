// src/pages/reader/__tests__/content.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadReaderMeta, loadReaderChapter, showReaderSkeletons } from '../content.js';
import { readerState } from '../state.js';
import * as services from '@services/index.js';
import * as fb from '@fb/index.js';

vi.mock('@services/index.js', () => ({
  getTaleMeta: vi.fn(),
  getChapter: vi.fn(),
}));

vi.mock('@fb/index.js', () => ({
  refs: { chapters: vi.fn(() => 'chapters-ref') },
  getDocs: vi.fn(),
}));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    setText: vi.fn((id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }),
  };
});

describe('ReaderContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="article-body"></div>
      <div id="article-meta-title"></div>
      <div id="author-name"></div>
      <div id="top-bar-ch-title"></div>
      <div id="breadcrumbs"></div>
      <div id="author-avatar"></div>
      <div id="article-title"></div>
      <div id="top-bar-ch-num"></div>
      <div id="top-bar-ch-total"></div>
      <div id="read-minutes"></div>
    `;
    readerState.chapters = [];
  });

  describe('showReaderSkeletons', () => {
    it('renders skeleton HTML', () => {
      showReaderSkeletons();
      expect(document.querySelector('.animate-pulse')).toBeTruthy();
    });
  });

  describe('loadReaderMeta', () => {
    it('fetches metadata and updates state', async () => {
      vi.mocked(services.getTaleMeta).mockResolvedValue({
        title: 'Epic Myth',
        authorName: 'Scribe',
      });
      vi.mocked(fb.getDocs).mockResolvedValue({
        docs: [{ id: 'c1', data: () => ({ chapterNum: 1, title: 'Ch 1', content: '...' }) }],
      });

      await loadReaderMeta('t1');

      expect(readerState.taleTitle).toBe('Epic Myth');
      expect(readerState.chapters).toHaveLength(1);
      expect(document.getElementById('article-meta-title').textContent).toBe('Epic Myth');
    });
  });

  describe('loadReaderChapter', () => {
    it('processes content and renders HTML', async () => {
      const mockResult = {
        chapter: {
          title: 'Chapter One',
          content: '# H2 Heading\n## H3 Heading\n> Blockquote\n![figure indigo]\nParagraph text',
        },
        navigation: { totalChapters: 10 },
      };
      vi.mocked(services.getChapter).mockResolvedValue(mockResult);

      await loadReaderChapter({ taleId: 't1', chapterIndex: 0 });

      const body = document.getElementById('article-body');
      expect(body.innerHTML).toContain('H2 Heading');
      expect(body.innerHTML).toContain('H3 Heading');
      expect(body.innerHTML).toContain('Blockquote');
      expect(body.innerHTML).toContain('Paragraph text');
    });
  });
});
