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
  onSnapshot: vi.fn((q, cb) => {
    cb({ size: 4 });
    return vi.fn();
  }),
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
  subscribeUnreadNotifications,
  markAllNotificationsAsRead,
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

  describe('subscribeUnreadNotifications', () => {
    it('returns noop if userId is missing', () => {
      const unsub = subscribeUnreadNotifications(null, vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('subscribes to onSnapshot and triggers callback', () => {
      const cb = vi.fn();
      const unsub = subscribeUnreadNotifications('u1', cb);
      expect(cb).toHaveBeenCalledWith(4);
      expect(typeof unsub).toBe('function');
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('returns false if userId is missing', async () => {
      expect(await markAllNotificationsAsRead(null)).toBe(false);
    });

    it('marks all fetched unread notifications as read', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [{ id: 'n1' }, { id: 'n2' }],
      });
      const res = await markAllNotificationsAsRead('u1');
      expect(res).toBe(true);
      expect(updateDoc).toHaveBeenCalledTimes(2);
    });
  });
});
