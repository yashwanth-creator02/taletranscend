// src/pages/admin/modules/deletions/deletions.js
import {
  listDeletionRequestsPage,
  getDeletionRequestDetail,
  decideDeletionRequest,
} from '@services/admin/deletion.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';
import { formatAdminDate, truncateAdminText, escapeAdminHtml } from '../../admin.utils.js';
import { buildAdminEmptyState, buildModuleLoading } from '../../admin.templates.js';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All statuses' },
];

const DIRECTION_OPTIONS = [
  { value: 'desc', label: 'Newest first' },
  { value: 'asc', label: 'Oldest first' },
];

const EMPTY_STATES = {
  pending: {
    title: 'No pending deletion requests',
    body: 'There are no tale deletion petitions awaiting a decision.',
  },
  approved: {
    title: 'No approved deletion requests',
    body: 'No petitions have been approved under the current archive record.',
  },
  rejected: {
    title: 'No rejected deletion requests',
    body: 'No petitions have been declined under the current archive record.',
  },
  all: {
    title: 'No deletion requests',
    body: 'No tale deletion petitions have been filed.',
  },
};

/**
 * @param {string} value
 * @returns {string}
 */
function statusBadge(value) {
  const status = String(value ?? '').toLowerCase();
  const tone = ['pending', 'approved', 'rejected'].includes(status) ? status : 'pending';
  return `<span class="admin-badge admin-badge--${tone}">${escapeAdminHtml(status || 'unknown')}</span>`;
}

/**
 * @param {Array<{value: string, label: string}>} options
 * @param {string} selected
 * @returns {string}
 */
function renderOptions(options, selected) {
  return options
    .map(
      (option) =>
        `<option value="${option.value}"${option.value === selected ? ' selected' : ''}>${option.label}</option>`
    )
    .join('');
}

/**
 * @param {string} label
 * @param {unknown} value
 * @param {boolean} [wide=false]
 * @returns {string}
 */
function detailField(label, value, wide = false) {
  return `
    <div class="admin-detail-field${wide ? ' admin-detail-field--wide' : ''}">
      <p class="admin-detail-field__label">${escapeAdminHtml(label)}</p>
      <p class="admin-detail-field__value">${escapeAdminHtml(value || '\u2014')}</p>
    </div>
  `;
}

/**
 * @param {{ container: HTMLElement, access: import('../../admin.state.js').AdminAccess }} opts
 * @returns {() => void}
 */
export function mount({ container }) {
  let items = [];
  let lastDoc = null;
  let hasMore = false;
  let status = 'pending';
  let direction = 'desc';
  let loading = false;
  let loadingMore = false;
  let deciding = false;
  let error = null;
  let selectedId = null;
  let detail = null;
  let detailLoading = false;
  let loadVersion = 0;
  let disposed = false;

  function renderToolbar() {
    return `
      <div class="admin-toolbar">
        <label class="admin-field">
          <span class="admin-field__label">Status</span>
          <select class="admin-select" data-filter="status">
            ${renderOptions(STATUS_OPTIONS, status)}
          </select>
        </label>
        <label class="admin-field">
          <span class="admin-field__label">Sort</span>
          <select class="admin-select" data-filter="direction">
            ${renderOptions(DIRECTION_OPTIONS, direction)}
          </select>
        </label>
      </div>
    `;
  }

  function renderDetail() {
    if (!selectedId) return '';

    if (detailLoading) {
      return `
        <div class="admin-detail-panel" role="status" aria-live="polite">
          <p class="admin-detail-field__value">Loading request detail...</p>
        </div>
      `;
    }

    if (!detail) return '';

    const tale = detail.tale;
    const title = tale?.title || 'Untitled tale';
    const pending = detail.status === 'pending';

    return `
      <section class="admin-detail-panel" aria-labelledby="deletion-detail-title">
        <div class="admin-detail-panel__header">
          <div>
            <h3 id="deletion-detail-title" class="admin-detail-panel__title">${escapeAdminHtml(
              title
            )}</h3>
            <p class="admin-detail-panel__subtitle">Request ${escapeAdminHtml(detail.id)}</p>
          </div>
          ${statusBadge(detail.status)}
        </div>
        <div class="admin-detail-grid">
          ${detailField('Tale ID', detail.taleId)}
          ${detailField('Tale author', tale?.authorName || tale?.authorId || 'Unknown')}
          ${detailField('Requested by', detail.userId)}
          ${detailField('Submitted', formatAdminDate(detail.createdAt))}
          ${detailField('Reviewed by', detail.reviewedBy || 'Not decided')}
          ${detailField(
            'Reviewed at',
            detail.reviewedAt ? formatAdminDate(detail.reviewedAt) : 'Not decided'
          )}
          ${detailField('Reason', detail.reason, true)}
          ${detail.adminNotes ? detailField('Reviewer notes', detail.adminNotes, true) : ''}
        </div>
        ${
          pending
            ? `
              <label class="admin-field admin-field--grow" for="deletion-review-notes">
                <span class="admin-field__label">Reviewer notes (optional)</span>
                <textarea
                  class="admin-textarea"
                  id="deletion-review-notes"
                  data-role="deletion-notes"
                  maxlength="1000"
                  placeholder="Context for this decision, kept on the request record."
                ></textarea>
              </label>
              <div class="admin-actions">
                <button
                  type="button"
                  class="admin-btn admin-btn--sm admin-btn--danger"
                  data-action="decide"
                  data-id="${escapeAdminHtml(detail.id)}"
                  data-decision="approved"
                  ${deciding ? 'disabled' : ''}
                >
                  ${deciding ? 'Processing...' : 'Approve and delete tale'}
                </button>
                <button
                  type="button"
                  class="admin-btn admin-btn--sm admin-btn--secondary"
                  data-action="decide"
                  data-id="${escapeAdminHtml(detail.id)}"
                  data-decision="rejected"
                  ${deciding ? 'disabled' : ''}
                >
                  Reject request
                </button>
                <button
                  type="button"
                  class="admin-btn admin-btn--sm"
                  data-action="close-detail"
                  ${deciding ? 'disabled' : ''}
                >
                  Close
                </button>
              </div>
              <p class="admin-readonly-note">
                Approval deletes the public tale record. It cannot be undone from this dashboard.
                Chapter and comment subcollections may remain until server-side cleanup.
              </p>
            `
            : `
              <div class="admin-actions">
                <button type="button" class="admin-btn admin-btn--sm" data-action="close-detail">
                  Close
                </button>
              </div>
              <p class="admin-readonly-note">
                This request has already been ${escapeAdminHtml(detail.status)} and cannot be
                decided again.
              </p>
            `
        }
      </section>
    `;
  }

  function renderTable() {
    const rows = items
      .map(
        (request) => `
          <tr>
            <td class="admin-table__cell--left font-mono">${escapeAdminHtml(
              truncateAdminText(request.taleId, 32)
            )}</td>
            <td class="admin-table__cell--left font-mono">${escapeAdminHtml(
              truncateAdminText(request.userId, 28)
            )}</td>
            <td class="admin-table__cell--wide">${escapeAdminHtml(
              truncateAdminText(request.reason, 100)
            )}</td>
            <td>${escapeAdminHtml(formatAdminDate(request.createdAt))}</td>
            <td>${statusBadge(request.status)}</td>
            <td class="admin-table__cell--right">
              <div class="admin-table__actions">
                <button
                  type="button"
                  class="admin-btn admin-btn--sm"
                  data-action="view"
                  data-id="${escapeAdminHtml(request.id)}"
                >
                  Review
                </button>
              </div>
            </td>
          </tr>
        `
      )
      .join('');

    return `
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="admin-table__cell--left">Tale ID</th>
              <th class="admin-table__cell--left">Requested by</th>
              <th class="admin-table__cell--wide">Reason</th>
              <th>Submitted</th>
              <th>Status</th>
              <th class="admin-table__cell--right">Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${
        hasMore
          ? `
            <div class="admin-pagination-bar">
              <button
                type="button"
                class="admin-btn admin-btn--secondary"
                data-action="load-more"
                ${loadingMore ? 'disabled' : ''}
              >
                ${loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          `
          : ''
      }
    `;
  }

  function render() {
    if (loading) {
      container.innerHTML = buildModuleLoading('deletion requests');
      return;
    }

    const empty = EMPTY_STATES[status] ?? EMPTY_STATES.pending;
    const body = error
      ? `
        <div class="admin-error" role="alert">
          <p>Deletion requests could not be loaded. ${escapeAdminHtml(error.message)}</p>
          <div class="admin-error__actions">
            <button type="button" class="admin-btn" data-action="retry">Try again</button>
          </div>
        </div>
      `
      : items.length === 0
        ? buildAdminEmptyState({ ...empty, icon: 'book-x' })
        : renderTable();

    container.innerHTML = `
      <section aria-labelledby="deletions-title">
        <h2 id="deletions-title" class="admin-section-title">Tale Deletion Requests</h2>
        <p class="admin-note">
          Review the petition before deciding. Approval removes the public tale record from the
          archive; rejection keeps it in place.
        </p>
        ${renderToolbar()}
        ${renderDetail()}
        ${body}
      </section>
    `;
  }

  async function loadFirstPage() {
    if (disposed) return;
    const token = ++loadVersion;
    loading = true;
    loadingMore = false;
    error = null;
    selectedId = null;
    detail = null;
    detailLoading = false;
    render();

    try {
      const result = await listDeletionRequestsPage({ status, direction });
      if (disposed || token !== loadVersion) return;
      items = result.items ?? [];
      lastDoc = result.lastDoc ?? null;
      hasMore = Boolean(result.hasMore);
    } catch (err) {
      if (disposed || token !== loadVersion) return;
      items = [];
      lastDoc = null;
      hasMore = false;
      error = err instanceof Error ? err : new Error('Unknown error');
      console.error('[deletion] failed to load requests', err);
    } finally {
      if (!disposed && token === loadVersion) {
        loading = false;
        render();
      }
    }
  }

  async function loadMore() {
    if (disposed || loading || loadingMore || !hasMore || !lastDoc) return;
    const token = loadVersion;
    loadingMore = true;
    render();

    try {
      const result = await listDeletionRequestsPage({ status, direction, cursor: lastDoc });
      if (disposed || token !== loadVersion) return;
      items = [...items, ...(result.items ?? [])];
      lastDoc = result.lastDoc ?? null;
      hasMore = Boolean(result.hasMore);
    } catch (err) {
      if (disposed || token !== loadVersion) return;
      console.error('[deletion] failed to load more requests', err);
      showToast({ type: 'error', message: 'Could not load more deletion requests.' });
    } finally {
      if (!disposed && token === loadVersion) {
        loadingMore = false;
        render();
      }
    }
  }

  async function openDetail(requestId) {
    if (disposed || !requestId) return;
    selectedId = requestId;
    detail = null;
    detailLoading = true;
    render();

    try {
      const result = await getDeletionRequestDetail(requestId);
      if (disposed || selectedId !== requestId) return;
      if (!result) {
        selectedId = null;
        detailLoading = false;
        showToast({ type: 'error', message: 'That deletion request no longer exists.' });
        render();
        return;
      }
      detail = result;
    } catch (err) {
      if (disposed || selectedId !== requestId) return;
      selectedId = null;
      console.error('[deletion] failed to load request detail', err);
      showToast({ type: 'error', message: 'Could not load the request detail.' });
    } finally {
      if (!disposed && selectedId === requestId) {
        detailLoading = false;
        render();
      }
    }
  }

  async function handleDecision(requestId, decision) {
    if (disposed || deciding) return;
    if (!requestId || !detail || detail.id !== requestId) return;
    if (decision !== 'approved' && decision !== 'rejected') return;

    const notesField = container.querySelector('[data-role="deletion-notes"]');
    const notes = notesField instanceof HTMLTextAreaElement ? notesField.value : '';
    const title = detail.tale?.title || detail.taleId || 'this tale';
    const approved = decision === 'approved';

    const confirmed = await showConfirmModal({
      title: approved ? 'Permanently delete this tale record?' : 'Reject this deletion request?',
      message: approved
        ? `Approving this request will <strong>permanently delete the public tale record</strong> for <strong>${escapeAdminHtml(
            title
          )}</strong>. The record cannot be restored from this dashboard. This action is irreversible.`
        : `Reject this request and keep <strong>${escapeAdminHtml(
            title
          )}</strong> in the archive? The author will be notified of the decision.`,
      confirmText: approved ? 'Delete tale record permanently' : 'Reject request',
      confirmVariant: approved ? 'danger' : 'primary',
    });
    if (!confirmed) return;
    if (disposed) return;

    deciding = true;
    render();

    try {
      await decideDeletionRequest(requestId, decision, { notes });
      showToast({
        type: 'success',
        message: approved
          ? 'Deletion request approved. The public tale record was permanently deleted.'
          : 'Deletion request rejected. The tale was kept.',
      });
      selectedId = null;
      detail = null;
      await loadFirstPage();
    } catch (err) {
      console.error('[deletion] decision failed', err);
      showToast({
        type: 'error',
        message: err instanceof Error && err.message ? err.message : 'The decision was not saved.',
      });
      if (!disposed) render();
    } finally {
      deciding = false;
      if (!disposed && !loading) render();
    }
  }

  function handleClick(event) {
    const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (!target || !container.contains(target)) return;

    const action = target.getAttribute('data-action');
    if (action === 'retry') {
      loadFirstPage();
      return;
    }
    if (action === 'load-more') {
      loadMore();
      return;
    }
    if (action === 'view') {
      openDetail(target.getAttribute('data-id'));
      return;
    }
    if (action === 'close-detail') {
      selectedId = null;
      detail = null;
      render();
      return;
    }
    if (action === 'decide') {
      handleDecision(target.getAttribute('data-id'), target.getAttribute('data-decision'));
    }
  }

  function handleChange(event) {
    const field = event.target instanceof Element ? event.target.closest('[data-filter]') : null;
    if (!field) return;

    const filter = field.getAttribute('data-filter');
    const value = field.value;
    if (filter === 'status') {
      status = STATUS_OPTIONS.some((option) => option.value === value) ? value : 'pending';
    } else if (filter === 'direction') {
      direction = value === 'asc' ? 'asc' : 'desc';
    } else {
      return;
    }
    loadFirstPage();
  }

  container.addEventListener('click', handleClick);
  container.addEventListener('change', handleChange);
  loadFirstPage();

  return () => {
    disposed = true;
    loadVersion += 1;
    container.removeEventListener('click', handleClick);
    container.removeEventListener('change', handleChange);
  };
}

export default { mount };
