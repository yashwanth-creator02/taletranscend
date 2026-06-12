// src/pages/home/__tests__/home.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as utils from '@/utils';
import { getTales } from '@services/index.js';

vi.mock('@ui/components/nav/nav.js', () => ({
  initNav: vi.fn(),
}));

vi.mock('@services/index.js', () => ({
  getTales: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    navigateTo: vi.fn(),
    initPageReveal: vi.fn(),
    readyReveal: vi.fn(),
  };
});

vi.mock('@ui/components/icons.js', () => ({
  initIcons: vi.fn(),
}));

describe('Home Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    document.body.innerHTML = `
      <button id="home-start-writing-btn"></button>
      <input id="home-search-input" />
      <button id="home-search-btn"></button>
      <div id="trending-grid"></div>
      <div id="trending-section"></div>
      <form id="newsletter-form"></form>
    `;
  });

  async function initPage() {
    await import('../home.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  }

  it('navigates to contribution on start writing click', async () => {
    await initPage();
    document.getElementById('home-start-writing-btn').click();
    expect(utils.navigateTo).toHaveBeenCalledWith('contribution.html');
  });

  it('performs search and navigates to library', async () => {
    await initPage();
    const input = document.getElementById('home-search-input');
    input.value = 'mythic';
    document.getElementById('home-search-btn').click();

    expect(utils.navigateTo).toHaveBeenCalledWith(
      expect.stringContaining('library.html?search=mythic')
    );
  });

  it('loads and renders trending tales', async () => {
    const mockTales = [{ id: 't1', title: 'Trending 1', era: 'Mythic', authorName: 'Scribe' }];
    vi.mocked(getTales).mockResolvedValue(mockTales);

    await initPage();

    // trending tales load is async
    await vi.waitFor(() => {
      expect(document.getElementById('trending-grid').innerHTML).toContain('Trending 1');
    });
  });

  it('hides trending section if no tales found', async () => {
    vi.mocked(getTales).mockResolvedValue([]);
    await initPage();

    await vi.waitFor(() => {
      expect(document.getElementById('trending-section').classList.contains('hidden')).toBe(true);
    });
  });
});
