// src/pages/contribution/contribution.js
// Entry point for the tale editor page.
// Bootstraps nav, auth, draft loading, and all editor interactions.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/contribution.css';

import {
  initAuth,
  addNewChapter,
  updateSidebarTitle,
  renderChapterList,
  loadCurrentChapter,
  autoSaveLocal,
  updateStats,
  saveToCloud,
  loadDraft,
  initDraftId,
  syncMetadataFromDom,
  publishFullTale,
  state,
  initIcons,
} from './index.js';
import { debounce } from '@/utils/function.utils';
import { setupAuthTimeout } from '@/utils/ui.utils';
import { initNav } from '@ui/components/nav/nav.js';
import { refineMythicText } from '@services/index.js';
import { AI_API_KEY } from '@config/app.config.js';
import { showToast } from '@ui/components/toast.js';

initNav();

/* ── Draft ID ─────────────────────────────────────────────────────── */
// Resolve ?draft=<id> from URL before auth resolves so loadDraft() has it.
initDraftId();

/* ── Auth + Init ──────────────────────────────────────────────────── */

const authTimeout = setupAuthTimeout('stat-status', 'Connection timed out. Please refresh.');

initAuth(async (user) => {
  clearTimeout(authTimeout);
  await init();
});

/**
 * Initialises the editor after auth resolves.
 * Loads existing draft or starts fresh.
 *
 * @param {string} _userId - Authenticated user ID (unused directly — auth state used internally)
 */
async function init() {
  bindEditorEvents();
  bindMetadataEvents();
  bindVoiceEvents();
  bindCoverEvents();
  bindAIEvents();

  const hasDraft = await loadDraft();

  if (hasDraft) {
    renderChapterList();
    loadCurrentChapter();
    updateChecklist();
    setStatus('Draft restored.', 'success');
  } else {
    addNewChapter();
    setStatus('New tale started.', 'neutral');
  }

  initIcons();
}

/* ── Editor Events ────────────────────────────────────────────────── */

function bindEditorEvents() {
  // Chapter controls
  document.getElementById('add-chapter-btn')?.addEventListener('click', addNewChapter);

  // Chapter title → sidebar sync
  document.getElementById('current-chapter-title')?.addEventListener('input', (e) => {
    updateSidebarTitle(e.target.value);
    state.isDirty = true;
  });

  // Chapter content → auto-save + stats
  document.getElementById('chapter-content')?.addEventListener('input', () => {
    autoSaveLocal();
    updateStats();
    state.isDirty = true;
  });

  // Cloud save buttons
  const saveHandler = async () => {
    syncMetadataFromDom();
    await saveToCloud();
    updateChecklist();
  };

  document.getElementById('save-draft-btn')?.addEventListener('click', saveHandler);
  document.getElementById('save-draft-btn-mobile')?.addEventListener('click', saveHandler);

  // Publish buttons
  document.getElementById('publish-btn')?.addEventListener('click', publishFullTale);
  document.getElementById('publish-btn-mobile')?.addEventListener('click', publishFullTale);

  // AI stubs — console for now, easy to swap for real calls later
  document.getElementById('ai-continue-btn')?.addEventListener('click', () => {
    setStatus('AI continue — coming soon.', 'neutral');
    console.info('[AI] Continue not yet implemented');
  });
  document.getElementById('ai-enhance-btn')?.addEventListener('click', () => {
    setStatus('AI enhance — coming soon.', 'neutral');
    console.info('[AI] Enhance not yet implemented');
  });
  document.getElementById('btn-generate-cover')?.addEventListener('click', () => {
    setStatus('Cover suggestion — coming soon.', 'neutral');
    console.info('[AI] Cover suggestion not yet implemented');
  });

  // Warn on unload only if there are unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (state.isDirty) e.preventDefault();
  });
}

/* ── Metadata Events ──────────────────────────────────────────────── */

/**
 * Marks state dirty and updates the checklist whenever any
 * metadata field changes. No Firestore write on every keystroke —
 * only on explicit Save.
 */
function bindMetadataEvents() {
  const metaIds = [
    'tale-title',
    'tale-synopsis',
    'tale-era',
    'genre-tags',
    'story-tone',
    'story-language',
    'story-visibility',
    'target-audience',
    'content-warnings',
    'world-setting',
    'story-notes',
  ];

  metaIds.forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      state.isDirty = true;
      updateChecklist();
      setStatus('Unsaved changes', 'neutral');
    });
  });

  // Right-panel visibility toggle buttons
  document.querySelectorAll('[data-visibility]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.visibility;
      state.visibility = value;

      // Update button styles
      document.querySelectorAll('[data-visibility]').forEach((b) => {
        b.classList.toggle('border-indigo-500/50', b.dataset.visibility === value);
        b.classList.toggle('bg-slate-800', b.dataset.visibility === value);
        b.classList.toggle('text-white', b.dataset.visibility === value);
        b.classList.toggle('border-slate-800', b.dataset.visibility !== value);
        b.classList.toggle('bg-slate-900', b.dataset.visibility !== value);
        b.classList.toggle('text-slate-500', b.dataset.visibility !== value);
      });

      state.isDirty = true;
    });
  });
}

/* ── AI Assisted Storytelling ────────────────────────────────────── */

function bindAIEvents() {
  const enhanceBtn = document.getElementById('ai-enhance-btn');
  const continueBtn = document.getElementById('ai-continue-btn');
  const contentArea = document.getElementById('chapter-content');

  if (!enhanceBtn || !continueBtn || !contentArea) return;

  enhanceBtn.addEventListener('click', async () => {
    const text = contentArea.value.trim();
    if (!text || text.length < 20) {
      showToast('Neural link requires more data to refine.', 'info');
      return;
    }

    enhanceBtn.disabled = true;
    enhanceBtn.classList.add('animate-pulse');
    showToast('Consulting the Oracle...', 'info');

    try {
      const refined = await refineMythicText(text, AI_API_KEY);
      if (refined) {
        contentArea.value = refined;
        contentArea.dispatchEvent(new Event('input', { bubbles: true }));
        showToast('The weave has been refined.', 'success');
      } else {
        showToast('The oracle remains silent.', 'warning');
      }
    } catch (err) {
      console.error('[ai] Enhancement failed:', err);
      showToast('Neural link severed during refinement.', 'error');
    } finally {
      enhanceBtn.disabled = false;
      enhanceBtn.classList.remove('animate-pulse');
    }
  });

  // Stub for continue
  continueBtn.addEventListener('click', () => {
    showToast('AI Continuation coming soon in the next era.', 'info');
  });
}

/* ── Voice Logic ──────────────────────────────────────────────────── */

/**
 * Wires all voice dictation buttons using the Web Speech API.
 * Falls back gracefully on unsupported browsers.
 */
function bindVoiceEvents() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    // Hide voice buttons on unsupported browsers
    document.querySelectorAll('[data-voice-target]').forEach((btn) => {
      btn.style.display = 'none';
    });
    return;
  }

  /**
   * Creates a one-shot recognition session that appends text to a target field.
   *
   * @param {string} targetId - ID of the input/textarea to append to
   * @param {HTMLButtonElement} btn - The button that triggered dictation
   */
  function startDictation(targetId, btn) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    btn.classList.add('voice-btn--active');
    btn.setAttribute('aria-label', 'Listening…');

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const target = document.getElementById(targetId);
      if (!target) return;

      // Append rather than replace — lets the user dictate in chunks
      const sep = target.value.trim().length > 0 ? ' ' : '';
      target.value += sep + transcript;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    };

    recognition.onerror = (event) => {
      console.warn('[voice] Recognition error:', event.error);
      setStatus(`Voice error: ${event.error}`, 'error');
    };

    recognition.onend = () => {
      btn.classList.remove('voice-btn--active');
      btn.setAttribute('aria-label', btn.dataset.voiceLabel ?? 'Voice input');
    };

    recognition.start();
  }

  document.querySelectorAll('[data-voice-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      startDictation(btn.dataset.voiceTarget, btn);
    });
  });
}

/* ── Cover Preview ────────────────────────────────────────────────── */

/**
 * Wires the cover URL input so typing a URL immediately updates
 * the preview image. Invalid URLs show a placeholder.
 */
function bindCoverEvents() {
  const urlInput = document.getElementById('cover-url');
  const preview = document.getElementById('tale-cover-preview');
  if (!urlInput || !preview) return;

  const PLACEHOLDER =
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop';

  const updatePreview = debounce((url) => {
    if (!url.trim()) {
      preview.src = PLACEHOLDER;
      state.coverUrl = '';
      return;
    }

    // Test the URL by loading it; fall back to placeholder on error
    const test = new Image();
    test.onload = () => {
      preview.src = url;
      state.coverUrl = url;
    };
    test.onerror = () => {
      preview.src = PLACEHOLDER;
    };
    test.src = url;
  }, 500);

  urlInput.addEventListener('input', (e) => {
    updatePreview(e.target.value);
    state.isDirty = true;
  });
}

/* ── Checklist ────────────────────────────────────────────────────── */

/**
 * Updates the publish-readiness checklist in the right panel.
 * Each item has a data-check attribute that maps to a validation function.
 */
export function updateChecklist() {
  const checks = {
    'check-title-synopsis': () =>
      document.getElementById('tale-title')?.value.trim().length > 0 &&
      document.getElementById('tale-synopsis')?.value.trim().length > 0,

    'check-cover-era': () => document.getElementById('tale-era')?.value.trim().length > 0,

    'check-chapter': () => state.chapters.some((ch) => ch.content?.trim().length > 0),
  };

  Object.entries(checks).forEach(([id, fn]) => {
    const item = document.getElementById(id);
    if (!item) return;

    const passed = fn();
    const icon = item.querySelector('i[data-lucide]');

    if (icon) {
      icon.setAttribute('data-lucide', passed ? 'check-circle-2' : 'circle');
      icon.className = `h-4 w-4 ${passed ? 'text-emerald-400' : 'text-zinc-600'}`;
    }

    item.classList.toggle('opacity-50', !passed);
  });

  initIcons();
}

/* ── Status Helper ────────────────────────────────────────────────── */

/**
 * Updates the status text in the editor header.
 * Single source of truth — used by contribution.js, cloud.js calls setStatus too.
 *
 * @param {string} message
 * @param {'success'|'error'|'neutral'} type
 */
export function setStatus(message, type) {
  const status = document.getElementById('stat-status');
  if (!status) return;

  status.className = status.className.replace(/text-\w+-\d+/g, '').trim();

  const colors = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    neutral: 'text-zinc-500',
  };

  status.classList.add(colors[type] ?? 'text-zinc-500');
  status.textContent = message;
}
