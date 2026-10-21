// src/ui/components/__tests__/geminiModal.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  openGeminiKeyModal,
  closeGeminiKeyModal,
  showMissingGeminiKeyToast,
} from '../geminiModal.js';
import * as apiKeyStorage from '@services/ai/apiKey.storage.js';
import * as toastModule from '@ui/components/toast.js';
import { initIcons } from '@ui/icons.js';

vi.mock('@/ui/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@ui/icons.js', () => ({
  initIcons: vi.fn(),
}));

describe('geminiModal component', () => {
  let storedKey = '';

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    storedKey = '';

    vi.spyOn(apiKeyStorage, 'getStoredApiKey').mockImplementation(() => storedKey);
    vi.spyOn(apiKeyStorage, 'setStoredApiKey').mockImplementation((k) => {
      storedKey = k;
    });
    vi.spyOn(apiKeyStorage, 'clearStoredApiKey').mockImplementation(() => {
      storedKey = '';
    });
    vi.spyOn(toastModule, 'showToast').mockImplementation(vi.fn());
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('openGeminiKeyModal', () => {
    it('creates and appends the dialog to the body if absent', () => {
      expect(document.getElementById('modal-gemini-key')).toBeNull();

      openGeminiKeyModal();

      const modal = document.getElementById('modal-gemini-key');
      expect(modal).not.toBeNull();
      expect(modal.getAttribute('role')).toBe('dialog');
      expect(modal.getAttribute('aria-modal')).toBe('true');
      expect(modal.classList.contains('hidden')).toBe(false);
      expect(modal.getAttribute('aria-hidden')).toBe('false');
      expect(initIcons).toHaveBeenCalledWith(modal);
    });

    it('displays Not Configured badge when no key is stored', () => {
      storedKey = '';
      openGeminiKeyModal();

      const badge = document.getElementById('gemini-modal-status-badge');
      expect(badge?.textContent).toBe('Not Configured');
      expect(badge?.className).toContain('text-amber-400');
    });

    it('populates input and displays Configured badge when key exists', () => {
      storedKey = 'AIzaSyExistingKey123';
      openGeminiKeyModal();

      const input = document.getElementById('input-gemini-key-modal');
      const badge = document.getElementById('gemini-modal-status-badge');

      expect(input?.value).toBe('AIzaSyExistingKey123');
      expect(badge?.textContent).toBe('Configured');
      expect(badge?.className).toContain('text-emerald-400');
    });
  });

  describe('closeGeminiKeyModal and dismissal actions', () => {
    it('closes on close button click', () => {
      openGeminiKeyModal();
      const modal = document.getElementById('modal-gemini-key');
      const closeBtn = document.getElementById('modal-gemini-close');

      expect(modal.classList.contains('hidden')).toBe(false);
      closeBtn?.click();

      expect(modal.classList.contains('hidden')).toBe(true);
      expect(modal.getAttribute('aria-hidden')).toBe('true');
    });

    it('closes on cancel button click', () => {
      openGeminiKeyModal();
      const modal = document.getElementById('modal-gemini-key');
      const cancelBtn = document.getElementById('btn-cancel-modal-key');

      cancelBtn?.click();
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('closes on backdrop click', () => {
      openGeminiKeyModal();
      const modal = document.getElementById('modal-gemini-key');
      const backdrop = document.getElementById('modal-gemini-backdrop');

      backdrop?.click();
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('closes on Escape key down', () => {
      openGeminiKeyModal();
      const modal = document.getElementById('modal-gemini-key');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('closes programmatically via closeGeminiKeyModal()', () => {
      openGeminiKeyModal();
      const modal = document.getElementById('modal-gemini-key');
      expect(modal.classList.contains('hidden')).toBe(false);

      closeGeminiKeyModal();
      expect(modal.classList.contains('hidden')).toBe(true);
      expect(modal.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('password visibility toggle', () => {
    it('toggles input type between password and text', () => {
      openGeminiKeyModal();
      const input = document.getElementById('input-gemini-key-modal');
      const toggleBtn = document.getElementById('btn-toggle-modal-key');

      expect(input.type).toBe('password');
      expect(toggleBtn.textContent.trim()).toBe('Show');

      toggleBtn.click();
      expect(input.type).toBe('text');
      expect(toggleBtn.textContent.trim()).toBe('Hide');

      toggleBtn.click();
      expect(input.type).toBe('password');
      expect(toggleBtn.textContent.trim()).toBe('Show');
    });
  });

  describe('saving API key', () => {
    it('stores key, dispatches event, and shows success toast on save', () => {
      openGeminiKeyModal();
      const input = document.getElementById('input-gemini-key-modal');
      const saveBtn = document.getElementById('btn-save-modal-key');
      const modal = document.getElementById('modal-gemini-key');

      const eventSpy = vi.fn();
      window.addEventListener('gemini-key-changed', eventSpy);

      input.value = 'AIzaSyNewSavedKey';
      saveBtn.click();

      expect(apiKeyStorage.setStoredApiKey).toHaveBeenCalledWith('AIzaSyNewSavedKey');
      expect(storedKey).toBe('AIzaSyNewSavedKey');
      expect(modal.classList.contains('hidden')).toBe(true);
      expect(toastModule.showToast).toHaveBeenCalledWith(
        'Google API Key stored securely in local storage.',
        'success'
      );
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('deleting API key', () => {
    it('provides a dedicated button to delete the key', () => {
      storedKey = 'AIzaSyToDelete';
      openGeminiKeyModal();

      const clearBtn = document.getElementById('btn-clear-modal-key');
      expect(clearBtn).not.toBeNull();
      expect(clearBtn.textContent).toContain('Delete Key');

      const eventSpy = vi.fn();
      window.addEventListener('gemini-key-changed', eventSpy);

      clearBtn.click();

      expect(apiKeyStorage.clearStoredApiKey).toHaveBeenCalled();
      expect(storedKey).toBe('');

      const input = document.getElementById('input-gemini-key-modal');
      expect(input?.value).toBe('');

      const modal = document.getElementById('modal-gemini-key');
      expect(modal.classList.contains('hidden')).toBe(true);

      expect(toastModule.showToast).toHaveBeenCalledWith('Google API Key deleted.', 'info');
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('showMissingGeminiKeyToast', () => {
    it('displays warning toast with "Tap to add" action', () => {
      showMissingGeminiKeyToast();

      expect(toastModule.showToast).toHaveBeenCalledWith(
        'Google API Key is missing. AI features require your personal key.',
        expect.objectContaining({
          type: 'warning',
          action: expect.objectContaining({
            label: 'Tap to add',
            onClick: expect.any(Function),
          }),
        })
      );
    });

    it('opens modal when toast action onClick is executed', () => {
      showMissingGeminiKeyToast();

      const callArgs = vi.mocked(toastModule.showToast).mock.calls[0];
      const action = callArgs[1].action;

      expect(document.getElementById('modal-gemini-key')).toBeNull();
      action.onClick();

      const modal = document.getElementById('modal-gemini-key');
      expect(modal).not.toBeNull();
      expect(modal.classList.contains('hidden')).toBe(false);
    });
  });
});
