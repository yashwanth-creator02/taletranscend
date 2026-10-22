// src/pages/admin/modules/author/author.js
import {
  DELETION_REASON_MAX,
  DELETION_REASON_MIN,
  getAuthorTalesPage,
  getAuthorDeletionRequestsPage,
  requestTaleDeletion,
} from '@services/admin/mycontent.service.js';
import { showToast } from '@/ui/components/toast.js';
import { formatAdminDate, formatAdminCount, escapeAdminHtml } from '../../admin.utils.js';
import { buildAdminEmptyState, buildModuleLoading } from '../../admin.templates.js';

const TALE_STATUSES = new Set(['draft', 'submitted', 'published', 'rejected']);
const REQUEST_STATUSES = new Set(['pending', 'approved', 'rejected']);

/**
 * Keep a status usable as a CSS modifier without allowing arbitrary tokens from
 * a document to reach the class attribute.
 * @param {unknown} value
 * @param {Set<string>} allowed
 * @param {string} fallback
 * @returns {string}
 */
function safeStatusToken(value, allowed, fallback) {
  const token = String(value ?? '')
    .trim()
    .toLowerCase();
  return allowed.has(token) ? token : fallback;
}

/**
 * @param {unknown} taleId
 * @returns {string}
 */
function taleHref(taleId) {
  return `tale.html?id=${encodeURIComponent(String(taleId ?? ''))}`;
}

/**
 * @param {{ container: HTMLElement, access: import('../../admin.state.js').AdminAccess }} opts
 * @returns {() => void}
 */
export function mount({ container }) {
  let tales = [];
  let deletionRequests = [];
  let talesLastDoc = null;
  let talesHasMore = false;
  let requestsLastDoc = null;
  let requestsHasMore = false;
  let loading = true;
  let error = false;
  let loadingMoreTales = false;
  let loadingMoreRequests = false;
  let submitting = false;
  /** @type {{ taleId: string, title: string, reason: string, error: string } | null} */
  let reasonForm = null;
  let disposed = false;

  function latestRequestFor(taleId) {
    return deletionRequests.find((request) => request.taleId === taleId) ?? null;
  }

  function requestBlocksAnother(request) {
    if (!request) return false;
    const status = safeStatusToken(request.status, REQUEST_STATUSES, 'unknown');
    return status !== 'rejected';
  }

  async function loadInitialData() {
    loading = true;
    error = false;
    render();

    try {
      const [talesResult, requestsResult] = await Promise.all([
        getAuthorTalesPage(null),
        getAuthorDeletionRequestsPage(null),
      ]);
      if (disposed) return;

      tales = talesResult.items;
      talesLastDoc = talesResult.lastDoc;
      talesHasMore = talesResult.hasMore;

      deletionRequests = requestsResult.items;
      requestsLastDoc = requestsResult.lastDoc;
      requestsHasMore = requestsResult.hasMore;
      error = false;
    } catch (err) {
      console.error('[author] failed to load author content', err);
      error = true;
    } finally {
      if (!disposed) {
        loading = false;
        render();
      }
    }
  }

  async function loadMoreTales() {
    if (disposed || loadingMoreTales || !talesHasMore || !talesLastDoc) return;
    loadingMoreTales = true;
    render();

    try {
      const result = await getAuthorTalesPage(talesLastDoc);
      if (disposed) return;
      tales = [...tales, ...result.items];
      talesLastDoc = result.lastDoc;
      talesHasMore = result.hasMore;
    } catch (err) {
      console.error('[author] failed to load more tales', err);
      if (!disposed) showToast('Could not load more tales.', 'error');
    } finally {
      if (!disposed) {
        loadingMoreTales = false;
        render();
      }
    }
  }

  async function loadMoreRequests() {
    if (disposed || loadingMoreRequests || !requestsHasMore || !requestsLastDoc) return;
    loadingMoreRequests = true;
    render();

    try {
      const result = await getAuthorDeletionRequestsPage(requestsLastDoc);
      if (disposed) return;
      deletionRequests = [...deletionRequests, ...result.items];
      requestsLastDoc = result.lastDoc;
      requestsHasMore = result.hasMore;
    } catch (err) {
      console.error('[author] failed to load more deletion requests', err);
      if (!disposed) showToast('Could not load more deletion requests.', 'error');
    } finally {
      if (!disposed) {
        loadingMoreRequests = false;
        render();
      }
    }
  }

  function openReasonForm(taleId) {
    const tale = tales.find((entry) => entry.id === taleId);
    if (!tale) return;
    if (requestBlocksAnother(latestRequestFor(taleId))) return;

    reasonForm = {
      taleId,
      title: tale.title || 'Untitled',
      reason: '',
      error: '',
    };
    render();
    const textarea = container.querySelector('[data-role="deletion-reason"]');
    textarea?.focus();
  }

  function showReasonError(message) {
    if (!reasonForm) return;
    reasonForm.error = message;
    const errorElement = container.querySelector('[data-role="deletion-form-error"]');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = false;
    }
    const textarea = container.querySelector('[data-role="deletion-reason"]');
    textarea?.setAttribute('aria-invalid', 'true');
  }

  async function handleSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.dataset.role !== 'deletion-form') return;
    event.preventDefault();
    if (!reasonForm || submitting) return;

    const textarea = form.querySelector('[data-role="deletion-reason"]');
    const reason = String(textarea?.value ?? reasonForm.reason).trim();
    if (reason.length < DELETION_REASON_MIN || reason.length > DELETION_REASON_MAX) {
      showReasonError(
        `Enter a reason between ${DELETION_REASON_MIN} and ${DELETION_REASON_MAX} characters.`
      );
      return;
    }

    reasonForm.reason = reason;
    reasonForm.error = '';
    submitting = true;
    render();

    try {
      await requestTaleDeletion(reasonForm.taleId, reason);
      if (disposed) return;
      reasonForm = null;
      submitting = false;
      showToast('Deletion request submitted.', 'success');
      await loadInitialData();
    } catch (err) {
      if (disposed) return;
      console.error('[author] failed to request tale deletion', err);
      submitting = false;
      reasonForm = {
        ...reasonForm,
        error: 'Could not submit the deletion request. Try again.',
      };
      render();
    }
  }

  function renderReasonForm() {
    if (!reasonForm) return '';

    return `
      <form class="admin-detail-panel" data-role="deletion-form">
        <div class="admin-detail-panel__header">
          <div>
            <h3 class="admin-detail-panel__title">Request deletion of &ldquo;${escapeAdminHtml(
              reasonForm.title
            )}&rdquo;</h3>
            <p class="admin-detail-panel__subtitle">
              Give the reviewers a reason between ${DELETION_REASON_MIN} and ${DELETION_REASON_MAX}
              characters. The tale stays public until an administrator approves the request.
            </p>
          </div>
          <button type="button" class="admin-btn" data-action="cancel-deletion">Cancel</button>
        </div>
        <label class="admin-field">
          <span class="admin-field__label">Reason</span>
          <textarea
            class="admin-textarea"
            data-role="deletion-reason"
            minlength="${DELETION_REASON_MIN}"
            maxlength="${DELETION_REASON_MAX}"
            required
          >${escapeAdminHtml(reasonForm.reason)}</textarea>
        </label>
        <p
          class="admin-error"
          data-role="deletion-form-error"
          role="alert"
          ${reasonForm.error ? '' : 'hidden'}
        >${escapeAdminHtml(reasonForm.error)}</p>
        <div class="admin-actions">
          <button type="submit" class="admin-btn admin-btn--danger" ${submitting ? 'disabled' : ''}>
            ${submitting ? 'Submitting...' : 'Submit request'}
          </button>
        </div>
      </form>
    `;
  }

  function renderTaleRows() {
    if (tales.length === 0) {
      return `<tr><td colspan="7">${buildAdminEmptyState({
        title: 'No tales found',
        body: 'You have not published any tales yet.',
        icon: 'feather',
      })}</td></tr>`;
    }

    return tales
      .map((tale) => {
        const status = safeStatusToken(tale.status, TALE_STATUSES, 'unknown');
        const request = latestRequestFor(tale.id);
        const requestStatus = request
          ? safeStatusToken(request.status, REQUEST_STATUSES, 'unknown')
          : '';
        const blocked = requestBlocksAnother(request);
        let buttonLabel = 'Request Deletion';
        if (blocked) {
          buttonLabel =
            requestStatus === 'pending'
              ? 'Request Pending'
              : requestStatus === 'approved'
                ? 'Removal Approved'
                : 'Request Unavailable';
        } else if (requestStatus === 'rejected') {
          buttonLabel = 'Request Again';
        }

        return `
          <tr>
            <td class="admin-table__cell--left">
              <a class="admin-table__name" href="${escapeAdminHtml(taleHref(tale.id))}">
                ${escapeAdminHtml(tale.title || 'Untitled')}
              </a>
            </td>
            <td><span class="admin-badge admin-badge--${status}">${escapeAdminHtml(
              status
            )}</span></td>
            <td>${escapeAdminHtml(formatAdminCount(tale.wordCount ?? 0))}</td>
            <td>${escapeAdminHtml(formatAdminDate(tale.publishedAt ?? tale.createdAt))}</td>
            <td>${escapeAdminHtml(formatAdminCount(tale.commentCount ?? 0))}</td>
            <td>
              ${
                requestStatus
                  ? `<span class="admin-badge admin-badge--${requestStatus}">${escapeAdminHtml(
                      requestStatus
                    )}</span>`
                  : '<span class="admin-table__sub">None</span>'
              }
            </td>
            <td class="admin-table__cell--right">
              <button
                type="button"
                class="admin-btn admin-btn--sm admin-btn--danger"
                data-action="request-deletion"
                data-tale-id="${escapeAdminHtml(tale.id)}"
                ${blocked ? 'disabled' : ''}
              >
                ${escapeAdminHtml(buttonLabel)}
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function renderRequestRows() {
    if (deletionRequests.length === 0) {
      return `<tr><td colspan="4">${buildAdminEmptyState({
        title: 'No deletion requests',
        body: 'You have no pending or past deletion requests.',
        icon: 'book-x',
      })}</td></tr>`;
    }

    return deletionRequests
      .map((request) => {
        const status = safeStatusToken(request.status, REQUEST_STATUSES, 'unknown');
        const href = taleHref(request.taleId);
        return `
          <tr>
            <td class="admin-table__cell--left">
              <a class="font-mono" href="${escapeAdminHtml(href)}">${escapeAdminHtml(
                request.taleId || '-'
              )}</a>
            </td>
            <td><span class="admin-badge admin-badge--${status}">${escapeAdminHtml(
              status
            )}</span></td>
            <td>${escapeAdminHtml(formatAdminDate(request.createdAt))}</td>
            <td class="admin-table__cell--left">${escapeAdminHtml(
              request.reason || 'No reason provided'
            )}</td>
          </tr>
        `;
      })
      .join('');
  }

  function render() {
    if (disposed) return;

    if (loading) {
      container.innerHTML = buildModuleLoading('your content');
      return;
    }

    const hasItems = tales.length > 0 || deletionRequests.length > 0;
    if (error && !hasItems) {
      container.innerHTML = `
        <section aria-labelledby="author-title">
          <h2 id="author-title" class="admin-section-title">Author Studio</h2>
          <div class="admin-error" role="alert">
            <p>Your tales and deletion requests could not be read.</p>
            <div class="admin-error__actions">
              <button type="button" class="admin-btn" data-action="retry">Try again</button>
            </div>
          </div>
        </section>
      `;
      return;
    }

    const errorHtml = error
      ? `
        <div class="admin-error" role="alert">
          <p>Some of your author content could not be refreshed.</p>
          <div class="admin-error__actions">
            <button type="button" class="admin-btn" data-action="retry">Try again</button>
          </div>
        </div>
      `
      : '';

    container.innerHTML = `
      <section aria-labelledby="author-title" class="admin-section">
        <div class="admin-section__header">
          <div>
            <h2 id="author-title" class="admin-section-title">Author Studio</h2>
            <p class="admin-note">
              Your own tales and removal petitions. Authors can read and act only on their own content.
            </p>
          </div>
        </div>

        ${errorHtml}
        ${renderReasonForm()}

        <div class="admin-content-stack">
          <div class="admin-content-panel">
            <div class="admin-content-panel__header">
              <h3 class="admin-content-panel__title">Your Tales</h3>
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
                    <th>Deletion Request</th>
                    <th class="admin-table__cell--right">Actions</th>
                  </tr>
                </thead>
                <tbody>${renderTaleRows()}</tbody>
              </table>
            </div>
            ${
              talesHasMore
                ? `<div class="admin-pagination-bar">
                     <button type="button" class="admin-btn admin-btn--secondary" data-action="load-more-tales" ${
                       loadingMoreTales ? 'disabled' : ''
                     }>
                       ${loadingMoreTales ? 'Loading...' : 'Load More Tales'}
                     </button>
                   </div>`
                : ''
            }
          </div>

          <div class="admin-content-panel">
            <div class="admin-content-panel__header">
              <h3 class="admin-content-panel__title">Your Deletion Requests</h3>
              <span class="admin-content-panel__count">${deletionRequests.length} requests</span>
            </div>
            <div class="admin-table-wrapper">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th class="admin-table__cell--left">Tale</th>
                    <th>Status</th>
                    <th>Requested Date</th>
                    <th class="admin-table__cell--left">Reason</th>
                  </tr>
                </thead>
                <tbody>${renderRequestRows()}</tbody>
              </table>
            </div>
            ${
              requestsHasMore
                ? `<div class="admin-pagination-bar">
                     <button type="button" class="admin-btn admin-btn--secondary" data-action="load-more-requests" ${
                       loadingMoreRequests ? 'disabled' : ''
                     }>
                       ${loadingMoreRequests ? 'Loading...' : 'Load More Requests'}
                     </button>
                   </div>`
                : ''
            }
          </div>
        </div>
      </section>
    `;
  }

  function handleClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest('[data-action="retry"]')) {
      loadInitialData();
      return;
    }

    const requestButton = target.closest('[data-action="request-deletion"]');
    if (requestButton instanceof HTMLButtonElement && !requestButton.disabled) {
      openReasonForm(requestButton.dataset.taleId);
      return;
    }

    if (target.closest('[data-action="cancel-deletion"]')) {
      reasonForm = null;
      render();
      return;
    }

    if (target.closest('[data-action="load-more-tales"]')) {
      loadMoreTales();
      return;
    }

    if (target.closest('[data-action="load-more-requests"]')) {
      loadMoreRequests();
    }
  }

  function handleInput(event) {
    const target = event.target;
    if (
      !(target instanceof HTMLTextAreaElement) ||
      target.dataset.role !== 'deletion-reason' ||
      !reasonForm
    ) {
      return;
    }

    reasonForm.reason = target.value;
    if (reasonForm.error) {
      reasonForm.error = '';
      const errorElement = container.querySelector('[data-role="deletion-form-error"]');
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.hidden = true;
      }
      target.removeAttribute('aria-invalid');
    }
  }

  container.addEventListener('click', handleClick);
  container.addEventListener('input', handleInput);
  container.addEventListener('submit', handleSubmit);
  loadInitialData();

  return () => {
    disposed = true;
    container.removeEventListener('click', handleClick);
    container.removeEventListener('input', handleInput);
    container.removeEventListener('submit', handleSubmit);
  };
}

export default { mount };
