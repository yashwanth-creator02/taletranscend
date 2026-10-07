// src/ui/components/__tests__/confirmModal.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showConfirmModal, confirmTaleDownload, CONFIRM_MODAL_ID } from '../confirmModal.js';
import { initIcons } from '@/ui/icons.js';

vi.mock('@/ui/icons.js', () => ({
  initIcons: vi.fn(),
}));

describe('confirmModal component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    vi.stubGlobal('requestAnimationFrame', (cb) => cb());
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('showConfirmModal', () => {
    it('creates and appends an accessible modal dialog to body', async () => {
      const promise = showConfirmModal({
        title: 'Seal Scroll?',
        message: 'Are you certain?',
        subtext: 'This action is recorded in archives.',
        confirmText: 'Yes, Seal',
        cancelText: 'Turn Back',
      });

      const modal = document.getElementById(CONFIRM_MODAL_ID);
      expect(modal).not.toBeNull();
      expect(modal?.getAttribute('role')).toBe('dialog');
      expect(modal?.getAttribute('aria-modal')).toBe('true');
      expect(modal?.textContent).toContain('Seal Scroll?');
      expect(modal?.textContent).toContain('Are you certain?');
      expect(modal?.textContent).toContain('This action is recorded in archives.');
      expect(modal?.textContent).toContain('Yes, Seal');
      expect(modal?.textContent).toContain('Turn Back');
      expect(initIcons).toHaveBeenCalledWith(modal);

      // Clean up by clicking cancel
      const cancelBtn = modal?.querySelector('.confirm-modal-cancel');
      cancelBtn?.click();
      const result = await promise;
      expect(result).toBe(false);
      expect(document.getElementById(CONFIRM_MODAL_ID)).toBeNull();
    });

    it('resolves true and cleans up DOM when confirm button is clicked', async () => {
      const promise = showConfirmModal({ title: 'Accept Fate' });
      const modal = document.getElementById(CONFIRM_MODAL_ID);
      const confirmBtn = modal?.querySelector('.confirm-modal-confirm');

      confirmBtn?.click();
      const res = await promise;

      expect(res).toBe(true);
      expect(document.getElementById(CONFIRM_MODAL_ID)).toBeNull();
    });

    it('resolves false when cancel button is clicked', async () => {
      const promise = showConfirmModal({ title: 'Cancel Test' });
      const modal = document.getElementById(CONFIRM_MODAL_ID);
      const cancelBtn = modal?.querySelector('.confirm-modal-cancel');

      cancelBtn?.click();
      const res = await promise;

      expect(res).toBe(false);
      expect(document.getElementById(CONFIRM_MODAL_ID)).toBeNull();
    });

    it('resolves false when close (X) button is clicked', async () => {
      const promise = showConfirmModal({ title: 'Close X Test' });
      const modal = document.getElementById(CONFIRM_MODAL_ID);
      const closeBtn = modal?.querySelector('.confirm-modal-close');

      closeBtn?.click();
      const res = await promise;

      expect(res).toBe(false);
      expect(document.getElementById(CONFIRM_MODAL_ID)).toBeNull();
    });

    it('resolves false when clicking the backdrop overlay outside the modal card', async () => {
      const promise = showConfirmModal({ title: 'Backdrop Test' });
      const modal = document.getElementById(CONFIRM_MODAL_ID);

      // Clicking directly on overlay (not child card)
      modal?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const res = await promise;

      expect(res).toBe(false);
      expect(document.getElementById(CONFIRM_MODAL_ID)).toBeNull();
    });

    it('does not dismiss when clicking inside the card', async () => {
      const promise = showConfirmModal({ title: 'Inside Click Test' });
      const modal = document.getElementById(CONFIRM_MODAL_ID);
      const card = modal?.querySelector('.modal-card');

      card?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(document.getElementById(CONFIRM_MODAL_ID)).not.toBeNull();

      // Complete by confirming
      const confirmBtn = modal?.querySelector('.confirm-modal-confirm');
      confirmBtn?.click();
      const res = await promise;
      expect(res).toBe(true);
    });

    it('resolves false on Escape key press', async () => {
      const promise = showConfirmModal({ title: 'Escape Test' });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      const res = await promise;

      expect(res).toBe(false);
      expect(document.getElementById(CONFIRM_MODAL_ID)).toBeNull();
    });

    it('handles Tab key focus wrapping inside modal', async () => {
      const promise = showConfirmModal({ title: 'Tab Test' });
      const modal = document.getElementById(CONFIRM_MODAL_ID);
      const focusable = modal?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      expect(focusable?.length).toBeGreaterThan(1);

      const first = focusable?.[0];
      const last = focusable?.[focusable.length - 1];

      // Tab on last element should cycle to first
      last?.focus();
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);

      // Shift+Tab on first element should cycle to last
      first?.focus();
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(shiftTabEvent);

      modal?.querySelector('.confirm-modal-cancel')?.click();
      await promise;
    });

    it('dismisses existing modal before creating a new one', async () => {
      const _firstPromise = showConfirmModal({ title: 'First' });
      const secondPromise = showConfirmModal({ title: 'Second' });

      const modals = document.querySelectorAll(`#${CONFIRM_MODAL_ID}`);
      expect(modals.length).toBe(1);
      expect(modals[0].textContent).toContain('Second');

      modals[0].querySelector('.confirm-modal-confirm')?.click();
      const secondRes = await secondPromise;
      expect(secondRes).toBe(true);
    });

    it('supports custom variant classes', async () => {
      const promise = showConfirmModal({
        title: 'Danger Zone',
        confirmVariant: 'danger',
      });
      const modal = document.getElementById(CONFIRM_MODAL_ID);
      const confirmBtn = modal?.querySelector('.confirm-modal-confirm');

      expect(confirmBtn?.classList.contains('btn-danger')).toBe(true);

      confirmBtn?.click();
      await promise;
    });
  });

  describe('confirmTaleDownload', () => {
    it('prompts confirmation for full chronicle download', async () => {
      const promise = confirmTaleDownload({
        title: 'Epic of Gilgamesh',
        chapterCount: 12,
      });

      const modal = document.getElementById(CONFIRM_MODAL_ID);
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('Download Chronicle?');
      expect(modal?.textContent).toContain('Epic of Gilgamesh');
      expect(modal?.textContent).toContain('All 12 fragments will be compiled');
      expect(modal?.textContent).toContain('Download Archive');

      const confirmBtn = modal?.querySelector('.confirm-modal-confirm');
      confirmBtn?.click();
      const res = await promise;

      expect(res).toBe(true);
    });

    it('prompts confirmation for single fragment download', async () => {
      const promise = confirmTaleDownload({
        title: 'Ramayana',
        isFragment: true,
        fragmentTitle: 'Bala Kanda',
      });

      const modal = document.getElementById(CONFIRM_MODAL_ID);
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('Download Fragment?');
      expect(modal?.textContent).toContain('Bala Kanda');
      expect(modal?.textContent).toContain('Ramayana');
      expect(modal?.textContent).toContain('Download Fragment');

      const cancelBtn = modal?.querySelector('.confirm-modal-cancel');
      cancelBtn?.click();
      const res = await promise;

      expect(res).toBe(false);
    });
  });
});
