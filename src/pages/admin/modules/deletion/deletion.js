// src/pages/admin/modules/deletion/deletion.js
import {
  listDeletionRequestsPage,
  decideDeletionRequest,
} from '@services/admin/deletion.service.js';
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
      const result = await listDeletionRequestsPage(cursor);
      items = result.items;
      lastDoc = result.lastDoc;
      hasMore = result.hasMore;
    } catch (err) {
      console.error('[deletion] failed to load', err);
    } finally {
      loading = false;
      render();
    }
  }

  async function handleDecision(id, decision) {
    const confirmed = await showConfirmModal({
      title: `Approve Deletion Request?`,
      message: `This will ${decision} the removal petition for tale deletion. This action is irreversible.`,
      confirmText: decision === 'approved' ? 'Approve' : 'Reject',
      confirmVariant: decision === 'approved' ? 'primary' : 'danger',
    });
    if (!confirmed) return;

    try {
      await decideDeletionRequest(id, decision);
      showToast({ type: 'success', message: `Request ${decision}` });
      loadPage();
    } catch (err) {
      console.error('[deletion] decision failed', err);
      showToast({ type: 'error', message: 'Failed to process request' });
    }
  }

  function render() {
    if (loading) {
      container.innerHTML =
        '<div class="admin-module-loading"><span class="admin-module-loading__line"></span><p>Loading deletion requests...</p></div>';
      return;
    }

    if (items.length === 0) {
      container.innerHTML = buildAdminEmptyState({
        title: 'No pending requests',
        body: 'There are no pending tale deletion requests at this time.',
        icon: 'book-x',
      });
      return;
    }

    const rows = items
      .map(
        (req) => `
      <tr>
        <td class="admin-table__cell--left">${escapeAdminHtml(truncateAdminText(req.userId, 20))}</td>
        <td>${escapeAdminHtml(truncateAdminText(req.taleId, 30))}</td>
        <td class="admin-table__cell--wide">${escapeAdminHtml(truncateAdminText(req.reason, 100))}</td>
        <td>${escapeAdminHtml(formatAdminDate(req.createdAt))}</td>
        <td class="admin-table__cell--right">
          <button class="btn btn-sm btn-success" onclick="handleApprove('${req.id}')">Approve</button>
          <button class="btn btn-sm btn-danger" onclick="handleReject('${req.id}')">Reject</button>
        </td>
      </tr>
    `
      )
      .join('');

    const paginationHtml = hasMore
      ? `<button class="btn btn-ghost" onclick="loadMore()" ${loading ? 'disabled' : ''}>Load More</button>`
      : '';

    container.innerHTML = `
      <section aria-labelledby="deletions-title">
        <h2 id="deletions-title" class="admin-section-title">Tale Deletion Requests</h2>
        <p class="admin-note">Decisions update the request status. Actual tale removal is handled server-side.</p>
        <table class="admin-table">
          <thead>
            <tr>
              <th class="admin-table__cell--left">Author</th>
              <th>Tale ID</th>
              <th>Reason</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="admin-pagination">${paginationHtml}</div>
      </section>
    `;

    window.handleApprove = (id) => handleDecision(id, 'approved');
    window.handleReject = (id) => handleDecision(id, 'rejected');
    window.loadMore = () => loadPage(lastDoc);
  }

  loadPage();

  return () => {
    delete window.handleApprove;
    delete window.handleReject;
    delete window.loadMore;
  };
}

export default { mount };
