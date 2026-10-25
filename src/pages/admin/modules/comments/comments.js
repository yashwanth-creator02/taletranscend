// src/pages/admin/modules/comments/comments.js
// Global comment moderation across every tale. The list is a collection-group
// query; hide, pin, and delete resolve against the nested comment rule.

import {
  COMMENT_FILTERS,
  deleteComment,
  getCommentDetail,
  listCommentsPage,
  moderateComment,
  purgeComment,
  restoreComment,
} from '@services/admin/comments.service.js';
import { MODERATION_CATEGORIES, MODERATION_CATEGORY_LABELS } from '@services/moderation.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';
import {
  formatAdminDate,
  formatAdminCount,
  truncateAdminText,
  escapeAdminHtml,
} from '../../admin.utils.js';
import { buildAdminEmptyState, buildModuleLoading } from '../../admin.templates.js';

const PAGE_SIZE = 20;
const EMPTY_VALUE = '\u2014';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All comments' },
  { value: 'visible', label: 'Visible only' },
  { value: 'hidden', label: 'Hidden only' },
  { value: 'pinned', label: 'Pinned only' },
  { value: 'deleted', label: 'Removed only' },
];

const DIRECTION_OPTIONS = [
  { value: 'desc', label: 'Newest first' },
  { value: 'asc', label: 'Oldest first' },
];

/**
 * @param {{ container: HTMLElement, access?: import('../../admin.state.js').AdminAccess }} options
 * @returns {() => void}
 */
export function mount({ container, access } = {}) {
  if (!container) return () => {};

  if (!access?.isStaff) {
    container.innerHTML = `
      <section aria-labelledby="admin-comments-denied-title">
        <h2 id="admin-comments-denied-title" class="admin-section-title">Comments</h2>
        <p class="admin-readonly-note">
          Comment moderation is available to administrators and moderators only.
        </p>
      </section>
    `;
    return () => {};
  }

  let items = [];
  let lastDoc = null;
  let hasMore = false;
  let filter = 'all';
  let direction = 'desc';
  let loading = false;
  let loadingMore = false;
  let listError = '';
  let selectedKey = '';
  let selectedTaleId = '';
  let selectedCommentId = '';
  let detail = null;
  let detailLoading = false;
  let detailError = '';
  let actionBusy = false;
  let listVersion = 0;
  let detailVersion = 0;
  let destroyed = false;

  container.innerHTML = `
    <section aria-labelledby="admin-comments-title">
      <h2 id="admin-comments-title" class="admin-section-title">Comments</h2>
      <p class="admin-note">
        Every comment across every tale. Hiding removes a comment from the public comment surfaces;
        pinning raises it to the top there. Removing a comment clears its public text, archives the
        original for staff, and keeps a placeholder in the thread. Removed comments can be restored
        or permanently deleted from this panel. Lists are cursor-paginated, so use Load More to
        continue.
      </p>

      <div class="admin-toolbar">
        <label class="admin-field">
          <span class="admin-field__label">Filter</span>
          <select class="admin-select" data-role="filter">
            ${FILTER_OPTIONS.map(
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

  /** @param {unknown} value */
  function textOrDash(value) {
    const text = String(value ?? '').trim();
    return text || EMPTY_VALUE;
  }

  /** @param {unknown} value */
  function displayText(value) {
    return String(value ?? '').trim();
  }

  /** @param {Record<string, unknown>} comment */
  function displayAuthor(comment) {
    return displayText(comment?.authorName) || displayText(comment?.authorId) || 'Unknown';
  }

  /** @param {unknown} value */
  function escapeWithBreaks(value) {
    return escapeAdminHtml(value).replace(/\r?\n/g, '<br />');
  }

  /** @param {Record<string, unknown>} comment */
  function stateBadges(comment) {
    const parts = [];
    if (comment?.isDeleted === true) {
      parts.push('<span class="admin-badge admin-badge--dismissed">Deleted</span>');
    } else if (comment?.isHidden === true) {
      parts.push('<span class="admin-badge admin-badge--rejected">Hidden</span>');
    } else {
      parts.push('<span class="admin-badge admin-badge--published">Visible</span>');
    }
    if (comment?.isPinned === true) {
      parts.push('<span class="admin-badge admin-badge--warning">Pinned</span>');
    }
    return parts.join(' ');
  }

  /** @param {Record<string, unknown>} comment */
  function commentBody(comment) {
    if (comment?.isDeleted === true) {
      return comment?.deletionType === 'author'
        ? 'Removed by its author.'
        : 'Removed from public view by an administrator.';
    }
    return displayText(comment?.text) || 'No text in this comment.';
  }

  /** @param {Record<string, unknown>} comment */
  function archivedBody(comment) {
    const archived = displayText(comment?.archive?.text);
    return archived || displayText(comment?.text) || 'No archived text was found.';
  }

  /** @param {Record<string, unknown>} comment */
  function categoryLabel(comment) {
    const key = displayText(comment?.moderationCategory);
    return key ? (MODERATION_CATEGORY_LABELS[key] ?? key) : '';
  }

  /** @param {string} label @param {string} valueHtml @param {{ wide?: boolean }} [options] */
  function buildDetailField(label, valueHtml, { wide = false } = {}) {
    return `
      <div class="admin-detail-field${wide ? ' admin-detail-field--wide' : ''}">
        <span class="admin-detail-field__label">${escapeAdminHtml(label)}</span>
        <div class="admin-detail-field__value">${valueHtml}</div>
      </div>
    `;
  }

  function renderCount() {
    if (!countEl) return;
    if (listError) {
      countEl.textContent = 'Comment list unavailable.';
      return;
    }
    if (loading && items.length === 0) {
      countEl.textContent = 'Loading comments...';
      return;
    }
    const noun = items.length === 1 && !hasMore ? 'comment' : 'comments';
    const filterLabel = FILTER_OPTIONS.find((option) => option.value === filter)?.label ?? '';
    countEl.textContent = `${items.length}${hasMore ? '+' : ''} ${noun} - ${filterLabel}${
      loadingMore ? ' - loading more' : ''
    }`;
  }

  function renderResults() {
    if (!resultsEl) return;

    if (loading && items.length === 0) {
      resultsEl.innerHTML = buildModuleLoading('comments');
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
        title: filter === 'all' ? 'No comments in the archive' : `No ${filter} comments`,
        body:
          filter === 'hidden'
            ? 'No comment has been hidden yet.'
            : filter === 'pinned'
              ? 'No comment has been pinned yet.'
              : 'No comment records match this view.',
        icon: 'message-square',
      });
      return;
    }

    const rows = items
      .map((comment) => {
        const taleId = String(comment?.taleId ?? '');
        const commentId = String(comment?.id ?? '');
        const key = `${taleId}/${commentId}`;
        const selected = key === selectedKey;
        return `
          <tr>
            <td class="admin-table__cell--wide">
              <div class="admin-table__name">${escapeAdminHtml(
                truncateAdminText(commentBody(comment), 90)
              )}</div>
              <div class="admin-table__sub">ID ${escapeAdminHtml(
                truncateAdminText(commentId, 18)
              )}</div>
            </td>
            <td>
              <div class="admin-table__name">${escapeAdminHtml(displayAuthor(comment))}</div>
              <div class="admin-table__sub">${escapeAdminHtml(
                textOrDash(comment?.authorType)
              )}</div>
            </td>
            <td>
              <div class="admin-table__sub">${escapeAdminHtml(truncateAdminText(taleId, 22))}</div>
            </td>
            <td>${stateBadges(comment)}</td>
            <td>${escapeAdminHtml(formatAdminDate(comment?.createdAt))}</td>
            <td class="admin-table__cell--right">
              <button
                type="button"
                class="admin-btn admin-btn--sm"
                data-action="view-comment"
                data-tale-id="${escapeAdminHtml(taleId)}"
                data-comment-id="${escapeAdminHtml(commentId)}"
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
              <th>Comment</th>
              <th>Author</th>
              <th>Tale</th>
              <th>State</th>
              <th>Created</th>
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
          <span class="admin-note">${items.length} comments loaded</span>
        </div>
      `;
      return;
    }
    paginationEl.innerHTML = `<p class="admin-note">${items.length} comments loaded - end of list.</p>`;
  }

  function renderDetail() {
    if (!detailEl) return;

    if (!selectedKey) {
      detailEl.innerHTML = '';
      return;
    }

    if (detailLoading) {
      detailEl.innerHTML = '<p class="admin-note">Loading comment...</p>';
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

    const hidden = detail.isHidden === true;
    const pinned = detail.isPinned === true;
    const deleted = detail.isDeleted === true;
    const taleId = String(detail.taleId ?? '');
    const taleTitle = detail.tale?.title ? String(detail.tale.title) : '';
    const taleLabel = taleTitle || `Tale ${truncateAdminText(taleId, 18)}`;
    const taleStatus = detail.tale
      ? `${detail.tale.status || 'unknown status'} / ${detail.tale.visibility || 'unknown visibility'}`
      : 'Tale record unavailable';
    const categoryOptions = MODERATION_CATEGORIES.map(
      (value) =>
        `<option value="${value}" ${
          value === 'other' ? 'selected' : ''
        }>${escapeAdminHtml(MODERATION_CATEGORY_LABELS[value] ?? value)}</option>`
    ).join('');

    const deletionFields = deleted
      ? `
          ${buildDetailField('Removed', escapeAdminHtml(formatAdminDate(detail.deletedAt)))}
          ${buildDetailField('Removal type', escapeAdminHtml(textOrDash(detail.deletionType)))}
          ${buildDetailField('Category', escapeAdminHtml(categoryLabel(detail) || EMPTY_VALUE))}
          ${buildDetailField('Reason', escapeAdminHtml(textOrDash(detail.deletionReason)))}
        `
      : '';

    const actions = deleted
      ? `
          <button
            type="button"
            class="admin-btn"
            data-action="restore-comment"
            ${actionBusy ? 'disabled' : ''}
          >
            Restore comment
          </button>
          <button
            type="button"
            class="admin-btn admin-btn--danger"
            data-action="purge-comment"
            ${actionBusy ? 'disabled' : ''}
          >
            Permanently delete
          </button>
        `
      : `
          <button
            type="button"
            class="admin-btn"
            data-action="toggle-hidden"
            ${actionBusy ? 'disabled' : ''}
          >
            ${hidden ? 'Unhide comment' : 'Hide comment'}
          </button>
          <button
            type="button"
            class="admin-btn admin-btn--secondary"
            data-action="toggle-pinned"
            ${actionBusy || hidden ? 'disabled' : ''}
          >
            ${pinned ? 'Unpin comment' : 'Pin comment'}
          </button>
          <label class="admin-field">
            <span class="admin-field__label">Removal category</span>
            <select class="admin-select" data-role="removal-category">${categoryOptions}</select>
          </label>
          <label class="admin-field admin-field--grow">
            <span class="admin-field__label">Removal reason</span>
            <input
              class="admin-input"
              data-role="removal-reason"
              maxlength="500"
              placeholder="Shown in the audit record and public notice"
            />
          </label>
          <button
            type="button"
            class="admin-btn admin-btn--danger"
            data-action="delete-comment"
            ${actionBusy ? 'disabled' : ''}
          >
            Remove from public view
          </button>
        `;

    detailEl.innerHTML = `
      <section class="admin-detail-panel" aria-labelledby="admin-comments-detail-title">
        <div class="admin-detail-panel__header">
          <div>
            <p class="admin-detail-panel__subtitle">${stateBadges(detail)}</p>
            <h3 id="admin-comments-detail-title" class="admin-detail-panel__title">
              Comment by ${escapeAdminHtml(displayAuthor(detail))}
            </h3>
            <p class="admin-detail-panel__subtitle">${escapeAdminHtml(taleLabel)}</p>
          </div>
          <button type="button" class="admin-btn admin-btn--sm" data-action="close-detail">
            Close
          </button>
        </div>

        <div class="admin-detail-field admin-detail-field--wide">
          <span class="admin-detail-field__label">${
            deleted ? 'Archived original (staff only)' : 'Comment'
          }</span>
          <div class="admin-detail-field__value">${escapeWithBreaks(
            deleted ? archivedBody(detail) : commentBody(detail)
          )}</div>
        </div>

        <div class="admin-detail-grid">
          ${buildDetailField('Author', escapeAdminHtml(displayAuthor(detail)))}
          ${buildDetailField('Author ID', escapeAdminHtml(textOrDash(detail.authorId)))}
          ${buildDetailField('Type', escapeAdminHtml(textOrDash(detail.authorType)))}
          ${buildDetailField('Tale', escapeAdminHtml(taleLabel))}
          ${buildDetailField('Tale state', escapeAdminHtml(taleStatus))}
          ${buildDetailField('Created', escapeAdminHtml(formatAdminDate(detail.createdAt)))}
          ${buildDetailField('Updated', escapeAdminHtml(formatAdminDate(detail.updatedAt)))}
          ${buildDetailField('Reports', escapeAdminHtml(formatAdminCount(detail.reportCount)))}
          ${buildDetailField('Likes', escapeAdminHtml(formatAdminCount(detail.likeCount)))}
          ${buildDetailField('Replies', escapeAdminHtml(formatAdminCount(detail.replyCount)))}
          ${buildDetailField('Comment ID', escapeAdminHtml(textOrDash(detail.id)))}
          ${deletionFields}
          ${buildDetailField(
            'Public tale',
            `<a class="admin-btn admin-btn--sm admin-btn--secondary" href="tale.html?id=${encodeURIComponent(
              taleId
            )}">Open tale</a>`
          )}
        </div>

        <div class="admin-actions">${actions}</div>

        <p class="admin-readonly-note">
          ${
            deleted
              ? 'The public comment text is cleared and replaced with a moderation notice. The archived original above is visible to staff only. Restoring returns the original text to the thread; permanent deletion removes the comment document and cannot be undone.'
              : 'Hiding removes the comment from public comment surfaces. Pinning raises it above ordinary comments there; a hidden comment must be unhidden before it can be pinned. Removing clears the public text, archives the original for staff, and keeps a placeholder so replies retain their context. Removed comments can be restored from this panel.'
          }
        </p>
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
    const buttons = container.querySelectorAll(
      '[data-action="toggle-hidden"], [data-action="toggle-pinned"], [data-action="delete-comment"], [data-action="restore-comment"], [data-action="purge-comment"]'
    );
    buttons.forEach((button) => {
      button.disabled = value;
    });
    const pinButton = container.querySelector('[data-action="toggle-pinned"]');
    if (!value && pinButton && detail?.isHidden === true) {
      pinButton.disabled = true;
    }
  }

  async function loadFirstPage() {
    const version = ++listVersion;
    loading = true;
    loadingMore = false;
    listError = '';
    items = [];
    lastDoc = null;
    hasMore = false;
    selectedKey = '';
    selectedTaleId = '';
    selectedCommentId = '';
    detail = null;
    detailError = '';
    detailLoading = false;
    renderAll();

    try {
      const page = await listCommentsPage({
        filter,
        direction,
        pageSize: PAGE_SIZE,
      });
      if (destroyed || version !== listVersion) return;
      items = page.items;
      lastDoc = page.lastDoc;
      hasMore = page.hasMore;
    } catch (err) {
      if (destroyed || version !== listVersion) return;
      listError = String(err?.message ?? '').trim() || 'Could not load comments.';
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
      const page = await listCommentsPage({
        filter,
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
      showToast(String(err?.message ?? '').trim() || 'Could not load more comments.', 'error');
    } finally {
      if (!destroyed && version === listVersion) {
        loadingMore = false;
        renderCount();
        renderResults();
        renderPagination();
      }
    }
  }

  async function openDetail(taleId, commentId, force = false) {
    const parentId = String(taleId ?? '').trim();
    const id = String(commentId ?? '').trim();
    if (!parentId || !id) return;
    const key = `${parentId}/${id}`;

    if (selectedKey === key && !force) {
      closeDetail();
      return;
    }

    selectedKey = key;
    selectedTaleId = parentId;
    selectedCommentId = id;
    detail = null;
    detailError = '';
    detailLoading = true;
    const version = ++detailVersion;
    renderResults();
    renderDetail();

    try {
      const result = await getCommentDetail(parentId, id);
      if (destroyed || version !== detailVersion) return;
      if (!result) {
        closeDetail();
        showToast('That comment no longer exists.', 'error');
        return;
      }
      detail = result;
    } catch (err) {
      if (destroyed || version !== detailVersion) return;
      detailError = String(err?.message ?? '').trim() || 'Could not load that comment.';
      showToast(detailError, 'error');
    } finally {
      if (!destroyed && version === detailVersion) {
        detailLoading = false;
        renderDetail();
      }
    }
  }

  function closeDetail() {
    selectedKey = '';
    selectedTaleId = '';
    selectedCommentId = '';
    detail = null;
    detailError = '';
    detailLoading = false;
    detailVersion += 1;
    renderResults();
    renderDetail();
  }

  async function moderate(action) {
    if (!detail || actionBusy) return;
    if (action === 'pin' && detail.isHidden === true) {
      showToast('Unhide this comment before pinning it.', 'info');
      return;
    }

    setActionBusy(true);
    try {
      await moderateComment(selectedTaleId, selectedCommentId, action);
      const messages = {
        hide: 'Comment hidden.',
        unhide: 'Comment unhidden.',
        pin: 'Comment pinned.',
        unpin: 'Comment unpinned.',
      };
      showToast(messages[action] ?? 'Comment updated.', 'success');
      closeDetail();
      await loadFirstPage();
    } catch (err) {
      showToast(String(err?.message ?? '').trim() || 'Could not update that comment.', 'error');
    } finally {
      if (!destroyed) setActionBusy(false);
    }
  }

  async function removeComment() {
    if (!detail || actionBusy) return;
    const author = displayAuthor(detail);
    const categoryField = container.querySelector('[data-role="removal-category"]');
    const reasonField = container.querySelector('[data-role="removal-reason"]');
    const category =
      categoryField instanceof HTMLSelectElement &&
      MODERATION_CATEGORIES.includes(categoryField.value)
        ? categoryField.value
        : 'other';
    const reason = reasonField instanceof HTMLInputElement ? reasonField.value.trim() : '';
    const confirmed = await showConfirmModal({
      title: 'Remove this comment from public view?',
      message: `Remove the comment by <strong>${escapeAdminHtml(
        author
      )}</strong> from public view? The original text is archived for staff and the thread keeps a moderation notice.`,
      subtext: 'You can restore the comment from this panel or from Deletions.',
      confirmText: 'Remove from public view',
      cancelText: 'Keep comment',
      confirmVariant: 'danger',
      icon: 'eye-off',
    });
    if (!confirmed || destroyed) return;

    setActionBusy(true);
    try {
      await deleteComment(selectedTaleId, selectedCommentId, { reason, category });
      showToast('Comment removed from public view. It can be restored.', 'success');
      closeDetail();
      await loadFirstPage();
    } catch (err) {
      showToast(String(err?.message ?? '').trim() || 'Could not remove that comment.', 'error');
    } finally {
      if (!destroyed) setActionBusy(false);
    }
  }

  async function restoreDeletedComment() {
    if (!detail || actionBusy) return;
    const confirmed = await showConfirmModal({
      title: 'Restore this comment?',
      message: `Restore the original text of the comment by <strong>${escapeAdminHtml(
        displayAuthor(detail)
      )}</strong> to the public thread?`,
      subtext: 'The moderation notice is removed and the archived text becomes public again.',
      confirmText: 'Restore comment',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
      icon: 'rotate-ccw',
    });
    if (!confirmed || destroyed) return;

    setActionBusy(true);
    try {
      await restoreComment(selectedTaleId, selectedCommentId);
      showToast('Comment restored.', 'success');
      closeDetail();
      await loadFirstPage();
    } catch (err) {
      showToast(String(err?.message ?? '').trim() || 'Could not restore that comment.', 'error');
    } finally {
      if (!destroyed) setActionBusy(false);
    }
  }

  async function purgeDeletedComment() {
    if (!detail || actionBusy) return;
    const confirmed = await showConfirmModal({
      title: 'Permanently delete this comment?',
      message: `Permanently delete the removed comment by <strong>${escapeAdminHtml(
        displayAuthor(detail)
      )}</strong>?`,
      subtext:
        'This deletes the comment document and its staff archive. Replies are stored separately and are not deleted. This cannot be undone.',
      confirmText: 'Delete permanently',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
      icon: 'trash-2',
    });
    if (!confirmed || destroyed) return;

    setActionBusy(true);
    try {
      await purgeComment(selectedTaleId, selectedCommentId);
      showToast('Comment permanently deleted.', 'success');
      closeDetail();
      await loadFirstPage();
    } catch (err) {
      showToast(
        String(err?.message ?? '').trim() || 'Could not permanently delete that comment.',
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
    else if (action === 'view-comment') {
      openDetail(target.getAttribute('data-tale-id'), target.getAttribute('data-comment-id'));
    } else if (action === 'close-detail') closeDetail();
    else if (action === 'retry-detail' && selectedKey) {
      openDetail(selectedTaleId, selectedCommentId, true);
    } else if (action === 'toggle-hidden') {
      moderate(detail?.isHidden === true ? 'unhide' : 'hide');
    } else if (action === 'toggle-pinned') {
      moderate(detail?.isPinned === true ? 'unpin' : 'pin');
    } else if (action === 'delete-comment') {
      removeComment();
    } else if (action === 'restore-comment') {
      restoreDeletedComment();
    } else if (action === 'purge-comment') {
      purgeDeletedComment();
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const role = target.getAttribute('data-role');
    if (role === 'filter') filter = COMMENT_FILTERS.includes(target.value) ? target.value : 'all';
    else if (role === 'direction') direction = target.value === 'asc' ? 'asc' : 'desc';
    else return;
    loadFirstPage();
  }

  container.addEventListener('click', handleClick);
  container.addEventListener('change', handleChange);

  loadFirstPage();

  return () => {
    destroyed = true;
    container.removeEventListener('click', handleClick);
    container.removeEventListener('change', handleChange);
  };
}

export default { mount };
