// src/ui/components/nav/__tests__/notifications.popover.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@services/notification.service.js', () => ({
  getUserNotifications: vi.fn(() => Promise.resolve([])),
  setNotificationPinned: vi.fn(() => Promise.resolve(true)),
  subscribePinnedNotificationCount: vi.fn(() => vi.fn()),
  subscribeUnreadNotifications: vi.fn(() => vi.fn()),
}));

vi.mock('../nav.utils.js', () => ({
  renderIcons: vi.fn(),
}));

import {
  updateNotificationBadge,
  updatePinnedCount,
  initNotifications,
  loadAndRenderNotifications,
  toggleNotificationPin,
  toggleNotificationsPopover,
  closeNotificationsPopover,
} from '../notifications.popover.js';
import {
  getUserNotifications,
  setNotificationPinned,
  subscribePinnedNotificationCount,
  subscribeUnreadNotifications,
} from '@services/notification.service.js';

const NOTIFICATIONS_MARKUP = `
  <header id="app-nav">
    <div id="nav-user">
      <a id="nav-profile-link" href="profile.html">Profile</a>
    </div>
  </header>
  <div id="nav-notifications-container" class="nav-notifications-float is-hidden">
    <button
      type="button"
      class="nav-icon-btn nav-notifications-trigger"
      id="nav-notifications-btn"
      aria-label="Chronicle Notices"
      aria-haspopup="dialog"
      aria-expanded="false"
      aria-controls="nav-notifications-popover"
    >
      <span id="nav-notifications-badge" class="nav-notifications-badge hidden"></span>
    </button>
    <div
      id="nav-notifications-popover"
      class="nav-notifications-popover hidden"
      role="dialog"
      aria-label="Notifications"
    >
      <button type="button" id="nav-notifications-mark-read">Mark read</button>
      <div id="nav-notifications-list" class="nav-notifications-list"></div>
    </div>
  </div>
`;

const root = () => document.getElementById('nav-notifications-container');
const trigger = () => document.getElementById('nav-notifications-btn');
const badge = () => document.getElementById('nav-notifications-badge');
const popover = () => document.getElementById('nav-notifications-popover');
const isHidden = () => root().classList.contains('is-hidden');

describe('notifications.popover', () => {
  beforeEach(() => {
    document.body.innerHTML = NOTIFICATIONS_MARKUP;
    vi.clearAllMocks();
  });

  describe('floating trigger visibility', () => {
    it('stays hidden when there are no unread or pinned notices', () => {
      updateNotificationBadge(0);
      updatePinnedCount(0);
      expect(isHidden()).toBe(true);
    });

    it('appears for unread notices and caps the badge', () => {
      updateNotificationBadge(12);
      expect(isHidden()).toBe(false);
      expect(badge().textContent).toBe('9+');
      expect(badge().classList.contains('hidden')).toBe(false);
    });

    it('stays visible for pinned notices even when everything is read', () => {
      updateNotificationBadge(0);
      updatePinnedCount(2);

      expect(isHidden()).toBe(false);
      expect(root().classList.contains('nav-notifications-float--pinned')).toBe(true);
      expect(badge().classList.contains('hidden')).toBe(true);
    });

    it('hides again once the last pinned notice is unpinned', () => {
      updatePinnedCount(1);
      expect(isHidden()).toBe(false);

      updatePinnedCount(0);
      expect(isHidden()).toBe(true);
      expect(root().classList.contains('nav-notifications-float--pinned')).toBe(false);
    });

    it('closes the open drawer and releases focus when it disappears', () => {
      updateNotificationBadge(1);
      toggleNotificationsPopover();
      expect(popover().classList.contains('hidden')).toBe(false);

      trigger().focus();
      updateNotificationBadge(0);

      expect(popover().classList.contains('hidden')).toBe(true);
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(document.getElementById('nav-profile-link'));
    });

    it('moves focus out of the drawer when the last unread notice is read', () => {
      updateNotificationBadge(1);
      toggleNotificationsPopover();
      document.getElementById('nav-notifications-mark-read').focus();

      updateNotificationBadge(0);

      expect(isHidden()).toBe(true);
      expect(document.activeElement).toBe(document.getElementById('nav-profile-link'));
    });

    it('names the trigger after its unread and pinned counts', () => {
      updateNotificationBadge(3);
      updatePinnedCount(1);
      expect(trigger().getAttribute('aria-label')).toBe('Chronicle Notices — 3 unread, 1 pinned');
    });
  });

  describe('initNotifications', () => {
    it('stays hidden and skips subscriptions when signed out', () => {
      initNotifications(null);
      expect(isHidden()).toBe(true);
      expect(subscribeUnreadNotifications).not.toHaveBeenCalled();
      expect(subscribePinnedNotificationCount).not.toHaveBeenCalled();
    });

    it('subscribes to unread and pinned counts for a signed-in user', () => {
      initNotifications({ uid: 'u1' });

      expect(subscribeUnreadNotifications).toHaveBeenCalledWith('u1', expect.any(Function));
      expect(subscribePinnedNotificationCount).toHaveBeenCalledWith('u1', expect.any(Function));

      const unreadCallback = vi.mocked(subscribeUnreadNotifications).mock.calls[0][1];
      unreadCallback(2);
      expect(isHidden()).toBe(false);
    });
  });

  describe('drawer toggling', () => {
    it('opens and closes the drawer with matching aria-expanded', () => {
      initNotifications({ uid: 'u1' });

      toggleNotificationsPopover();
      expect(popover().classList.contains('hidden')).toBe(false);
      expect(trigger().getAttribute('aria-expanded')).toBe('true');

      toggleNotificationsPopover();
      expect(popover().classList.contains('hidden')).toBe(true);
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
    });

    it('returns focus to the trigger when closed by keyboard', () => {
      updateNotificationBadge(1);
      toggleNotificationsPopover();

      closeNotificationsPopover(true);
      expect(document.activeElement).toBe(trigger());
    });
  });

  describe('notice rendering', () => {
    it('formats Firestore timestamps without throwing', async () => {
      vi.mocked(getUserNotifications).mockResolvedValue([
        {
          id: 'n1',
          title: 'Timestamped notice',
          isRead: false,
          createdAt: { toDate: () => new Date(Date.now() - 5 * 60 * 1000) },
        },
      ]);

      await loadAndRenderNotifications('u1');

      expect(document.querySelector('.nav-notifications-item__time').textContent).toBe('5m ago');
    });

    it('resolves relative targets and drops unsafe schemes', async () => {
      vi.mocked(getUserNotifications).mockResolvedValue([
        { id: 'n1', title: 'Safe', actionUrl: 'profile.html', isRead: true },
        { id: 'n2', title: 'Unsafe', actionUrl: 'javascript:alert(1)', isRead: true },
      ]);

      await loadAndRenderNotifications('u1');

      const links = document.querySelectorAll('.nav-notifications-item__link');
      expect(links[0].tagName).toBe('A');
      expect(links[0].getAttribute('href')).toContain('profile.html');
      expect(links[1].tagName).toBe('DIV');
      expect(links[1].getAttribute('href')).toBeNull();
    });

    it('replaces the loading state with a failure notice when rendering throws', async () => {
      vi.mocked(getUserNotifications).mockRejectedValueOnce(new Error('boom'));

      await expect(loadAndRenderNotifications('u1')).resolves.toBeUndefined();
      expect(document.getElementById('nav-notifications-list').textContent).toContain(
        'could not be read'
      );
    });
  });

  describe('pin controls', () => {
    const items = [
      { id: 'n1', title: 'Pinned notice', isRead: true, isPinned: true },
      { id: 'n2', title: 'Fresh notice', isRead: false, isPinned: false },
    ];

    beforeEach(() => {
      vi.mocked(getUserNotifications).mockResolvedValue(items);
    });

    it('renders a pin control per notice reflecting its pressed state', async () => {
      await loadAndRenderNotifications('u1');

      const pins = document.querySelectorAll('.nav-notifications-item__pin');
      expect(pins).toHaveLength(2);
      expect(pins[0].dataset.notificationId).toBe('n1');
      expect(pins[0].getAttribute('aria-pressed')).toBe('true');
      expect(pins[0].getAttribute('aria-label')).toBe('Unpin notice');
      expect(pins[1].dataset.notificationId).toBe('n2');
      expect(pins[1].getAttribute('aria-pressed')).toBe('false');
      expect(pins[1].getAttribute('aria-label')).toBe('Pin notice');
    });

    it('toggles the pin state through the service and refreshes the list', async () => {
      initNotifications({ uid: 'u1' });
      await loadAndRenderNotifications('u1');
      const rendersBefore = vi.mocked(getUserNotifications).mock.calls.length;

      await toggleNotificationPin('n1');
      expect(setNotificationPinned).toHaveBeenCalledWith('u1', 'n1', false);

      await toggleNotificationPin('n2');
      expect(setNotificationPinned).toHaveBeenCalledWith('u1', 'n2', true);
      expect(vi.mocked(getUserNotifications).mock.calls.length).toBe(rendersBefore + 2);
    });

    it('leaves the list untouched when the pin write fails', async () => {
      vi.mocked(setNotificationPinned).mockResolvedValueOnce(false);
      initNotifications({ uid: 'u1' });
      await loadAndRenderNotifications('u1');
      const rendersBefore = vi.mocked(getUserNotifications).mock.calls.length;

      await toggleNotificationPin('n1');
      expect(vi.mocked(getUserNotifications).mock.calls.length).toBe(rendersBefore);
    });

    it('returns focus to the same pin control after the re-render', async () => {
      initNotifications({ uid: 'u1' });
      await loadAndRenderNotifications('u1');

      await toggleNotificationPin('n2');
      expect(document.activeElement?.dataset.notificationId).toBe('n2');
    });

    it('ignores pin toggles when no user is signed in', async () => {
      initNotifications(null);
      await toggleNotificationPin('n1');
      expect(setNotificationPinned).not.toHaveBeenCalled();
    });
  });
});
