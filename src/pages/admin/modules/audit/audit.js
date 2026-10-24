// src/pages/admin/modules/audit/audit.js
import { listAdminAuditLogPage } from '@services/admin/audit.service.js';
import { formatAdminDate, truncateAdminText, escapeAdminHtml } from '../../admin.utils.js';
import { buildAdminEmptyState, buildModuleLoading } from '../../admin.templates.js';

const PAGE_SIZE = 25;
const KNOWN_ROLES = new Set(['admin', 'moderator']);

/**
 * Resolve a display-safe actor role. A malformed entry must never throw while
 * the log is being rendered.
 * @param {Record<string, unknown>} entry
 * @returns {{ role: string, mark: string }}
 */
function describeActorRole(entry) {
  const raw = typeof entry?.actorRole === 'string' ? entry.actorRole.trim().toLowerCase() : '';
  if (KNOWN_ROLES.has(raw)) {
    return { role: raw, mark: raw === 'admin' ? 'A' : 'M' };
  }
  return { role: raw || 'unknown', mark: '?' };
}

/**
 * @param {{ container: HTMLElement, access: import('../../admin.state.js').AdminAccess }} opts
 * @returns {() => void}
 */
export function mount({ container }) {
  let items = [];
  let lastDoc = null;
  let hasMore = false;
  let loading = false;
  let loadingMore = false;
  let error = false;
  let query = '';
  let disposed = false;

  /**
   * @param {{ cursor?: import('firebase/firestore').QueryDocumentSnapshot | null, append?: boolean }} [options]
   */
  async function loadPage({ cursor = null, append = false } = {}) {
    if (disposed || loadingMore || (loading && !append)) return;

    if (append) {
      loadingMore = true;
    } else {
      loading = items.length === 0;
      error = false;
    }
    render();

    try {
      const result = await listAdminAuditLogPage({ pageSize: PAGE_SIZE, cursor });
      if (disposed) return;

      if (result.error) {
        error = true;
      } else {
        items = append ? [...items, ...result.items] : result.items;
        lastDoc = result.lastDoc;
        hasMore = result.hasMore;
        error = false;
      }
    } catch (err) {
      console.error('[audit] failed to load entries', err);
      error = true;
    } finally {
      if (!disposed) {
        loading = false;
        loadingMore = false;
        render();
      }
    }
  }

  function matchesQuery(entry) {
    if (!query) return true;
    const needle = query.toLowerCase();
    return ['action', 'actorId', 'actorRole'].some((field) =>
      String(entry?.[field] ?? '')
        .toLowerCase()
        .includes(needle)
    );
  }

  function filteredItems() {
    return items.filter(matchesQuery);
  }

  function buildRows() {
    const visible = filteredItems();
    if (visible.length === 0) {
      return `<tr><td colspan="5">${buildAdminEmptyState({
        title: 'No matching entries',
        body: 'No audit entries match that action or actor. Clear the search to see every loaded entry.',
        icon: 'search',
      })}</td></tr>`;
    }

    return visible
      .map((entry) => {
        const actor = describeActorRole(entry);
        const actorId = truncateAdminText(entry.actorId || 'Unknown actor', 32);
        const target = [entry.targetType, entry.targetId].filter(Boolean).join(' / ');

        return `
      <tr data-audit-entry>
        <td class="admin-table__cell--left">
          <span class="admin-table__mark">${escapeAdminHtml(actor.mark)}</span>
          <span class="admin-table__name">${escapeAdminHtml(actorId)}</span>
          <span class="admin-table__sub">${escapeAdminHtml(actor.role)}</span>
        </td>
        <td>${escapeAdminHtml(entry.action || 'Unknown action')}</td>
        <td>${escapeAdminHtml(truncateAdminText(target || 'Archive', 48))}</td>
        <td class="admin-table__cell--wide">${escapeAdminHtml(
          truncateAdminText(entry.summary, 80)
        )}</td>
        <td class="admin-table__cell--right">${escapeAdminHtml(formatAdminDate(entry.createdAt))}</td>
      </tr>
    `;
      })
      .join('');
  }

  function updateCount() {
    const count = container.querySelector('[data-role="audit-count"]');
    if (!count) return;
    const visible = filteredItems().length;
    count.textContent = query
      ? `${visible} of ${items.length} loaded ${items.length === 1 ? 'entry' : 'entries'}`
      : `${items.length} loaded ${items.length === 1 ? 'entry' : 'entries'}`;
  }

  /**
   * Refresh only the rows, so typing in the search field keeps its focus and
   * caret position.
   */
  function refreshRows() {
    const tbody = container.querySelector('[data-role="audit-rows"]');
    if (!tbody) return;
    tbody.innerHTML = buildRows();
    updateCount();
  }

  function render() {
    if (disposed) return;

    if (loading) {
      container.innerHTML = buildModuleLoading('audit log');
      return;
    }

    const hasItems = items.length > 0;
    const toolbar = hasItems
      ? `
        <div class="admin-toolbar">
          <label class="admin-field admin-field--grow">
            <span class="admin-field__label">Search</span>
            <input
              type="search"
              class="admin-input"
              data-role="audit-search"
              value="${escapeAdminHtml(query)}"
              placeholder="Filter by action or actor"
              aria-label="Search audit entries by action or actor"
            >
          </label>
          <p class="admin-note" data-role="audit-count"></p>
        </div>
      `
      : '';

    const errorHtml = error
      ? `
        <div class="admin-error" role="alert">
          <p>${
            hasItems
              ? 'Newer audit entries could not be read. Loaded entries are still shown below.'
              : 'The audit log could not be read.'
          }</p>
          <div class="admin-error__actions">
            <button type="button" class="admin-btn" data-action="retry">Try again</button>
          </div>
        </div>
      `
      : '';

    let body;
    if (hasItems) {
      body = `
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="admin-table__cell--left">Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Summary</th>
                <th class="admin-table__cell--right">Time</th>
              </tr>
            </thead>
            <tbody data-role="audit-rows">${buildRows()}</tbody>
          </table>
        </div>
      `;
    } else if (error) {
      body = '';
    } else {
      body = buildAdminEmptyState({
        title: 'No audit entries',
        body: 'The audit log is empty. Staff actions will appear here as they happen.',
        icon: 'scroll-text',
      });
    }

    const pagination = hasMore
      ? `
        <div class="admin-pagination-bar">
          <button type="button" class="admin-btn" data-action="load-more" ${
            loadingMore ? 'disabled' : ''
          }>
            ${loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      `
      : '';

    container.innerHTML = `
      <section aria-labelledby="audit-title">
        <div class="admin-section__header">
          <div>
            <h2 id="audit-title" class="admin-section-title">Audit Log</h2>
            <p class="admin-note">Append-only record of staff actions. Entries cannot be edited or deleted.</p>
          </div>
        </div>
        ${toolbar}
        ${errorHtml}
        ${body}
        ${pagination}
      </section>
    `;

    updateCount();
  }

  function handleClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('[data-action="retry"]')) {
      loadPage({ cursor: items.length > 0 ? lastDoc : null, append: items.length > 0 });
      return;
    }

    if (target.closest('[data-action="load-more"]') && hasMore && !loadingMore) {
      loadPage({ cursor: lastDoc, append: true });
    }
  }

  function handleInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.dataset.role !== 'audit-search') return;
    query = target.value;
    refreshRows();
  }

  container.addEventListener('click', handleClick);
  container.addEventListener('input', handleInput);
  loadPage();

  return () => {
    disposed = true;
    container.removeEventListener('click', handleClick);
    container.removeEventListener('input', handleInput);
  };
}

export default { mount };
