// src/pages/shelf/__tests__/interactions.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initShelfInteractions } from '../interactions.js';
import { shelfState } from '../state.js';
import * as content from '../content.js';
import * as ui from '../ui.js';
import * as services from '@services/index.js';
import * as utils from '@/utils';

vi.mock('../content.js', () => ({
  loadBookmarkedTales: vi.fn(),
  loadDrafts: vi.fn(),
  applyAndRender: vi.fn(),
  computeAndRenderHeroStats: vi.fn(),
}));

vi.mock('../ui.js', () => ({
  setActiveTab: vi.fn(),
  buildSortPanel: vi.fn(),
  refreshSortPanel: vi.fn(),
}));

vi.mock('@services/index.js', () => ({
  removeFromBookmarks: vi.fn(),
}));

vi.mock('@/utils', () => ({
  debounce: vi.fn((fn) => fn),
  navigateTo: vi.fn(),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

describe('ShelfInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shelfState.userId = 'u1';
    shelfState.activeTab = 'bookmarked';
    document.body.innerHTML = `
      <button class="shelf-tab" data-tab="drafts"></button>
      <input id="shelf-filter-input" />
      <button id="sort-btn"></button>
      <div id="sort-panel" hidden>
        <button data-sort="title"></button>
      </div>
      <div id="studio-grid">
        <div data-id="t1">
          <button data-action="options" data-menu-id="menu-t1"></button>
          <div id="menu-t1" class="shelf-menu" hidden>
            <button data-action="decouple" data-id="t1"></button>
          </div>
        </div>
      </div>
      <button id="ritual-new-draft"></button>
    `;
  });

  it('binds tab clicks', async () => {
    initShelfInteractions();
    const btn = document.querySelector('[data-tab="drafts"]');
    await btn.click();

    expect(shelfState.activeTab).toBe('drafts');
    expect(ui.setActiveTab).toHaveBeenCalledWith('drafts');
    expect(content.loadDrafts).toHaveBeenCalledWith('u1');
  });

  it('binds filter input', () => {
    initShelfInteractions();
    const input = document.getElementById('shelf-filter-input');
    input.value = 'test';
    input.dispatchEvent(new Event('input'));

    expect(shelfState.filterQuery).toBe('test');
    expect(content.applyAndRender).toHaveBeenCalled();
  });

  it('binds sort panel toggle', () => {
    initShelfInteractions();
    const btn = document.getElementById('sort-btn');
    const panel = document.getElementById('sort-panel');

    btn.click();
    expect(panel.hidden).toBe(false);

    btn.click();
    expect(panel.hidden).toBe(true);
  });

  it('handles decouple action in grid', async () => {
    initShelfInteractions();
    const decoupleBtn = document.querySelector('[data-action="decouple"]');
    await decoupleBtn.click();

    expect(services.removeFromBookmarks).toHaveBeenCalledWith({ userId: 'u1', taleId: 't1' });
    expect(content.computeAndRenderHeroStats).toHaveBeenCalled();
  });

  it('navigates to contribution on ritual click', () => {
    initShelfInteractions();
    document.getElementById('ritual-new-draft').click();
    expect(utils.navigateTo).toHaveBeenCalledWith('contribution.html');
  });
});
