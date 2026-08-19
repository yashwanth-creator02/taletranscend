// src/ui/components/apiKeyModal/__tests__/apiKeyModal.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@shared/icons.js', () => ({
  initIcons: vi.fn(),
}));

const mockGetStoredApiKey = vi.fn();
const mockSetApiKey = vi.fn();
const mockClearApiKey = vi.fn();

vi.mock('@services/index.js', () => ({
  getStoredApiKey: (...args) => mockGetStoredApiKey(...args),
  setApiKey: (...args) => mockSetApiKey(...args),
  clearApiKey: (...args) => mockClearApiKey(...args),
}));

const { showApiKeyModal, ensureApiKey } = await import('../apiKeyModal.js');

describe('apiKeyModal', () => {
  beforeEach(() => {
    mockGetStoredApiKey.mockReset();
    mockSetApiKey.mockReset();
    mockClearApiKey.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('showApiKeyModal', () => {
    it('renders the modal into the DOM', () => {
      showApiKeyModal();
      expect(document.getElementById('api-key-modal')).not.toBeNull();
    });

    it('resolves null and removes itself when cancel is clicked', async () => {
      const promise = showApiKeyModal();
      document.querySelector('[data-action="cancel"]').click();
      const result = await promise;

      expect(result).toBeNull();
      expect(document.getElementById('api-key-modal')).toBeNull();
    });

    it('resolves null and removes itself when the backdrop is clicked', async () => {
      const promise = showApiKeyModal();
      document.getElementById('api-key-modal').click();
      const result = await promise;

      expect(result).toBeNull();
      expect(document.getElementById('api-key-modal')).toBeNull();
    });

    it('does NOT close when clicking inside the dialog itself', () => {
      showApiKeyModal();
      document.querySelector('input[name="apiKey"]').click();
      expect(document.getElementById('api-key-modal')).not.toBeNull();
    });

    it('saves the key and resolves it on valid submit', async () => {
      const promise = showApiKeyModal();
      const input = document.querySelector('input[name="apiKey"]');
      input.value = 'a-real-looking-key';
      document
        .querySelector('[data-api-key-form]')
        .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      const result = await promise;

      expect(mockSetApiKey).toHaveBeenCalledWith('a-real-looking-key');
      expect(result).toBe('a-real-looking-key');
      expect(document.getElementById('api-key-modal')).toBeNull();
    });

    it('shows a validation error and stays open when the key is empty', async () => {
      mockSetApiKey.mockImplementation(() => {
        throw new Error('API key must be a non-empty string.');
      });

      showApiKeyModal();
      document
        .querySelector('[data-api-key-form]')
        .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      const errorEl = document.querySelector('[data-api-key-error]');
      expect(errorEl.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('api-key-modal')).not.toBeNull();
    });

    it('replaces an already-open modal instead of stacking a second one', () => {
      showApiKeyModal();
      showApiKeyModal();
      expect(document.querySelectorAll('#api-key-modal').length).toBe(1);
    });

    it('shows a masked key and a clear option when a key is already stored', () => {
      mockGetStoredApiKey.mockReturnValue('abcd1234wxyz');
      showApiKeyModal();

      expect(document.body.textContent).toContain('••••wxyz');
      expect(document.querySelector('[data-action="clear"]')).not.toBeNull();
    });

    it('does not show the clear option when no key is stored', () => {
      mockGetStoredApiKey.mockReturnValue(null);
      showApiKeyModal();

      expect(document.querySelector('[data-action="clear"]')).toBeNull();
    });

    it('clears the key and resolves null when "Clear Stored Key" is clicked', async () => {
      mockGetStoredApiKey.mockReturnValue('abcd1234wxyz');
      const promise = showApiKeyModal();
      document.querySelector('[data-action="clear"]').click();
      const result = await promise;

      expect(mockClearApiKey).toHaveBeenCalled();
      expect(result).toBeNull();
      expect(document.getElementById('api-key-modal')).toBeNull();
    });
  });

  describe('ensureApiKey', () => {
    it('returns the existing key without showing the modal', async () => {
      mockGetStoredApiKey.mockReturnValue('already-stored-key');
      const result = await ensureApiKey();

      expect(result).toBe('already-stored-key');
      expect(document.getElementById('api-key-modal')).toBeNull();
    });

    it('shows the modal and returns the entered key if none is stored', async () => {
      mockGetStoredApiKey.mockReturnValue(null);
      const promise = ensureApiKey();

      const input = document.querySelector('input[name="apiKey"]');
      input.value = 'freshly-entered-key';
      document
        .querySelector('[data-api-key-form]')
        .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      expect(await promise).toBe('freshly-entered-key');
    });

    it('returns null if none is stored and the user cancels', async () => {
      mockGetStoredApiKey.mockReturnValue(null);
      const promise = ensureApiKey();
      document.querySelector('[data-action="cancel"]').click();

      expect(await promise).toBeNull();
    });
  });
});
