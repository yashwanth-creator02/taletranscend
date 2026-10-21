import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@fb/index.js', () => ({
  refs: {
    notifications: vi.fn((uid) => ({ path: `users/${uid}/notifications` })),
    notification: vi.fn((uid, nid) => ({ path: `users/${uid}/notifications/${nid}` })),
  },
  getDocs: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'n1' })),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
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
  setNotificationPinned,
  subscribePinnedNotificationCount,
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
      vi.mocked(getDocs)
        .mockResolvedValueOnce({
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
        })
        .mockResolvedValueOnce({ docs: [] });

      const result = await getUserNotifications('u1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('n1');
      expect(result[0].title).toBe('New Scroll Available');
      expect(result[0].isRead).toBe(false);
    });

    it('normalizes legacy link/message fields onto actionUrl/body', async () => {
      vi.mocked(getDocs)
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'n-legacy',
              data: () => ({ title: 'Legacy notice', link: 'profile.html', message: 'Old shape' }),
            },
          ],
        })
        .mockResolvedValueOnce({ docs: [] });

      const result = await getUserNotifications('u1');
      expect(result[0].actionUrl).toBe('profile.html');
      expect(result[0].body).toBe('Old shape');
    });

    it('lists pinned notices first and de-duplicates them from the recent window', async () => {
      const ts = (ms) => ({ toMillis: () => ms });
      vi.mocked(getDocs)
        .mockResolvedValueOnce({
          docs: [
            { id: 'recent-1', data: () => ({ title: 'Recent 1', createdAt: ts(300) }) },
            { id: 'pinned-1', data: () => ({ title: 'Pinned 1', createdAt: ts(200) }) },
          ],
        })
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'pinned-1',
              data: () => ({ title: 'Pinned 1', isPinned: true, createdAt: ts(200) }),
            },
            {
              id: 'pinned-old',
              data: () => ({ title: 'Pinned old', isPinned: true, createdAt: ts(100) }),
            },
          ],
        });

      const result = await getUserNotifications('u1');
      expect(result.map((n) => n.id)).toEqual(['pinned-1', 'pinned-old', 'recent-1']);
      expect(result[0].isPinned).toBe(true);
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

  describe('subscribePinnedNotificationCount', () => {
    it('returns noop if userId is missing', () => {
      const unsub = subscribePinnedNotificationCount(null, vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('subscribes to onSnapshot and reports the pinned count', () => {
      const cb = vi.fn();
      const unsub = subscribePinnedNotificationCount('u1', cb);
      expect(cb).toHaveBeenCalledWith(4);
      expect(typeof unsub).toBe('function');
    });
  });

  describe('setNotificationPinned', () => {
    it('returns false without a user or notification id', async () => {
      expect(await setNotificationPinned(null, 'n1', true)).toBe(false);
      expect(await setNotificationPinned('u1', null, true)).toBe(false);
    });

    it('writes the pin state to the notification document', async () => {
      const res = await setNotificationPinned('u1', 'n1', true);
      expect(res).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/u1/notifications/n1' }),
        { isPinned: true }
      );
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
      // firestore.rules allows an owner to change only isRead + readAt, so the
      // update must carry both or the rule's allowlist rejects the write.
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
        isRead: true,
        readAt: 'mock-timestamp',
      });
    });
  });
});
