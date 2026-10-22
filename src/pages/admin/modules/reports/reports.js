// src/pages/admin/modules/reports/reports.js
import {
  listReportsPage,
  getReportDetail,
  resolveReport,
} from '@services/admin/reports.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';
import { formatAdminDate, truncateAdminText, escapeAdminHtml } from '../../admin.utils.js';
import { buildAdminEmptyState, buildModuleLoading } from '../../admin.templates.js';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All statuses' },
];

const DIRECTION_OPTIONS = [
  { value: 'desc', label: 'Newest first' },
  { value: 'asc', label: 'Oldest first' },
];

const EMPTY_STATES = {
  pending: {
    title: 'No pending reports',
    body: 'Every reader report has been triaged. No action is required.',
  },
  resolved: {
    title: 'No resolved reports',
    body: 'No reports have been marked resolved.',
  },
  dismissed: {
    title: 'No dismissed reports',
    body: 'No reports have been dismissed.',
  },
  all: {
    title: 'No reports',
    body: 'No reader reports have been filed.',
  },
};

/**
 * @param {string} value
 * @returns {string}
 */
function statusBadge(value) {
  const status = String(value ?? '').toLowerCase();
  const tone = ['pending', 'resolved', 'dismissed'].includes(status) ? status : 'pending';
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
          <p class="admin-detail-field__value">Loading report detail...</p>
        </div>
      `;
    }

    if (!detail) return '';

    const pending = detail.status === 'pending';
    const target = detail.targetSummary;

    return `
      <section class="admin-detail-panel" aria-labelledby="report-detail-title">
        <div class="admin-detail-panel__header">
          <div>
            <h3 id="report-detail-title" class="admin-detail-panel__title">Report ${escapeAdminHtml(
              detail.id
            )}</h3>
            <p class="admin-detail-panel__subtitle">
              ${escapeAdminHtml(detail.targetType || 'unknown target')} /
              ${escapeAdminHtml(detail.targetId || 'unknown id')}
            </p>
          </div>
          ${statusBadge(detail.status)}
        </div>
        <div class="admin-detail-grid">
          ${detailField('Reporter', detail.reporterId)}
          ${detailField('Target type', detail.targetType)}
          ${detailField('Target ID', detail.targetId)}
          ${detailField('Filed', formatAdminDate(detail.createdAt))}
          ${detailField('Reviewed by', detail.reviewedBy || 'Not decided')}
          ${detailField(
            'Reviewed at',
            detail.reviewedAt ? formatAdminDate(detail.reviewedAt) : 'Not decided'
          )}
          ${detailField('Reason', detail.reason, true)}
          ${detailField(
            'Target summary',
            target
              ? [target.label, target.detail].filter(Boolean).join(' / ')
              : 'Target unavailable or already removed',
            true
          )}
          ${detail.resolutionNotes ? detailField('Resolution notes', detail.resolutionNotes, true) : ''}
        </div>
        ${
          pending
            ? `
              <label class="admin-field admin-field--grow" for="report-resolution-notes">
                <span class="admin-field__label">Resolution notes (optional)</span>
                <textarea
                  class="admin-textarea"
                  id="report-resolution-notes"
                  data-role="resolution-notes"
                  maxlength="1000"
                  placeholder="Context for this decision, kept on the report record."
                ></textarea>
              </label>
              <div class="admin-actions">
                <button
                  type="button"
                  class="admin-btn admin-btn--sm admin-btn--secondary"
                  data-action="decide"
                  data-id="${escapeAdminHtml(detail.id)}"
                  data-resolution="resolved"
                  ${deciding ? 'disabled' : ''}
                >
                  ${deciding ? 'Processing...' : 'Resolve report'}
                </button>
                <button
                  type="button"
                  class="admin-btn admin-btn--sm"
                  data-action="decide"
                  data-id="${escapeAdminHtml(detail.id)}"
                  data-resolution="dismissed"
                  ${deciding ? 'disabled' : ''}
                >
                  Dismiss report
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
                Resolving or dismissing records a decision on this report. The reporter is not
                notified by this action.
              </p>
            `
            : `
              <div class="admin-actions">
                <button type="button" class="admin-btn admin-btn--sm" data-action="close-detail">
                  Close
                </button>
              </div>
              <p class="admin-readonly-note">
                This report has already been ${escapeAdminHtml(detail.status)} and cannot be
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
        (report) => `
          <tr>
            <td class="admin-table__cell--left">${escapeAdminHtml(
              report.targetType || 'unknown'
            )}</td>
            <td class="admin-table__cell--left font-mono">${escapeAdminHtml(
              truncateAdminText(report.targetId, 32)
            )}</td>
            <td class="admin-table__cell--left font-mono">${escapeAdminHtml(
              truncateAdminText(report.reporterId, 28)
            )}</td>
            <td class="admin-table__cell--wide">${escapeAdminHtml(
              truncateAdminText(report.reason, 100)
            )}</td>
            <td>${escapeAdminHtml(formatAdminDate(report.createdAt))}</td>
            <td>${statusBadge(report.status)}</td>
            <td class="admin-table__cell--right">
              <div class="admin-table__actions">
                <button
                  type="button"
                  class="admin-btn admin-btn--sm"
                  data-action="view"
                  data-id="${escapeAdminHtml(report.id)}"
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
              <th class="admin-table__cell--left">Target</th>
              <th class="admin-table__cell--left">Target ID</th>
              <th class="admin-table__cell--left">Reporter</th>
              <th class="admin-table__cell--wide">Reason</th>
              <th>Filed</th>
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
      container.innerHTML = buildModuleLoading('reports');
      return;
    }

    const empty = EMPTY_STATES[status] ?? EMPTY_STATES.pending;
    const body = error
      ? `
        <div class="admin-error" role="alert">
          <p>Reports could not be loaded. ${escapeAdminHtml(error.message)}</p>
          <div class="admin-error__actions">
            <button type="button" class="admin-btn" data-action="retry">Try again</button>
          </div>
        </div>
      `
      : items.length === 0
        ? buildAdminEmptyState({ ...empty, icon: 'flag' })
        : renderTable();

    container.innerHTML = `
      <section aria-labelledby="reports-title">
        <h2 id="reports-title" class="admin-section-title">Reports</h2>
        <p class="admin-note">
          Triage reader reports. Decisions are recorded in the audit trail; this screen does not
          send a notification.
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
      const result = await listReportsPage({ status, direction });
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
      console.error('[reports] failed to load reports', err);
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
      const result = await listReportsPage({ status, direction, cursor: lastDoc });
      if (disposed || token !== loadVersion) return;
      items = [...items, ...(result.items ?? [])];
      lastDoc = result.lastDoc ?? null;
      hasMore = Boolean(result.hasMore);
    } catch (err) {
      if (disposed || token !== loadVersion) return;
      console.error('[reports] failed to load more reports', err);
      showToast({ type: 'error', message: 'Could not load more reports.' });
    } finally {
      if (!disposed && token === loadVersion) {
        loadingMore = false;
        render();
      }
    }
  }

  async function openDetail(reportId) {
    if (disposed || !reportId) return;
    selectedId = reportId;
    detail = null;
    detailLoading = true;
    render();

    try {
      const result = await getReportDetail(reportId);
      if (disposed || selectedId !== reportId) return;
      if (!result) {
        selectedId = null;
        detailLoading = false;
        showToast({ type: 'error', message: 'That report no longer exists.' });
        render();
        return;
      }
      detail = result;
    } catch (err) {
      if (disposed || selectedId !== reportId) return;
      selectedId = null;
      console.error('[reports] failed to load report detail', err);
      showToast({ type: 'error', message: 'Could not load the report detail.' });
    } finally {
      if (!disposed && selectedId === reportId) {
        detailLoading = false;
        render();
      }
    }
  }

  async function handleDecision(reportId, resolution) {
    if (disposed || deciding) return;
    if (!reportId || !detail || detail.id !== reportId) return;
    if (resolution !== 'resolved' && resolution !== 'dismissed') return;

    const notesField = container.querySelector('[data-role="resolution-notes"]');
    const notes = notesField instanceof HTMLTextAreaElement ? notesField.value : '';
    const resolved = resolution === 'resolved';

    const confirmed = await showConfirmModal({
      title: resolved ? 'Resolve this report?' : 'Dismiss this report?',
      message: resolved
        ? 'Mark this report as <strong>resolved</strong>? The decision is recorded against your staff account and cannot be changed from this screen.'
        : 'Dismiss this report as <strong>not actionable</strong>? The decision is recorded against your staff account and cannot be changed from this screen.',
      confirmText: resolved ? 'Resolve' : 'Dismiss',
      confirmVariant: resolved ? 'primary' : 'accent',
    });
    if (!confirmed) return;
    if (disposed) return;

    deciding = true;
    render();

    try {
      await resolveReport(reportId, resolution, { notes });
      showToast({
        type: 'success',
        message: resolved ? 'Report resolved.' : 'Report dismissed.',
      });
      selectedId = null;
      detail = null;
      await loadFirstPage();
    } catch (err) {
      console.error('[reports] decision failed', err);
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
      handleDecision(target.getAttribute('data-id'), target.getAttribute('data-resolution'));
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
