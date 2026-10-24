// src/pages/admin/modules/applications/__tests__/applications.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../applications.js';
import {
  listApplicationsPage,
  getApplication,
  decideApplication,
} from '@services/admin/applications.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';

vi.mock('@services/admin/applications.service.js', () => ({
  listApplicationsPage: vi.fn(),
  getApplication: vi.fn(),
  decideApplication: vi.fn(),
  APPLICATION_NOTES_MAX: 1000,
}));

vi.mock('@/ui/components/confirmModal.js', () => ({
  showConfirmModal: vi.fn(),
}));

vi.mock('@/ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

const ADMIN_ACCESS = { role: 'admin', isAdmin: true, isModerator: false, isStaff: true };
const MODERATOR_ACCESS = {
  role: 'moderator',
  isAdmin: false,
  isModerator: true,
  isStaff: true,
};

const APPLICATION = {
  id: 'app-1',
  applicantId: 'reader-1',
  penName: 'Mara Voss',
  bio: 'A teller of coastal myths and drowned bells.',
  sampleUrl: 'https://example.com/sample',
  status: 'pending',
  createdAt: '2026-10-03T10:00:00.000Z',
};

/**
 * @returns {HTMLElement}
 */
function createContainer() {
  document.body.innerHTML = '<div id="admin-container"></div>';
  return document.getElementById('admin-container');
}

describe('applications module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listApplicationsPage).mockResolvedValue({
      items: [],
      lastDoc: null,
      hasMore: false,
    });
    vi.mocked(getApplication).mockResolvedValue(APPLICATION);
    vi.mocked(decideApplication).mockResolvedValue({
      applicationId: 'app-1',
      status: 'approved',
      authorRoleGranted: true,
    });
    vi.mocked(showConfirmModal).mockResolvedValue(true);
  });

  it('gives moderators a read-only queue with no decision controls', async () => {
    vi.mocked(listApplicationsPage).mockResolvedValue({
      items: [APPLICATION],
      lastDoc: null,
      hasMore: false,
    });

    const container = createContainer();
    const unmount = mount({ container, access: MODERATOR_ACCESS });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Mara Voss');
    });
    expect(
      container.querySelector('.admin-readonly-note').textContent.replace(/\s+/g, ' ')
    ).toContain('Only an administrator can record a decision');
    expect(container.querySelector('[data-action="view"]')).not.toBeNull();

    container.querySelector('[data-action="view"]').click();

    await vi.waitFor(() => {
      expect(container.querySelector('.admin-detail-panel')).not.toBeNull();
    });
    expect(container.querySelector('[data-action="decide"]')).toBeNull();
    expect(container.querySelector('[data-role="application-notes"]')).toBeNull();
    expect(container.textContent).toContain('read-only for moderators');

    unmount();
  });

  it('lets an administrator approve with notes and the real staff UID', async () => {
    vi.mocked(listApplicationsPage).mockResolvedValue({
      items: [APPLICATION],
      lastDoc: null,
      hasMore: false,
    });

    const container = createContainer();
    const unmount = mount({ container, access: ADMIN_ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view"]')).not.toBeNull();
    });
    container.querySelector('[data-action="view"]').click();
    await vi.waitFor(() => {
      expect(container.querySelector('[data-role="application-notes"]')).not.toBeNull();
    });

    container.querySelector('[data-role="application-notes"]').value = 'Strong sample work.';
    container.querySelector('[data-action="decide"][data-decision="approved"]').click();

    await vi.waitFor(() => {
      expect(decideApplication).toHaveBeenCalledWith('app-1', 'approved', 'Strong sample work.');
    });

    expect(showConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Mara Voss'),
      })
    );
    expect(showToast).toHaveBeenCalledWith(
      'Author application approved. Author workspace access granted.',
      'success'
    );

    unmount();
  });

  it('renders only https sample links and never a javascript href', async () => {
    const unsafeApplication = {
      ...APPLICATION,
      id: 'app-2',
      penName: 'Unsafe Sample',
      sampleUrl: 'javascript:alert(1)',
    };
    vi.mocked(listApplicationsPage).mockResolvedValue({
      items: [APPLICATION, unsafeApplication],
      lastDoc: null,
      hasMore: false,
    });
    vi.mocked(getApplication).mockResolvedValue(unsafeApplication);

    const container = createContainer();
    const unmount = mount({ container, access: ADMIN_ACCESS });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Unsafe Sample');
    });

    const links = Array.from(container.querySelectorAll('a[href]'));
    expect(links.some((link) => link.getAttribute('href').startsWith('javascript:'))).toBe(false);
    expect(links.some((link) => link.getAttribute('href').startsWith('https://'))).toBe(true);

    container.querySelector('[data-action="view"][data-id="app-2"]').click();
    await vi.waitFor(() => {
      expect(container.querySelector('.admin-detail-panel')).not.toBeNull();
    });
    expect(container.textContent).toContain('No valid https sample link provided.');
    expect(container.querySelector('.admin-detail-panel a[href^="javascript:"]')).toBeNull();

    unmount();
  });

  it('blocks an over-length notes submission before confirmation', async () => {
    vi.mocked(listApplicationsPage).mockResolvedValue({
      items: [APPLICATION],
      lastDoc: null,
      hasMore: false,
    });

    const container = createContainer();
    const unmount = mount({ container, access: ADMIN_ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view"]')).not.toBeNull();
    });
    container.querySelector('[data-action="view"]').click();
    await vi.waitFor(() => {
      expect(container.querySelector('[data-role="application-notes"]')).not.toBeNull();
    });

    container.querySelector('[data-role="application-notes"]').value = 'z'.repeat(1001);
    container.querySelector('[data-action="decide"][data-decision="approved"]').click();

    await vi.waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('1000 characters or fewer'),
        'error'
      );
    });
    expect(showConfirmModal).not.toHaveBeenCalled();
    expect(decideApplication).not.toHaveBeenCalled();

    unmount();
  });

  it('searches by pen name prefix after a debounce', async () => {
    const container = createContainer();
    const unmount = mount({ container, access: ADMIN_ACCESS });

    await vi.waitFor(() => {
      expect(listApplicationsPage).toHaveBeenCalledTimes(1);
    });

    const search = container.querySelector('[data-role="search"]');
    search.value = 'Mara';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.waitFor(
      () => {
        expect(listApplicationsPage).toHaveBeenLastCalledWith({
          status: 'pending',
          search: 'Mara',
          direction: 'desc',
        });
      },
      { timeout: 1500 }
    );
    expect(container.textContent).toContain('No applications match that search');

    unmount();
  });

  it('reloads with the selected status filter', async () => {
    const container = createContainer();
    const unmount = mount({ container, access: ADMIN_ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-filter="status"]')).not.toBeNull();
    });

    const statusFilter = container.querySelector('[data-filter="status"]');
    statusFilter.value = 'approved';
    statusFilter.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(listApplicationsPage).toHaveBeenLastCalledWith({
        status: 'approved',
        search: '',
        direction: 'desc',
      });
    });

    unmount();
  });

  it('shows an error state and retries the page load', async () => {
    vi.mocked(listApplicationsPage)
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({ items: [APPLICATION], lastDoc: null, hasMore: false });

    const container = createContainer();
    const unmount = mount({ container, access: ADMIN_ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('.admin-error')).not.toBeNull();
    });

    container.querySelector('[data-action="retry"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Mara Voss');
    });
    expect(listApplicationsPage).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('loads the next page with the cursor', async () => {
    const cursor = { id: 'cursor-1' };
    vi.mocked(listApplicationsPage)
      .mockResolvedValueOnce({ items: [APPLICATION], lastDoc: cursor, hasMore: true })
      .mockResolvedValueOnce({
        items: [
          {
            ...APPLICATION,
            id: 'app-2',
            penName: 'Second Applicant',
            bio: 'Second application bio.',
          },
        ],
        lastDoc: null,
        hasMore: false,
      });

    const container = createContainer();
    const unmount = mount({ container, access: ADMIN_ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="load-more"]')).not.toBeNull();
    });
    container.querySelector('[data-action="load-more"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Second Applicant');
    });
    expect(listApplicationsPage).toHaveBeenLastCalledWith({
      status: 'pending',
      search: '',
      direction: 'desc',
      cursor,
    });

    unmount();
  });
});
