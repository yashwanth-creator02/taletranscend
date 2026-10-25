// src/pages/admin/modules/content/content.js
// Global tale archive: every tale, including drafts, with a rule-safe edit
// panel and confirmed deletion. Chapter text stays author-owned, so this module
// exposes chapter metadata read-only.

import {
  TALE_STATUSES,
  TALE_VISIBILITIES,
  deleteTale,
  getTaleDetail,
  listTalesPage,
  purgeTale,
  restoreTale,
  updateTale,
} from '@services/admin/content.service.js';
import { MODERATION_CATEGORIES, MODERATION_CATEGORY_LABELS } from '@services/moderation.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';
import {
  formatAdminDate,
  formatAdminCount,
  truncateAdminText,
  escapeAdminHtml,
  adminInitials,
} from '../../admin.utils.js';
import { buildAdminEmptyState, buildModuleLoading } from '../../admin.templates.js';

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;
const EMPTY_VALUE = '\u2014';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'deleted', label: 'Deleted' },
];

const STATUS_BADGES = {
  published: 'admin-badge--published',
  draft: 'admin-badge--draft',
  submitted: 'admin-badge--pending',
  rejected: 'admin-badge--rejected',
  deleted: 'admin-badge--dismissed',
};

const VISIBILITY_LABELS = {
  public: 'Public',
  private: 'Private',
  unlisted: 'Unlisted',
};

const DIRECTION_OPTIONS = [
  { value: 'desc', label: 'Newest update' },
  { value: 'asc', label: 'Oldest update' },
];

/**
 * @param {{ container: HTMLElement, access?: import('../../admin.state.js').AdminAccess }} options
 * @returns {() => void}
 */
export function mount({ container, access } = {}) {
  if (!container) return () => {};

  if (!access?.isAdmin) {
    container.innerHTML = `
      <section aria-labelledby="admin-content-denied-title">
        <h2 id="admin-content-denied-title" class="admin-section-title">Tales &amp; Chapters</h2>
        <p class="admin-readonly-note">
          This archive-wide content view is available to administrators only.
        </p>
      </section>
    `;
    return () => {};
  }

  let items = [];
  let lastDoc = null;
  let hasMore = false;
  let status = 'all';
  let direction = 'desc';
  let searchTerm = '';
  let loading = false;
  let loadingMore = false;
  let listError = '';
  let selectedId = null;
  let detail = null;
  let detailLoading = false;
  let detailError = '';
  let actionBusy = false;
  let searchTimer = null;
  let listVersion = 0;
  let detailVersion = 0;
  let destroyed = false;

  container.innerHTML = `
    <section aria-labelledby="admin-content-title">
      <h2 id="admin-content-title" class="admin-section-title">Tales &amp; Chapters</h2>
      <p class="admin-note">
        Every tale in the archive, including drafts. Search by title or paste a complete tale ID.
        Firestore permits staff to change the title, status, and visibility; chapter text remains
        author-owned. Lists are cursor-paginated, so use Load More to continue.
      </p>

      <div class="admin-toolbar">
        <label class="admin-field admin-field--grow">
          <span class="admin-field__label">Search</span>
          <input
            class="admin-input"
            type="search"
            data-role="search"
            placeholder="Search by title or paste a tale ID"
            autocomplete="off"
          />
        </label>
        <label class="admin-field">
          <span class="admin-field__label">Status</span>
          <select class="admin-select" data-role="status">
            ${STATUS_OPTIONS.map(
              (option) => `<option value="${option.value}">${option.label}</option>`
            ).join('')}
          </select>
        </label>
        <label class="admin-field">
          <span class="admin-field__label">Order</span>
          <select class="admin-select" data-role="direction">
            ${DIRECTION_OPTIONS.map(
              (option) => `<option value="${option.value}">${option.label}</option>`
            ).join('')}
          </select>
        </label>
      </div>

      <p class="admin-note" data-region="count" role="status" aria-live="polite"></p>
      <div data-region="detail"></div>
      <div data-region="results"></div>
      <div data-region="pagination"></div>
    </section>
  `;

  const resultsEl = container.querySelector('[data-region="results"]');
  const detailEl = container.querySelector('[data-region="detail"]');
  const paginationEl = container.querySelector('[data-region="pagination"]');
  const countEl = container.querySelector('[data-region="count"]');

  /** @param {string} label @param {string} valueHtml @param {{ wide?: boolean }} [options] */
  function buildDetailField(label, valueHtml, { wide = false } = {}) {
    return `
      <div class="admin-detail-field${wide ? ' admin-detail-field--wide' : ''}">
        <span class="admin-detail-field__label">${escapeAdminHtml(label)}</span>
        <div class="admin-detail-field__value">${valueHtml}</div>
      </div>
    `;
  }

  /** @param {unknown} value */
  function displayTitle(value) {
    return String(value ?? '').trim() || 'Untitled tale';
  }

  /** @param {Record<string, unknown>} tale */
  function displayAuthor(tale) {
    return (
      String(tale?.authorName ?? '').trim() || String(tale?.authorId ?? '').trim() || 'Unknown'
    );
  }

  /** @param {Record<string, unknown>} tale */
  function statusBadge(tale) {
    const value = String(tale?.status ?? 'draft').trim() || 'draft';
    const className = STATUS_BADGES[value] ?? 'admin-badge--dismissed';
    return `<span class="admin-badge ${className}">${escapeAdminHtml(value)}</span>`;
  }

  /** @param {unknown} value */
  function visibilityLabel(value) {
    const key = String(value ?? '')
      .trim()
      .toLowerCase();
    return VISIBILITY_LABELS[key] ?? (key ? key : EMPTY_VALUE);
  }

  function renderCount() {
    if (!countEl) return;
    if (listError) {
      countEl.textContent = 'Tale list unavailable.';
      return;
    }
    if (loading && items.length === 0) {
      countEl.textContent = 'Loading tales...';
      return;
    }
    const noun = items.length === 1 && !hasMore ? 'tale' : 'tales';
    const searchNote = searchTerm ? ` matching ${searchTerm}` : '';
    countEl.textContent = `${items.length}${hasMore ? '+' : ''} ${noun}${searchNote}${
      loadingMore ? ' - loading more' : ''
    }`;
  }

  function renderResults() {
    if (!resultsEl) return;

    if (loading && items.length === 0) {
      resultsEl.innerHTML = buildModuleLoading('content');
      return;
    }

    if (listError && items.length === 0) {
      resultsEl.innerHTML = `
        <div class="admin-error" role="alert">
          <p>${escapeAdminHtml(listError)}</p>
          <div class="admin-error__actions">
            <button type="button" class="admin-btn" data-action="retry">Try again</button>
          </div>
        </div>
      `;
      return;
    }

    if (items.length === 0) {
      resultsEl.innerHTML = buildAdminEmptyState({
        title: searchTerm ? 'No tales match that search' : 'No tales in this view',
        body: searchTerm
          ? 'Try a different title prefix, paste a complete tale ID, or clear the search.'
          : 'No tale records match the selected status.',
        icon: 'book-open',
      });
      return;
    }

    const rows = items
      .map((tale) => {
        const id = String(tale?.id ?? '');
        const selected = id === selectedId;
        return `
          <tr>
            <td>
              <div class="admin-table__mark">${escapeAdminHtml(adminInitials(displayTitle(tale.title)))}</div>
              <div class="admin-table__name">${escapeAdminHtml(displayTitle(tale.title))}</div>
              <div class="admin-table__sub">ID ${escapeAdminHtml(truncateAdminText(id, 18))}</div>
            </td>
            <td>
              <div class="admin-table__name">${escapeAdminHtml(displayAuthor(tale))}</div>
              <div class="admin-table__sub">${escapeAdminHtml(
                truncateAdminText(tale.authorId, 18) || EMPTY_VALUE
              )}</div>
            </td>
            <td>${statusBadge(tale)}</td>
            <td>${escapeAdminHtml(visibilityLabel(tale.visibility))}</td>
            <td>${escapeAdminHtml(formatAdminCount(tale.chapterCount))}</td>
            <td>${escapeAdminHtml(formatAdminDate(tale.updatedAt ?? tale.createdAt))}</td>
            <td class="admin-table__cell--right">
              <button
                type="button"
                class="admin-btn admin-btn--sm"
                data-action="view-tale"
                data-id="${escapeAdminHtml(id)}"
              >
                ${selected ? 'Close' : 'View'}
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    resultsEl.innerHTML = `
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Tale</th>
              <th>Author</th>
              <th>Status</th>
              <th>Visibility</th>
              <th>Chapters</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderPagination() {
    if (!paginationEl) return;
    if (loading || items.length === 0) {
      paginationEl.innerHTML = '';
      return;
    }
    if (hasMore) {
      paginationEl.innerHTML = `
        <div class="admin-pagination-bar">
          <button
            type="button"
            class="admin-btn admin-btn--secondary"
            data-action="load-more"
            ${loadingMore ? 'disabled' : ''}
          >
            ${loadingMore ? 'Loading...' : 'Load More'}
          </button>
          <span class="admin-note">${items.length} tales loaded</span>
        </div>
      `;
      return;
    }
    paginationEl.innerHTML = `<p class="admin-note">${items.length} tales loaded - end of list.</p>`;
  }

  function renderDetail() {
    if (!detailEl) return;

    if (!selectedId) {
      detailEl.innerHTML = '';
      return;
    }

    if (detailLoading) {
      detailEl.innerHTML = '<p class="admin-note">Loading tale...</p>';
      return;
    }

    if (detailError && !detail) {
      detailEl.innerHTML = `
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
      return;
    }

    if (!detail) {
      detailEl.innerHTML = '';
      return;
    }

    const id = String(detail.id ?? '');
    const title = displayTitle(detail.title);
    const deleted = detail.isDeleted === true || String(detail.status ?? '') === 'deleted';
    const chapters = Array.isArray(detail.chapters) ? detail.chapters : null;
    const chapterRows = chapters
      ? chapters
          .map((chapter) => {
            const chapterIndex = chapter.index ?? chapter.id;
            return `
              <tr>
                <td>${escapeAdminHtml(formatAdminCount(chapter.index))}</td>
                <td>${escapeAdminHtml(displayTitle(chapter.title))}</td>
                <td>${escapeAdminHtml(formatAdminCount(chapter.wordCount))}</td>
                <td>${escapeAdminHtml(formatAdminDate(chapter.updatedAt))}</td>
                <td class="admin-table__cell--right">
                  <a
                    class="admin-btn admin-btn--sm admin-btn--secondary"
                    href="reader.html?taleId=${encodeURIComponent(id)}&chapterId=${encodeURIComponent(
                      String(chapterIndex ?? '')
                    )}"
                  >
                    Open
                  </a>
                </td>
              </tr>
            `;
          })
          .join('')
      : '';

    const chapterSection = !chapters
      ? `<p class="admin-note">${
          detail.chaptersUnavailable
            ? 'The chapter list could not be read.'
            : 'No chapter documents were found for this tale.'
        }</p>`
      : chapters.length === 0
        ? '<p class="admin-note">No chapter documents were found for this tale.</p>'
        : `
          <div class="admin-table-wrapper">
            <table class="admin-table">
              <thead><tr><th>#</th><th>Chapter</th><th>Words</th><th>Updated</th><th></th></tr></thead>
              <tbody>${chapterRows}</tbody>
            </table>
          </div>
          ${
            detail.chaptersTruncated
              ? '<p class="admin-note">Showing the first 50 chapters only.</p>'
              : ''
          }
        `;

    const statusOptions = TALE_STATUSES.map(
      (value) =>
        `<option value="${value}" ${
          String(detail.status ?? '') === value ? 'selected' : ''
        }>${value}</option>`
    ).join('');
    const visibilityOptions = TALE_VISIBILITIES.map(
      (value) =>
        `<option value="${value}" ${
          String(detail.visibility ?? '') === value ? 'selected' : ''
        }>${VISIBILITY_LABELS[value] ?? value}</option>`
    ).join('');

    detailEl.innerHTML = `
      <section class="admin-detail-panel" aria-labelledby="admin-content-detail-title">
        <div class="admin-detail-panel__header">
          <div>
            <p class="admin-detail-panel__subtitle">${statusBadge(detail)}</p>
            <h3 id="admin-content-detail-title" class="admin-detail-panel__title">${escapeAdminHtml(
              title
            )}</h3>
            <p class="admin-detail-panel__subtitle">${escapeAdminHtml(displayAuthor(detail))} - ${escapeAdminHtml(
              id
            )}</p>
          </div>
          <button type="button" class="admin-btn admin-btn--sm" data-action="close-detail">
            Close
          </button>
        </div>

        <div class="admin-detail-grid">
          ${buildDetailField(
            'Title',
            `<input class="admin-input" data-role="tale-title" maxlength="200" value="${escapeAdminHtml(
              title
            )}" />`,
            { wide: true }
          )}
          ${buildDetailField(
            'Status',
            `<select class="admin-select" data-role="tale-status" ${
              deleted ? 'disabled' : ''
            }>${statusOptions}</select>`
          )}
          ${buildDetailField(
            'Visibility',
            `<select class="admin-select" data-role="tale-visibility" ${
              deleted ? 'disabled' : ''
            }>${visibilityOptions}</select>`
          )}
          ${
            deleted
              ? buildDetailField('Deleted at', escapeAdminHtml(formatAdminDate(detail.deletedAt)))
              : ''
          }
          ${
            deleted
              ? buildDetailField(
                  'Deletion type',
                  escapeAdminHtml(detail.deletionType || 'administrator')
                )
              : ''
          }
          ${
            deleted
              ? buildDetailField(
                  'Moderation category',
                  escapeAdminHtml(
                    MODERATION_CATEGORY_LABELS[detail.moderationCategory] ||
                      detail.moderationCategory ||
                      'Other'
                  )
                )
              : ''
          }
          ${
            deleted && detail.deletionReason
              ? buildDetailField('Removal reason', escapeAdminHtml(detail.deletionReason), true)
              : ''
          }
          ${buildDetailField('Author', escapeAdminHtml(displayAuthor(detail)))}
          ${buildDetailField('Chapters', escapeAdminHtml(formatAdminCount(detail.chapterCount)))}
          ${buildDetailField('Words', escapeAdminHtml(formatAdminCount(detail.wordCount)))}
          ${buildDetailField('Comments', escapeAdminHtml(formatAdminCount(detail.commentCount)))}
          ${buildDetailField('Updated', escapeAdminHtml(formatAdminDate(detail.updatedAt)))}
          ${buildDetailField('Published', escapeAdminHtml(formatAdminDate(detail.publishedAt)))}
          ${buildDetailField(
            'Public link',
            deleted
              ? '<span class="admin-note">Unavailable while deleted</span>'
              : `<a class="admin-btn admin-btn--sm admin-btn--secondary" href="tale.html?id=${encodeURIComponent(
                  id
                )}">Open tale</a>`
          )}
        </div>

        <div class="admin-actions">
          ${
            deleted
              ? `
                <button
                  type="button"
                  class="admin-btn"
                  data-action="restore-tale"
                  ${actionBusy ? 'disabled' : ''}
                >
                  ${actionBusy ? 'Working...' : 'Restore tale'}
                </button>
                <button
                  type="button"
                  class="admin-btn admin-btn--danger"
                  data-action="purge-tale"
                  ${actionBusy ? 'disabled' : ''}
                >
                  Permanently delete
                </button>
              `
              : `
                <button type="button" class="admin-btn" data-action="save-tale">
                  ${actionBusy ? 'Saving...' : 'Save changes'}
                </button>
                <label class="admin-field">
                  <span class="admin-field__label">Removal category</span>
                  <select class="admin-select" data-role="delete-category">
                    ${MODERATION_CATEGORIES.map(
                      (value) =>
                        `<option value="${value}"${
                          value === 'other' ? ' selected' : ''
                        }>${escapeAdminHtml(MODERATION_CATEGORY_LABELS[value] ?? value)}</option>`
                    ).join('')}
                  </select>
                </label>
                <label class="admin-field admin-field--grow">
                  <span class="admin-field__label">Removal reason (optional)</span>
                  <input
                    class="admin-input"
                    data-role="delete-reason"
                    maxlength="500"
                    placeholder="Why this tale is being removed from public view"
                  />
                </label>
                <button
                  type="button"
                  class="admin-btn admin-btn--danger"
                  data-action="delete-tale"
                  ${actionBusy ? 'disabled' : ''}
                >
                  Remove from public view
                </button>
              `
          }
          <button
            type="button"
            class="admin-btn admin-btn--sm admin-btn--secondary"
            data-action="close-detail"
          >
            Close
          </button>
        </div>

        <p class="admin-readonly-note">
          Firestore permits staff to change the title, status, and visibility. Chapter text is
          author-owned and remains read-only here. Removing a tale is a soft deletion: the record
          and its subcollections stay in place, the tale leaves public discovery, and it can be
          restored from this panel or the Deletions workspace.
        </p>

        <h4 class="admin-detail-panel__title">Chapters</h4>
        ${chapterSection}
      </section>
    `;
  }

  function renderAll() {
    renderCount();
    renderResults();
    renderPagination();
    renderDetail();
  }

  function setActionBusy(value) {
    actionBusy = value;
    const saveButton = container.querySelector('[data-action="save-tale"]');
    const deleteButton = container.querySelector('[data-action="delete-tale"]');
    const restoreButton = container.querySelector('[data-action="restore-tale"]');
    const purgeButton = container.querySelector('[data-action="purge-tale"]');
    if (saveButton) {
      saveButton.disabled = value;
      saveButton.textContent = value ? 'Saving...' : 'Save changes';
    }
    if (deleteButton) deleteButton.disabled = value;
    if (restoreButton) restoreButton.disabled = value;
    if (purgeButton) purgeButton.disabled = value;
  }

  async function loadFirstPage() {
    const version = ++listVersion;
    loading = true;
    loadingMore = false;
    listError = '';
    items = [];
    lastDoc = null;
    hasMore = false;
    selectedId = null;
    detail = null;
    detailError = '';
    detailLoading = false;
    renderAll();

    try {
      const page = await listTalesPage({
        status,
        search: searchTerm,
        direction,
        pageSize: PAGE_SIZE,
      });
      if (destroyed || version !== listVersion) return;
      items = page.items;
      lastDoc = page.lastDoc;
      hasMore = page.hasMore;
    } catch (err) {
      if (destroyed || version !== listVersion) return;
      listError = String(err?.message ?? '').trim() || 'Could not load the tale archive.';
    } finally {
      if (!destroyed && version === listVersion) {
        loading = false;
        renderAll();
      }
    }
  }

  async function loadMore() {
    if (!hasMore || !lastDoc || loading || loadingMore) return;
    const version = listVersion;
    loadingMore = true;
    renderPagination();

    try {
      const page = await listTalesPage({
        status,
        search: searchTerm,
        direction,
        cursor: lastDoc,
        pageSize: PAGE_SIZE,
      });
      if (destroyed || version !== listVersion) return;
      items = [...items, ...page.items];
      lastDoc = page.lastDoc;
      hasMore = page.hasMore;
    } catch (err) {
      if (destroyed || version !== listVersion) return;
      showToast(String(err?.message ?? '').trim() || 'Could not load more tales.', 'error');
    } finally {
      if (!destroyed && version === listVersion) {
        loadingMore = false;
        renderCount();
        renderResults();
        renderPagination();
      }
    }
  }

  async function openDetail(taleId, force = false) {
    const id = String(taleId ?? '').trim();
    if (!id) return;

    if (selectedId === id && !force) {
      closeDetail();
      return;
    }

    selectedId = id;
    detail = null;
    detailError = '';
    detailLoading = true;
    const version = ++detailVersion;
    renderResults();
    renderDetail();

    try {
      const result = await getTaleDetail(id);
      if (destroyed || version !== detailVersion) return;
      if (!result) {
        closeDetail();
        showToast('That tale no longer exists.', 'error');
        return;
      }
      detail = result;
    } catch (err) {
      if (destroyed || version !== detailVersion) return;
      detailError = String(err?.message ?? '').trim() || 'Could not load that tale.';
      showToast(detailError, 'error');
    } finally {
      if (!destroyed && version === detailVersion) {
        detailLoading = false;
        renderDetail();
      }
    }
  }

  function closeDetail() {
    selectedId = null;
    detail = null;
    detailError = '';
    detailLoading = false;
    detailVersion += 1;
    renderResults();
    renderDetail();
  }

  async function saveTale() {
    if (!detail || actionBusy) return;
    const titleInput = container.querySelector('[data-role="tale-title"]');
    const statusInput = container.querySelector('[data-role="tale-status"]');
    const visibilityInput = container.querySelector('[data-role="tale-visibility"]');
    const nextTitle = String(titleInput?.value ?? '').trim();
    const nextStatus = String(statusInput?.value ?? '').trim();
    const nextVisibility = String(visibilityInput?.value ?? '').trim();

    if (!nextTitle) {
      showToast('A tale title is required.', 'error');
      titleInput?.focus();
      return;
    }

    if (
      nextTitle === displayTitle(detail.title) &&
      nextStatus === String(detail.status ?? '') &&
      nextVisibility === String(detail.visibility ?? '')
    ) {
      showToast('No changes to save.', 'info');
      return;
    }

    setActionBusy(true);
    try {
      await updateTale(detail.id, {
        title: nextTitle,
        status: nextStatus,
        visibility: nextVisibility,
      });
      showToast('Tale updated.', 'success');
      closeDetail();
      await loadFirstPage();
    } catch (err) {
      showToast(String(err?.message ?? '').trim() || 'Could not update that tale.', 'error');
    } finally {
      if (!destroyed) setActionBusy(false);
    }
  }

  async function removeTale() {
    if (!detail || actionBusy) return;
    const title = displayTitle(detail.title);
    const reasonField = container.querySelector('[data-role="delete-reason"]');
    const categoryField = container.querySelector('[data-role="delete-category"]');
    const reason = reasonField instanceof HTMLInputElement ? reasonField.value.trim() : '';
    const category =
      categoryField instanceof HTMLSelectElement && categoryField.value
        ? categoryField.value
        : 'other';
    const confirmed = await showConfirmModal({
      title: 'Remove this tale from public view?',
      message: `Remove <strong>${escapeAdminHtml(
        title
      )}</strong> from public discovery? The tale can be restored later from the Deletions workspace.`,
      subtext:
        'The tale document, chapters, and comments stay in Firestore. Its public status is set to deleted and its visibility to private.',
      confirmText: 'Remove from public view',
      cancelText: 'Keep tale',
      confirmVariant: 'danger',
      icon: 'eye-off',
    });
    if (!confirmed || destroyed) return;

    setActionBusy(true);
    try {
      await deleteTale(detail.id, { reason, category });
      showToast('Tale removed from public view. It can be restored from Deletions.', 'success');
      closeDetail();
      await loadFirstPage();
    } catch (err) {
      showToast(String(err?.message ?? '').trim() || 'Could not remove that tale.', 'error');
    } finally {
      if (!destroyed) setActionBusy(false);
    }
  }

  async function restoreDeletedTale() {
    if (!detail || actionBusy) return;
    setActionBusy(true);
    try {
      await restoreTale(detail.id);
      showToast('Tale restored.', 'success');
      closeDetail();
      await loadFirstPage();
    } catch (err) {
      showToast(String(err?.message ?? '').trim() || 'Could not restore that tale.', 'error');
    } finally {
      if (!destroyed) setActionBusy(false);
    }
  }

  async function purgeDeletedTale() {
    if (!detail || actionBusy) return;
    const title = displayTitle(detail.title);
    const confirmed = await showConfirmModal({
      title: 'Permanently delete this tale?',
      message: `Permanently delete <strong>${escapeAdminHtml(
        title
      )}</strong>? This cannot be undone and the tale document will be removed.`,
      subtext:
        'Chapter and comment subcollections are not cascaded by Firestore and may remain after the tale document is removed.',
      confirmText: 'Delete permanently',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
      icon: 'trash-2',
    });
    if (!confirmed || destroyed) return;

    setActionBusy(true);
    try {
      await purgeTale(detail.id);
      showToast('Tale permanently deleted.', 'success');
      closeDetail();
      await loadFirstPage();
    } catch (err) {
      showToast(
        String(err?.message ?? '').trim() || 'Could not permanently delete that tale.',
        'error'
      );
    } finally {
      if (!destroyed) setActionBusy(false);
    }
  }

  function handleClick(event) {
    const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (!target) return;
    const action = target.getAttribute('data-action');
    if (action === 'retry') loadFirstPage();
    else if (action === 'load-more') loadMore();
    else if (action === 'view-tale') openDetail(target.getAttribute('data-id'));
    else if (action === 'close-detail') closeDetail();
    else if (action === 'retry-detail' && selectedId) openDetail(selectedId, true);
    else if (action === 'save-tale') saveTale();
    else if (action === 'delete-tale') removeTale();
    else if (action === 'restore-tale') restoreDeletedTale();
    else if (action === 'purge-tale') purgeDeletedTale();
  }

  function handleInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.getAttribute('data-role') !== 'search') {
      return;
    }
    searchTerm = target.value.trim();
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchTimer = null;
      if (!destroyed) loadFirstPage();
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const role = target.getAttribute('data-role');
    if (role === 'status') status = target.value;
    else if (role === 'direction') direction = target.value;
    else return;
    loadFirstPage();
  }

  container.addEventListener('click', handleClick);
  container.addEventListener('input', handleInput);
  container.addEventListener('change', handleChange);

  loadFirstPage();

  return () => {
    destroyed = true;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = null;
    container.removeEventListener('click', handleClick);
    container.removeEventListener('input', handleInput);
    container.removeEventListener('change', handleChange);
  };
}

export default { mount };
