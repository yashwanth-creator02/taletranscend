// src/pages/admin/modules/deletions/registry.js
// Removed-content registry and bulk tale removal for the Deletions workspace.
// Every list is cursor-paginated. Tale operations are administrator-only;
// comment and reply operations are available to all staff.

import { listTalesPage } from '@services/admin/content.service.js';
import {
  MODERATION_CATEGORIES,
  MODERATION_CATEGORY_LABELS,
  bulkSoftDeleteTales,
  getSoftDeletionDetail,
  listSoftDeletionsPage,
  permanentlyDeleteComment,
  permanentlyDeleteReply,
  permanentlyDeleteTale,
  restoreComment,
  restoreReply,
  restoreTale,
} from '@services/moderation.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';
import {
  captureAdminSearchFocus,
  escapeAdminHtml,
  formatAdminCount,
  formatAdminDate,
  restoreAdminSearchFocus,
  truncateAdminText,
} from '../../admin.utils.js';
import { buildAdminEmptyState, buildModuleLoading } from '../../admin.templates.js';

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;
const BULK_LIMIT = 50;
const EMPTY_VALUE = '\u2014';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All content types' },
  { value: 'tale', label: 'Tales' },
  { value: 'comment', label: 'Comments' },
  { value: 'reply', label: 'Replies' },
  { value: 'chapter', label: 'Chapters' },
];

const STATUS_OPTIONS = [
  { value: 'deleted', label: 'Removed' },
  { value: 'restored', label: 'Restored' },
  { value: 'purged', label: 'Permanently deleted' },
  { value: 'all', label: 'All registry statuses' },
];

const DIRECTION_OPTIONS = [
  { value: 'desc', label: 'Newest removal first' },
  { value: 'asc', label: 'Oldest removal first' },
];

const TYPE_LABELS = {
  tale: 'Tale',
  comment: 'Comment',
  reply: 'Reply',
  chapter: 'Chapter',
};

const STATUS_TONES = {
  deleted: 'admin-badge--rejected',
  restored: 'admin-badge--published',
  purged: 'admin-badge--dismissed',
};

const EMPTY_STATES = {
  deleted: {
    title: 'No removed content',
    body: 'Nothing is currently removed from public view under this filter.',
  },
  restored: {
    title: 'No restored content',
    body: 'No removed record has been restored under this filter.',
  },
  purged: {
    title: 'No permanently deleted content',
    body: 'No removed record has been permanently deleted under this filter.',
  },
  all: {
    title: 'No registry entries',
    body: 'The deletion registry has no records under this filter.',
  },
};

/** @param {Array<{value: string, label: string}>} options @param {string} selected */
function renderOptions(options, selected) {
  return options
    .map(
      (option) =>
        `<option value="${option.value}"${
          option.value === selected ? ' selected' : ''
        }>${escapeAdminHtml(option.label)}</option>`
    )
    .join('');
}

/** @param {string} value */
function typeLabel(value) {
  return TYPE_LABELS[value] ?? value ?? 'Unknown';
}

/** @param {string} value */
function statusBadge(value) {
  const status = String(value ?? '').toLowerCase();
  const tone = STATUS_TONES[status] ?? 'admin-badge--dismissed';
  return `<span class="admin-badge ${tone}">${escapeAdminHtml(status || 'unknown')}</span>`;
}

/** @param {string} label @param {string} valueHtml @param {{ wide?: boolean }} [options] */
function detailField(label, valueHtml, { wide = false } = {}) {
  return `
    <div class="admin-detail-field${wide ? ' admin-detail-field--wide' : ''}">
      <span class="admin-detail-field__label">${escapeAdminHtml(label)}</span>
      <div class="admin-detail-field__value">${valueHtml}</div>
    </div>
  `;
}

/** @param {unknown} value */
function textOrDash(value) {
  const text = String(value ?? '').trim();
  return escapeAdminHtml(text || EMPTY_VALUE);
}

/** @param {Record<string, unknown>} entry */
function categoryLabel(entry) {
  const key = String(entry?.moderationCategory ?? '').trim();
  return key ? (MODERATION_CATEGORY_LABELS[key] ?? key) : '';
}

/** @param {Record<string, unknown>} report */
function reportTitle(report) {
  return String(report?.subject ?? report?.reason ?? '').trim() || 'Untitled report';
}

/**
 * @param {{ container: HTMLElement, access?: import('../../admin.state.js').AdminAccess }} options
 * @returns {() => void}
 */
export function mountRegistry({ container, access } = {}) {
  if (!container) return () => {};

  let entries = [];
  let lastDoc = null;
  let hasMore = false;
  let type = 'all';
  let status = 'deleted';
  let direction = 'desc';
  let searchTerm = '';
  let searchTimer = null;
  let pendingSearchFocus = null;
  let loading = false;
  let loadingMore = false;
  let error = null;
  let selectedId = null;
  let detail = null;
  let detailLoading = false;
  let detailError = null;
  let actionBusy = false;
  let loadVersion = 0;
  let detailVersion = 0;
  let disposed = false;

  let bulkOpen = false;
  let bulkItems = [];
  let bulkLastDoc = null;
  let bulkHasMore = false;
  let bulkSearch = '';
  let bulkSearchTimer = null;
  let bulkLoading = false;
  let bulkLoadingMore = false;
  let bulkError = null;
  let bulkBusy = false;
  let bulkVersion = 0;
  /** @type {Map<string, { id: string, title: string }>} */
  const selectedTales = new Map();

  const canManageTales = access?.isAdmin === true;

  function renderBulkPanel() {
    if (!canManageTales) return '';

    if (!bulkOpen) {
      return `
        <div class="admin-actions">
          <button type="button" class="admin-btn admin-btn--secondary" data-action="open-bulk">
            Bulk remove tales
          </button>
        </div>
      `;
    }

    const selectedCount = selectedTales.size;
    const selectedTitles = Array.from(selectedTales.values())
      .slice(0, 5)
      .map((entry) => entry.title)
      .join(', ');
    const rows = bulkItems
      .map((tale) => {
        const id = String(tale?.id ?? '');
        const title = String(tale?.title ?? '').trim() || 'Untitled tale';
        const removed =
          tale?.isDeleted === true || String(tale?.status ?? '').toLowerCase() === 'deleted';
        const checked = selectedTales.has(id);
        return `
          <tr>
            <td>
              <input
                type="checkbox"
                data-action="toggle-tale"
                data-id="${escapeAdminHtml(id)}"
                ${checked ? 'checked' : ''}
                ${removed || bulkBusy ? 'disabled' : ''}
                aria-label="Select ${escapeAdminHtml(title)}"
              />
            </td>
            <td>
              <div class="admin-table__name">${escapeAdminHtml(title)}</div>
              <div class="admin-table__sub">${escapeAdminHtml(
                truncateAdminText(tale?.authorName || tale?.authorId || 'Unknown', 40)
              )}</div>
            </td>
            <td>${escapeAdminHtml(String(tale?.status ?? 'unknown'))}</td>
            <td>${escapeAdminHtml(formatAdminDate(tale?.updatedAt ?? tale?.createdAt))}</td>
            <td class="admin-table__cell--right">
              ${
                removed
                  ? '<span class="admin-badge admin-badge--rejected">Already removed</span>'
                  : '<span class="admin-note">Selectable</span>'
              }
            </td>
          </tr>
        `;
      })
      .join('');

    const bulkBody = bulkLoading
      ? buildModuleLoading('tales')
      : bulkError
        ? `
            <div class="admin-error" role="alert">
              <p>${escapeAdminHtml(bulkError)}</p>
              <div class="admin-error__actions">
                <button type="button" class="admin-btn" data-action="retry-bulk">Try again</button>
              </div>
            </div>
          `
        : bulkItems.length === 0
          ? buildAdminEmptyState({
              title: bulkSearch ? 'No tales match that search' : 'No tales available',
              body: bulkSearch
                ? 'Try a different title prefix or clear the search.'
                : 'No tale records are available for bulk removal.',
              icon: 'book-open',
            })
          : `
              <div class="admin-table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Tale</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
              ${
                bulkHasMore
                  ? `<div class="admin-pagination-bar">
                      <button type="button" class="admin-btn admin-btn--secondary" data-action="load-more-bulk" ${
                        bulkLoadingMore ? 'disabled' : ''
                      }>${bulkLoadingMore ? 'Loading...' : 'Load more tales'}</button>
                    </div>`
                  : ''
              }
            `;

    return `
      <section class="admin-detail-panel" aria-labelledby="bulk-removal-title">
        <div class="admin-detail-panel__header">
          <div>
            <h3 id="bulk-removal-title" class="admin-detail-panel__title">Bulk remove tales</h3>
            <p class="admin-detail-panel__subtitle">
              Select up to ${BULK_LIMIT} tales. Every selected record is validated before an atomic
              batch removes it from public view.
            </p>
          </div>
          <button type="button" class="admin-btn admin-btn--sm admin-btn--secondary" data-action="close-bulk" ${
            bulkBusy ? 'disabled' : ''
          }>
            Close
          </button>
        </div>

        <div class="admin-toolbar">
          <label class="admin-field admin-field--grow">
            <span class="admin-field__label">Find tales</span>
            <input
              class="admin-input"
              type="search"
              data-role="bulk-search"
              value="${escapeAdminHtml(bulkSearch)}"
              placeholder="Search by title prefix"
              autocomplete="off"
            />
          </label>
          <button type="button" class="admin-btn admin-btn--secondary" data-action="select-visible" ${
            bulkBusy ? 'disabled' : ''
          }>
            Select visible
          </button>
          <button type="button" class="admin-btn admin-btn--secondary" data-action="clear-selection" ${
            bulkBusy || selectedTales.size === 0 ? 'disabled' : ''
          }>
            Clear selection
          </button>
        </div>

        <p class="admin-note" role="status" aria-live="polite">
          ${selectedCount} selected${selectedCount ? `: ${escapeAdminHtml(selectedTitles)}${selectedCount > 5 ? ', ...' : ''}` : ''}
        </p>

        <div data-region="bulk-results">${bulkBody}</div>

        <div class="admin-detail-grid">
          ${detailField(
            'Removal category',
            `<select class="admin-select" data-role="bulk-category">${renderOptions(
              MODERATION_CATEGORIES.map((value) => ({
                value,
                label: MODERATION_CATEGORY_LABELS[value] ?? value,
              })),
              'other'
            )}</select>`
          )}
          ${detailField(
            'Removal reason',
            `<input class="admin-input" data-role="bulk-reason" maxlength="500" placeholder="Shown in the audit record" />`,
            { wide: true }
          )}
        </div>

        <div class="admin-actions">
          <button
            type="button"
            class="admin-btn admin-btn--danger"
            data-action="bulk-remove"
            ${bulkBusy || selectedCount === 0 ? 'disabled' : ''}
          >
            ${bulkBusy ? 'Removing...' : `Remove ${selectedCount || 'selected'} tale${selectedCount === 1 ? '' : 's'}`}
          </button>
        </div>

        <p class="admin-readonly-note">
          Tales are removed from discovery and direct access, and each one is added to this registry.
          The operation is all-or-nothing: if any selected tale is missing or already removed, nothing
          is written. Chapter and comment subcollections are left in place.
        </p>
      </section>
    `;
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
            placeholder="Search by title prefix"
            autocomplete="off"
          />
        </label>
        <label class="admin-field">
          <span class="admin-field__label">Type</span>
          <select class="admin-select" data-filter="type">${renderOptions(TYPE_OPTIONS, type)}</select>
        </label>
        <label class="admin-field">
          <span class="admin-field__label">Registry status</span>
          <select class="admin-select" data-filter="status">${renderOptions(
            STATUS_OPTIONS,
            status
          )}</select>
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

  function renderDetail() {
    if (!selectedId) return '';

    if (detailLoading) {
      return `
        <div class="admin-detail-panel" role="status" aria-live="polite">
          <p class="admin-detail-field__value">Loading removed record...</p>
        </div>
      `;
    }

    if (detailError && !detail) {
      return `
        <div class="admin-error" role="alert">
          <p>${escapeAdminHtml(detailError)}</p>
          <div class="admin-error__actions">
            <button type="button" class="admin-btn" data-action="retry-detail">Try again</button>
            <button type="button" class="admin-btn admin-btn--secondary" data-action="close-detail">
              Close
            </button>
          </div>
        </div>
      `;
    }

    if (!detail) return '';

    const entry = detail;
    const entityType = String(entry.entityType ?? '');
    const isDeleted = entry.status === 'deleted';
    const authorDeleted = entry.deletionType === 'author';
    const canRestore =
      isDeleted &&
      entityType !== 'chapter' &&
      !(authorDeleted && (entityType === 'comment' || entityType === 'reply')) &&
      (entityType === 'tale' ? canManageTales : true);
    const canPurge =
      isDeleted && entityType !== 'chapter' && (entityType === 'tale' ? canManageTales : true);

    const entity = entry.entity;
    const archiveText = String(entry.archive?.text ?? '').trim();
    const reports = Array.isArray(entry.reports) ? entry.reports : [];
    const reportRows = reports
      .map(
        (report) => `
          <tr>
            <td>${escapeAdminHtml(reportTitle(report))}</td>
            <td>${escapeAdminHtml(String(report?.status ?? 'unknown'))}</td>
            <td>${escapeAdminHtml(formatAdminDate(report?.createdAt))}</td>
            <td class="admin-table__cell--right">
              <a class="admin-btn admin-btn--sm admin-btn--secondary" href="admin.html#reports">Open reports</a>
            </td>
          </tr>
        `
      )
      .join('');

    const actions = `
      <div class="admin-actions">
        ${
          canRestore
            ? `<button type="button" class="admin-btn" data-action="restore-entry" ${
                actionBusy ? 'disabled' : ''
              }>Restore</button>`
            : ''
        }
        ${
          canPurge
            ? `<button type="button" class="admin-btn admin-btn--danger" data-action="purge-entry" ${
                actionBusy ? 'disabled' : ''
              }>Permanently delete</button>`
            : ''
        }
        <button type="button" class="admin-btn admin-btn--secondary" data-action="close-detail">
          Close
        </button>
      </div>
    `;

    return `
      <section class="admin-detail-panel" aria-labelledby="removed-detail-title">
        <div class="admin-detail-panel__header">
          <div>
            <p class="admin-detail-panel__subtitle">${statusBadge(entry.status)} ${escapeAdminHtml(
              typeLabel(entityType)
            )}</p>
            <h3 id="removed-detail-title" class="admin-detail-panel__title">${escapeAdminHtml(
              entry.title || 'Untitled record'
            )}</h3>
            <p class="admin-detail-panel__subtitle">Registry ${escapeAdminHtml(entry.id)}</p>
          </div>
          <button type="button" class="admin-btn admin-btn--sm" data-action="close-detail">
            Close
          </button>
        </div>

        <div class="admin-detail-grid">
          ${detailField('Entity type', escapeAdminHtml(typeLabel(entityType)))}
          ${detailField('Entity ID', textOrDash(entry.entityId))}
          ${detailField('Parent tale', textOrDash(entry.parentId))}
          ${detailField('Parent comment', textOrDash(entry.parentCommentId))}
          ${detailField('Owner', escapeAdminHtml(entry.ownerName || entry.ownerId || 'Unknown'))}
          ${detailField('Removal type', escapeAdminHtml(entry.deletionType || EMPTY_VALUE))}
          ${detailField('Category', escapeAdminHtml(categoryLabel(entry) || EMPTY_VALUE))}
          ${detailField('Reports', escapeAdminHtml(formatAdminCount(entry.reportCount)))}
          ${detailField('Removed', escapeAdminHtml(formatAdminDate(entry.deletedAt)))}
          ${detailField('Removed by', textOrDash(entry.deletedBy))}
          ${detailField('Restored', escapeAdminHtml(formatAdminDate(entry.restoredAt)))}
          ${detailField('Restored by', textOrDash(entry.restoredBy))}
          ${detailField('Permanently deleted', escapeAdminHtml(formatAdminDate(entry.purgedAt)))}
          ${detailField('Purged by', textOrDash(entry.purgedBy))}
          ${detailField('Reason', escapeAdminHtml(entry.deletionReason || EMPTY_VALUE), {
            wide: true,
          })}
          ${detailField('Preview', escapeAdminHtml(entry.preview || EMPTY_VALUE), { wide: true })}
          ${
            archiveText
              ? detailField('Archived original (staff only)', escapeAdminHtml(archiveText), {
                  wide: true,
                })
              : ''
          }
          ${
            entity
              ? detailField(
                  'Live entity state',
                  escapeAdminHtml(
                    [
                      entity.isDeleted === true ? 'isDeleted' : 'not deleted',
                      entity.status ? `status ${entity.status}` : '',
                      entity.visibility ? `visibility ${entity.visibility}` : '',
                    ]
                      .filter(Boolean)
                      .join(' / ')
                  )
                )
              : detailField('Live entity', 'The underlying document is no longer present.')
          }
        </div>

        ${actions}

        ${
          entityType === 'chapter'
            ? '<p class="admin-readonly-note">Chapter-level restoration is not implemented. The registry record is preserved for audit and the tale can be restored from its own registry entry.</p>'
            : ''
        }
        ${
          authorDeleted && isDeleted && (entityType === 'comment' || entityType === 'reply')
            ? '<p class="admin-readonly-note">This record was removed by its author. Moderation cannot restore author-deleted content; permanent deletion remains available.</p>'
            : ''
        }

        <h4 class="admin-detail-panel__title">Related reports</h4>
        ${
          reports.length
            ? `<div class="admin-table-wrapper">
                <table class="admin-table">
                  <thead><tr><th>Report</th><th>Status</th><th>Filed</th><th></th></tr></thead>
                  <tbody>${reportRows}</tbody>
                </table>
              </div>`
            : '<p class="admin-note">No reports reference this record.</p>'
        }
      </section>
    `;
  }

  function renderTable() {
    const rows = entries
      .map((entry) => {
        const id = String(entry?.id ?? '');
        const selected = id === selectedId;
        return `
          <tr>
            <td class="admin-table__cell--wide">
              <div class="admin-table__name">${escapeAdminHtml(
                truncateAdminText(entry.title || 'Untitled record', 90)
              )}</div>
              <div class="admin-table__sub">${escapeAdminHtml(
                `${typeLabel(entry.entityType)} - ${truncateAdminText(entry.entityId, 24)}`
              )}</div>
            </td>
            <td>
              <div class="admin-table__name">${escapeAdminHtml(
                entry.ownerName || entry.ownerId || 'Unknown'
              )}</div>
              <div class="admin-table__sub">${escapeAdminHtml(entry.deletionType || EMPTY_VALUE)}</div>
            </td>
            <td>${escapeAdminHtml(categoryLabel(entry) || EMPTY_VALUE)}</td>
            <td>${escapeAdminHtml(formatAdminDate(entry.deletedAt))}</td>
            <td>${statusBadge(entry.status)}</td>
            <td>${escapeAdminHtml(formatAdminCount(entry.reportCount))}</td>
            <td class="admin-table__cell--right">
              <button
                type="button"
                class="admin-btn admin-btn--sm"
                data-action="view-entry"
                data-id="${escapeAdminHtml(id)}"
              >
                ${selected ? 'Close' : 'Review'}
              </button>
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
              <th>Record</th>
              <th>Owner</th>
              <th>Category</th>
              <th>Removed</th>
              <th>Status</th>
              <th>Reports</th>
              <th class="admin-table__cell--right">Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderCount() {
    const countEl = container.querySelector('[data-region="count"]');
    if (!countEl) return;
    if (error) {
      countEl.textContent = 'Removed content could not be loaded.';
      return;
    }
    if (loading && entries.length === 0) {
      countEl.textContent = 'Loading removed content...';
      return;
    }
    countEl.textContent = `${entries.length}${hasMore ? '+' : ''} registry ${
      entries.length === 1 && !hasMore ? 'entry' : 'entries'
    }${searchTerm ? ` matching ${searchTerm}` : ''}${loadingMore ? ' - loading more' : ''}`;
  }

  function renderPagination() {
    const paginationEl = container.querySelector('[data-region="pagination"]');
    if (!paginationEl) return;
    if (loading || entries.length === 0) {
      paginationEl.innerHTML = '';
      return;
    }
    if (hasMore) {
      paginationEl.innerHTML = `
        <div class="admin-pagination-bar">
          <button type="button" class="admin-btn admin-btn--secondary" data-action="load-more" ${
            loadingMore ? 'disabled' : ''
          }>${loadingMore ? 'Loading...' : 'Load more'}</button>
          <span class="admin-note">${entries.length} registry entries loaded</span>
        </div>
      `;
      return;
    }
    paginationEl.innerHTML = `<p class="admin-note">${entries.length} registry entries loaded - end of list.</p>`;
  }

  function render() {
    pendingSearchFocus = captureAdminSearchFocus(container, pendingSearchFocus);
    const body = loading
      ? buildModuleLoading('removed content')
      : error
        ? `
            <div class="admin-error" role="alert">
              <p>Removed content could not be loaded. ${escapeAdminHtml(error.message)}</p>
              <div class="admin-error__actions">
                <button type="button" class="admin-btn" data-action="retry">Try again</button>
              </div>
            </div>
          `
        : entries.length === 0
          ? buildAdminEmptyState({
              ...(EMPTY_STATES[status] ?? EMPTY_STATES.deleted),
              icon: 'archive',
            })
          : renderTable();

    container.innerHTML = `
      <section aria-labelledby="removed-content-title">
        <h3 id="removed-content-title" class="admin-section-title">Removed content</h3>
        <p class="admin-note">
          Every soft-deleted tale, comment, and reply, including records restored or permanently
          deleted later. Comments and replies keep an archived copy of their original text for staff.
        </p>
        ${renderBulkPanel()}
        ${renderToolbar()}
        <p class="admin-note" data-region="count" role="status" aria-live="polite"></p>
        ${renderDetail()}
        <div data-region="results">${body}</div>
        <div data-region="pagination"></div>
      </section>
    `;
    renderCount();
    renderPagination();
    restoreAdminSearchFocus(container, pendingSearchFocus);
    pendingSearchFocus = null;
  }

  async function loadFirstPage() {
    if (disposed) return;
    const version = ++loadVersion;
    loading = true;
    loadingMore = false;
    error = null;
    selectedId = null;
    detail = null;
    detailError = null;
    detailLoading = false;
    render();

    try {
      const page = await listSoftDeletionsPage({
        type,
        status,
        search: searchTerm,
        direction,
        pageSize: PAGE_SIZE,
      });
      if (disposed || version !== loadVersion) return;
      entries = page.items ?? [];
      lastDoc = page.lastDoc ?? null;
      hasMore = Boolean(page.hasMore);
    } catch (err) {
      if (disposed || version !== loadVersion) return;
      entries = [];
      lastDoc = null;
      hasMore = false;
      error = err instanceof Error ? err : new Error('Unknown error');
      console.error('[deletions] failed to load registry', err);
    } finally {
      if (!disposed && version === loadVersion) {
        loading = false;
        render();
      }
    }
  }

  async function loadMore() {
    if (disposed || loading || loadingMore || !hasMore || !lastDoc) return;
    const version = loadVersion;
    loadingMore = true;
    renderPagination();

    try {
      const page = await listSoftDeletionsPage({
        type,
        status,
        search: searchTerm,
        direction,
        cursor: lastDoc,
        pageSize: PAGE_SIZE,
      });
      if (disposed || version !== loadVersion) return;
      entries = [...entries, ...(page.items ?? [])];
      lastDoc = page.lastDoc ?? null;
      hasMore = Boolean(page.hasMore);
    } catch (err) {
      if (disposed || version !== loadVersion) return;
      console.error('[deletions] failed to load more registry entries', err);
      showToast('Could not load more removed content.', 'error');
    } finally {
      if (!disposed && version === loadVersion) {
        loadingMore = false;
        render();
      }
    }
  }

  async function openDetail(registryId) {
    if (disposed || !registryId) return;
    selectedId = registryId;
    detail = null;
    detailError = null;
    detailLoading = true;
    const version = ++detailVersion;
    render();

    try {
      const result = await getSoftDeletionDetail(registryId);
      if (disposed || version !== detailVersion) return;
      if (!result) {
        selectedId = null;
        detailLoading = false;
        showToast('That registry entry no longer exists.', 'error');
        render();
        return;
      }
      detail = result;
    } catch (err) {
      if (disposed || version !== detailVersion) return;
      detailError = String(err?.message ?? '').trim() || 'Could not load that record.';
      console.error('[deletions] failed to load registry detail', err);
    } finally {
      if (!disposed && version === detailVersion) {
        detailLoading = false;
        render();
      }
    }
  }

  function closeDetail() {
    selectedId = null;
    detail = null;
    detailError = null;
    detailLoading = false;
    detailVersion += 1;
    render();
  }

  /** @param {Record<string, unknown>} entry */
  async function restoreEntry(entry) {
    const entityType = String(entry.entityType ?? '');
    if (entityType === 'tale') return restoreTale(String(entry.entityId));
    if (entityType === 'comment') {
      return restoreComment(String(entry.parentId), String(entry.entityId));
    }
    if (entityType === 'reply') {
      return restoreReply(
        String(entry.parentId),
        String(entry.parentCommentId),
        String(entry.entityId)
      );
    }
    throw new Error('This record type cannot be restored from the registry.');
  }

  /** @param {Record<string, unknown>} entry */
  async function purgeEntry(entry) {
    const entityType = String(entry.entityType ?? '');
    if (entityType === 'tale') return permanentlyDeleteTale(String(entry.entityId));
    if (entityType === 'comment') {
      return permanentlyDeleteComment(String(entry.parentId), String(entry.entityId));
    }
    if (entityType === 'reply') {
      return permanentlyDeleteReply(
        String(entry.parentId),
        String(entry.parentCommentId),
        String(entry.entityId)
      );
    }
    throw new Error('This record type cannot be permanently deleted from the registry.');
  }

  async function handleRestore() {
    if (!detail || actionBusy) return;
    const title = detail.title || detail.entityId || 'this record';
    const confirmed = await showConfirmModal({
      title: 'Restore this record?',
      message: `Restore <strong>${escapeAdminHtml(
        title
      )}</strong> to public view? The original content and relationships are preserved.`,
      subtext: 'Restoring does not automatically restore independently deleted children.',
      confirmText: 'Restore',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
      icon: 'rotate-ccw',
    });
    if (!confirmed || disposed) return;

    actionBusy = true;
    render();
    try {
      await restoreEntry(detail);
      showToast('Record restored to public view.', 'success');
      selectedId = null;
      detail = null;
      await loadFirstPage();
    } catch (err) {
      console.error('[deletions] restore failed', err);
      showToast(String(err?.message ?? '').trim() || 'The record could not be restored.', 'error');
    } finally {
      actionBusy = false;
      if (!disposed && !loading) render();
    }
  }

  async function handlePurge() {
    if (!detail || actionBusy) return;
    const title = detail.title || detail.entityId || 'this record';
    const confirmed = await showConfirmModal({
      title: 'Permanently delete this record?',
      message: `Permanently delete <strong>${escapeAdminHtml(
        title
      )}</strong>? This removes the underlying document and cannot be undone.`,
      subtext:
        'Subcollections are not cascaded by Firestore. The registry keeps a purged audit entry.',
      confirmText: 'Delete permanently',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
      icon: 'trash-2',
    });
    if (!confirmed || disposed) return;

    actionBusy = true;
    render();
    try {
      await purgeEntry(detail);
      showToast('Record permanently deleted.', 'success');
      selectedId = null;
      detail = null;
      await loadFirstPage();
    } catch (err) {
      console.error('[deletions] purge failed', err);
      showToast(
        String(err?.message ?? '').trim() || 'The record could not be permanently deleted.',
        'error'
      );
    } finally {
      actionBusy = false;
      if (!disposed && !loading) render();
    }
  }

  async function loadBulkTales({ reset = true } = {}) {
    if (disposed || bulkLoading || bulkLoadingMore) return;
    const version = ++bulkVersion;
    if (reset) {
      bulkLoading = true;
      bulkItems = [];
      bulkLastDoc = null;
      bulkHasMore = false;
      bulkError = null;
      selectedTales.clear();
    } else {
      bulkLoadingMore = true;
    }
    render();

    try {
      const page = await listTalesPage({
        status: 'all',
        search: bulkSearch,
        direction: 'desc',
        cursor: reset ? null : bulkLastDoc,
        pageSize: PAGE_SIZE,
      });
      if (disposed || version !== bulkVersion) return;
      bulkItems = reset ? (page.items ?? []) : [...bulkItems, ...(page.items ?? [])];
      bulkLastDoc = page.lastDoc ?? null;
      bulkHasMore = Boolean(page.hasMore);
    } catch (err) {
      if (disposed || version !== bulkVersion) return;
      bulkError = String(err?.message ?? '').trim() || 'Could not load tales.';
      console.error('[deletions] failed to load bulk tales', err);
    } finally {
      if (!disposed && version === bulkVersion) {
        bulkLoading = false;
        bulkLoadingMore = false;
        render();
      }
    }
  }

  async function handleBulkRemove() {
    if (bulkBusy || selectedTales.size === 0) return;
    if (selectedTales.size > BULK_LIMIT) {
      showToast(`Select ${BULK_LIMIT} tales or fewer.`, 'error');
      return;
    }
    const categoryField = container.querySelector('[data-role="bulk-category"]');
    const reasonField = container.querySelector('[data-role="bulk-reason"]');
    const category =
      categoryField instanceof HTMLSelectElement &&
      MODERATION_CATEGORIES.includes(categoryField.value)
        ? categoryField.value
        : 'other';
    const reason = reasonField instanceof HTMLInputElement ? reasonField.value.trim() : '';
    const selected = Array.from(selectedTales.values());
    const titles = selected
      .slice(0, 8)
      .map((entry) => entry.title)
      .join(', ');
    const confirmed = await showConfirmModal({
      title: `Remove ${selected.length} tale${selected.length === 1 ? '' : 's'} from public view?`,
      message: `Remove <strong>${selected.length} tale${
        selected.length === 1 ? '' : 's'
      }</strong> from discovery and direct access?<br /><br />Selected type: <strong>tale</strong><br />${escapeAdminHtml(
        titles
      )}${selected.length > 8 ? ', ...' : ''}`,
      subtext:
        'Every selected record is validated first. If any tale is missing or already removed, nothing is written. The operation can be restored from Removed content.',
      confirmText: `Remove ${selected.length} tale${selected.length === 1 ? '' : 's'}`,
      cancelText: 'Cancel',
      confirmVariant: 'danger',
      icon: 'archive',
    });
    if (!confirmed || disposed) return;

    bulkBusy = true;
    render();
    try {
      const result = await bulkSoftDeleteTales(
        selected.map((entry) => entry.id),
        { reason, category }
      );
      showToast(
        `${result.count} tale${result.count === 1 ? '' : 's'} removed from public view.`,
        'success'
      );
      selectedTales.clear();
      await loadBulkTales({ reset: true });
      await loadFirstPage();
    } catch (err) {
      console.error('[deletions] bulk removal failed', err);
      showToast(String(err?.message ?? '').trim() || 'The bulk removal was not applied.', 'error');
    } finally {
      bulkBusy = false;
      if (!disposed) render();
    }
  }

  function handleClick(event) {
    const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (!target || !container.contains(target)) return;
    const action = target.getAttribute('data-action');

    if (action === 'retry') loadFirstPage();
    else if (action === 'load-more') loadMore();
    else if (action === 'view-entry') openDetail(target.getAttribute('data-id'));
    else if (action === 'close-detail') closeDetail();
    else if (action === 'retry-detail' && selectedId) openDetail(selectedId);
    else if (action === 'restore-entry') handleRestore();
    else if (action === 'purge-entry') handlePurge();
    else if (action === 'open-bulk') {
      bulkOpen = true;
      render();
      if (bulkItems.length === 0) loadBulkTales({ reset: true });
    } else if (action === 'close-bulk') {
      bulkOpen = false;
      render();
    } else if (action === 'retry-bulk') {
      loadBulkTales({ reset: true });
    } else if (action === 'load-more-bulk') {
      loadBulkTales({ reset: false });
    } else if (action === 'select-visible') {
      if (selectedTales.size >= BULK_LIMIT) {
        showToast(`Select ${BULK_LIMIT} tales or fewer.`, 'info');
        return;
      }
      for (const tale of bulkItems) {
        const id = String(tale?.id ?? '');
        if (!id || tale?.isDeleted === true || String(tale?.status ?? '') === 'deleted') continue;
        if (selectedTales.size >= BULK_LIMIT) break;
        selectedTales.set(id, {
          id,
          title: String(tale?.title ?? '').trim() || 'Untitled tale',
        });
      }
      render();
    } else if (action === 'clear-selection') {
      selectedTales.clear();
      render();
    } else if (action === 'bulk-remove') {
      handleBulkRemove();
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (
      target instanceof HTMLInputElement &&
      target.getAttribute('data-action') === 'toggle-tale'
    ) {
      const id = target.getAttribute('data-id') ?? '';
      if (!id) return;
      if (target.checked) {
        if (selectedTales.size >= BULK_LIMIT) {
          target.checked = false;
          showToast(`Select ${BULK_LIMIT} tales or fewer.`, 'info');
          return;
        }
        const tale = bulkItems.find((item) => String(item?.id ?? '') === id);
        selectedTales.set(id, {
          id,
          title: String(tale?.title ?? '').trim() || 'Untitled tale',
        });
      } else {
        selectedTales.delete(id);
      }
      render();
      return;
    }

    if (!(target instanceof HTMLSelectElement)) return;
    const filter = target.getAttribute('data-filter');
    if (filter === 'type') {
      type = TYPE_OPTIONS.some((option) => option.value === target.value) ? target.value : 'all';
    } else if (filter === 'status') {
      status = STATUS_OPTIONS.some((option) => option.value === target.value)
        ? target.value
        : 'deleted';
    } else if (filter === 'direction') {
      direction = target.value === 'asc' ? 'asc' : 'desc';
    } else {
      return;
    }
    loadFirstPage();
  }

  function handleInput(event) {
    const field = event.target;
    if (!(field instanceof HTMLInputElement)) return;

    const role = field.getAttribute('data-role');
    if (role === 'search') {
      searchTerm = field.value.trim();
      if (searchTimer) window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        searchTimer = null;
        if (!disposed) loadFirstPage();
      }, SEARCH_DEBOUNCE_MS);
      return;
    }

    if (role === 'bulk-search') {
      bulkSearch = field.value.trim();
      if (bulkSearchTimer) window.clearTimeout(bulkSearchTimer);
      bulkSearchTimer = window.setTimeout(() => {
        bulkSearchTimer = null;
        if (!disposed && bulkOpen) loadBulkTales({ reset: true });
      }, SEARCH_DEBOUNCE_MS);
    }
  }

  container.addEventListener('click', handleClick);
  container.addEventListener('change', handleChange);
  container.addEventListener('input', handleInput);
  loadFirstPage();

  return () => {
    disposed = true;
    loadVersion += 1;
    bulkVersion += 1;
    if (searchTimer) window.clearTimeout(searchTimer);
    if (bulkSearchTimer) window.clearTimeout(bulkSearchTimer);
    searchTimer = null;
    bulkSearchTimer = null;
    container.removeEventListener('click', handleClick);
    container.removeEventListener('change', handleChange);
    container.removeEventListener('input', handleInput);
  };
}

export default { mountRegistry };
