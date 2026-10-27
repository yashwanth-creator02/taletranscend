// src/pages/admin/modules/users/users.js
// Administrator user directory: real profiles, cursor pagination, a detail
// panel, and writer verification. Every action is delegated from the module
// container, so no inline handlers or window globals are needed.

import {
  listUsersPage,
  getUserDetail,
  updateWriterVerification,
} from '@services/admin/users.service.js';
import { sendAdminMessage } from '@services/admin/reports.service.js';
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

/**
 * @param {{ container: HTMLElement, access?: import('../../admin.state.js').AdminAccess }} options
 * @returns {() => void}
 */
export function mount({ container, access } = {}) {
  if (!container) return () => {};

  if (!access?.isAdmin) {
    container.innerHTML = `
      <section aria-labelledby="admin-users-denied-title">
        <h2 id="admin-users-denied-title" class="admin-section-title">Users</h2>
        <p class="admin-readonly-note">
          Administrator access is required to review reader profiles. No data was read.
        </p>
      </section>
    `;
    return () => {};
  }

  let items = [];
  let lastDoc = null;
  let hasMore = false;
  let loading = false;
  let listError = false;
  let searchTerm = '';
  let sort = 'name';
  let selectedUid = null;
  let detail = null;
  let detailLoading = false;
  let detailError = '';
  let actionBusy = false;
  let messageOpen = false;
  let messageBusy = false;
  let searchTimer = null;
  let listVersion = 0;
  let detailVersion = 0;
  let destroyed = false;

  container.innerHTML = `
    <section aria-labelledby="admin-users-title">
      <h2 id="admin-users-title" class="admin-section-title">Users</h2>
      <p class="admin-note">
        Profiles come from the Firestore users collection, not Firebase Auth. An Auth account
        without a profile document does not appear here, and the browser SDK cannot list Auth
        accounts at all: that requires server-side Admin SDK access. The only profile action
        offered here is writer verification. Role labels are display data; staff authority follows
        Firebase Auth custom claims, and account bans require an enforcement surface that this
        dashboard does not have. The table is cursor-paginated, so use Load More to continue.
      </p>

      <div class="admin-toolbar">
        <label class="admin-field admin-field--grow">
          <span class="admin-field__label">Search</span>
          <input
            class="admin-input"
            type="search"
            data-role="search"
            placeholder="Search by name or paste a user ID"
            autocomplete="off"
          />
        </label>
        <label class="admin-field">
          <span class="admin-field__label">Sort</span>
          <select class="admin-select" data-role="sort">
            <option value="name">Name (A-Z)</option>
            <option value="newest">Newest first</option>
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

  /** @param {Record<string, unknown>} user */
  function displayName(user) {
    const name = typeof user?.name === 'string' ? user.name.trim() : '';
    const penName = typeof user?.penName === 'string' ? user.penName.trim() : '';
    return name || penName || 'Anonymous Reader';
  }

  /** @param {Record<string, unknown>} user */
  function displayRole(user) {
    const role = String(user?.role ?? '').trim();
    return role || 'user';
  }

  /** @param {unknown} value */
  function textOrDash(value) {
    const text = String(value ?? '').trim();
    return text || EMPTY_VALUE;
  }

  /** @param {string} label @param {string} valueHtml @param {{ wide?: boolean }} [options] */
  function buildDetailField(label, valueHtml, { wide = false } = {}) {
    return `
      <div class="admin-detail-field${wide ? ' admin-detail-field--wide' : ''}">
        <p class="admin-detail-field__label">${escapeAdminHtml(label)}</p>
        <p class="admin-detail-field__value">${valueHtml}</p>
      </div>
    `;
  }

  /** @param {Record<string, unknown>} user */
  function buildFlagBadges(user) {
    const verified = user?.isVerifiedWriter === true;
    return `
      <span class="admin-meta-row">
        <span class="admin-badge ${verified ? 'admin-badge--approved' : 'admin-badge--dismissed'}">
          ${verified ? 'Verified writer' : 'Unverified'}
        </span>
      </span>
    `;
  }

  /**
   * Builds the inline administrator message composer for the selected reader.
   *
   * @param {string} uid
   * @returns {string}
   */
  function buildMessageComposer(uid) {
    return `
      <div class="admin-message-composer" aria-labelledby="admin-user-message-title">
        <h4 id="admin-user-message-title" class="admin-detail-panel__title">Message this reader</h4>
        <p class="admin-detail-panel__subtitle">
          Delivers a direct administrative message to this user's inbox.
        </p>
        <div class="admin-detail-grid">
          <div class="admin-detail-field admin-detail-field--wide">
            <label class="admin-field__label" for="admin-user-message-recipient">Recipient user ID</label>
            <input
              class="admin-input"
              id="admin-user-message-recipient"
              value="${escapeAdminHtml(uid)}"
              readonly
            />
          </div>
          <div class="admin-detail-field admin-detail-field--wide">
            <label class="admin-field__label" for="admin-user-message-subject">Subject</label>
            <input
              class="admin-input"
              id="admin-user-message-subject"
              data-role="user-message-subject"
              maxlength="160"
              autocomplete="off"
            />
          </div>
          <div class="admin-detail-field admin-detail-field--wide">
            <label class="admin-field__label" for="admin-user-message-body">Message</label>
            <textarea
              class="admin-textarea"
              id="admin-user-message-body"
              data-role="user-message-body"
              maxlength="5000"
              rows="4"
            ></textarea>
          </div>
        </div>
        <div class="admin-actions">
          <button
            type="button"
            class="admin-btn admin-btn--sm"
            data-action="send-user-message"
            data-uid="${escapeAdminHtml(uid)}"
            ${messageBusy ? 'disabled' : ''}
          >
            ${messageBusy ? 'Sending...' : 'Send message'}
          </button>
          <button
            type="button"
            class="admin-btn admin-btn--sm admin-btn--secondary"
            data-action="cancel-user-message"
            ${messageBusy ? 'disabled' : ''}
          >
            Cancel
          </button>
        </div>
      </div>
    `;
  }

  /** @param {Record<string, unknown>} user */
  function buildUserRow(user) {
    const uid = String(user?.uid ?? user?.id ?? '');
    const name = displayName(user);
    const role = displayRole(user);
    const selected = uid === selectedUid;

    return `
      <tr>
        <td class="admin-table__cell--left">
          <span class="admin-table__mark">${escapeAdminHtml(adminInitials(name))}</span>
          <div class="admin-table__name">${escapeAdminHtml(truncateAdminText(name, 48))}</div>
          <div class="admin-table__sub font-mono">${escapeAdminHtml(uid || EMPTY_VALUE)}</div>
        </td>
        <td><span class="admin-badge">${escapeAdminHtml(role)}</span></td>
        <td>${escapeAdminHtml(formatAdminDate(user?.joinedAt))}</td>
        <td>${buildFlagBadges(user)}</td>
        <td class="admin-table__cell--right">
          <button
            type="button"
            class="admin-btn admin-btn--sm"
            data-action="view-user"
            data-uid="${escapeAdminHtml(uid)}"
          >
            ${selected ? 'Close' : 'View'}
          </button>
        </td>
      </tr>
    `;
  }

  function renderCount() {
    if (!countEl) return;
    if (listError) {
      countEl.textContent = 'User list unavailable.';
      return;
    }
    if (loading && items.length === 0) {
      countEl.textContent = 'Loading users...';
      return;
    }
    const noun = items.length === 1 && !hasMore ? 'result' : 'results';
    countEl.textContent = `${items.length}${hasMore ? '+' : ''} ${noun}${
      loading ? ' - loading more' : ''
    }`;
  }

  function renderResults() {
    if (!resultsEl) return;

    if (loading && items.length === 0) {
      resultsEl.innerHTML = buildModuleLoading('users');
      return;
    }

    if (listError && items.length === 0) {
      resultsEl.innerHTML = `
        <div class="admin-error" role="alert">
          <p>Could not load user profiles. Nothing was changed.</p>
          <div class="admin-error__actions">
            <button type="button" class="admin-btn admin-btn--sm" data-action="retry-list">
              Retry
            </button>
          </div>
        </div>
      `;
      return;
    }

    if (items.length === 0) {
      resultsEl.innerHTML = buildAdminEmptyState({
        title: searchTerm ? 'No matching users' : 'No user profiles yet',
        body: searchTerm
          ? `No profile name matches "${searchTerm}". Try a shorter search or paste a full user ID.`
          : 'Profiles appear here once readers create one. No tales are required.',
        icon: 'users',
      });
      return;
    }

    const rows = items.map((user) => buildUserRow(user)).join('');

    resultsEl.innerHTML = `
      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="admin-table__cell--left">Reader</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Status</th>
              <th class="admin-table__cell--right">Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderPagination() {
    if (!paginationEl) return;
    if (!hasMore) {
      paginationEl.innerHTML = '';
      return;
    }
    paginationEl.innerHTML = `
      <div class="admin-pagination-bar">
        <button
          type="button"
          class="admin-btn admin-btn--sm"
          data-action="load-more"
          ${loading ? 'disabled' : ''}
        >
          Load More
        </button>
      </div>
    `;
  }

  function renderDetail() {
    if (!detailEl) return;

    if (!selectedUid) {
      detailEl.innerHTML = '';
      return;
    }

    if (detailLoading && !detail) {
      detailEl.innerHTML = buildModuleLoading('profile');
      return;
    }

    if (detailError) {
      detailEl.innerHTML = `
        <div class="admin-error" role="alert">
          <p>${escapeAdminHtml(detailError)}</p>
          <div class="admin-error__actions">
            <button
              type="button"
              class="admin-btn admin-btn--sm"
              data-action="retry-detail"
              data-uid="${escapeAdminHtml(selectedUid)}"
            >
              Retry
            </button>
            <button type="button" class="admin-btn admin-btn--sm" data-action="close-detail">
              Close
            </button>
          </div>
        </div>
      `;
      return;
    }

    if (!detail) return;

    const uid = String(detail.uid ?? detail.id ?? selectedUid);
    const name = displayName(detail);
    const role = displayRole(detail);
    const isVerified = detail.isVerifiedWriter === true;
    const disabled = actionBusy || messageOpen ? 'disabled' : '';
    const taleCountLabel =
      detail.taleCount === null || detail.taleCount === undefined
        ? 'Unavailable'
        : formatAdminCount(detail.taleCount);

    detailEl.innerHTML = `
      <section class="admin-detail-panel" aria-labelledby="admin-user-detail-title">
        <div class="admin-detail-panel__header">
          <div>
            <h3 id="admin-user-detail-title" class="admin-detail-panel__title">
              ${escapeAdminHtml(name)}
            </h3>
            <p class="admin-detail-panel__subtitle">
              User ID: <span class="font-mono">${escapeAdminHtml(uid || EMPTY_VALUE)}</span>
            </p>
          </div>
          <div class="admin-actions">
            <button type="button" class="admin-btn admin-btn--sm" data-action="close-detail">
              Close
            </button>
          </div>
        </div>

        <div class="admin-detail-grid">
          ${buildDetailField('Role', `<span class="admin-badge">${escapeAdminHtml(role)}</span>`)}
          ${buildDetailField('Joined', escapeAdminHtml(formatAdminDate(detail.joinedAt)))}
          ${buildDetailField('Tales authored', escapeAdminHtml(taleCountLabel))}
          ${buildDetailField('Status', buildFlagBadges(detail))}
          ${buildDetailField('Pen name', escapeAdminHtml(textOrDash(detail.penName)))}
          ${buildDetailField('Location', escapeAdminHtml(textOrDash(detail.location)))}
          ${buildDetailField(
            'Bio',
            escapeAdminHtml(truncateAdminText(detail.bio, 500) || EMPTY_VALUE),
            { wide: true }
          )}
        </div>

        <div class="admin-actions">
          <button
            type="button"
            class="admin-btn admin-btn--sm admin-btn--secondary"
            data-action="open-message"
            data-uid="${escapeAdminHtml(uid)}"
            ${disabled}
          >
            Message
          </button>
          <button
            type="button"
            class="admin-btn admin-btn--sm"
            data-action="toggle-verified"
            data-uid="${escapeAdminHtml(uid)}"
            ${disabled}
          >
            ${isVerified ? 'Remove verification' : 'Verify writer'}
          </button>
        </div>

        ${messageOpen ? buildMessageComposer(uid) : ''}

        <p class="admin-readonly-note">
          Writer verification unlocks the Author Studio. Role labels are shown as stored profile
          data, but this dashboard does not change them: staff authority requires Firebase Auth
          custom claims. The banned flag is neither shown nor editable because no reader surface
          enforces a profile ban.
        </p>
      </section>
    `;
  }

  /** @param {{ append?: boolean }} [options] */
  async function loadUsers({ append = false } = {}) {
    if (destroyed) return;

    const cursor = append ? lastDoc : null;
    if (append && !cursor) return;

    const version = ++listVersion;
    loading = true;
    listError = false;
    if (!append) {
      items = [];
      lastDoc = null;
      hasMore = false;
    }

    renderCount();
    renderResults();
    renderPagination();

    try {
      const page = await listUsersPage({
        search: searchTerm.trim(),
        sort,
        cursor,
        pageSize: PAGE_SIZE,
      });
      if (destroyed || version !== listVersion) return;

      items = append ? [...items, ...page.items] : page.items;
      lastDoc = page.lastDoc ?? null;
      hasMore = Boolean(page.hasMore);
    } catch (err) {
      if (destroyed || version !== listVersion) return;
      console.error('[users] failed to load', err);
      if (append) {
        showToast('Could not load more users. Try again.', 'error');
      } else {
        listError = true;
        items = [];
        lastDoc = null;
        hasMore = false;
      }
    } finally {
      if (!destroyed && version === listVersion) {
        loading = false;
        renderCount();
        renderResults();
        renderPagination();
      }
    }
  }

  /** @param {string} uid */
  function openDetail(uid) {
    if (!uid) return;

    selectedUid = uid;
    detail = null;
    detailError = '';
    detailLoading = true;
    messageOpen = false;
    messageBusy = false;
    const version = ++detailVersion;

    renderDetail();
    renderResults();

    getUserDetail(uid)
      .then((profile) => {
        if (destroyed || version !== detailVersion || selectedUid !== uid) return;
        detailLoading = false;
        if (!profile) {
          detailError = 'That user profile no longer exists.';
        } else {
          detail = profile;
        }
        renderDetail();
      })
      .catch((err) => {
        if (destroyed || version !== detailVersion || selectedUid !== uid) return;
        detailLoading = false;
        console.error('[users] failed to load user detail', err);
        detailError = 'Could not load this user profile.';
        renderDetail();
      });
  }

  function closeDetail() {
    selectedUid = null;
    detail = null;
    detailError = '';
    detailLoading = false;
    messageOpen = false;
    messageBusy = false;
    detailVersion += 1;
    renderDetail();
    renderResults();
  }

  /** @param {string} uid @param {boolean} isVerifiedWriter @param {string} successMessage */
  async function applyVerification(uid, isVerifiedWriter, successMessage) {
    if (destroyed || actionBusy) return;

    actionBusy = true;
    renderDetail();

    try {
      const updated = await updateWriterVerification(uid, isVerifiedWriter);
      if (destroyed) return;

      items = items.map((item) =>
        String(item.uid ?? item.id ?? '') === uid ? { ...item, ...updated } : item
      );
      if (detail && String(detail.uid ?? detail.id ?? '') === uid) {
        detail = { ...detail, ...updated };
      }
      showToast(successMessage, 'success');
    } catch (err) {
      if (destroyed) return;
      console.error('[users] writer verification update failed', err);
      showToast('Could not update writer verification. No change was saved.', 'error');
    } finally {
      if (!destroyed) {
        actionBusy = false;
        renderResults();
        renderDetail();
      }
    }
  }

  /** @param {string} uid */
  async function handleToggleVerified(uid) {
    if (!detail || actionBusy) return;
    const detailUid = String(detail.uid ?? detail.id ?? '');
    if (detailUid !== uid) return;

    const nextVerified = !(detail.isVerifiedWriter === true);
    await applyVerification(
      uid,
      nextVerified,
      nextVerified ? 'Writer verified.' : 'Verification removed.'
    );
  }

  /**
   * Delivers an administrative message to the selected reader through the
   * shared reports service, which owns validation, notification creation, and
   * the audit trail.
   *
   * @param {string} uid
   */
  async function handleSendMessage(uid) {
    if (!detail || messageBusy) return;
    const detailUid = String(detail.uid ?? detail.id ?? '');
    if (detailUid !== uid) return;

    const subjectField = container.querySelector('[data-role="user-message-subject"]');
    const bodyField = container.querySelector('[data-role="user-message-body"]');
    const subject = subjectField instanceof HTMLInputElement ? subjectField.value.trim() : '';
    const body = bodyField instanceof HTMLTextAreaElement ? bodyField.value.trim() : '';

    if (!subject || !body) {
      showToast('Subject and message are required.', 'error');
      return;
    }

    messageBusy = true;
    const sendButton = container.querySelector('[data-action="send-user-message"]');
    const cancelButton = container.querySelector('[data-action="cancel-user-message"]');
    if (sendButton instanceof HTMLButtonElement) {
      sendButton.disabled = true;
      sendButton.textContent = 'Sending...';
    }
    if (cancelButton instanceof HTMLButtonElement) cancelButton.disabled = true;

    try {
      await sendAdminMessage({ recipientId: uid, subject, body });
      if (destroyed) return;
      messageOpen = false;
      showToast('Message delivered to the reader inbox.', 'success');
      renderDetail();
    } catch (error) {
      if (destroyed) return;
      console.error('[users] failed to send administrative message', error);
      showToast(
        error instanceof Error && error.message
          ? error.message
          : 'The message could not be delivered.',
        'error'
      );
      if (sendButton instanceof HTMLButtonElement) {
        sendButton.disabled = false;
        sendButton.textContent = 'Send message';
      }
      if (cancelButton instanceof HTMLButtonElement) cancelButton.disabled = false;
    } finally {
      messageBusy = false;
    }
  }

  /** @param {MouseEvent} event */
  function handleClick(event) {
    const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (!target || !container.contains(target)) return;

    const action = target.dataset.action;
    const uid = target.dataset.uid || selectedUid || '';

    switch (action) {
      case 'retry-list':
        loadUsers({ append: false });
        break;
      case 'load-more':
        if (!loading && hasMore) loadUsers({ append: true });
        break;
      case 'view-user':
        if (!uid) break;
        if (uid === selectedUid) closeDetail();
        else openDetail(uid);
        break;
      case 'close-detail':
        closeDetail();
        break;
      case 'retry-detail':
        if (uid) openDetail(uid);
        break;
      case 'toggle-verified':
        if (uid) handleToggleVerified(uid);
        break;
      case 'open-message':
        if (!uid || messageBusy) break;
        messageOpen = true;
        renderDetail();
        container.querySelector('[data-role="user-message-subject"]')?.focus();
        break;
      case 'cancel-user-message':
        if (messageBusy) break;
        messageOpen = false;
        renderDetail();
        break;
      case 'send-user-message':
        if (uid) handleSendMessage(uid);
        break;
      default:
        break;
    }
  }

  /** @param {Event} event */
  function handleInput(event) {
    const target = event.target;
    if (!target?.matches?.('[data-role="search"]')) return;

    searchTerm = target.value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchTimer = null;
      if (!destroyed) loadUsers({ append: false });
    }, SEARCH_DEBOUNCE_MS);
  }

  /** @param {Event} event */
  function handleChange(event) {
    const target = event.target;
    if (!target?.matches?.('[data-role="sort"]')) return;

    const nextSort = target.value === 'newest' ? 'newest' : 'name';
    if (nextSort === sort) return;
    sort = nextSort;
    loadUsers({ append: false });
  }

  container.addEventListener('click', handleClick);
  container.addEventListener('input', handleInput);
  container.addEventListener('change', handleChange);

  loadUsers({ append: false });

  return () => {
    destroyed = true;
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
    container.removeEventListener('click', handleClick);
    container.removeEventListener('input', handleInput);
    container.removeEventListener('change', handleChange);
  };
}

export default { mount };
