import { escapeHtml } from '@/utils';
import { initIcons } from '@/ui/icons.js';

/**
 * Renders an empty state message.
 *
 * @param {HTMLElement} container - Container to render into
 * @param {Object} options - Configuration options
 * @param {string} options.message - Main message
 * @param {string} options.subMessage - Secondary message
 * @param {string} options.icon - Lucide icon name
 * @param {string} options.classes - Additional CSS classes for the container
 */
export function renderEmptyState(
  container,
  {
    message = 'No data found.',
    subMessage = '',
    icon = 'sparkles',
    classes = 'py-20 text-center',
  } = {}
) {
  if (!container) return;

  container.innerHTML = `
    <div class="${classes}">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
        <i data-lucide="${icon}" class="h-6 w-6 text-zinc-500"></i>
      </div>
      <p class="text-sm font-medium text-zinc-400">${escapeHtml(message)}</p>
      ${subMessage ? `<p class="mt-2 text-xs text-zinc-600">${escapeHtml(subMessage)}</p>` : ''}
    </div>
  `;

  initIcons(container);
}

/**
 * Renders an error state message.
 *
 * @param {HTMLElement} container - Container to render into
 * @param {Object} options - Configuration options
 * @param {string} options.message - Error message
 * @param {string} options.subMessage - Secondary message
 */
export function renderErrorState(
  container,
  { message = 'Something went wrong.', subMessage = 'Please try again later.' } = {}
) {
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full rounded-4xl border border-red-500/10 bg-red-500/5 px-6 py-16 text-center shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
        <i data-lucide="triangle-alert" class="h-6 w-6 text-red-400"></i>
      </div>
      <p class="text-sm font-medium text-red-200">${escapeHtml(message)}</p>
      <p class="mt-2 text-xs text-red-300/70">${escapeHtml(subMessage)}</p>
    </div>
  `;

  initIcons(container);
}

/**
 * Renders an empty search state with query context, suggested topics, and reset action.
 *
 * @param {HTMLElement} container
 * @param {Object} options
 * @param {string} [options.query]
 * @param {string[]} [options.suggestions]
 * @param {() => void} [options.onClear]
 * @param {(topic: string) => void} [options.onSelectSuggestion]
 */
export function renderEmptySearchState(
  container,
  {
    query = '',
    suggestions = ['Mythic', 'Ancient', 'Folklore', 'Celestial', 'Ascendant'],
    onClear = null,
    onSelectSuggestion = null,
  } = {}
) {
  if (!container) return;

  const safeQuery = escapeHtml(query.trim());
  const hasQuery = Boolean(safeQuery);

  const headingText = hasQuery ? `No chronicles match "${safeQuery}"` : 'The Archives are Silent';
  const subtitleText = hasQuery
    ? 'No scrolls or fragments were discovered under this inscription. Try checking for typos or explore suggested eras.'
    : 'No tales found in this wing of the sanctuary. Inscribe a new legend or explore all chronicles.';

  const suggestionsHtml = suggestions
    .map(
      (topic) => `
      <button
        type="button"
        class="empty-search-topic-btn px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-colors"
        data-topic="${escapeHtml(topic)}"
      >
        ${escapeHtml(topic)}
      </button>
    `
    )
    .join('');

  container.innerHTML = `
    <div class="col-span-full flex flex-col items-center gap-6 py-20 text-center animate-fade-in max-w-lg mx-auto">
      <div class="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-2xl">
        <i data-lucide="compass" class="w-8 h-8 text-indigo-400"></i>
      </div>
      <div class="space-y-2">
        <h3 class="text-xl font-cinzel font-bold text-white tracking-tight">${headingText}</h3>
        <p class="text-xs text-zinc-400 leading-relaxed font-medium">${subtitleText}</p>
      </div>

      <div class="w-full pt-2">
        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Suggested Inscriptions</p>
        <div class="flex flex-wrap items-center justify-center gap-2">
          ${suggestionsHtml}
        </div>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <button
          type="button"
          id="empty-search-reset-btn"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-indigo-600/20"
        >
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
          <span>Browse All Chronicles</span>
        </button>
      </div>
    </div>
  `;

  initIcons(container);

  if (onClear) {
    container.querySelector('#empty-search-reset-btn')?.addEventListener('click', onClear);
  }

  if (onSelectSuggestion) {
    container.querySelectorAll('.empty-search-topic-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const topic = btn.getAttribute('data-topic');
        if (topic) onSelectSuggestion(topic);
      });
    });
  }
}
