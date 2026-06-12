// src/pages/tale/__tests__/comments.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listenToComments, postComment } from '../comments.js';
import * as fb from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: { uid: 'u1', displayName: 'Hero' } },
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  refs: { comments: vi.fn(() => 'comments-ref') },
  serverTimestamp: vi.fn(() => 'mock-ts'),
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('@ui/components/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
  escapeHtml: vi.fn((s) => s),
  checkRateLimit: vi.fn(() => true),
  getRemainingTime: vi.fn(() => 1000),
  applyButtonCooldown: vi.fn(),
}));

import { checkRateLimit, applyButtonCooldown } from '@/utils';

describe('TaleComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="comments-list"></div>
      <textarea id="comment-text"></textarea>
      <button id="post-btn"></button>
    `;
  });

  describe('listenToComments', () => {
    it('fetches and renders comments', async () => {
      vi.mocked(fb.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'c1',
            data: () => ({ authorName: 'A1', text: 'Hello', createdAt: { seconds: 123 } }),
          },
        ],
      });

      await listenToComments('t1');

      const list = document.getElementById('comments-list');
      expect(list.innerHTML).toContain('Hello');
      expect(list.innerHTML).toContain('A1');
    });
  });

  describe('postComment', () => {
    it('submits a new comment', async () => {
      document.getElementById('comment-text').value = 'New comment';
      vi.mocked(fb.getDocs).mockResolvedValue({ empty: true, docs: [] }); // For refresh

      await postComment('t1');

      expect(fb.addDoc).toHaveBeenCalledWith(
        'comments-ref',
        expect.objectContaining({
          text: 'New comment',
          authorId: 'u1',
        })
      );
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('transmitted'), 'success');
      expect(document.getElementById('comment-text').value).toBe('');
    });

    it('blocks submission if rate-limited and applies cooldown', async () => {
      document.getElementById('comment-text').value = 'Valid comment';
      vi.mocked(checkRateLimit).mockReturnValue(false);

      await postComment('t1');

      expect(fb.addDoc).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('wait'), 'warning');
      expect(applyButtonCooldown).toHaveBeenCalled();
    });
  });
});
