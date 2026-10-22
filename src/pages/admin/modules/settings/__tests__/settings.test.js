// src/pages/admin/modules/settings/__tests__/settings.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../settings.js';
import { getAppConfig, getFeatureFlags, setFeatureFlag } from '@services/admin/settings.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';

vi.mock('@services/admin/settings.service.js', () => ({
  getAppConfig: vi.fn(),
  getFeatureFlags: vi.fn(),
  setFeatureFlag: vi.fn(),
}));

vi.mock('@/ui/components/confirmModal.js', () => ({
  showConfirmModal: vi.fn(),
}));

vi.mock('@/ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

function flags() {
  return {
    betaAccess: {
      id: 'betaAccess',
      label: 'Beta Access',
      description: 'Offers the beta reading experience to invited readers.',
      enabled: false,
    },
    darkMode: {
      id: 'darkMode',
      label: 'Dark Mode',
      description: 'Enables the archive-wide dark appearance.',
      enabled: true,
    },
  };
}

describe('settings module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="admin-container"></div>';
    getAppConfig.mockResolvedValue({ siteName: 'TaleTranscend' });
    getFeatureFlags.mockResolvedValue(flags());
  });

  it('renders flag labels, descriptions, config values, and delegated toggles', async () => {
    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Beta Access');
    });

    expect(container.textContent).toContain('Offers the beta reading experience');
    expect(container.textContent).toContain('siteName');
    expect(container.textContent).toContain('TaleTranscend');
    expect(container.querySelector('[data-flag-id="betaAccess"]')).not.toBeNull();
    expect(container.querySelector('[data-flag-id="betaAccess"]').checked).toBe(false);
    expect(container.querySelector('[data-flag-id="darkMode"]').checked).toBe(true);
    expect(container.innerHTML).not.toContain('onchange=');
    expect(window.handleFlagChange).toBeUndefined();

    unmount();
  });

  it('writes a toggle after confirmation and reports success', async () => {
    showConfirmModal.mockResolvedValue(true);
    setFeatureFlag.mockResolvedValue({ id: 'betaAccess', enabled: true });

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-flag-id="betaAccess"]')).not.toBeNull();
    });

    const toggle = container.querySelector('[data-flag-id="betaAccess"]');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(setFeatureFlag).toHaveBeenCalledWith('betaAccess', true);
      expect(showToast).toHaveBeenCalledWith('Beta Access enabled.', 'success');
    });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-flag-id="betaAccess"]').checked).toBe(true);
    });

    unmount();
  });

  it('reverts the checkbox when the confirmation is cancelled', async () => {
    showConfirmModal.mockResolvedValue(false);

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-flag-id="betaAccess"]')).not.toBeNull();
    });

    const toggle = container.querySelector('[data-flag-id="betaAccess"]');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(container.querySelector('[data-flag-id="betaAccess"]').checked).toBe(false);
    });
    expect(setFeatureFlag).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();

    unmount();
  });

  it('renders a load error and retries without losing the module', async () => {
    getAppConfig
      .mockRejectedValueOnce(new Error('permission-denied'))
      .mockResolvedValueOnce({ siteName: 'TaleTranscend' });

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Site settings could not be read');
    });

    container.querySelector('[data-action="retry"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('siteName');
    });

    unmount();
  });

  it('renders an empty state when no settings or flags exist', async () => {
    getAppConfig.mockResolvedValue({});
    getFeatureFlags.mockResolvedValue({});

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('No settings yet');
    });

    unmount();
  });

  it('removes its listeners on unmount', async () => {
    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-flag-id="betaAccess"]')).not.toBeNull();
    });

    unmount();
    const toggle = container.querySelector('[data-flag-id="betaAccess"]');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();

    expect(showConfirmModal).not.toHaveBeenCalled();
    expect(setFeatureFlag).not.toHaveBeenCalled();
  });
});
