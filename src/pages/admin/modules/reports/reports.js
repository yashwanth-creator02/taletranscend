// src/pages/admin/modules/reports/reports.js
// Report triage, user-visible responses, staff-only notes, and direct inbox
// messaging. Reports are staff-readable; responses are mirrored into the
// reporter's history and delivered through the existing notification inbox.

import {
  getReportDetail,
  listReportsPage,
  markReportUnderReview,
  resolveReport,
  respondToReport,
  sendAdminMessage,
} from '@services/admin/reports.service.js';
import { REPORT_CATEGORY_LABELS, REPORT_STATUS_LABELS } from '@services/report.service.js';
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
const RESPONSE_MAX = 5000;
const PRIVATE_NOTE_MAX = 2000;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'responded', label: 'Responded' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Closed' },
  { value: 'all', label: 'All statuses' },
];

const DIRECTION_OPTIONS = [
  { value: 'desc', label: 'Newest first' },
  { value: 'asc', label: 'Oldest first' },
];

const EMPTY_STATES = {
  pending: {
    title: 'No submitted reports',
    body: 'Every reader report has been opened. No action is required.',
  },
  under_review: {
    title: 'No reports under review',
    body: 'No report is currently marked as under review.',
  },
  responded: {
    title: 'No responded reports',
    body: 'No report has received a user-visible response yet.',
  },
  resolved: {
    title: 'No resolved reports',
    body: 'No reports have been marked resolved.',
  },
  dismissed: {
    title: 'No closed reports',
    body: 'No reports have been closed without action.',
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
  const tone =
    status === 'under_review'
      ? 'warning'
      : status === 'responded'
        ? 'published'
        : ['pending', 'resolved', 'dismissed'].includes(status)
          ? status
          : 'pending';
  return `<span class="admin-badge admin-badge--${tone}">${escapeAdminHtml(
    REPORT_STATUS_LABELS[status] ?? (status || 'unknown')
  )}</span>`;
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

/** @param {unknown} value */
function escapeWithBreaks(value) {
  return escapeAdminHtml(value).replace(/\r?\n/g, '<br />');
}

/** @param {Record<string, unknown>} report */
function reportSubject(report) {
  return (
    String(report?.subject ?? '').trim() || String(report?.reason ?? '').trim() || 'Untitled report'
  );
}

/** @param {Record<string, unknown>} report */
function categoryLabel(report) {
  return (
    report?.categoryLabel ||
    REPORT_CATEGORY_LABELS[String(report?.category ?? '').toLowerCase()] ||
    'General'
  );
}

/**
 * @param {{ container: HTMLElement, access: import('../../admin.state.js').AdminAccess }} opts
 * @returns {() => void}
 */
export function mount({ container, access }) {
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
  let composeBusy = false;

  if (!access?.isStaff) {
    container.innerHTML = `
      <section aria-labelledby="reports-denied-title">
        <h2 id="reports-denied-title" class="admin-section-title">Reports</h2>
        <p class="admin-readonly-note">
          Report triage is available to administrators and moderators only.
        </p>
      </section>
    `;
    return () => {};
  }

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
            placeholder="Search by target ID prefix"
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

  function renderResponses(report) {
    const responses = Array.isArray(report.responses) ? report.responses : [];
    if (!responses.length) {
      return '<p class="admin-note">No user-visible response has been sent.</p>';
    }
    return `
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Response</th>
              <th>Status</th>
              <th>Sent</th>
            </tr>
          </thead>
          <tbody>
            ${responses
              .map(
                (response) => `
                  <tr>
                    <td class="admin-table__cell--wide">${escapeWithBreaks(
                      response?.body ?? ''
                    )}</td>
                    <td>${escapeAdminHtml(
                      REPORT_STATUS_LABELS[response?.status] ?? response?.status ?? ''
                    )}</td>
                    <td>${escapeAdminHtml(formatAdminDate(response?.createdAt))}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderResponseForm(report) {
    const canRespond = ['pending', 'under_review', 'responded'].includes(report.status);
    if (!canRespond) return '';

    return `
      <div class="admin-detail-field admin-detail-field--wide">
        <span class="admin-detail-field__label">Send a response</span>
        <div class="admin-detail-field__value">
          <label class="admin-field admin-field--grow" for="report-response-body">
            <span class="admin-field__label">User-visible response</span>
            <textarea
              class="admin-textarea"
              id="report-response-body"
              data-role="response-body"
              maxlength="${RESPONSE_MAX}"
              rows="5"
              placeholder="Explain the outcome or the action taken. This is delivered to the reporter's inbox."
            ></textarea>
          </label>
          <label class="admin-field admin-field--grow" for="report-private-note">
            <span class="admin-field__label">Private staff note (optional)</span>
            <textarea
              class="admin-textarea"
              id="report-private-note"
              data-role="private-note"
              maxlength="${PRIVATE_NOTE_MAX}"
              rows="3"
              placeholder="Internal context. Never shown to the reporter."
            ></textarea>
          </label>
          <label class="admin-checkbox-row" for="report-resolve-after">
            <input type="checkbox" id="report-resolve-after" data-role="resolve-after" />
            <span>Mark this report resolved after sending the response</span>
          </label>
          <div class="admin-actions">
            <button
              type="button"
              class="admin-btn"
              data-action="send-response"
              data-id="${escapeAdminHtml(report.id)}"
              ${deciding ? 'disabled' : ''}
            >
              ${deciding ? 'Sending...' : 'Send response'}
            </button>
            <button
              type="button"
              class="admin-btn admin-btn--sm admin-btn--secondary"
              data-action="close-detail"
              ${deciding ? 'disabled' : ''}
            >
              Close
            </button>
          </div>
        </div>
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
    const canTriage = ['pending', 'under_review', 'responded'].includes(detail.status);
    const target = detail.targetSummary;
    const privateNote = detail.privateNote?.notes || '';
    const description = detail.description || detail.reason || '';

    return `
      <section class="admin-detail-panel" aria-labelledby="report-detail-title">
        <div class="admin-detail-panel__header">
          <div>
            <h3 id="report-detail-title" class="admin-detail-panel__title">${escapeAdminHtml(
              reportSubject(detail)
            )}</h3>
            <p class="admin-detail-panel__subtitle">
              ${escapeAdminHtml(detail.targetType || 'unknown target')} /
              ${escapeAdminHtml(detail.targetId || 'unknown id')} /
              ${escapeAdminHtml(categoryLabel(detail))}
            </p>
          </div>
          ${statusBadge(detail.status)}
        </div>
        <div class="admin-detail-grid">
          ${detailField('Reporter', detail.reporterId)}
          ${detailField('Target type', detail.targetType)}
          ${detailField('Target ID', detail.targetId)}
          ${detailField('Category', categoryLabel(detail))}
          ${detailField('Filed', formatAdminDate(detail.createdAt))}
          ${detailField('Reviewed by', detail.reviewedBy || 'Not opened')}
          ${detailField(
            'Reviewed at',
            detail.reviewedAt ? formatAdminDate(detail.reviewedAt) : 'Not opened'
          )}
          ${detailField(
            'Responded at',
            detail.respondedAt ? formatAdminDate(detail.respondedAt) : 'No response'
          )}
          ${detailField('Subject', reportSubject(detail), true)}
          ${detailField('Description', description, true)}
          ${detailField(
            'Target summary',
            target
              ? [target.label, target.detail].filter(Boolean).join(' / ')
              : 'Target unavailable or already removed',
            true
          )}
          ${detail.resolutionNotes ? detailField('Resolution notes', detail.resolutionNotes, true) : ''}
          ${
            privateNote
              ? `<div class="admin-detail-field admin-detail-field--wide">
                   <span class="admin-detail-field__label">Private staff note</span>
                   <div class="admin-detail-field__value">${escapeWithBreaks(privateNote)}</div>
                 </div>`
              : ''
          }
        </div>

        <div class="admin-detail-field admin-detail-field--wide">
          <span class="admin-detail-field__label">Response history</span>
          <div class="admin-detail-field__value">${renderResponses(detail)}</div>
        </div>

        ${
          canTriage
            ? `
              ${renderResponseForm(detail)}
              ${
                pending
                  ? `<label class="admin-field admin-field--wide">
                       <span class="admin-field__label">Resolution notes (optional)</span>
                       <textarea
                         class="admin-textarea"
                         rows="3"
                         maxlength="2000"
                         data-role="resolution-notes"
                         placeholder="Context for resolving or closing this report. Visible to staff only."
                       ></textarea>
                     </label>`
                  : ''
              }
              <div class="admin-actions">
                ${
                  pending
                    ? `<button
                         type="button"
                         class="admin-btn admin-btn--secondary"
                         data-action="mark-under-review"
                         data-id="${escapeAdminHtml(detail.id)}"
                         ${deciding ? 'disabled' : ''}
                       >
                         Mark under review
                       </button>`
                    : ''
                }
                ${
                  pending
                    ? `
                      <button
                        type="button"
                        class="admin-btn admin-btn--secondary"
                        data-action="decide"
                        data-id="${escapeAdminHtml(detail.id)}"
                        data-resolution="resolved"
                        ${deciding ? 'disabled' : ''}
                      >
                        Resolve without response
                      </button>
                      <button
                        type="button"
                        class="admin-btn admin-btn--sm"
                        data-action="decide"
                        data-id="${escapeAdminHtml(detail.id)}"
                        data-resolution="dismissed"
                        ${deciding ? 'disabled' : ''}
                      >
                        Close without action
                      </button>
                    `
                    : ''
                }
                <button
                  type="button"
                  class="admin-btn admin-btn--sm admin-btn--secondary"
                  data-action="close-detail"
                  ${deciding ? 'disabled' : ''}
                >
                  Close
                </button>
              </div>
              <p class="admin-readonly-note">
                Responses are visible to the reporter in Support &amp; Reports and are also sent to
                their inbox. Private staff notes never leave the dashboard.
              </p>
            `
            : `
              <div class="admin-actions">
                <button type="button" class="admin-btn admin-btn--sm" data-action="close-detail">
                  Close
                </button>
              </div>
              <p class="admin-readonly-note">
                This report is ${escapeAdminHtml(
                  REPORT_STATUS_LABELS[detail.status] ?? detail.status
                )}. Use the direct message form below if the reporter needs a further reply.
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
            <td class="admin-table__cell--wide">
              <div class="admin-table__name">${escapeAdminHtml(
                truncateAdminText(reportSubject(report), 90)
              )}</div>
              <div class="admin-table__sub">${escapeAdminHtml(
                `${report.targetType || 'unknown'} / ${report.targetId || 'unknown id'}`
              )}</div>
            </td>
            <td class="admin-table__cell--left font-mono">${escapeAdminHtml(
              truncateAdminText(report.reporterId, 24)
            )}</td>
            <td>${escapeAdminHtml(categoryLabel(report))}</td>
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
              <th class="admin-table__cell--left">Subject</th>
              <th class="admin-table__cell--left">Reporter</th>
              <th>Category</th>
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

  function renderCompose() {
    return `
      <section class="admin-detail-panel" aria-labelledby="admin-compose-title">
        <div class="admin-detail-panel__header">
          <div>
            <h3 id="admin-compose-title" class="admin-detail-panel__title">Message a reader</h3>
            <p class="admin-detail-panel__subtitle">
              Delivers a direct administrative message to an existing user inbox.
            </p>
          </div>
        </div>
        <div class="admin-detail-grid">
          <div class="admin-detail-field admin-detail-field--wide">
            <label class="admin-field__label" for="admin-message-recipient">Recipient user ID</label>
            <input
              class="admin-input"
              id="admin-message-recipient"
              data-role="message-recipient"
              maxlength="128"
              placeholder="Firebase user ID"
            />
          </div>
          <div class="admin-detail-field admin-detail-field--wide">
            <label class="admin-field__label" for="admin-message-subject">Subject</label>
            <input
              class="admin-input"
              id="admin-message-subject"
              data-role="message-subject"
              maxlength="160"
              placeholder="Short, specific subject"
            />
          </div>
          <div class="admin-detail-field admin-detail-field--wide">
            <label class="admin-field__label" for="admin-message-body">Message</label>
            <textarea
              class="admin-textarea"
              id="admin-message-body"
              data-role="message-body"
              maxlength="5000"
              rows="4"
              placeholder="Message body delivered to the reader inbox."
            ></textarea>
          </div>
        </div>
        <div class="admin-actions">
          <button
            type="button"
            class="admin-btn"
            data-action="send-message"
            ${composeBusy ? 'disabled' : ''}
          >
            ${composeBusy ? 'Sending...' : 'Send message'}
          </button>
        </div>
        <p class="admin-readonly-note">
          Direct messages appear in the reader's existing notifications inbox. They are not posted
          publicly and do not change report status.
        </p>
      </section>
    `;
  }

  function render() {
    pendingSearchFocus = captureAdminSearchFocus(container, pendingSearchFocus);
    if (loading) {
      container.innerHTML = buildModuleLoading('reports');
      return;
    }

    const empty = searchTerm
      ? {
          title: 'No reports match that search',
          body: 'Try a different target ID prefix, or clear the search to see the queue.',
        }
      : (EMPTY_STATES[status] ?? EMPTY_STATES.pending);
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
          Triage reader reports, record private notes, and send user-visible responses. Responses
          are mirrored into the reporter's Support &amp; Reports history and delivered to their inbox.
        </p>
        ${renderToolbar()}
        ${renderDetail()}
        ${body}
        ${renderCompose()}
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
      const result = await listReportsPage({ status, search: searchTerm, direction });
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
      const result = await listReportsPage({
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
      console.error('[reports] failed to load more reports', err);
      showToast('Could not load more reports.', 'error');
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
        showToast('That report no longer exists.', 'error');
        render();
        return;
      }
      detail = result;
    } catch (err) {
      if (disposed || selectedId !== reportId) return;
      selectedId = null;
      console.error('[reports] failed to load report detail', err);
      showToast('Could not load the report detail.', 'error');
    } finally {
      if (!disposed && selectedId === reportId) {
        detailLoading = false;
        render();
      }
    }
  }

  async function refreshDetail(reportId) {
    try {
      const result = await getReportDetail(reportId);
      if (!disposed && selectedId === reportId && result) {
        detail = result;
      }
    } catch (err) {
      console.error('[reports] failed to refresh report detail', err);
    }
  }

  async function handleMarkUnderReview(reportId) {
    if (disposed || deciding || !reportId) return;
    deciding = true;
    render();
    try {
      await markReportUnderReview(reportId);
      showToast('Report marked under review.', 'success');
      await refreshDetail(reportId);
      if (!disposed) {
        items = items.map((item) =>
          item.id === reportId ? { ...item, status: 'under_review' } : item
        );
      }
    } catch (err) {
      console.error('[reports] failed to mark report under review', err);
      showToast(
        err instanceof Error && err.message ? err.message : 'The report was not updated.',
        'error'
      );
    } finally {
      deciding = false;
      if (!disposed) render();
    }
  }

  async function handleSendResponse(reportId) {
    if (disposed || deciding || !reportId || !detail || detail.id !== reportId) return;
    const responseField = container.querySelector('[data-role="response-body"]');
    const noteField = container.querySelector('[data-role="private-note"]');
    const resolveField = container.querySelector('[data-role="resolve-after"]');
    const response = responseField instanceof HTMLTextAreaElement ? responseField.value.trim() : '';
    const privateNote = noteField instanceof HTMLTextAreaElement ? noteField.value.trim() : '';
    const resolveAfter = resolveField instanceof HTMLInputElement && resolveField.checked;
    if (!response) {
      showToast('Write a response before sending.', 'error');
      return;
    }

    deciding = true;
    render();
    try {
      await respondToReport(reportId, {
        response,
        privateNote,
        status: resolveAfter ? 'resolved' : 'responded',
      });
      showToast('Response delivered to the reporter inbox.', 'success');
      await refreshDetail(reportId);
      if (!disposed) {
        items = items.map((item) =>
          item.id === reportId ? { ...item, status: resolveAfter ? 'resolved' : 'responded' } : item
        );
      }
    } catch (err) {
      console.error('[reports] failed to send response', err);
      showToast(
        err instanceof Error && err.message ? err.message : 'The response was not sent.',
        'error'
      );
    } finally {
      deciding = false;
      if (!disposed) render();
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
      title: resolved ? 'Resolve this report?' : 'Close this report?',
      message: resolved
        ? 'Mark this report as <strong>resolved</strong>? The reporter sees the resolved status in Support &amp; Reports.'
        : 'Close this report as <strong>not actionable</strong>? The reporter sees the closed status in Support &amp; Reports.',
      confirmText: resolved ? 'Resolve' : 'Close report',
      confirmVariant: resolved ? 'primary' : 'accent',
    });
    if (!confirmed) return;
    if (disposed) return;

    deciding = true;
    render();

    try {
      await resolveReport(reportId, resolution, { notes });
      showToast(resolved ? 'Report resolved.' : 'Report closed.', 'success');
      await refreshDetail(reportId);
      if (!disposed) {
        items = items.map((item) =>
          item.id === reportId ? { ...item, status: resolution } : item
        );
      }
    } catch (err) {
      console.error('[reports] decision failed', err);
      showToast(
        err instanceof Error && err.message ? err.message : 'The decision was not saved.',
        'error'
      );
      if (!disposed) render();
    } finally {
      deciding = false;
      if (!disposed) render();
    }
  }

  async function handleSendMessage() {
    if (disposed || composeBusy) return;
    const recipientField = container.querySelector('[data-role="message-recipient"]');
    const subjectField = container.querySelector('[data-role="message-subject"]');
    const bodyField = container.querySelector('[data-role="message-body"]');
    const recipientId =
      recipientField instanceof HTMLInputElement ? recipientField.value.trim() : '';
    const subject = subjectField instanceof HTMLInputElement ? subjectField.value.trim() : '';
    const body = bodyField instanceof HTMLTextAreaElement ? bodyField.value.trim() : '';
    if (!recipientId || !subject || !body) {
      showToast('Recipient, subject, and message are required.', 'error');
      return;
    }

    composeBusy = true;
    render();
    try {
      await sendAdminMessage({
        recipientId,
        subject,
        body,
        reportId: selectedId || undefined,
      });
      showToast('Administrative message delivered to the reader inbox.', 'success');
      composeBusy = false;
      render();
      return;
    } catch (err) {
      console.error('[reports] failed to send admin message', err);
      showToast(
        err instanceof Error && err.message ? err.message : 'The message was not delivered.',
        'error'
      );
    } finally {
      composeBusy = false;
      if (!disposed) render();
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
    if (action === 'mark-under-review') {
      handleMarkUnderReview(target.getAttribute('data-id'));
      return;
    }
    if (action === 'send-response') {
      handleSendResponse(target.getAttribute('data-id'));
      return;
    }
    if (action === 'decide') {
      handleDecision(target.getAttribute('data-id'), target.getAttribute('data-resolution'));
      return;
    }
    if (action === 'send-message') {
      handleSendMessage();
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
