// src/pages/admin/modules/overview/overview.js
import { fetchOverviewStats } from '@services/admin/overview.service.js';
import {
  formatAdminDate,
  formatAdminCount,
  escapeAdminHtml,
  adminInitials,
  truncateAdminText,
} from '../../admin.utils.js';
import { buildAdminEmptyState, buildModuleLoading } from '../../admin.templates.js';

/**
 * @param {{ container: HTMLElement, access: import('../../admin.state.js').AdminAccess }} opts
 * @returns {() => void}
 */
export function mount({ container, access }) {
  let loading = true;
  let stats = null;
  let error = null;
  let disposed = false;

  async function load() {
    loading = true;
    error = null;
    render();
    try {
      stats = await fetchOverviewStats({ includeAudit: Boolean(access?.isAdmin) });
    } catch (err) {
      error = err;
      console.error('[overview] failed to load stats', err);
    } finally {
      if (!disposed) {
        loading = false;
        render();
      }
    }
  }

  function renderAudit() {
    const heading = `<h3 class="admin-audit-strip__title">Recent Staff Activity</h3>`;

    if (!access?.isAdmin) {
      return `
        <div class="admin-audit-strip">
          ${heading}
          <p class="admin-readonly-note">
            Recent staff activity is visible to administrators only. The audit log
            remains append-only for every staff action.
          </p>
        </div>
      `;
    }

    if (stats?.auditUnavailable) {
      return `
        <div class="admin-audit-strip">
          ${heading}
          ${buildAdminEmptyState({
            title: 'Audit activity unavailable',
            body: 'The dashboard counters loaded, but the audit log could not be read. Refresh to try again.',
            icon: 'alert-circle',
          })}
        </div>
      `;
    }

    const entries = stats?.recentAuditEntries ?? [];
    if (entries.length === 0) {
      return `
        <div class="admin-audit-strip">
          ${heading}
          ${buildAdminEmptyState({
            title: 'No recent activity',
            body: 'The audit log is empty. Staff actions will appear here as they happen.',
            icon: 'scroll-text',
          })}
        </div>
      `;
    }

    return `
      <div class="admin-audit-strip">
        ${heading}
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="admin-table__cell--left">Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th class="admin-table__cell--right">Time</th>
              </tr>
            </thead>
            <tbody>
              ${entries
                .map((entry) => {
                  const role = entry.actorRole || 'staff';
                  const actor = entry.actorId || 'Unknown actor';
                  const target = [entry.targetType, entry.targetId].filter(Boolean).join(' / ');
                  return `
                    <tr>
                      <td class="admin-table__cell--left">
                        <span class="admin-table__mark">${escapeAdminHtml(
                          adminInitials(actor)
                        )}</span>
                        <span class="admin-table__name">${escapeAdminHtml(
                          truncateAdminText(actor, 28)
                        )}</span>
                        <span class="admin-table__sub">${escapeAdminHtml(role)}</span>
                      </td>
                      <td>${escapeAdminHtml(entry.action || 'Unknown action')}</td>
                      <td>${escapeAdminHtml(truncateAdminText(target || 'Archive', 40))}</td>
                      <td class="admin-table__cell--right">${escapeAdminHtml(
                        formatAdminDate(entry.createdAt)
                      )}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function render() {
    if (loading) {
      container.innerHTML = buildModuleLoading('overview');
      return;
    }

    if (error || !stats) {
      container.innerHTML = `
        <section aria-labelledby="overview-error-title">
          <div class="admin-error" role="alert">
            <h2 id="overview-error-title" class="admin-section-title">Overview unavailable</h2>
            <p>Live archive counters could not be read. No numbers are estimated.</p>
            <div class="admin-error__actions">
              <button type="button" class="admin-btn" data-action="retry">Try again</button>
            </div>
          </div>
        </section>
      `;
      return;
    }

    const cards = [
      { label: 'Published Tales', value: stats.totalTales },
      { label: 'Reader Profiles', value: stats.totalProfiles },
      { label: 'Pending Reports', value: stats.pendingReports },
      { label: 'Pending Applications', value: stats.pendingApplications },
      { label: 'Pending Deletions', value: stats.pendingDeletions },
    ];

    const statsHtml = `
      <div class="admin-stats-grid">
        ${cards
          .map(
            (card) => `
              <div class="admin-stat">
                <span class="admin-stat__value">${escapeAdminHtml(
                  formatAdminCount(card.value)
                )}</span>
                <span class="admin-stat__label">${escapeAdminHtml(card.label)}</span>
              </div>
            `
          )
          .join('')}
      </div>
    `;

    container.innerHTML = `
      <section aria-labelledby="overview-title">
        <h2 id="overview-title" class="admin-section-title">Archive Overview</h2>
        <p class="admin-note">
          Counts are read live from Firestore. An em dash means that counter could
          not be read; it is never replaced with an estimate. Reader Profiles counts
          <span class="font-mono">users/{uid}</span> profile documents, not Firebase Auth accounts:
          anonymous sessions without a profile are not included.
        </p>
        ${statsHtml}
        ${renderAudit()}
      </section>
    `;
  }

  function handleClick(event) {
    if (event.target.closest('[data-action="retry"]')) load();
  }

  container.addEventListener('click', handleClick);
  load();

  return () => {
    disposed = true;
    container.removeEventListener('click', handleClick);
  };
}

export default { mount };
