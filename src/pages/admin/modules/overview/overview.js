// src/pages/admin/modules/overview/overview.js
import { fetchOverviewStats } from '@services/admin/overview.service.js';
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
  let loading = true;
  let stats = null;
  let error = false;

  async function load() {
    try {
      stats = await fetchOverviewStats();
      error = false;
    } catch (err) {
      error = true;
      console.error('[overview] failed to load stats', err);
    } finally {
      loading = false;
      render();
    }
  }

  function render() {
    if (loading) {
      container.innerHTML =
        '<div class="admin-module-loading" role="status"><span class="admin-module-loading__line"></span><p>Loading overview...</p></div>';
      return;
    }

    if (error || !stats) {
      container.innerHTML = buildAdminEmptyState({
        title: 'Failed to load overview',
        body: 'Could not fetch dashboard statistics. Try refreshing the page.',
        icon: 'alert-circle',
      });
      return;
    }

    const { totalTales, totalUsers, pendingReports, pendingApplications, recentAuditEntries } =
      stats;

    const statsHtml = `
      <div class="admin-stats-grid">
        <div class="admin-stat">
          <span class="admin-stat__value">${escapeAdminHtml(formatAdminCount(totalTales))}</span>
          <span class="admin-stat__label">Published Tales</span>
        </div>
        <div class="admin-stat">
          <span class="admin-stat__value">${escapeAdminHtml(formatAdminCount(totalUsers))}</span>
          <span class="admin-stat__label">Registered Users</span>
        </div>
        <div class="admin-stat">
          <span class="admin-stat__value">${escapeAdminHtml(formatAdminCount(pendingReports))}</span>
          <span class="admin-stat__label">Pending Reports</span>
        </div>
        <div class="admin-stat">
          <span class="admin-stat__value">${escapeAdminHtml(formatAdminCount(pendingApplications))}</span>
          <span class="admin-stat__label">Pending Applications</span>
        </div>
      </div>
    `;

    const auditHtml =
      recentAuditEntries.length > 0
        ? `
        <div class="admin-audit-strip">
          <h3 class="admin-audit-strip__title">Recent Staff Activity</h3>
          <table class="admin-table">
            <thead>
              <tr>
                <th class="admin-table__cell--left">Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${recentAuditEntries
                .map(
                  (entry) => `
                <tr>
                  <td class="admin-table__cell--left">
                    <span class="admin-table__mark">${escapeAdminHtml(adminInitials(entry.actorRole))}</span>
                    ${escapeAdminHtml(entry.actorRole)}
                  </td>
                  <td>${escapeAdminHtml(entry.action)}</td>
                  <td>${escapeAdminHtml(`${entry.targetType}/${entry.targetId}`)}</td>
                  <td class="admin-table__cell--right">${escapeAdminHtml(formatAdminDate(entry.createdAt))}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
        : buildAdminEmptyState({
            title: 'No recent activity',
            body: 'The audit log is empty. Staff actions will appear here as they happen.',
            icon: 'scroll-text',
          });

    container.innerHTML = `
      <section aria-labelledby="overview-title">
        <h2 id="overview-title" class="admin-section-title">Archive Overview</h2>
        ${statsHtml}
        ${auditHtml}
      </section>
    `;
  }

  load();

  return () => {
    /* no cleanup needed */
  };
}

export default { mount };
