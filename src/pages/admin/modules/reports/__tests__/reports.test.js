// src/pages/admin/modules/reports/__tests__/reports.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../reports.js';
import {
  listReportsPage,
  getReportDetail,
  resolveReport,
} from '@services/admin/reports.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';

vi.mock('@services/admin/reports.service.js', () => ({
  listReportsPage: vi.fn(),
  getReportDetail: vi.fn(),
  resolveReport: vi.fn(),
}));

vi.mock('@/ui/components/confirmModal.js', () => ({
  showConfirmModal: vi.fn(),
}));

vi.mock('@/ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

const ACCESS = { role: 'moderator', isAdmin: false, isModerator: true, isStaff: true };

const REPORT = {
  id: 'rep-1',
  reporterId: 'reader-1',
  targetType: 'tale',
  targetId: 'tale-1',
  reason: 'This tale contains unattributed material.',
  status: 'pending',
  createdAt: '2026-10-02T10:00:00.000Z',
};

const DETAIL = {
  ...REPORT,
  targetSummary: {
    type: 'tale',
    id: 'tale-1',
    label: 'The Salt Road',
    detail: 'Mara Voss',
  },
};

/**
 * @returns {HTMLElement}
 */
function createContainer() {
  document.body.innerHTML = '<div id="admin-container"></div>';
  return document.getElementById('admin-container');
}

describe('reports module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listReportsPage).mockResolvedValue({
      items: [],
      lastDoc: null,
      hasMore: false,
    });
    vi.mocked(getReportDetail).mockResolvedValue(DETAIL);
    vi.mocked(resolveReport).mockResolvedValue({ reportId: 'rep-1', status: 'resolved' });
    vi.mocked(showConfirmModal).mockResolvedValue(true);
  });

  it('renders reports with filter controls and no inline handlers', async () => {
    vi.mocked(listReportsPage).mockResolvedValue({
      items: [REPORT],
      lastDoc: null,
      hasMore: false,
    });

    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('This tale contains unattributed material.');
    });

    expect(container.querySelector('[data-filter="status"]')).not.toBeNull();
    expect(container.querySelector('[data-filter="direction"]')).not.toBeNull();
    expect(container.querySelector('[onclick]')).toBeNull();
    expect(container.querySelector('[onchange]')).toBeNull();
    expect(window.handleResolve).toBeUndefined();

    unmount();
  });

  it('reloads with the selected status filter', async () => {
    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-filter="status"]')).not.toBeNull();
    });

    const statusFilter = container.querySelector('[data-filter="status"]');
    statusFilter.value = 'dismissed';
    statusFilter.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(listReportsPage).toHaveBeenLastCalledWith({
        status: 'dismissed',
        search: '',
        direction: 'desc',
      });
    });

    unmount();
  });

  it('searches by target id prefix after a debounce', async () => {
    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(listReportsPage).toHaveBeenCalledTimes(1);
    });

    const search = container.querySelector('[data-role="search"]');
    search.value = 'tale-';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    await vi.waitFor(
      () => {
        expect(listReportsPage).toHaveBeenLastCalledWith({
          status: 'pending',
          search: 'tale-',
          direction: 'desc',
        });
      },
      { timeout: 1500 }
    );
    expect(container.textContent).toContain('No reports match that search');

    unmount();
  });

  it('opens a detail panel with the target summary', async () => {
    vi.mocked(listReportsPage).mockResolvedValue({
      items: [REPORT],
      lastDoc: null,
      hasMore: false,
    });

    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view"]')).not.toBeNull();
    });
    container.querySelector('[data-action="view"]').click();

    await vi.waitFor(() => {
      expect(container.querySelector('.admin-detail-panel')).not.toBeNull();
    });
    expect(container.textContent).toContain('The Salt Road');
    expect(container.textContent).toContain('Mara Voss');
    expect(resolveReport).not.toHaveBeenCalled();

    unmount();
  });

  it('resolves a report with optional resolution notes', async () => {
    vi.mocked(listReportsPage).mockResolvedValue({
      items: [REPORT],
      lastDoc: null,
      hasMore: false,
    });

    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view"]')).not.toBeNull();
    });
    container.querySelector('[data-action="view"]').click();
    await vi.waitFor(() => {
      expect(container.querySelector('[data-role="resolution-notes"]')).not.toBeNull();
    });

    container.querySelector('[data-role="resolution-notes"]').value = 'Author fixed attribution.';
    container.querySelector('[data-action="decide"][data-resolution="resolved"]').click();

    await vi.waitFor(() => {
      expect(resolveReport).toHaveBeenCalledWith('rep-1', 'resolved', {
        notes: 'Author fixed attribution.',
      });
    });

    expect(showToast).toHaveBeenCalledWith('Report resolved.', 'success');

    unmount();
  });

  it('dismisses a report and does not claim a notification was sent', async () => {
    vi.mocked(listReportsPage).mockResolvedValue({
      items: [REPORT],
      lastDoc: null,
      hasMore: false,
    });

    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="view"]')).not.toBeNull();
    });
    container.querySelector('[data-action="view"]').click();
    await vi.waitFor(() => {
      expect(
        container.querySelector('[data-action="decide"][data-resolution="dismissed"]')
      ).not.toBeNull();
    });

    container.querySelector('[data-action="decide"][data-resolution="dismissed"]').click();

    await vi.waitFor(() => {
      expect(resolveReport).toHaveBeenCalledWith('rep-1', 'dismissed', { notes: '' });
    });
    expect(showConfirmModal.mock.calls[0][0].message).not.toContain('notify');

    unmount();
  });

  it('shows an error state and retries', async () => {
    vi.mocked(listReportsPage)
      .mockRejectedValueOnce(new Error('permission denied'))
      .mockResolvedValueOnce({ items: [REPORT], lastDoc: null, hasMore: false });

    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('.admin-error')).not.toBeNull();
    });
    expect(container.textContent).toContain('permission denied');

    container.querySelector('[data-action="retry"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('This tale contains unattributed material.');
    });
    expect(listReportsPage).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('loads the next page with the cursor', async () => {
    const cursor = { id: 'cursor-1' };
    vi.mocked(listReportsPage)
      .mockResolvedValueOnce({ items: [REPORT], lastDoc: cursor, hasMore: true })
      .mockResolvedValueOnce({
        items: [{ ...REPORT, id: 'rep-2', reason: 'Second report reason.' }],
        lastDoc: null,
        hasMore: false,
      });

    const container = createContainer();
    const unmount = mount({ container, access: ACCESS });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="load-more"]')).not.toBeNull();
    });
    container.querySelector('[data-action="load-more"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Second report reason.');
    });
    expect(listReportsPage).toHaveBeenLastCalledWith({
      status: 'pending',
      search: '',
      direction: 'desc',
      cursor,
    });

    unmount();
  });
});
