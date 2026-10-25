// src/pages/admin/modules/comments/__tests__/comments.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../comments.js';

const serviceMocks = vi.hoisted(() => ({
  listCommentsPage: vi.fn(),
  getCommentDetail: vi.fn(),
  moderateComment: vi.fn(),
  deleteComment: vi.fn(),
  restoreComment: vi.fn(),
  purgeComment: vi.fn(),
}));

const uiMocks = vi.hoisted(() => ({
  showConfirmModal: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('@services/admin/comments.service.js', () => ({
  listCommentsPage: serviceMocks.listCommentsPage,
  getCommentDetail: serviceMocks.getCommentDetail,
  moderateComment: serviceMocks.moderateComment,
  deleteComment: serviceMocks.deleteComment,
  restoreComment: serviceMocks.restoreComment,
  purgeComment: serviceMocks.purgeComment,
  COMMENT_FILTERS: ['all', 'visible', 'hidden', 'pinned', 'deleted'],
}));

vi.mock('@/ui/components/confirmModal.js', () => ({
  showConfirmModal: uiMocks.showConfirmModal,
}));

vi.mock('@/ui/components/toast.js', () => ({
  showToast: uiMocks.showToast,
}));

const STAFF_ACCESS = {
  role: 'admin',
  isAdmin: true,
  isModerator: false,
  isStaff: true,
  isAuthor: false,
  canEnter: true,
};

function makeComment(overrides = {}) {
  return {
    id: 'comment-1',
    key: 'tale-1/comment-1',
    taleId: 'tale-1',
    authorId: 'reader-2',
    authorName: 'A. Scribe',
    authorType: 'reader',
    text: 'The road was long, but the archive remembered.',
    isHidden: false,
    isPinned: false,
    isDeleted: false,
    reportCount: 0,
    likeCount: 2,
    replyCount: 0,
    createdAt: '2026-01-02T03:04:00Z',
    updatedAt: '2026-01-02T03:04:00Z',
    ...overrides,
  };
}

function makeDetail(overrides = {}) {
  return {
    ...makeComment(),
    tale: {
      id: 'tale-1',
      title: 'The Long Road',
      status: 'published',
      visibility: 'public',
    },
    ...overrides,
  };
}

function makePage(items, { lastDoc = null, hasMore = false } = {}) {
  return { items, lastDoc, hasMore };
}

function setup(access = STAFF_ACCESS) {
  document.body.innerHTML = '<div id="admin-container"></div>';
  const container = document.getElementById('admin-container');
  const unmount = mount({ container, access, navigate: vi.fn() });
  return { container, unmount };
}

async function openDetail(container) {
  await vi.waitFor(() => {
    expect(container.querySelector('[data-action="view-comment"]')).not.toBeNull();
  });
  container.querySelector('[data-action="view-comment"]').click();
  await vi.waitFor(() => {
    expect(container.querySelector('.admin-detail-panel')).not.toBeNull();
  });
}

describe('admin comments module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.listCommentsPage.mockResolvedValue(makePage([]));
    serviceMocks.getCommentDetail.mockResolvedValue(makeDetail());
    serviceMocks.moderateComment.mockResolvedValue({
      commentId: 'comment-1',
      isHidden: true,
      isPinned: false,
    });
    serviceMocks.deleteComment.mockResolvedValue({
      commentId: 'comment-1',
      authorName: 'A. Scribe',
    });
    uiMocks.showConfirmModal.mockResolvedValue(true);
  });

  it('blocks readers without reading comment data', () => {
    const { container } = setup({
      ...STAFF_ACCESS,
      role: 'user',
      isAdmin: false,
      isStaff: false,
      canEnter: false,
    });

    expect(container.textContent).toContain('administrators and moderators only');
    expect(serviceMocks.listCommentsPage).not.toHaveBeenCalled();
    expect(container.querySelector('[data-role="filter"]')).toBeNull();
  });

  it('renders the global comment list and cursor pagination', async () => {
    serviceMocks.listCommentsPage.mockResolvedValue(
      makePage([makeComment()], { lastDoc: { id: 'cursor-1' }, hasMore: true })
    );

    const { container, unmount } = setup();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('The road was long');
    });

    expect(serviceMocks.listCommentsPage).toHaveBeenCalledWith({
      filter: 'all',
      direction: 'desc',
      pageSize: 20,
    });
    expect(container.textContent).toContain('A. Scribe');
    expect(container.textContent).toContain('tale-1');
    expect(container.querySelector('[data-region="count"]').textContent).toContain('1+');
    expect(container.querySelector('[data-action="load-more"]')).not.toBeNull();
    expect(container.innerHTML).not.toContain('onclick');
    expect(container.innerHTML).not.toContain('onchange');
    expect(window.loadComments).toBeUndefined();

    unmount();
  });

  it('reloads with the selected moderation filter', async () => {
    serviceMocks.listCommentsPage
      .mockResolvedValueOnce(makePage([makeComment()]))
      .mockResolvedValueOnce(makePage([makeComment({ isHidden: true })]));

    const { container, unmount } = setup();
    await vi.waitFor(() => {
      expect(serviceMocks.listCommentsPage).toHaveBeenCalledTimes(1);
    });

    const filter = container.querySelector('[data-role="filter"]');
    filter.value = 'hidden';
    filter.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(serviceMocks.listCommentsPage).toHaveBeenLastCalledWith({
        filter: 'hidden',
        direction: 'desc',
        pageSize: 20,
      });
    });

    unmount();
  });

  it('opens the detail panel with the parent tale summary', async () => {
    serviceMocks.listCommentsPage.mockResolvedValue(makePage([makeComment()]));

    const { container, unmount } = setup();
    await openDetail(container);

    expect(container.textContent).toContain('Comment by A. Scribe');
    expect(container.textContent).toContain('The Long Road');
    expect(container.textContent).toContain('The road was long');
    expect(container.querySelector('a[href="tale.html?id=tale-1"]')).not.toBeNull();
    expect(serviceMocks.getCommentDetail).toHaveBeenCalledWith('tale-1', 'comment-1');

    unmount();
  });

  it('hides a visible comment through the service', async () => {
    serviceMocks.listCommentsPage.mockResolvedValue(makePage([makeComment()]));

    const { container, unmount } = setup();
    await openDetail(container);

    container.querySelector('[data-action="toggle-hidden"]').click();

    await vi.waitFor(() => {
      expect(serviceMocks.moderateComment).toHaveBeenCalledWith('tale-1', 'comment-1', 'hide');
    });
    expect(uiMocks.showToast).toHaveBeenCalledWith('Comment hidden.', 'success');

    unmount();
  });

  it('requires confirmation before deleting a comment', async () => {
    serviceMocks.listCommentsPage.mockResolvedValue(makePage([makeComment()]));

    const { container, unmount } = setup();
    await openDetail(container);

    container.querySelector('[data-action="delete-comment"]').click();

    await vi.waitFor(() => {
      expect(uiMocks.showConfirmModal).toHaveBeenCalled();
    });
    expect(uiMocks.showConfirmModal.mock.calls[0][0].message.toLowerCase()).toContain('remove');
    await vi.waitFor(() => {
      expect(serviceMocks.deleteComment).toHaveBeenCalledWith('tale-1', 'comment-1', {
        reason: '',
        category: 'other',
      });
    });
    expect(uiMocks.showToast).toHaveBeenCalledWith(
      'Comment removed from public view. It can be restored.',
      'success'
    );

    unmount();
  });
});
