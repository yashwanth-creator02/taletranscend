// src/pages/admin/modules/applications/applications.js
import { listApplicationsPage, decideApplication } from '@services/admin/applications.service.js';
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
      const result = await listApplicationsPage(cursor);
      items = result.items;
      lastDoc = result.lastDoc;
      hasMore = result.hasMore;
    } catch (err) {
      console.error('[applications] failed to load', err);
    } finally {
      loading = false;
      render();
    }
  }

  async function handleDecision(id, decision) {
    const confirmed = await showConfirmModal({
      title: decision === 'approved' ? 'Approve Application?' : 'Reject Application?',
      message: `This will ${decision} the author application. The applicant will be notified.`,
      confirmText: decision === 'approved' ? 'Approve' : 'Reject',
      confirmVariant: decision === 'approved' ? 'primary' : 'danger',
    });
    if (!confirmed) return;

    try {
      await decideApplication(id, decision);
      showToast({ type: 'success', message: `Application ${decision}` });
      loadPage();
    } catch (err) {
      console.error('[applications] decision failed', err);
      showToast({ type: 'error', message: 'Failed to process application' });
    }
  }

  function render() {
    if (loading) {
      container.innerHTML =
        '<div class="admin-module-loading"><span class="admin-module-loading__line"></span><p>Loading applications...</p></div>';
      return;
    }

    if (items.length === 0) {
      container.innerHTML = buildAdminEmptyState({
        title: 'No pending applications',
        body: 'No author applications are currently pending review.',
        icon: 'file-text',
      });
      return;
    }

    const rows = items
      .map(
        (app) => `
      <tr>
        <td class="admin-table__cell--left">${escapeAdminHtml(truncateAdminText(app.penName, 20))}</td>
        <td class="admin-table__cell--wide">${escapeAdminHtml(truncateAdminText(app.bio, 80))}</td>
        <td><a href="${escapeAdminHtml(app.sampleUrl)}" target="_blank" rel="noopener">${escapeAdminHtml(truncateAdminText(app.sampleUrl, 30))}</a></td>
        <td>${escapeAdminHtml(formatAdminDate(app.createdAt))}</td>
        <td class="admin-table__cell--right">
          <button class="btn btn-sm btn-success" onclick="handleApprove('${app.id}')">Approve</button>
          <button class="btn btn-sm btn-danger" onclick="handleReject('${app.id}')">Reject</button>
        </td>
      </tr>
    `
      )
      .join('');

    const paginationHtml = hasMore
      ? `<button class="btn btn-ghost" onclick="loadMore()" ${loading ? 'disabled' : ''}>Load More</button>`
      : '';

    container.innerHTML = `
      <section aria-labelledby="applications-title">
        <h2 id="applications-title" class="admin-section-title">Author Applications</h2>
        <table class="admin-table">
          <thead>
            <tr>
              <th class="admin-table__cell--left">Pen Name</th>
              <th>Bio</th>
              <th>Sample URL</th>
              <th>Applied</th>
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
