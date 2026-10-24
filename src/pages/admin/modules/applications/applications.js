// src/pages/admin/modules/applications/applications.js
import {
  listApplicationsPage,
  getApplication,
  decideApplication,
  APPLICATION_NOTES_MAX,
} from '@services/admin/applications.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';
import {
  formatAdminDate,
  truncateAdminText,
  escapeAdminHtml,
  captureAdminSearchFocus,
  restoreAdminSearchFocus,
} from '../../admin.utils.js';
import { buildAdminEmptyState, buildModuleLoading } from '../../admin.templates.js';

const SEARCH_DEBOUNCE_MS = 300;

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
    title: 'No pending applications',
    body: 'No reader is currently waiting for an author application decision.',
  },
  approved: {
    title: 'No approved applications',
    body: 'No author applications have been approved.',
  },
  rejected: {
    title: 'No rejected applications',
    body: 'No author applications have been rejected.',
  },
  all: {
    title: 'No author applications',
    body: 'No reader has applied to become a chronicler.',
  },
};

/**
 * Only https links are offered as clickable samples. Anything else is shown as
 * plain text so a javascript: or data: URL can never become an href.
 *
 * @param {unknown} value
 * @returns {string}
 */
function safeHttpsUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

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
export function mount({ container, access }) {
  const canDecide = access?.isAdmin === true || access?.role === 'admin';

  let items = [];
  let lastDoc = null;
  let hasMore = false;
  let status = 'pending';
  let direction = 'desc';
  let searchTerm = '';
  let searchTimer = null;
  let pendingSearchFocus = null;
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
        <label class="admin-field admin-field--grow">
          <span class="admin-field__label">Search</span>
          <input
            class="admin-input"
            type="search"
            data-role="search"
            value="${escapeAdminHtml(searchTerm)}"
            placeholder="Search by pen name prefix"
            autocomplete="off"
          />
        </label>
        <label class="admin-field">
          <span class="admin-field__label">Status</span>
          <select class="admin-select" data-filter="status">
            ${renderOptions(STATUS_OPTIONS, status)}
          </select>
        </label>
        <label class="admin-field">
          <span class="admin-field__label">Sort</span>
          <select
            class="admin-select"
            data-filter="direction"
            ${searchTerm ? 'disabled title="Prefix search sorts alphabetically"' : ''}
          >
            ${renderOptions(DIRECTION_OPTIONS, direction)}
          </select>
        </label>
      </div>
    `;
  }

  function renderSampleLink(sampleUrl) {
    const safeUrl = safeHttpsUrl(sampleUrl);
    if (!safeUrl) {
      return '<p class="admin-detail-field__value">No valid https sample link provided.</p>';
    }
    return `
      <p class="admin-detail-field__value">
        <a href="${escapeAdminHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">
          ${escapeAdminHtml(safeUrl)}
        </a>
      </p>
    `;
  }

  function renderDetail() {
    if (!selectedId) return '';

    if (detailLoading) {
      return `
        <div class="admin-detail-panel" role="status" aria-live="polite">
          <p class="admin-detail-field__value">Loading application detail...</p>
        </div>
      `;
    }

    if (!detail) return '';

    const pending = detail.status === 'pending';
    const canAct = pending && canDecide;
    const sampleUrl = safeHttpsUrl(detail.sampleUrl);

    return `
      <section class="admin-detail-panel" aria-labelledby="application-detail-title">
        <div class="admin-detail-panel__header">
          <div>
            <h3 id="application-detail-title" class="admin-detail-panel__title">
              ${escapeAdminHtml(detail.penName || 'Unnamed applicant')}
            </h3>
            <p class="admin-detail-panel__subtitle">
              Application ${escapeAdminHtml(detail.id)}
            </p>
          </div>
          ${statusBadge(detail.status)}
        </div>
        <div class="admin-detail-grid">
          ${detailField('Applicant ID', detail.applicantId)}
          ${detailField('Pen name', detail.penName)}
          ${detailField('Applied', formatAdminDate(detail.createdAt))}
          ${detailField('Reviewed by', detail.reviewedBy || 'Not decided')}
          ${detailField(
            'Reviewed at',
            detail.reviewedAt ? formatAdminDate(detail.reviewedAt) : 'Not decided'
          )}
          ${detailField('Bio', detail.bio, true)}
          ${
            detail.notes || detail.adminNotes
              ? detailField('Reviewer notes', detail.notes || detail.adminNotes, true)
              : ''
          }
          <div class="admin-detail-field admin-detail-field--wide">
            <p class="admin-detail-field__label">Sample work</p>
            ${renderSampleLink(sampleUrl)}
          </div>
        </div>
        ${
          canAct
            ? `
              <label class="admin-field admin-field--grow" for="application-review-notes">
                <span class="admin-field__label">Reviewer notes (optional)</span>
                <textarea
                  class="admin-textarea"
                  id="application-review-notes"
                  data-role="application-notes"
                  maxlength="${APPLICATION_NOTES_MAX}"
                  placeholder="Up to ${APPLICATION_NOTES_MAX} characters, stored on the application."
                ></textarea>
              </label>
              <div class="admin-actions">
                <button
                  type="button"
                  class="admin-btn admin-btn--sm admin-btn--secondary"
                  data-action="decide"
                  data-id="${escapeAdminHtml(detail.id)}"
                  data-decision="approved"
                  ${deciding ? 'disabled' : ''}
                >
                  ${deciding ? 'Processing...' : 'Approve application'}
                </button>
                <button
                  type="button"
                  class="admin-btn admin-btn--sm admin-btn--danger"
                  data-action="decide"
                  data-id="${escapeAdminHtml(detail.id)}"
                  data-decision="rejected"
                  ${deciding ? 'disabled' : ''}
                >
                  Reject application
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
            `
            : `
              <div class="admin-actions">
                <button type="button" class="admin-btn admin-btn--sm" data-action="close-detail">
                  Close
                </button>
              </div>
              ${
                pending
                  ? `
                    <p class="admin-readonly-note">
                      Only administrators can approve or reject author applications. This queue is
                      read-only for moderators.
                    </p>
                  `
                  : `
                    <p class="admin-readonly-note">
                      This application has already been ${escapeAdminHtml(
                        detail.status
                      )} and cannot be decided again.
                    </p>
                  `
              }
            `
        }
      </section>
    `;
  }

  function renderTable() {
    const rows = items
      .map((application) => {
        const sampleUrl = safeHttpsUrl(application.sampleUrl);
        return `
          <tr>
            <td class="admin-table__cell--left font-medium">${escapeAdminHtml(
              truncateAdminText(application.penName || 'Unnamed applicant', 40)
            )}</td>
            <td class="admin-table__cell--wide">${escapeAdminHtml(
              truncateAdminText(application.bio, 100)
            )}</td>
            <td>${escapeAdminHtml(formatAdminDate(application.createdAt))}</td>
            <td>${statusBadge(application.status)}</td>
            <td class="admin-table__cell--right">
              <div class="admin-table__actions">
                <button
                  type="button"
                  class="admin-btn admin-btn--sm"
                  data-action="view"
                  data-id="${escapeAdminHtml(application.id)}"
                >
                  Review
                </button>
                ${
                  sampleUrl
                    ? `
                      <a
                        class="admin-btn admin-btn--sm"
                        href="${escapeAdminHtml(sampleUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Sample
                      </a>
                    `
                    : ''
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="admin-table__cell--left">Pen name</th>
              <th class="admin-table__cell--wide">Bio</th>
              <th>Applied</th>
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
    pendingSearchFocus = captureAdminSearchFocus(container, pendingSearchFocus);
    if (loading) {
      container.innerHTML = buildModuleLoading('author applications');
      return;
    }

    const empty = searchTerm
      ? {
          title: 'No applications match that search',
          body: 'Try a different pen name prefix, or clear the search to see the queue.',
        }
      : (EMPTY_STATES[status] ?? EMPTY_STATES.pending);
    const body = error
      ? `
        <div class="admin-error" role="alert">
          <p>Author applications could not be loaded. ${escapeAdminHtml(error.message)}</p>
          <div class="admin-error__actions">
            <button type="button" class="admin-btn" data-action="retry">Try again</button>
          </div>
        </div>
      `
      : items.length === 0
        ? buildAdminEmptyState({ ...empty, icon: 'file-text' })
        : renderTable();

    container.innerHTML = `
      <section aria-labelledby="applications-title">
        <h2 id="applications-title" class="admin-section-title">Author Applications</h2>
        <p class="admin-note">
          Review the applicant's bio and sample work before deciding. Decisions are final and are
          recorded in the audit trail.
        </p>
        ${
          canDecide
            ? ''
            : `
              <p class="admin-readonly-note" role="note">
                Moderators can review author applications but cannot approve or reject them. Only an
                administrator can record a decision.
              </p>
            `
        }
        ${renderToolbar()}
        ${renderDetail()}
        ${body}
      </section>
    `;
    restoreAdminSearchFocus(container, pendingSearchFocus);
    pendingSearchFocus = null;
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
      const result = await listApplicationsPage({ status, search: searchTerm, direction });
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
      console.error('[applications] failed to load applications', err);
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
      const result = await listApplicationsPage({
        status,
        search: searchTerm,
        direction,
        cursor: lastDoc,
      });
      if (disposed || token !== loadVersion) return;
      items = [...items, ...(result.items ?? [])];
      lastDoc = result.lastDoc ?? null;
      hasMore = Boolean(result.hasMore);
    } catch (err) {
      if (disposed || token !== loadVersion) return;
      console.error('[applications] failed to load more applications', err);
      showToast('Could not load more applications.', 'error');
    } finally {
      if (!disposed && token === loadVersion) {
        loadingMore = false;
        render();
      }
    }
  }

  async function openDetail(applicationId) {
    if (disposed || !applicationId) return;
    selectedId = applicationId;
    detail = null;
    detailLoading = true;
    render();

    try {
      const result = await getApplication(applicationId);
      if (disposed || selectedId !== applicationId) return;
      if (!result) {
        selectedId = null;
        detailLoading = false;
        showToast('That application no longer exists.', 'error');
        render();
        return;
      }
      detail = result;
    } catch (err) {
      if (disposed || selectedId !== applicationId) return;
      selectedId = null;
      console.error('[applications] failed to load application detail', err);
      showToast('Could not load the application detail.', 'error');
    } finally {
      if (!disposed && selectedId === applicationId) {
        detailLoading = false;
        render();
      }
    }
  }

  async function handleDecision(applicationId, decision) {
    if (disposed || deciding || !canDecide) return;
    if (!applicationId || !detail || detail.id !== applicationId) return;
    if (decision !== 'approved' && decision !== 'rejected') return;

    const notesField = container.querySelector('[data-role="application-notes"]');
    const notes = notesField instanceof HTMLTextAreaElement ? notesField.value : '';
    if (notes.trim().length > APPLICATION_NOTES_MAX) {
      showToast(`Reviewer notes must be ${APPLICATION_NOTES_MAX} characters or fewer.`, 'error');
      notesField?.focus();
      return;
    }

    const approved = decision === 'approved';
    const penName = detail.penName || 'this applicant';

    const confirmed = await showConfirmModal({
      title: approved ? 'Approve this application?' : 'Reject this application?',
      message: approved
        ? `Approve <strong>${escapeAdminHtml(
            penName
          )}</strong> as an author? This grants the author workspace on their profile and records the decision against your staff account. It cannot be changed from this screen.`
        : `Reject <strong>${escapeAdminHtml(
            penName
          )}</strong>'s application? The decision is recorded against your staff account and cannot be changed from this screen.`,
      confirmText: approved ? 'Approve application' : 'Reject application',
      confirmVariant: approved ? 'primary' : 'danger',
    });
    if (!confirmed) return;
    if (disposed) return;

    deciding = true;
    render();

    try {
      const result = await decideApplication(applicationId, decision, notes);
      const approvalMessage = result.authorRoleGranted
        ? 'Author application approved. Author workspace access granted.'
        : 'Author application approved. The applicant profile was missing or already held a staff role, so its role was left unchanged.';
      showToast(approved ? approvalMessage : 'Author application rejected.', 'success');
      selectedId = null;
      detail = null;
      await loadFirstPage();
    } catch (err) {
      console.error('[applications] decision failed', err);
      showToast(
        err instanceof Error && err.message ? err.message : 'The decision was not saved.',
        'error'
      );
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

  function handleInput(event) {
    const field =
      event.target instanceof Element ? event.target.closest('[data-role="search"]') : null;
    if (!(field instanceof HTMLInputElement)) return;

    searchTerm = field.value.trim();
    if (searchTimer) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      searchTimer = null;
      if (!disposed) loadFirstPage();
    }, SEARCH_DEBOUNCE_MS);
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
  container.addEventListener('input', handleInput);
  loadFirstPage();

  return () => {
    disposed = true;
    loadVersion += 1;
    if (searchTimer) {
      window.clearTimeout(searchTimer);
      searchTimer = null;
    }
    container.removeEventListener('click', handleClick);
    container.removeEventListener('change', handleChange);
    container.removeEventListener('input', handleInput);
  };
}

export default { mount };
