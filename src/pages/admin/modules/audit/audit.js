// src/pages/admin/modules/audit/audit.js
import { listAdminAuditLogPage } from '@services/admin/audit.service.js';
import { formatAdminDate, truncateAdminText, escapeAdminHtml } from '../../admin.utils.js';
import { buildAdminEmptyState } from '../../admin.templates.js';

/**
 * @param {{ container: HTMLElement, access: import('../../admin.state.js').AdminAccess }} opts
 * @returns {() => void}
 */
export function mount({ container }) {
  let items = [];
  let lastDoc = null;
  let hasMore = false;
  let loading = false;

  async function loadPage(cursor = null) {
    loading = true;
    try {
      const result = await listAdminAuditLogPage({ pageSize: 25, cursor });
      items = result.items;
      lastDoc = result.lastDoc;
      hasMore = result.hasMore;
    } catch (err) {
      console.error('[audit] failed to load', err);
    } finally {
      loading = false;
      render();
    }
  }

  function render() {
    if (loading) {
      container.innerHTML =
        '<div class="admin-module-loading"><span class="admin-module-loading__line"></span><p>Loading audit log...</p></div>';
      return;
    }

    if (items.length === 0) {
      container.innerHTML = buildAdminEmptyState({
        title: 'No audit entries',
        body: 'The audit log is empty. Staff actions will appear here as they happen.',
        icon: 'scroll-text',
      });
      return;
    }

    const rows = items
      .map(
        (entry) => `
      <tr>
        <td class="admin-table__cell--left">
          <span class="admin-table__mark">${escapeAdminHtml(entry.actorRole[0].toUpperCase())}</span>
          ${escapeAdminHtml(entry.actorRole)}
        </td>
        <td>${escapeAdminHtml(entry.action)}</td>
        <td>${escapeAdminHtml(`${entry.targetType}/${entry.targetId || '-'}`)}</td>
        <td class="admin-table__cell--wide">${escapeAdminHtml(truncateAdminText(entry.summary, 60))}</td>
        <td class="admin-table__cell--right">${escapeAdminHtml(formatAdminDate(entry.createdAt))}</td>
      </tr>
    `
      )
      .join('');

    const paginationHtml = hasMore
      ? `<button class="btn btn-ghost" onclick="loadMore()" ${loading ? 'disabled' : ''}>Load More</button>`
      : '';

    container.innerHTML = `
      <section aria-labelledby="audit-title">
        <h2 id="audit-title" class="admin-section-title">Audit Log</h2>
        <p class="admin-note">Append-only record of staff actions. Entries cannot be edited or deleted.</p>
        <table class="admin-table">
          <thead>
            <tr>
              <th class="admin-table__cell--left">Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Summary</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="admin-pagination">${paginationHtml}</div>
      </section>
    `;

    window.loadMore = () => loadPage(lastDoc);
  }

  loadPage();

  return () => {
    delete window.loadMore;
  };
}

export default { mount };
