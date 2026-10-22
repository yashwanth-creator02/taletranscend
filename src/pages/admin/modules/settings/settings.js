// src/pages/admin/modules/settings/settings.js
import { getAppConfig, getFeatureFlags, setFeatureFlag } from '@services/admin/settings.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';
import { escapeAdminHtml } from '../../admin.utils.js';

/**
 * @param {{ container: HTMLElement, access: import('../../admin.state.js').AdminAccess }} opts
 * @returns {() => void}
 */
export function mount({ container }) {
  let config = {};
  let flags = {};
  let loading = false;

  async function loadData() {
    loading = true;
    try {
      [config, flags] = await Promise.all([getAppConfig(), getFeatureFlags()]);
    } catch (err) {
      console.error('[settings] failed to load', err);
    } finally {
      loading = false;
      render();
    }
  }

  async function handleFlagChange(flagId, enabled) {
    const confirmed = await showConfirmModal({
      title: 'Toggle Feature Flag',
      message: `Set <strong>${escapeAdminHtml(flagId)}</strong> to ${enabled}?`,
      confirmText: enabled ? 'Enable' : 'Disable',
      confirmVariant: enabled ? 'primary' : 'accent',
    });
    if (!confirmed) {
      // Revert checkbox
      render();
      return;
    }

    try {
      await setFeatureFlag(flagId, enabled);
      showToast({ type: 'success', message: `Flag ${flagId} updated` });
      flags[flagId] = { ...flags[flagId], enabled };
      render();
    } catch (err) {
      console.error('[settings] flag update failed', err);
      showToast({ type: 'error', message: 'Failed to update flag' });
      render();
    }
  }

  function render() {
    if (loading) {
      container.innerHTML =
        '<div class="admin-module-loading"><span class="admin-module-loading__line"></span><p>Loading settings...</p></div>';
      return;
    }

    const flagRows = Object.entries(flags)
      .map(
        ([flagId, data]) => `
      <tr>
        <td class="admin-table__cell--left">${escapeAdminHtml(flagId)}</td>
        <td>
          <label class="admin-toggle">
            <input type="checkbox" ${data.enabled ? 'checked' : ''} onchange="handleFlagChange('${flagId}', this.checked)">
            <span class="admin-toggle__track"></span>
          </label>
        </td>
        <td>${escapeAdminHtml(data.enabled ? 'Enabled' : 'Disabled')}</td>
      </tr>
    `
      )
      .join('');

    const configRows = Object.entries(config)
      .map(
        ([key, value]) => `
      <tr>
        <td class="admin-table__cell--left">${escapeAdminHtml(key)}</td>
        <td class="admin-table__cell--wide">${escapeAdminHtml(String(value))}</td>
      </tr>
    `
      )
      .join('');

    container.innerHTML = `
      <section aria-labelledby="settings-title">
        <h2 id="settings-title" class="admin-section-title">Site Settings</h2>
        <div class="admin-settings-grid">
          <div class="admin-settings-panel">
            <h3 class="admin-settings-panel__title">Feature Flags</h3>
            <table class="admin-table">
              <thead>
                <tr>
                  <th class="admin-table__cell--left">Flag</th>
                  <th>Status</th>
                  <th>Current</th>
                </tr>
              </thead>
              <tbody>${flagRows || '<tr><td colspan="3" class="admin-table__cell--center">No flags configured</td></tr>'}</tbody>
            </table>
          </div>
          <div class="admin-settings-panel">
            <h3 class="admin-settings-panel__title">App Configuration</h3>
            <table class="admin-table">
              <thead>
                <tr>
                  <th class="admin-table__cell--left">Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>${configRows || '<tr><td colspan="2" class="admin-table__cell--center">No configuration found</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </section>
    `;

    window.handleFlagChange = handleFlagChange;
  }

  loadData();

  return () => {
    delete window.handleFlagChange;
  };
}

export default { mount };
