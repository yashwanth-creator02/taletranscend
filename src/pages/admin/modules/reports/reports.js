// src/pages/admin/modules/reports/reports.js
import { listReportsPage, resolveReport } from '@services/admin/reports.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';
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
      const result = await listReportsPage(cursor);
      items = result.items;
      lastDoc = result.lastDoc;
      hasMore = result.hasMore;
    } catch (err) {
      console.error('[reports] failed to load', err);
    } finally {
      loading = false;
      render();
    }
  }

  async function handleResolve(id, resolution) {
    const confirmed = await showConfirmModal({
      title: `Resolve Report?`,
      message: `Mark this report as <strong>${resolution}</strong>? This will notify the reporter.`,
      confirmText: resolution === 'resolved' ? 'Resolve' : 'Dismiss',
      confirmVariant: resolution === 'resolved' ? 'primary' : 'accent',
    });
    if (!confirmed) return;

    try {
      await resolveReport(id, resolution);
      showToast({ type: 'success', message: `Report ${resolution}` });
      loadPage();
    } catch (err) {
      console.error('[reports] resolution failed', err);
      showToast({ type: 'error', message: 'Failed to resolve report' });
    }
  }

  function render() {
    if (loading) {
      container.innerHTML =
        '<div class="admin-module-loading"><span class="admin-module-loading__line"></span><p>Loading reports...</p></div>';
      return;
    }

    if (items.length === 0) {
      container.innerHTML = buildAdminEmptyState({
        title: 'No pending reports',
        body: 'All reports have been triaged. No action required.',
        icon: 'flag',
      });
      return;
    }

    const rows = items
      .map(
        (report) => `
      <tr>
        <td class="admin-table__cell--left">${escapeAdminHtml(truncateAdminText(report.reporterId, 20))}</td>
        <td>${escapeAdminHtml(report.targetType)}</td>
        <td class="admin-table__cell--wide">${escapeAdminHtml(truncateAdminText(report.reason, 100))}</td>
        <td>${escapeAdminHtml(formatAdminDate(report.createdAt))}</td>
        <td class="admin-table__cell--right">
          <button class="btn btn-sm btn-success" onclick="handleResolve('${report.id}', 'resolved')">Resolve</button>
          <button class="btn btn-sm btn-ghost" onclick="handleResolve('${report.id}', 'dismissed')">Dismiss</button>
        </td>
      </tr>
    `
      )
      .join('');

    const paginationHtml = hasMore
      ? `<button class="btn btn-ghost" onclick="loadMore()" ${loading ? 'disabled' : ''}>Load More</button>`
      : '';

    container.innerHTML = `
      <section aria-labelledby="reports-title">
        <h2 id="reports-title" class="admin-section-title">Reports</h2>
        <table class="admin-table">
          <thead>
            <tr>
              <th class="admin-table__cell--left">Reporter</th>
              <th>Target</th>
              <th>Reason</th>
              <th>Filed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="admin-pagination">${paginationHtml}</div>
      </section>
    `;

    window.handleResolve = (id, resolution) => handleResolve(id, resolution);
    window.loadMore = () => loadPage(lastDoc);
  }

  loadPage();

  return () => {
    delete window.handleResolve;
    delete window.loadMore;
  };
}

export default { mount };
