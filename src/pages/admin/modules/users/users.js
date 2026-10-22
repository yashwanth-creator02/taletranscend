// src/pages/admin/modules/users/users.js
import { fetchAdminPage } from '@services/admin/pagination.service.js';
import { refs } from '@fb/refs.js';
import { getUserProfile, updateUserFlags } from '@services/admin/users.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';
import {
  formatAdminDate,
  formatAdminCount,
  escapeAdminHtml,
  adminInitials,
} from '../../admin.utils.js';
import { buildAdminEmptyState } from '../../admin.templates.js';

/**
 * @param {{ container: HTMLElement, access: import('../../admin.state.js').AdminAccess }} opts
 * @returns {() => void}
 */
export function mount({ container }) {
  const _page = 1; // reserved
  let items = [];
  let lastDoc = null;
  let hasMore = false;
  let loading = false;

  async function loadPage(cursor = null) {
    loading = true;
    try {
      // Fetch users from the tales collection to get author UIDs
      const result = await fetchAdminPage(refs.tales(), {
        orderField: 'publishedAt',
        direction: 'desc',
        pageSize: 20,
        cursor,
      });
      // Extract unique author UIDs and fetch their profiles
      const authorUids = [...new Set(result.items.map((item) => item.authorId))];
      const profiles = await Promise.all(authorUids.map((uid) => getUserProfile(uid)));
      items = profiles.filter(Boolean);
      lastDoc = result.lastDoc;
      hasMore = result.hasMore;
    } catch (err) {
      console.error('[users] failed to load', err);
    } finally {
      loading = false;
      render();
    }
  }

  async function handleFlagChange(uid, flag, enabled) {
    const confirmed = await showConfirmModal({
      title: `Update User Flag`,
      message: `Set <strong>${flag}</strong> to ${enabled} for this user?`,
      confirmText: 'Confirm',
      confirmVariant: 'primary',
    });
    if (!confirmed) return;

    try {
      await updateUserFlags(uid, { [flag]: enabled });
      showToast({ type: 'success', message: `User flag updated` });
      loadPage();
    } catch (err) {
      console.error('[users] flag update failed', err);
      showToast({ type: 'error', message: 'Failed to update user flag' });
    }
  }

  function render() {
    if (loading) {
      container.innerHTML =
        '<div class="admin-module-loading"><span class="admin-module-loading__line"></span><p>Loading users...</p></div>';
      return;
    }

    if (items.length === 0) {
      container.innerHTML = buildAdminEmptyState({
        title: 'No users found',
        body: 'No registered authors have published tales yet.',
      });
      return;
    }

    const rows = items
      .map(
        (user) => `
      <tr>
        <td class="admin-table__cell--left">
          <span class="admin-table__mark">${escapeAdminHtml(adminInitials(user.name || user.uid))}</span>
          <div class="admin-table__name">${escapeAdminHtml(user.name || 'Unknown')}</div>
          <div class="admin-table__sub">${escapeAdminHtml(user.uid)}</div>
        </td>
        <td>${escapeAdminHtml(formatAdminDate(user.joinedAt))}</td>
        <td>${escapeAdminHtml(formatAdminCount(user.taleCount ?? 0))}</td>
        <td>
          <label class="admin-toggle">
            <input type="checkbox" ${user.isBanned ? 'checked' : ''} onchange="handleBan('${user.uid}', this.checked)">
            <span class="admin-toggle__track"></span>
          </label>
        </td>
        <td>
          <label class="admin-toggle">
            <input type="checkbox" ${user.isVerifiedWriter ? 'checked' : ''} onchange="handleVerify('${user.uid}', this.checked)">
            <span class="admin-toggle__track"></span>
          </label>
        </td>
      </tr>
    `
      )
      .join('');

    const paginationHtml = hasMore
      ? `<button class="btn btn-ghost" onclick="loadMore()" ${loading ? 'disabled' : ''}>Load More</button>`
      : '';

    container.innerHTML = `
      <section aria-labelledby="users-title">
        <h2 id="users-title" class="admin-section-title">Users &amp; Roles</h2>
        <p class="admin-note">Profile role labels are display data only. Actual authority follows Firebase Auth custom claims.</p>
        <table class="admin-table">
          <thead>
            <tr>
              <th class="admin-table__cell--left">User</th>
              <th>Joined</th>
              <th>Tales</th>
              <th>Banned</th>
              <th>Verified</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="admin-pagination">${paginationHtml}</div>
      </section>
    `;

    window.handleBan = (uid, checked) => handleFlagChange(uid, 'isBanned', checked);
    window.handleVerify = (uid, checked) => handleFlagChange(uid, 'isVerifiedWriter', checked);
    window.loadMore = () => loadPage(lastDoc);
  }

  loadPage();

  return () => {
    delete window.handleBan;
    delete window.handleVerify;
    delete window.loadMore;
  };
}

export default { mount };
