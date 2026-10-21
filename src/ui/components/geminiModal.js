// src/ui/components/geminiModal.js
/**
 * Global Mythic Modal for entering and managing the Google Gemini API Key.
 *
 * Provides a centralized, accessible dialog available from any page in the MPA.
 * Integrates directly with the centralized toast notification system so missing
 * key alerts provide an actionable "Tap to add" button that summons this modal.
 */

import {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
} from '@services/ai/apiKey.storage.js';
import { showToast } from '@ui/components/toast.js';
import { initIcons } from '@ui/icons.js';

const MODAL_HTML = `
  <div
    id="modal-gemini-key"
    class="gemini-modal-overlay settings-modal-overlay hidden"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-gemini-title"
    aria-hidden="true"
  >
    <div class="gemini-modal-backdrop settings-modal-backdrop" id="modal-gemini-backdrop"></div>
    <div class="gemini-modal-card settings-modal-card">
      <header class="gemini-modal-header settings-modal-header">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <i data-lucide="sparkles" class="w-4 h-4 text-amber-400"></i>
          </div>
          <div>
            <h3 id="modal-gemini-title" class="gemini-modal-title settings-modal-title">Google Gemini API Key</h3>
            <p class="gemini-modal-sub settings-modal-sub">Oracle AI & Manuscript Intelligence</p>
          </div>
        </div>
        <button
          type="button"
          id="modal-gemini-close"
          class="gemini-modal-close settings-modal-close"
          aria-label="Close dialog"
        >
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </header>

      <div class="gemini-modal-body settings-modal-body space-y-4">
        <div class="gemini-info-box settings-info-box">
          <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"></i>
          <div class="text-xs text-slate-300 space-y-1">
            <p class="font-semibold text-slate-100">Private Archival Storage</p>
            <p class="text-slate-400 text-[11px] leading-relaxed">
              Your key is stored strictly on your device inside your browser's private local
              storage. It is never transmitted to TaleTranscend servers, and only communicates
              directly with Google's Gemini API endpoints.
            </p>
          </div>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="input-gemini-key-modal" class="text-xs font-semibold text-slate-200">
              Gemini API Key
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              Get free key from Google AI Studio
              <i data-lucide="external-link" class="w-2.5 h-2.5"></i>
            </a>
          </div>
          <div class="relative flex items-center">
            <input
              type="password"
              id="input-gemini-key-modal"
              class="gemini-modal-input settings-input font-mono text-xs w-full pr-16"
              placeholder="AIzaSy…"
              autocomplete="off"
              spellcheck="false"
            />
            <button
              type="button"
              id="btn-toggle-modal-key"
              class="gemini-modal-toggle-btn settings-modal-toggle-btn"
              aria-label="Toggle API key visibility"
            >
              Show
            </button>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <p id="gemini-modal-status-text">
              Status: <span id="gemini-modal-status-badge" class="font-semibold text-amber-400">Not Configured</span>
            </p>
            <p id="modal-gemini-hint" class="text-[11px] text-slate-500 font-mono">
              Prefix: AIzaSy…
            </p>
          </div>
        </div>
      </div>

      <footer class="gemini-modal-footer settings-modal-footer flex items-center justify-between">
        <button
          type="button"
          id="btn-clear-modal-key"
          data-testid="btn-delete-modal-key"
          class="btn-danger text-xs flex items-center gap-1.5"
          aria-label="Delete stored Gemini API key"
        >
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          <span>Delete Key</span>
        </button>
        <div class="flex items-center gap-2">
          <button
            type="button"
            id="btn-cancel-modal-key"
            class="btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-save-modal-key"
            class="btn-primary text-xs flex items-center gap-1.5"
          >
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            <span>Save Key</span>
          </button>
        </div>
      </footer>
    </div>
  </div>
`;

let isInitialized = false;

function _ensureModalInDom() {
  let modal = document.getElementById('modal-gemini-key');
  if (!modal) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = MODAL_HTML.trim();
    modal = wrapper.firstElementChild;
    document.body.appendChild(modal);
  }
  if (!isInitialized || !modal.dataset.geminiModalBound) {
    _initModalEvents(modal);
    modal.dataset.geminiModalBound = 'true';
    isInitialized = true;
  }
  return modal;
}

function _updateStatusBadge(modal) {
  const badge = modal.querySelector('#gemini-modal-status-badge');
  const key = getStoredApiKey();
  if (badge) {
    if (key) {
      badge.textContent = 'Configured (Securely Stored)';
      badge.className = 'font-semibold text-emerald-400';
    } else {
      badge.textContent = 'Not Configured';
      badge.className = 'font-semibold text-amber-400';
    }
  }
}

function _initModalEvents(modal) {
  const closeBtn = modal.querySelector('#modal-gemini-close');
  const backdrop = modal.querySelector('#modal-gemini-backdrop');
  const cancelBtn = modal.querySelector('#btn-cancel-modal-key');
  const saveBtn = modal.querySelector('#btn-save-modal-key');
  const clearBtn = modal.querySelector('#btn-clear-modal-key');
  const toggleBtn = modal.querySelector('#btn-toggle-modal-key');
  const modalInput = modal.querySelector('#input-gemini-key-modal');

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
  };

  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  toggleBtn?.addEventListener('click', () => {
    if (!modalInput) return;
    const isPassword = modalInput.type === 'password';
    modalInput.type = isPassword ? 'text' : 'password';
    toggleBtn.textContent = isPassword ? 'Hide' : 'Show';
  });

  const syncKeyToPage = (val) => {
    const pageInputs = document.querySelectorAll('#input-gemini-key');
    pageInputs.forEach((el) => {
      el.value = val;
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gemini-key-changed', { detail: { key: val } }));
    }
  };

  saveBtn?.addEventListener('click', () => {
    const val = modalInput?.value?.trim() || '';
    if (val) {
      setStoredApiKey(val);
      syncKeyToPage(val);
      _updateStatusBadge(modal);
      showToast('Gemini API key stored securely in local storage.', 'success');
    } else {
      clearStoredApiKey();
      syncKeyToPage('');
      _updateStatusBadge(modal);
      showToast('Gemini API key deleted.', 'info');
    }
    closeModal();
  });

  clearBtn?.addEventListener('click', () => {
    clearStoredApiKey();
    syncKeyToPage('');
    if (modalInput) modalInput.value = '';
    _updateStatusBadge(modal);
    showToast('Gemini API key deleted.', 'info');
    closeModal();
  });
}

/**
 * Opens the global Gemini API Key modal.
 */
export function openGeminiKeyModal() {
  const modal = _ensureModalInDom();
  const modalInput = modal.querySelector('#input-gemini-key-modal');
  const toggleBtn = modal.querySelector('#btn-toggle-modal-key');

  const currentKey = getStoredApiKey() || '';
  if (modalInput) {
    modalInput.value = currentKey;
    modalInput.type = 'password';
  }
  if (toggleBtn) {
    toggleBtn.textContent = 'Show';
  }

  _updateStatusBadge(modal);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('overflow-hidden');
  initIcons(modal);

  if (modalInput) {
    setTimeout(() => modalInput.focus(), 50);
  }
}

/**
 * Closes the global Gemini API Key modal.
 */
export function closeGeminiKeyModal() {
  const modal = document.getElementById('modal-gemini-key');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
  }
}

/**
 * Displays a toast notification indicating that the Gemini API key is missing,
 * with an actionable button ("Tap to add") that opens the global key entry modal.
 *
 * @param {string} [customMessage] - Optional custom toast message
 * @returns {HTMLElement} The created toast element
 */
export function showMissingGeminiKeyToast(customMessage) {
  const message =
    customMessage || 'Gemini API key is missing. AI features require your personal API key.';
  return showToast(message, {
    type: 'warning',
    action: {
      label: 'Tap to add',
      onClick: () => openGeminiKeyModal(),
    },
  });
}

// Global window registration for accessibility from any page or module
if (typeof window !== 'undefined') {
  window.openGeminiKeyModal = openGeminiKeyModal;
  window.closeGeminiKeyModal = closeGeminiKeyModal;
  window.showMissingGeminiKeyToast = showMissingGeminiKeyToast;
  window.addEventListener('tt:open-gemini-modal', () => openGeminiKeyModal());
}
