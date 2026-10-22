// src/pages/admin/modules/settings/settings.js
import { getAppConfig, getFeatureFlags, setFeatureFlag } from '@services/admin/settings.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';
import { escapeAdminHtml } from '../../admin.utils.js';
import { buildAdminEmptyState, buildModuleLoading } from '../../admin.templates.js';

/**
 * Render a configuration value without leaking object internals into the table.
 * @param {unknown} value
 * @returns {string}
 */
function formatConfigValue(value) {
  if (value === null || value === undefined || value === '') return '\u2014';
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      const date = value.toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString();
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * @param {{ container: HTMLElement, access: import('../../admin.state.js').AdminAccess }} opts
 * @returns {() => void}
 */
export function mount({ container }) {
  let config = {};
  let flags = {};
  let loading = true;
  let error = false;
  let savingFlagId = null;
  let disposed = false;

  async function loadData() {
    loading = true;
    error = false;
    render();

    try {
      [config, flags] = await Promise.all([getAppConfig(), getFeatureFlags()]);
      error = false;
    } catch (err) {
      console.error('[settings] failed to load settings', err);
      error = true;
    } finally {
      if (!disposed) {
        loading = false;
        render();
      }
    }
  }

  async function handleFlagChange(input) {
    const flagId = input.dataset.flagId;
    const flag = flagId ? flags[flagId] : null;
    if (!flagId || !flag || savingFlagId) {
      render();
      return;
    }

    const enabled = input.checked;
    const label = flag.label || flagId;

    const confirmed = await showConfirmModal({
      title: 'Toggle Feature Flag',
      message: `Set <strong>${escapeAdminHtml(label)}</strong> to ${
        enabled ? 'enabled' : 'disabled'
      }? This changes site behaviour for every visitor.`,
      confirmText: enabled ? 'Enable' : 'Disable',
      confirmVariant: enabled ? 'primary' : 'accent',
    });

    if (!confirmed) {
      render();
      return;
    }

    savingFlagId = flagId;
    render();

    try {
      await setFeatureFlag(flagId, enabled);
      flags[flagId] = { ...flags[flagId], enabled };
      showToast(`${label} ${enabled ? 'enabled' : 'disabled'}.`, 'success');
    } catch (err) {
      console.error('[settings] flag update failed', err);
      showToast(`Could not update ${label}.`, 'error');
    } finally {
      if (!disposed) {
        savingFlagId = null;
        render();
      }
    }
  }

  function renderFeatureFlags() {
    const entries = Object.entries(flags);
    if (entries.length === 0) {
      return '<tr><td colspan="3" class="admin-table__cell--center">No feature flags configured</td></tr>';
    }

    return entries
      .map(([id, flag]) => {
        const label = flag?.label || id;
        const description = flag?.description ? ` \u2014 ${flag.description}` : '';
        const enabled = flag?.enabled === true;

        return `
          <tr>
            <td class="admin-table__cell--left">
              <span class="admin-table__name">${escapeAdminHtml(label)}</span>
              <span class="admin-table__sub">${escapeAdminHtml(`${id}${description}`)}</span>
            </td>
            <td>
              <label class="admin-toggle">
                <input
                  type="checkbox"
                  data-flag-id="${escapeAdminHtml(id)}"
                  ${enabled ? 'checked' : ''}
                  ${savingFlagId ? 'disabled' : ''}
                  aria-label="Toggle ${escapeAdminHtml(label)}"
                >
                <span class="admin-toggle__track"></span>
              </label>
            </td>
            <td>${escapeAdminHtml(enabled ? 'Enabled' : 'Disabled')}</td>
          </tr>
        `;
      })
      .join('');
  }

  function renderConfig() {
    const entries = Object.entries(config);
    if (entries.length === 0) {
      return '<tr><td colspan="2" class="admin-table__cell--center">No configuration found</td></tr>';
    }

    return entries
      .map(
        ([key, value]) => `
          <tr>
            <td class="admin-table__cell--left">${escapeAdminHtml(key)}</td>
            <td class="admin-table__cell--wide">${escapeAdminHtml(formatConfigValue(value))}</td>
          </tr>
        `
      )
      .join('');
  }

  function render() {
    if (disposed) return;

    if (loading) {
      container.innerHTML = buildModuleLoading('settings');
      return;
    }

    if (error) {
      container.innerHTML = `
        <section aria-labelledby="settings-title">
          <h2 id="settings-title" class="admin-section-title">Site Settings</h2>
          <div class="admin-error" role="alert">
            <p>Site settings could not be read. No values were changed.</p>
            <div class="admin-error__actions">
              <button type="button" class="admin-btn" data-action="retry">Try again</button>
            </div>
          </div>
        </section>
      `;
      return;
    }

    const hasFlags = Object.keys(flags).length > 0;
    const hasConfig = Object.keys(config).length > 0;
    if (!hasFlags && !hasConfig) {
      container.innerHTML = `
        <section aria-labelledby="settings-title">
          <h2 id="settings-title" class="admin-section-title">Site Settings</h2>
          ${buildAdminEmptyState({
            title: 'No settings yet',
            body: 'No site configuration or feature flags exist. Toggling a known flag creates it.',
            icon: 'settings',
          })}
        </section>
      `;
      return;
    }

    container.innerHTML = `
      <section aria-labelledby="settings-title">
        <h2 id="settings-title" class="admin-section-title">Site Settings</h2>
        <p class="admin-note">
          Feature flags are public configuration and only an administrator can change them.
          Every toggle is written to the audit trail.
        </p>
        <div class="admin-settings-grid">
          <div class="admin-settings-panel">
            <h3 class="admin-settings-panel__title">Feature Flags</h3>
            <div class="admin-table-wrapper">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th class="admin-table__cell--left">Flag</th>
                    <th>Toggle</th>
                    <th>Current</th>
                  </tr>
                </thead>
                <tbody>${renderFeatureFlags()}</tbody>
              </table>
            </div>
          </div>
          <div class="admin-settings-panel">
            <h3 class="admin-settings-panel__title">App Configuration</h3>
            <div class="admin-table-wrapper">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th class="admin-table__cell--left">Key</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>${renderConfig()}</tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function handleClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-action="retry"]')) loadData();
  }

  function handleChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type !== 'checkbox' || !target.dataset.flagId) return;
    handleFlagChange(target);
  }

  container.addEventListener('click', handleClick);
  container.addEventListener('change', handleChange);
  loadData();

  return () => {
    disposed = true;
    container.removeEventListener('click', handleClick);
    container.removeEventListener('change', handleChange);
  };
}

export default { mount };
