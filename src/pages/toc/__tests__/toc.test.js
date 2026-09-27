// src/pages/toc/__tests__/toc.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as services from '@services/index.js';

vi.mock('@ui/components/nav/nav.js', () => ({
  initNav: vi.fn(),
}));

vi.mock('@ui/components/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@services/index.js', () => ({
  getTales: vi.fn(),
}));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    initPageReveal: vi.fn(),
    readyReveal: vi.fn(),
    taleUrl: vi.fn((id) => `/tales/${id}`),
    readerUrl: vi.fn((id, ch) => `/tales/${id}/read/${ch}`),
  };
});

describe('Table of Contents Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <span id="stat-total-tales"></span>
      <span id="stat-total-chapters"></span>
      <span id="stat-total-eras"></span>
      <span id="stat-total-words"></span>
      <div id="era-filter-container"></div>
      <input id="toc-search" type="search" />
      <span id="toc-count-label"></span>
      <div id="toc-list"></div>
    `;
  });

  it('renders stats and chronicles from getTales', async () => {
    const mockTales = [
      {
        id: 'tale-1',
        title: 'Gilgamesh',
        era: 'Mesopotamian',
        authorName: 'Sin-leqi-unninni',
        chapterCount: 3,
        wordCount: 1500,
        description: 'First epic poem.',
        genre: 'Epic',
      },
      {
        id: 'tale-2',
        title: 'Beowulf',
        era: 'Anglo-Saxon',
        authorName: 'Unknown',
        chapterCount: 2,
        wordCount: 2200,
        description: 'Monster slaying heroics.',
        genre: 'Myth',
      },
    ];

    vi.mocked(services.getTales).mockResolvedValue(mockTales);

    await import('../toc.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    // Wait for microtasks
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(services.getTales).toHaveBeenCalled();
    expect(document.getElementById('stat-total-tales').textContent).toBe('2');
    expect(document.getElementById('stat-total-chapters').textContent).toBe('5');
    expect(document.getElementById('stat-total-eras').textContent).toBe('2');

    const list = document.getElementById('toc-list');
    expect(list.innerHTML).toContain('Gilgamesh');
    expect(list.innerHTML).toContain('Beowulf');
    expect(list.innerHTML).toContain('/tales/tale-1');
    expect(list.innerHTML).toContain('/tales/tale-1/read/0');
    expect(list.innerHTML).toContain('/tales/tale-1/read/1');
    expect(list.innerHTML).toContain('/tales/tale-1/read/2');
  });
});
