import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@fb/index.js', () => ({
  refs: {
    notifications: vi.fn((uid) => ({ path: `users/${uid}/notifications` })),
    notification: vi.fn((uid, nid) => ({ path: `users/${uid}/notifications/${nid}` })),
  },
  getDocs: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
  query: vi.fn((...args) => ({ args })),
  orderBy: vi.fn((field, dir) => ({ field, dir })),
  limit: vi.fn((n) => ({ limit: n })),
  where: vi.fn((field, op, val) => ({ field, op, val })),
}));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    safeAsync: vi.fn((promise) => promise),
    createLogger: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  };
});

import { getDocs, updateDoc } from '@fb/index.js';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
} from '../notification.service.js';

describe('notification.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserNotifications', () => {
    it('returns empty array when userId is null', async () => {
      const result = await getUserNotifications(null);
      expect(result).toEqual([]);
    });

    it('returns formatted notifications from firestore', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [
          {
            id: 'n1',
            data: () => ({
              title: 'New Scroll Available',
              body: 'A new chapter has arrived',
              isRead: false,
              type: 'new_chapter',
            }),
          },
        ],
      });

      const result = await getUserNotifications('u1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('n1');
      expect(result[0].title).toBe('New Scroll Available');
      expect(result[0].isRead).toBe(false);
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('returns 0 if userId is null', async () => {
      const count = await getUnreadNotificationCount(null);
      expect(count).toBe(0);
    });

    it('returns size of unread documents snapshot', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        size: 3,
      });

      const count = await getUnreadNotificationCount('u1');
      expect(count).toBe(3);
    });
  });

  describe('markNotificationAsRead', () => {
    it('returns false if userId or notificationId is missing', async () => {
      expect(await markNotificationAsRead(null, 'n1')).toBe(false);
      expect(await markNotificationAsRead('u1', null)).toBe(false);
    });

    it('calls updateDoc with isRead: true and returns true', async () => {
      const success = await markNotificationAsRead('u1', 'n1');
      expect(success).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/u1/notifications/n1' }),
        { isRead: true }
      );
    });
  });
});
