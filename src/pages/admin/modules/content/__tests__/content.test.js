// src/pages/admin/modules/content/__tests__/content.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../content.js';

const serviceMocks = vi.hoisted(() => ({
  listTalesPage: vi.fn(),
  getTaleDetail: vi.fn(),
  updateTale: vi.fn(),
  deleteTale: vi.fn(),
}));

const uiMocks = vi.hoisted(() => ({
  showConfirmModal: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('@services/admin/content.service.js', () => ({
  listTalesPage: serviceMocks.listTalesPage,
  getTaleDetail: serviceMocks.getTaleDetail,
  updateTale: serviceMocks.updateTale,
  deleteTale: serviceMocks.deleteTale,
  TALE_STATUSES: ['draft', 'submitted', 'published', 'rejected'],
  TALE_VISIBILITIES: ['public', 'private', 'unlisted'],
}));

vi.mock('@/ui/components/confirmModal.js', () => ({
  showConfirmModal: uiMocks.showConfirmModal,
}));

vi.mock('@/ui/components/toast.js', () => ({
  showToast: uiMocks.showToast,
}));

const ADMIN_ACCESS = {
  role: 'admin',
  isAdmin: true,
  isModerator: false,
  isStaff: true,
  isAuthor: false,
  canEnter: true,
};

function makeTale(overrides = {}) {
  return {
    id: 'tale-1',
    title: 'The Long Road',
    authorId: 'author-1',
    authorName: 'A. Scribe',
    status: 'published',
    visibility: 'public',
    chapterCount: 2,
    wordCount: 1200,
    commentCount: 3,
    updatedAt: '2026-01-02T03:04:00Z',
    publishedAt: '2026-01-01T03:04:00Z',
    ...overrides,
  };
}

function makeDetail(overrides = {}) {
  return {
    ...makeTale(),
    chapters: [
      { id: '0', index: 0, title: 'The Beginning', wordCount: 600 },
      { id: '1', index: 1, title: 'The Crossing', wordCount: 600 },
    ],
    chaptersUnavailable: false,
    chaptersTruncated: false,
    ...overrides,
  };
}

function makePage(items, { lastDoc = null, hasMore = false } = {}) {
  return { items, lastDoc, hasMore };
}

function setup(access = ADMIN_ACCESS) {
  document.body.innerHTML = '<div id="admin-container"></div>';
  const container = document.getElementById('admin-container');
  const unmount = mount({ container, access, navigate: vi.fn() });
  return { container, unmount };
}

async function openDetail(container) {
  await vi.waitFor(() => {
    expect(container.querySelector('[data-action="view-tale"]')).not.toBeNull();
  });
  container.querySelector('[data-action="view-tale"]').click();
  await vi.waitFor(() => {
    expect(container.querySelector('.admin-detail-panel')).not.toBeNull();
  });
}

describe('admin content module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.listTalesPage.mockResolvedValue(makePage([]));
    serviceMocks.getTaleDetail.mockResolvedValue(makeDetail());
    serviceMocks.updateTale.mockResolvedValue({});
    serviceMocks.deleteTale.mockResolvedValue({ id: 'tale-1', title: 'The Long Road' });
    uiMocks.showConfirmModal.mockResolvedValue(true);
  });

  it('blocks non-administrators without reading tale data', () => {
    const { container } = setup({ ...ADMIN_ACCESS, role: 'moderator', isAdmin: false });

    expect(container.textContent).toContain(
      'This archive-wide content view is available to administrators only.'
    );
    expect(serviceMocks.listTalesPage).not.toHaveBeenCalled();
    expect(container.querySelector('[data-role="search"]')).toBeNull();
  });

  it('renders every tale with real fields and cursor pagination', async () => {
    serviceMocks.listTalesPage.mockResolvedValue(
      makePage([makeTale()], { lastDoc: { id: 'cursor-1' }, hasMore: true })
    );

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('The Long Road');
    });

    expect(serviceMocks.listTalesPage).toHaveBeenCalledWith({
      status: 'all',
      search: '',
      direction: 'desc',
      pageSize: 20,
    });
    expect(container.textContent).toContain('A. Scribe');
    expect(container.textContent).toContain('Published');
    expect(container.textContent).toContain('Public');
    expect(container.querySelector('[data-region="count"]').textContent).toContain('1+');
    expect(container.querySelector('[data-action="load-more"]')).not.toBeNull();
    expect(container.innerHTML).not.toContain('onclick');
    expect(container.innerHTML).not.toContain('onchange');
    expect(window.loadTales).toBeUndefined();

    unmount();
  });

  it('reloads with the selected status and loads the next cursor page', async () => {
    serviceMocks.listTalesPage
      .mockResolvedValueOnce(makePage([makeTale()], { lastDoc: { id: 'cursor-1' }, hasMore: true }))
      .mockResolvedValueOnce(
        makePage([makeTale({ status: 'draft' })], {
          lastDoc: { id: 'cursor-2' },
          hasMore: true,
        })
      );

    const { container, unmount } = setup();
    await vi.waitFor(() => {
      expect(serviceMocks.listTalesPage).toHaveBeenCalledTimes(1);
    });

    const status = container.querySelector('[data-role="status"]');
    status.value = 'draft';
    status.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(serviceMocks.listTalesPage).toHaveBeenLastCalledWith({
        status: 'draft',
        search: '',
        direction: 'desc',
        pageSize: 20,
      });
    });

    serviceMocks.listTalesPage.mockResolvedValueOnce(
      makePage([makeTale({ id: 'tale-2', title: 'Another Tale' })], { hasMore: false })
    );
    const loadMore = container.querySelector('[data-action="load-more"]');
    expect(loadMore).not.toBeNull();
    loadMore.click();

    await vi.waitFor(() => {
      expect(serviceMocks.listTalesPage).toHaveBeenLastCalledWith({
        status: 'draft',
        search: '',
        direction: 'desc',
        cursor: { id: 'cursor-2' },
        pageSize: 20,
      });
    });
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Another Tale');
    });

    unmount();
  });

  it('debounces title search and starts a fresh query', async () => {
    serviceMocks.listTalesPage
      .mockResolvedValueOnce(makePage([makeTale()]))
      .mockResolvedValueOnce(makePage([makeTale({ title: 'The Long Winter' })]));

    const { container, unmount } = setup();
    await vi.waitFor(() => {
      expect(serviceMocks.listTalesPage).toHaveBeenCalledTimes(1);
    });

    const search = container.querySelector('[data-role="search"]');
    search.value = 'Long';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    expect(serviceMocks.listTalesPage).toHaveBeenCalledTimes(1);

    await vi.waitFor(
      () => {
        expect(serviceMocks.listTalesPage).toHaveBeenCalledTimes(2);
      },
      { timeout: 2000 }
    );

    expect(serviceMocks.listTalesPage).toHaveBeenLastCalledWith({
      status: 'all',
      search: 'Long',
      direction: 'desc',
      pageSize: 20,
    });
    await vi.waitFor(() => {
      expect(container.textContent).toContain('The Long Winter');
    });

    unmount();
  });

  it('opens the detail panel and saves only the permitted publication fields', async () => {
    serviceMocks.listTalesPage.mockResolvedValue(makePage([makeTale()]));

    const { container, unmount } = setup();
    await openDetail(container);

    expect(container.textContent).toContain('The Beginning');
    expect(container.textContent.replace(/\s+/g, ' ')).toContain('Chapter text is author-owned');

    const title = container.querySelector('[data-role="tale-title"]');
    title.value = 'The Long Road, Revised';
    container.querySelector('[data-action="save-tale"]').click();

    await vi.waitFor(() => {
      expect(serviceMocks.updateTale).toHaveBeenCalledWith('tale-1', {
        title: 'The Long Road, Revised',
        status: 'published',
        visibility: 'public',
      });
    });
    expect(uiMocks.showToast).toHaveBeenCalledWith('Tale updated.', 'success');

    unmount();
  });

  it('requires confirmation before deleting a tale', async () => {
    serviceMocks.listTalesPage.mockResolvedValue(makePage([makeTale()]));

    const { container, unmount } = setup();
    await openDetail(container);

    container.querySelector('[data-action="delete-tale"]').click();

    await vi.waitFor(() => {
      expect(uiMocks.showConfirmModal).toHaveBeenCalled();
    });
    expect(uiMocks.showConfirmModal.mock.calls[0][0].message).toContain('Delete');
    await vi.waitFor(() => {
      expect(serviceMocks.deleteTale).toHaveBeenCalledWith('tale-1');
    });
    expect(uiMocks.showToast).toHaveBeenCalledWith('Tale deleted.', 'success');

    unmount();
  });
});
