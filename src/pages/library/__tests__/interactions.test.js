// src/pages/library/__tests__/interactions.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupCardInteractions } from '../interactions.js';
import * as services from '@services/index.js';
import * as utils from '@/utils';

vi.mock('@services/index.js', () => ({
  resolveResumePoint: vi.fn(),
  addToBookmarks: vi.fn(),
  removeFromBookmarks: vi.fn(),
  markTaleFinished: vi.fn(),
}));

vi.mock('@/utils', () => ({
  navigateTo: vi.fn(),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('@ui/components/icons.js', () => ({
  initIcons: vi.fn(),
}));

describe('LibraryInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="cards-grid">
        <div class="tale-card" data-id="t1">
          <button data-action="options" data-menu-id="menu-t1"></button>
          <div id="menu-t1" class="options-menu hidden">
            <button data-action="resume"></button>
            <button data-action="couple"></button>
            <button data-action="copy-link"></button>
            <button data-action="mark-finished"></button>
          </div>
        </div>
      </div>
      <div id="copy-link-modal" class="hidden">
        <input id="copy-link-input" />
        <button id="copy-link-confirm"></button>
        <button id="copy-link-close"></button>
      </div>
      <div id="confirm-modal" class="hidden">
        <button id="confirm-accept"></button>
        <button id="confirm-cancel"></button>
      </div>
    `;
  });

  it('navigates to tale page on card body click', () => {
    setupCardInteractions('u1');
    const card = document.querySelector('.tale-card');
    card.click();
    expect(utils.navigateTo).toHaveBeenCalledWith('tale.html?id=t1');
  });

  it('toggles options menu', () => {
    setupCardInteractions('u1');
    const optBtn = document.querySelector('[data-action="options"]');
    optBtn.click();

    const menu = document.getElementById('menu-t1');
    expect(menu.classList.contains('hidden')).toBe(false);
  });

  it('handles resume action', async () => {
    vi.mocked(services.resolveResumePoint).mockResolvedValue({ chapterIndex: 3 });
    setupCardInteractions('u1');

    const resumeBtn = document.querySelector('[data-action="resume"]');
    await resumeBtn.click();

    expect(services.resolveResumePoint).toHaveBeenCalled();
    expect(utils.navigateTo).toHaveBeenCalledWith(expect.stringContaining('chapterId=3'));
  });

  it('handles couple action (bookmark)', async () => {
    setupCardInteractions('u1');
    const coupleBtn = document.querySelector('[data-action="couple"]');
    await coupleBtn.click();

    expect(services.addToBookmarks).toHaveBeenCalledWith({ userId: 'u1', taleId: 't1' });
    expect(coupleBtn.dataset.action).toBe('decouple');
  });

  it('handles copy link action', async () => {
    setupCardInteractions('u1');
    const copyBtn = document.querySelector('[data-action="copy-link"]');
    await copyBtn.click();
    expect(document.getElementById('copy-link-modal').classList.contains('flex')).toBe(true);
  });

  it('handles mark finished action', async () => {
    setupCardInteractions('u1');
    const finishBtn = document.querySelector('[data-action="mark-finished"]');
    await finishBtn.click();
    expect(document.getElementById('confirm-modal').classList.contains('flex')).toBe(true);

    const acceptBtn = document.getElementById('confirm-accept');
    await acceptBtn.click();

    expect(services.markTaleFinished).toHaveBeenCalledWith({ userId: 'u1', taleId: 't1' });
  });
});
