// src/pages/admin/my-content/__tests__/my-content.test.js
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount } from '../my-content.js';
import {
  getAuthorTalesPage,
  getAuthorDeletionRequestsPage,
  getAuthorReports,
  requestTaleDeletion,
} from '@services/admin/mycontent.service.js';
import { showConfirmModal } from '@/ui/components/confirmModal.js';
import { showToast } from '@/ui/components/toast.js';

vi.mock('@services/admin/mycontent.service.js', () => ({
  getAuthorTalesPage: vi.fn(),
  getAuthorDeletionRequestsPage: vi.fn(),
  getAuthorReports: vi.fn(),
  requestTaleDeletion: vi.fn(),
}));

vi.mock('@/ui/components/confirmModal.js', () => ({
  showConfirmModal: vi.fn(),
}));

vi.mock('@/ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

describe('my-content module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="admin-container"></div>';
  });

  it('renders author tales, deletion requests, and reports', async () => {
    vi.mocked(getAuthorTalesPage).mockResolvedValue({
      items: [
        {
          id: 'tale-1',
          title: 'Test Tale',
          status: 'published',
          wordCount: 1500,
          publishedAt: '2026-10-01',
          commentCount: 5,
        },
      ],
      lastDoc: null,
      hasMore: false,
    });
    vi.mocked(getAuthorDeletionRequestsPage).mockResolvedValue({
      items: [
        {
          id: 'req-1',
          taleId: 'tale-1',
          status: 'pending',
          createdAt: '2026-10-02',
          reason: 'Outdated',
        },
      ],
      lastDoc: null,
      hasMore: false,
    });
    vi.mocked(getAuthorReports).mockResolvedValue([
      {
        id: 'rep-1',
        targetId: 'tale-1',
        status: 'pending',
        reason: 'Clarification needed',
        createdAt: '2026-10-03',
      },
    ]);

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'author', isAuthor: true } });

    // Wait for async loadInitialData
    await vi.waitFor(() => {
      expect(container.innerHTML).toContain('Test Tale');
      expect(container.innerHTML).toContain('Deletion Requests');
      expect(container.innerHTML).toContain('Pending Reports on Your Content');
    });

    expect(container.innerHTML).toContain('Outdated');
    expect(container.innerHTML).toContain('Clarification needed');

    unmount();
  });

  it('handles request deletion action with confirm modal and toast', async () => {
    vi.mocked(getAuthorTalesPage).mockResolvedValue({
      items: [
        {
          id: 'tale-1',
          title: 'Test Tale',
          status: 'published',
          wordCount: 1500,
          publishedAt: '2026-10-01',
          commentCount: 5,
        },
      ],
      lastDoc: null,
      hasMore: false,
    });
    vi.mocked(getAuthorDeletionRequestsPage).mockResolvedValue({
      items: [],
      lastDoc: null,
      hasMore: false,
    });
    vi.mocked(getAuthorReports).mockResolvedValue([]);
    vi.mocked(showConfirmModal).mockResolvedValue(true);
    vi.mocked(requestTaleDeletion).mockResolvedValue('req-new');

    const container = document.getElementById('admin-container');
    mount({ container, access: { role: 'author', isAuthor: true } });

    await vi.waitFor(() => {
      expect(container.querySelector('[data-action="delete-tale"]')).not.toBeNull();
    });

    const deleteBtn = container.querySelector('[data-action="delete-tale"]');
    deleteBtn.click();

    await vi.waitFor(() => {
      expect(showConfirmModal).toHaveBeenCalled();
      expect(requestTaleDeletion).toHaveBeenCalledWith('tale-1', expect.any(String));
      expect(showToast).toHaveBeenCalledWith('Deletion request submitted successfully', 'success');
    });
  });
});
