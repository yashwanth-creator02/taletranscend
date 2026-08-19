// src/shared/components/apiKeyModal/apiKeyModal.js
//
// Prompts the user to paste their own Gemini API key (BYOK — see
// docs/MIGRATION_PLAN.md Phase 6.6). Shown the first time an AI feature is
// used with no key stored, and available from profile settings afterward to
// change or clear it.

import { initIcons } from '@shared/icons.js';
import { escapeText } from '../../../utils/sanitize.utils.ts';
import { setApiKey, clearApiKey, getStoredApiKey } from '@services/index.js';

const MODAL_ID = 'api-key-modal';
const GEMINI_KEY_URL = 'https://aistudio.google.com/apikey';

/**
 * Shows the API key entry modal.
 *
 * @returns {Promise<string|null>} the saved key, or null if the user cancelled
 */
export function showApiKeyModal() {
  return new Promise((resolve) => {
    // Guard against a second modal stacking on top of an existing one
    document.getElementById(MODAL_ID)?.remove();

    const existingKey = getStoredApiKey();
    const maskedKey = existingKey ? `••••${existingKey.slice(-4)}` : null;

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.className =
      'fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4';

    overlay.innerHTML = `
      <div class="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-6">
        <div class="flex items-center gap-3 mb-3">
          <i data-lucide="sparkles" class="w-5 h-5 text-indigo-400"></i>
          <h2 class="text-sm font-black uppercase tracking-widest text-white">Connect Your Oracle</h2>
        </div>
        <p class="text-[13px] text-slate-400 leading-relaxed mb-4">
          AI features use your own free Gemini API key — nothing is sent to our servers, and
          nothing is shared with other users. Your key stays only in this browser.
        </p>
        <a
          href="${GEMINI_KEY_URL}"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-[12px] font-bold text-indigo-400 hover:text-indigo-300 mb-4"
        >
          Get a free key from Google AI Studio
          <i data-lucide="external-link" class="w-3 h-3"></i>
        </a>
        ${
          maskedKey
            ? `<p class="text-[12px] text-slate-400 mb-3">Current key: <span class="font-mono text-slate-300">${escapeText(maskedKey)}</span></p>`
            : ''
        }
        <form data-api-key-form>
          <input
            type="password"
            name="apiKey"
            autocomplete="off"
            placeholder="${maskedKey ? 'Paste a new key to replace it' : 'Paste your Gemini API key'}"
            class="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 mb-2"
          />
          <p data-api-key-error class="text-[12px] text-rose-400 font-semibold mb-2 hidden"></p>
          <div class="flex gap-2 mt-3">
            <button
              type="button"
              data-action="cancel"
              class="flex-1 px-4 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wide text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wide bg-indigo-500 hover:bg-indigo-400 text-white transition-colors"
            >
              Save Key
            </button>
          </div>
          ${
            maskedKey
              ? `<button
                  type="button"
                  data-action="clear"
                  class="w-full mt-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide text-rose-400/80 hover:text-rose-400 transition-colors"
                >
                  Clear Stored Key
                </button>`
              : ''
          }
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    initIcons(overlay);

    const form = overlay.querySelector('[data-api-key-form]');
    const input = overlay.querySelector('input[name="apiKey"]');
    const errorEl = overlay.querySelector('[data-api-key-error]');
    input?.focus();

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', () => close(null));

    overlay.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
      clearApiKey();
      close(null);
    });

    // Clicking the backdrop itself (not the dialog) cancels, same as most modals
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input?.value ?? '';
      try {
        setApiKey(value);
        close(value.trim());
      } catch {
        if (errorEl) {
          errorEl.textContent = 'Please enter a valid API key.';
          errorEl.classList.remove('hidden');
        }
      }
    });
  });
}

/**
 * Ensures a key is available, prompting the modal if none is stored yet.
 * Callers that need a key before proceeding should await this rather than
 * reading getStoredApiKey() directly, so the "ask if missing" behavior stays
 * in one place.
 *
 * @returns {Promise<string|null>} the key to use, or null if the user cancelled
 */
export async function ensureApiKey() {
  const existing = getStoredApiKey();
  if (existing) return existing;
  return showApiKeyModal();
}

/** Re-exported for the profile settings "manage key" UI, so it has one
 *  place to import both the modal and the clear action from. */
export { clearApiKey, getStoredApiKey };
