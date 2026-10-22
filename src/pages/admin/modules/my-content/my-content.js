// src/pages/admin/modules/my-content/my-content.js
import {
  getAuthorTalesPage,
  getAuthorDeletionRequestsPage,
  getAuthorReports,
  requestTaleDeletion,
} from '@services/admin/mycontent.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';
import { formatAdminDate, formatAdminCount, escapeAdminHtml } from '../../admin.utils.js';
import { buildAdminEmptyState } from '../../admin.templates.js';

/**
 * @param {{ container: HTMLElement, access: import('../../admin.state.js').AdminAccess }} opts
 * @returns {() => void}
 */
export function mount({ container }) {
  let tales = [];
  let deletionRequests = [];
  let reports = [];
  let talesLastDoc = null;
  let talesHasMore = false;
  let requestsLastDoc = null;
  let requestsHasMore = false;
  let loading = false;
  let loadingMoreTales = false;
  let loadingMoreRequests = false;

  async function loadInitialData() {
    loading = true;
    render();
    try {
      const [talesResult, requestsResult, fetchedReports] = await Promise.all([
        getAuthorTalesPage(null),
        getAuthorDeletionRequestsPage(null),
        getAuthorReports(),
      ]);

      tales = talesResult.items;
      talesLastDoc = talesResult.lastDoc;
      talesHasMore = talesResult.hasMore;

      deletionRequests = requestsResult.items;
      requestsLastDoc = requestsResult.lastDoc;
      requestsHasMore = requestsResult.hasMore;

      reports = fetchedReports;
    } catch (err) {
      console.error('[my-content] failed to load data', err);
      showToast('Failed to load your content data', 'error');
    } finally {
      loading = false;
      render();
    }
  }

  async function handleLoadMoreTales() {
    if (loadingMoreTales || !talesHasMore || !talesLastDoc) return;
    loadingMoreTales = true;
    render();
    try {
      const result = await getAuthorTalesPage(talesLastDoc);
      tales = [...tales, ...result.items];
      talesLastDoc = result.lastDoc;
      talesHasMore = result.hasMore;
    } catch (err) {
      console.error('[my-content] failed to load more tales', err);
      showToast('Failed to load more tales', 'error');
    } finally {
      loadingMoreTales = false;
      render();
    }
  }

  async function handleLoadMoreRequests() {
    if (loadingMoreRequests || !requestsHasMore || !requestsLastDoc) return;
    loadingMoreRequests = true;
    render();
    try {
      const result = await getAuthorDeletionRequestsPage(requestsLastDoc);
      deletionRequests = [...deletionRequests, ...result.items];
      requestsLastDoc = result.lastDoc;
      requestsHasMore = result.hasMore;
    } catch (err) {
      console.error('[my-content] failed to load more requests', err);
      showToast('Failed to load more deletion requests', 'error');
    } finally {
      loadingMoreRequests = false;
      render();
    }
  }

  async function handleRequestDeletion(taleId, taleTitle) {
    const confirmed = await showConfirmModal({
      title: `Request Tale Deletion`,
      message: `Are you sure you want to request deletion for <strong>${escapeAdminHtml(taleTitle)}</strong>? This will submit a request to moderators.`,
      confirmText: 'Request Deletion',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
      await requestTaleDeletion(taleId, 'Author requested deletion via admin dashboard');
      showToast('Deletion request submitted successfully', 'success');
      await loadInitialData();
    } catch (err) {
      console.error('[my-content] failed to request deletion', err);
      showToast('Failed to submit deletion request', 'error');
    }
  }

  function render() {
    if (loading) {
      container.innerHTML = `
        <div class="admin-module-loading">
          <span class="admin-module-loading__line"></span>
          <p>Loading your content...</p>
        </div>
      `;
      return;
    }

    const taleRows =
      tales.length > 0
        ? tales
            .map(
              (tale) => `
        <tr>
          <td class="admin-table__cell--left font-medium">${escapeAdminHtml(tale.title || 'Untitled')}</td>
          <td><span class="admin-badge admin-badge--${escapeAdminHtml(tale.status || 'draft')}">${escapeAdminHtml(tale.status || 'draft')}</span></td>
          <td>${escapeAdminHtml(formatAdminCount(tale.wordCount ?? 0))}</td>
          <td>${escapeAdminHtml(formatAdminDate(tale.publishedAt ?? tale.createdAt))}</td>
          <td>${escapeAdminHtml(formatAdminCount(tale.commentCount ?? 0))}</td>
          <td class="admin-table__cell--right">
            <button type="button" class="admin-btn admin-btn--sm admin-btn--danger" data-action="delete-tale" data-tale-id="${escapeAdminHtml(tale.id)}" data-tale-title="${escapeAdminHtml(tale.title || 'Untitled')}">
              Request Deletion
            </button>
          </td>
        </tr>
      `
            )
            .join('')
        : `<tr><td colspan="6" class="admin-table__cell--center">${buildAdminEmptyState({ title: 'No Tales Found', body: 'You have not published any tales yet.' })}</td></tr>`;

    const requestRows =
      deletionRequests.length > 0
        ? deletionRequests
            .map(
              (req) => `
        <tr>
          <td class="admin-table__cell--left font-mono">${escapeAdminHtml(req.taleId || '-')}</td>
          <td><span class="admin-badge admin-badge--${escapeAdminHtml(req.status || 'pending')}">${escapeAdminHtml(req.status || 'pending')}</span></td>
          <td>${escapeAdminHtml(formatAdminDate(req.createdAt))}</td>
          <td class="admin-table__cell--left">${escapeAdminHtml(req.reason || 'No reason provided')}</td>
        </tr>
      `
            )
            .join('')
        : `<tr><td colspan="4" class="admin-table__cell--center">${buildAdminEmptyState({ title: 'No Deletion Requests', body: 'You have no pending or past deletion requests.' })}</td></tr>`;

    const reportRows =
      reports.length > 0
        ? reports
            .map(
              (rep) => `
        <tr>
          <td class="admin-table__cell--left font-mono">${escapeAdminHtml(rep.targetId || '-')}</td>
          <td><span class="admin-badge admin-badge--warning">${escapeAdminHtml(rep.status || 'pending')}</span></td>
          <td class="admin-table__cell--left">${escapeAdminHtml(rep.reason || rep.description || 'Reported content')}</td>
          <td>${escapeAdminHtml(formatAdminDate(rep.createdAt))}</td>
        </tr>
      `
            )
            .join('')
        : `<tr><td colspan="4" class="admin-table__cell--center">${buildAdminEmptyState({ title: 'No Pending Reports', body: 'There are no active reports on your content.' })}</td></tr>`;

    container.innerHTML = `
      <section aria-labelledby="my-content-title" class="admin-section">
        <div class="admin-section__header">
          <div>
            <h2 id="my-content-title" class="admin-section-title">Your Content</h2>
            <p class="admin-note">Manage your published tales, review your deletion requests, and monitor reports on your content.</p>
          </div>
        </div>

        <div class="admin-content-stack">
          <!-- Tales Panel -->
          <div class="admin-content-panel">
            <div class="admin-content-panel__header">
              <h3 class="admin-content-panel__title">Published Tales</h3>
              <span class="admin-content-panel__count">${tales.length} tales</span>
            </div>
            <div class="admin-table-wrapper">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th class="admin-table__cell--left">Title</th>
                    <th>Status</th>
                    <th>Words</th>
                    <th>Submitted / Published</th>
                    <th>Comments</th>
                    <th class="admin-table__cell--right">Actions</th>
                  </tr>
                </thead>
                <tbody>${taleRows}</tbody>
              </table>
            </div>
            ${
              talesHasMore
                ? `<div class="admin-pagination-bar">
                     <button type="button" class="admin-btn admin-btn--secondary" id="load-more-tales" ${loadingMoreTales ? 'disabled' : ''}>
                       ${loadingMoreTales ? 'Loading...' : 'Load More Tales'}
                     </button>
                   </div>`
                : ''
            }
          </div>

          <!-- Deletion Requests Panel -->
          <div class="admin-content-panel">
            <div class="admin-content-panel__header">
              <h3 class="admin-content-panel__title">Your Deletion Requests</h3>
              <span class="admin-content-panel__count">${deletionRequests.length} requests</span>
            </div>
            <div class="admin-table-wrapper">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th class="admin-table__cell--left">Tale ID</th>
                    <th>Status</th>
                    <th>Requested Date</th>
                    <th class="admin-table__cell--left">Reason</th>
                  </tr>
                </thead>
                <tbody>${requestRows}</tbody>
              </table>
            </div>
            ${
              requestsHasMore
                ? `<div class="admin-pagination-bar">
                     <button type="button" class="admin-btn admin-btn--secondary" id="load-more-requests" ${loadingMoreRequests ? 'disabled' : ''}>
                       ${loadingMoreRequests ? 'Loading...' : 'Load More Requests'}
                     </button>
                   </div>`
                : ''
            }
          </div>

          <!-- Pending Reports Panel -->
          <div class="admin-content-panel">
            <div class="admin-content-panel__header">
              <h3 class="admin-content-panel__title">Pending Reports on Your Content</h3>
              <span class="admin-content-panel__count">${reports.length} reports</span>
            </div>
            <div class="admin-table-wrapper">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th class="admin-table__cell--left">Target ID</th>
                    <th>Status</th>
                    <th class="admin-table__cell--left">Reason</th>
                    <th>Reported Date</th>
                  </tr>
                </thead>
                <tbody>${reportRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    `;

    // Bind event listeners
    container.querySelectorAll('[data-action="delete-tale"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const taleId = btn.getAttribute('data-tale-id');
        const taleTitle = btn.getAttribute('data-tale-title');
        if (taleId) handleRequestDeletion(taleId, taleTitle);
      });
    });

    const loadMoreTalesBtn = container.querySelector('#load-more-tales');
    if (loadMoreTalesBtn) {
      loadMoreTalesBtn.addEventListener('click', handleLoadMoreTales);
    }

    const loadMoreReqBtn = container.querySelector('#load-more-requests');
    if (loadMoreReqBtn) {
      loadMoreReqBtn.addEventListener('click', handleLoadMoreRequests);
    }
  }

  loadInitialData();

  return () => {
    // Cleanup if needed
  };
}

export default { mount };
