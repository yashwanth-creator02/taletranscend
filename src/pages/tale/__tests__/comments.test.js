import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listenToComments,
  postComment,
  editComment,
  editReply,
  deleteComment,
  deleteReply,
  buildReplyTree,
} from '../comments.js';
import * as fb from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: { uid: 'u1', displayName: 'Hero' } },
  addDoc: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  getDocs: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  refs: {
    comments: vi.fn(() => 'comments-ref'),
    comment: vi.fn((tid, cid) => `comments/${tid}/${cid}`),
    commentReplies: vi.fn((tid, cid) => `comments/${tid}/${cid}/replies`),
    commentReply: vi.fn((tid, cid, rid) => `comments/${tid}/${cid}/replies/${rid}`),
    tale: vi.fn((tid) => `tales/${tid}`),
  },
  serverTimestamp: vi.fn(() => 'mock-ts'),
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('@ui/components/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
  escapeHtml: vi.fn((s) => s),
  checkRateLimit: vi.fn(() => true),
  getRemainingTime: vi.fn(() => 1000),
  applyButtonCooldown: vi.fn(),
  validateData: vi.fn((schema, data) => ({ success: true, data })),
  CommentSchema: {},
}));

import { checkRateLimit, applyButtonCooldown } from '@/utils';

describe('TaleComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue(true);
    document.body.innerHTML = `
      <div id="comments-list"></div>
      <textarea id="comment-text"></textarea>
      <button id="post-btn"></button>
    `;
  });

  describe('listenToComments', () => {
    it('fetches and renders comments', async () => {
      vi.mocked(fb.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'c1',
            data: () => ({ authorName: 'A1', text: 'Hello', createdAt: { seconds: 123 } }),
          },
        ],
      });

      await listenToComments('t1');

      const list = document.getElementById('comments-list');
      expect(list.innerHTML).toContain('Hello');
      expect(list.innerHTML).toContain('A1');
    });

    it('renders author tag when comment author matches tale author', async () => {
      vi.mocked(fb.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'c-author',
            data: () => ({
              authorId: 'author-1',
              authorName: 'Scribe Prime',
              text: 'My tale note',
              createdAt: { seconds: 123 },
            }),
          },
        ],
      });

      await listenToComments('t1', 'author-1');

      const list = document.getElementById('comments-list');
      expect(list.innerHTML).toContain('Scribe Prime');
      const tag = list.querySelector('.author-tag');
      expect(tag).not.toBeNull();
      expect(tag.textContent).toBe('Author');
    });

    it('does not render author tag when comment author does not match tale author', async () => {
      vi.mocked(fb.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'c-reader',
            data: () => ({
              authorId: 'reader-99',
              authorName: 'Reader Joy',
              text: 'Great tale',
              createdAt: { seconds: 123 },
            }),
          },
        ],
      });

      await listenToComments('t1', 'author-1');

      const list = document.getElementById('comments-list');
      expect(list.innerHTML).toContain('Reader Joy');
      expect(list.querySelector('.author-tag')).toBeNull();
    });
  });

  describe('postComment', () => {
    it('submits a new comment', async () => {
      document.getElementById('comment-text').value = 'New comment';
      vi.mocked(fb.getDocs).mockResolvedValue({ empty: true, docs: [] }); // For refresh

      await postComment('t1');

      expect(fb.addDoc).toHaveBeenCalledWith(
        'comments-ref',
        expect.objectContaining({
          text: 'New comment',
          authorId: 'u1',
        })
      );
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('transmitted'), 'success');
      expect(document.getElementById('comment-text').value).toBe('');
    });

    it('blocks submission if rate-limited and applies cooldown', async () => {
      document.getElementById('comment-text').value = 'Valid comment';
      vi.mocked(checkRateLimit).mockReturnValue(false);

      await postComment('t1');

      expect(fb.addDoc).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('wait'), 'warning');
      expect(applyButtonCooldown).toHaveBeenCalled();
    });
  });

  describe('comment editing and edited badge', () => {
    it('renders edited badge when isEdited is true', async () => {
      vi.mocked(fb.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'c-edited',
            data: () => ({
              authorId: 'u2',
              authorName: 'Other Scribe',
              text: 'Edited content',
              isEdited: true,
              createdAt: { seconds: 123 },
            }),
          },
        ],
      });

      await listenToComments('t1');

      const list = document.getElementById('comments-list');
      const badge = list.querySelector('.edited-badge');
      expect(badge).not.toBeNull();
      expect(badge.textContent).toContain('Edited');
    });

    it('does not render edited badge when isEdited is false or undefined', async () => {
      vi.mocked(fb.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'c-normal',
            data: () => ({
              authorId: 'u2',
              authorName: 'Other Scribe',
              text: 'Original content',
              isEdited: false,
              createdAt: { seconds: 123 },
            }),
          },
        ],
      });

      await listenToComments('t1');

      const list = document.getElementById('comments-list');
      expect(list.querySelector('.edited-badge')).toBeNull();
    });

    it('renders edit button for comment author but not for other users', async () => {
      vi.mocked(fb.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'c-mine',
            data: () => ({
              authorId: 'u1',
              authorName: 'Hero',
              text: 'My echo',
              createdAt: { seconds: 123 },
            }),
          },
          {
            id: 'c-other',
            data: () => ({
              authorId: 'u2',
              authorName: 'Other',
              text: 'Other echo',
              createdAt: { seconds: 123 },
            }),
          },
        ],
      });

      await listenToComments('t1');

      expect(document.querySelector('#comment-c-mine .edit-comment-trigger')).not.toBeNull();
      expect(document.querySelector('#comment-c-other .edit-comment-trigger')).toBeNull();
    });

    it('toggles edit form on edit button click and cancels correctly', async () => {
      vi.mocked(fb.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'c-mine',
            data: () => ({
              authorId: 'u1',
              authorName: 'Hero',
              text: 'Original text',
              createdAt: { seconds: 123 },
            }),
          },
        ],
      });

      await listenToComments('t1');

      const editBtn = document.querySelector('.edit-comment-trigger');
      const form = document.getElementById('comment-edit-form-c-mine');
      const textDisplay = document.getElementById('comment-text-display-c-mine');

      expect(form.classList.contains('hidden')).toBe(true);

      editBtn.click();
      expect(form.classList.contains('hidden')).toBe(false);
      expect(textDisplay.classList.contains('hidden')).toBe(true);

      const cancelBtn = document.querySelector('.cancel-edit-trigger');
      cancelBtn.click();
      expect(form.classList.contains('hidden')).toBe(true);
      expect(textDisplay.classList.contains('hidden')).toBe(false);
    });

    it('saves edited comment, updates DOM, and adds edited badge', async () => {
      vi.mocked(fb.getDocs).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'c-mine',
            data: () => ({
              authorId: 'u1',
              authorName: 'Hero',
              text: 'Old echo',
              isEdited: false,
              createdAt: { seconds: 123 },
            }),
          },
        ],
      });

      await listenToComments('t1');

      const editBtn = document.querySelector('.edit-comment-trigger');
      editBtn.click();

      const textarea = document.getElementById('comment-edit-text-c-mine');
      textarea.value = 'Updated echo text';

      const saveBtn = document.querySelector('.save-edit-trigger');
      saveBtn.click();

      await new Promise((r) => setTimeout(r, 10));

      expect(fb.updateDoc).toHaveBeenCalledWith(
        'comments/t1/c-mine',
        expect.objectContaining({
          text: 'Updated echo text',
          isEdited: true,
          editedAt: 'mock-ts',
          updatedAt: 'mock-ts',
        })
      );

      const textDisplay = document.getElementById('comment-text-display-c-mine');
      expect(textDisplay.textContent).toBe('Updated echo text');
      expect(textDisplay.classList.contains('hidden')).toBe(false);

      const badge = document.querySelector('#comment-c-mine .edited-badge');
      expect(badge).not.toBeNull();
      expect(badge.textContent).toContain('Edited');
      expect(showToast).toHaveBeenCalledWith('Echo updated.', 'success');
    });

    it('editComment helper function executes updateDoc with required fields', async () => {
      await editComment('tale-1', 'comment-1', 'Direct edit text');

      expect(fb.updateDoc).toHaveBeenCalledWith('comments/tale-1/comment-1', {
        text: 'Direct edit text',
        isEdited: true,
        editedAt: 'mock-ts',
        updatedAt: 'mock-ts',
      });
    });
  });

  describe('comment deletion and soft-delete display', () => {
    it('erases text and shows "This has been deleted by the user." when silence button is clicked by author', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      vi.mocked(fb.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'c-mine',
            data: () => ({
              authorId: 'u1',
              authorName: 'Hero',
              text: 'My echo to silence',
              createdAt: { seconds: 123 },
            }),
          },
        ],
      });

      await listenToComments('t1');

      const deleteBtn = document.querySelector('.delete-comment-trigger');
      expect(deleteBtn).not.toBeNull();

      deleteBtn.click();

      // Wait a tick for async handler
      await new Promise((r) => setTimeout(r, 10));

      expect(fb.updateDoc).toHaveBeenCalledWith(
        'comments/t1/c-mine',
        expect.objectContaining({
          text: '',
          isDeleted: true,
          deletedAt: 'mock-ts',
          updatedAt: 'mock-ts',
        })
      );
      // Comment container remains present
      expect(document.getElementById('comment-c-mine')).not.toBeNull();
      const textDisplay = document.getElementById('comment-text-display-c-mine');
      expect(textDisplay.textContent).toBe('This has been deleted by the user.');
      expect(textDisplay.classList.contains('italic')).toBe(true);

      // Actions are removed
      expect(document.querySelector('#comment-c-mine .delete-comment-trigger')).toBeNull();
      expect(document.querySelector('#comment-c-mine .edit-comment-trigger')).toBeNull();
      expect(document.querySelector('#comment-c-mine .reply-trigger')).toBeNull();
      expect(showToast).toHaveBeenCalledWith('Echo silenced.', 'success');
    });

    it('renders "This has been deleted by the user." for initially deleted comments without edit/delete/reply triggers', async () => {
      vi.mocked(fb.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'c-deleted',
            data: () => ({
              authorId: 'u1',
              authorName: 'Hero',
              text: '',
              isDeleted: true,
              createdAt: { seconds: 123 },
            }),
          },
        ],
      });

      await listenToComments('t1');

      const textDisplay = document.getElementById('comment-text-display-c-deleted');
      expect(textDisplay).not.toBeNull();
      expect(textDisplay.textContent).toBe('This has been deleted by the user.');
      expect(textDisplay.classList.contains('italic')).toBe(true);

      // No action triggers rendered
      expect(document.querySelector('#comment-c-deleted .edit-comment-trigger')).toBeNull();
      expect(document.querySelector('#comment-c-deleted .delete-comment-trigger')).toBeNull();
      expect(document.querySelector('#comment-c-deleted .reply-trigger')).toBeNull();
    });

    it('soft-deletes reply when silence reply is clicked', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      // 1st getDocs: comment
      vi.mocked(fb.getDocs)
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            {
              id: 'c1',
              data: () => ({
                authorId: 'u2',
                authorName: 'Other',
                text: 'Top echo',
                createdAt: { seconds: 123 },
              }),
            },
          ],
        })
        // 2nd getDocs: replies for c1
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            {
              id: 'r1',
              data: () => ({
                authorId: 'u1',
                authorName: 'Hero',
                text: 'My reply to silence',
                parentId: 'c1',
                createdAt: { seconds: 124 },
              }),
            },
          ],
        });

      await listenToComments('t1');

      const deleteReplyBtn = document.querySelector('.delete-reply-trigger');
      expect(deleteReplyBtn).not.toBeNull();

      deleteReplyBtn.click();

      await new Promise((r) => setTimeout(r, 10));

      expect(fb.updateDoc).toHaveBeenCalledWith(
        'comments/t1/c1/replies/r1',
        expect.objectContaining({
          text: '',
          isDeleted: true,
          deletedAt: 'mock-ts',
          updatedAt: 'mock-ts',
        })
      );
      expect(document.getElementById('reply-r1')).not.toBeNull();
      const replyDisplay = document.getElementById('reply-text-display-r1');
      expect(replyDisplay.textContent).toBe('This has been deleted by the user.');
      expect(document.querySelector('#reply-r1 .delete-reply-trigger')).toBeNull();
      expect(document.querySelector('#reply-r1 .edit-reply-trigger')).toBeNull();
      expect(showToast).toHaveBeenCalledWith('Reply silenced.', 'success');
    });

    it('renders "This has been deleted by the user." for initially deleted replies', async () => {
      vi.mocked(fb.getDocs)
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            {
              id: 'c1',
              data: () => ({
                authorId: 'u2',
                authorName: 'Other',
                text: 'Top echo',
                createdAt: { seconds: 123 },
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            {
              id: 'r-deleted',
              data: () => ({
                authorId: 'u1',
                authorName: 'Hero',
                text: '',
                isDeleted: true,
                parentId: 'c1',
                createdAt: { seconds: 124 },
              }),
            },
          ],
        });

      await listenToComments('t1');

      const replyDisplay = document.getElementById('reply-text-display-r-deleted');
      expect(replyDisplay).not.toBeNull();
      expect(replyDisplay.textContent).toBe('This has been deleted by the user.');
      expect(document.querySelector('#reply-r-deleted .delete-reply-trigger')).toBeNull();
      expect(document.querySelector('#reply-r-deleted .edit-reply-trigger')).toBeNull();
    });

    it('deleteComment helper function executes updateDoc with soft delete payload', async () => {
      await deleteComment('tale-1', 'comment-1');

      expect(fb.updateDoc).toHaveBeenCalledWith('comments/tale-1/comment-1', {
        text: '',
        isDeleted: true,
        deletedAt: 'mock-ts',
        updatedAt: 'mock-ts',
      });
    });

    it('deleteReply helper function executes updateDoc with soft delete payload', async () => {
      await deleteReply('tale-1', 'comment-1', 'reply-1');

      expect(fb.updateDoc).toHaveBeenCalledWith('comments/tale-1/comment-1/replies/reply-1', {
        text: '',
        isDeleted: true,
        deletedAt: 'mock-ts',
        updatedAt: 'mock-ts',
      });
    });
  });

  describe('nested replies and reply-to-reply hierarchy', () => {
    describe('buildReplyTree', () => {
      it('returns empty array when given non-array or empty array', () => {
        expect(buildReplyTree([])).toEqual([]);
        expect(buildReplyTree(null)).toEqual([]);
        expect(buildReplyTree(undefined)).toEqual([]);
      });

      it('returns root nodes for replies without replyToId', () => {
        const replies = [
          { id: 'r1', text: 'First' },
          { id: 'r2', text: 'Second' },
        ];
        const tree = buildReplyTree(replies);
        expect(tree).toHaveLength(2);
        expect(tree[0].id).toBe('r1');
        expect(tree[0].children).toEqual([]);
        expect(tree[1].id).toBe('r2');
        expect(tree[1].children).toEqual([]);
      });

      it('nests child replies under their parent reply', () => {
        const replies = [
          { id: 'r1', text: 'Parent' },
          { id: 'r2', text: 'Child of r1', replyToId: 'r1' },
          { id: 'r3', text: 'Grandchild of r2', replyToId: 'r2' },
          { id: 'r4', text: 'Another child of r1', replyToId: 'r1' },
        ];
        const tree = buildReplyTree(replies);
        expect(tree).toHaveLength(1);
        expect(tree[0].id).toBe('r1');
        expect(tree[0].children).toHaveLength(2);
        expect(tree[0].children[0].id).toBe('r2');
        expect(tree[0].children[0].children).toHaveLength(1);
        expect(tree[0].children[0].children[0].id).toBe('r3');
        expect(tree[0].children[1].id).toBe('r4');
      });

      it('gracefully handles orphaned reply by making it a root node', () => {
        const replies = [
          { id: 'r1', text: 'Parent' },
          { id: 'r2', text: 'Orphan reply', replyToId: 'non-existent' },
        ];
        const tree = buildReplyTree(replies);
        expect(tree).toHaveLength(2);
        expect(tree[0].id).toBe('r1');
        expect(tree[1].id).toBe('r2');
      });
    });

    describe('nested reply rendering and interactions', () => {
      it('renders hierarchical tree with replyTo badge and nested children container', async () => {
        vi.mocked(fb.getDocs)
          .mockResolvedValueOnce({
            empty: false,
            docs: [
              {
                id: 'c1',
                data: () => ({
                  authorId: 'u2',
                  authorName: 'Commenter',
                  text: 'Top level echo',
                  createdAt: { seconds: 123 },
                }),
              },
            ],
          })
          .mockResolvedValueOnce({
            empty: false,
            docs: [
              {
                id: 'r1',
                data: () => ({
                  authorId: 'u3',
                  authorName: 'ReplyAuthor1',
                  text: 'Direct reply',
                  createdAt: { seconds: 124 },
                  replyToId: null,
                }),
              },
              {
                id: 'r2',
                data: () => ({
                  authorId: 'u1',
                  authorName: 'Hero',
                  text: 'Nested reply to r1',
                  createdAt: { seconds: 125 },
                  replyToId: 'r1',
                  replyToAuthorName: 'ReplyAuthor1',
                }),
              },
            ],
          });

        await listenToComments('t1');

        // Verify r1 contains child replies container holding r2
        const r1Element = document.getElementById('reply-r1');
        expect(r1Element).not.toBeNull();

        const childContainer = document.getElementById('child-replies-r1');
        expect(childContainer).not.toBeNull();
        expect(childContainer.querySelector('#reply-r2')).not.toBeNull();

        // Verify r2 has the reply-to tag pointing to ReplyAuthor1
        const r2Tag = document.querySelector('#reply-r2 .reply-to-tag');
        expect(r2Tag).not.toBeNull();
        expect(r2Tag.textContent).toContain('ReplyAuthor1');

        // Verify Echo Back button is rendered for r2
        const r2EchoBtn = document.querySelector('.reply-to-reply-trigger[data-reply-id="r2"]');
        expect(r2EchoBtn).not.toBeNull();
      });

      it('opens and cancels reply-to-reply form', async () => {
        vi.mocked(fb.getDocs)
          .mockResolvedValueOnce({
            empty: false,
            docs: [
              {
                id: 'c1',
                data: () => ({
                  authorId: 'u2',
                  authorName: 'TopAuthor',
                  text: 'Echo',
                  createdAt: { seconds: 123 },
                }),
              },
            ],
          })
          .mockResolvedValueOnce({
            empty: false,
            docs: [
              {
                id: 'r1',
                data: () => ({
                  authorId: 'u3',
                  authorName: 'ReplyAuthor1',
                  text: 'Parent reply',
                  createdAt: { seconds: 124 },
                }),
              },
            ],
          });

        await listenToComments('t1');

        const trigger = document.querySelector('.reply-to-reply-trigger[data-reply-id="r1"]');
        const form = document.getElementById('reply-to-reply-form-r1');
        expect(form.classList.contains('hidden')).toBe(true);

        trigger.click();
        expect(form.classList.contains('hidden')).toBe(false);

        const cancelBtn = document.querySelector('.cancel-reply-to-reply[data-reply-id="r1"]');
        cancelBtn.click();
        expect(form.classList.contains('hidden')).toBe(true);
      });

      it('submits reply-to-reply with target reply info and refreshes thread', async () => {
        vi.mocked(fb.getDocs)
          .mockResolvedValueOnce({
            empty: false,
            docs: [
              {
                id: 'c1',
                data: () => ({
                  authorId: 'u2',
                  authorName: 'TopAuthor',
                  text: 'Echo',
                  createdAt: { seconds: 123 },
                }),
              },
            ],
          })
          .mockResolvedValueOnce({
            empty: false,
            docs: [
              {
                id: 'r1',
                data: () => ({
                  authorId: 'u3',
                  authorName: 'TargetAuthor',
                  text: 'Parent reply',
                  createdAt: { seconds: 124 },
                }),
              },
            ],
          })
          .mockResolvedValueOnce({
            // Refresh call after posting
            empty: false,
            docs: [],
          });

        await listenToComments('t1');

        const trigger = document.querySelector('.reply-to-reply-trigger[data-reply-id="r1"]');
        trigger.click();

        const input = document.getElementById('reply-to-reply-text-r1');
        input.value = 'My nested reply text';

        const submitBtn = document.querySelector('.submit-reply-to-reply[data-reply-id="r1"]');
        submitBtn.click();

        await new Promise((r) => setTimeout(r, 10));

        expect(fb.addDoc).toHaveBeenCalledWith(
          'comments/t1/c1/replies',
          expect.objectContaining({
            parentId: 'c1',
            replyToId: 'r1',
            replyToAuthorName: 'TargetAuthor',
            text: 'My nested reply text',
            authorId: 'u1',
          })
        );
        expect(showToast).toHaveBeenCalledWith('Echo back recorded.', 'success');
      });

      it('allows editing a nested reply in-place', async () => {
        vi.mocked(fb.getDocs)
          .mockResolvedValueOnce({
            empty: false,
            docs: [
              {
                id: 'c1',
                data: () => ({
                  authorId: 'u2',
                  authorName: 'TopAuthor',
                  text: 'Echo',
                  createdAt: { seconds: 123 },
                }),
              },
            ],
          })
          .mockResolvedValueOnce({
            empty: false,
            docs: [
              {
                id: 'r1',
                data: () => ({
                  authorId: 'u3',
                  authorName: 'ParentAuthor',
                  text: 'Parent reply',
                  createdAt: { seconds: 124 },
                }),
              },
              {
                id: 'r2',
                data: () => ({
                  authorId: 'u1', // Current user
                  authorName: 'Hero',
                  text: 'Original nested text',
                  replyToId: 'r1',
                  replyToAuthorName: 'ParentAuthor',
                  createdAt: { seconds: 125 },
                }),
              },
            ],
          });

        await listenToComments('t1');

        const editBtn = document.querySelector('.edit-reply-trigger[data-reply-id="r2"]');
        expect(editBtn).not.toBeNull();

        editBtn.click();

        const editForm = document.getElementById('reply-edit-form-r2');
        expect(editForm.classList.contains('hidden')).toBe(false);

        const textarea = document.getElementById('reply-edit-text-r2');
        textarea.value = 'Updated nested text';

        const saveBtn = document.querySelector('.save-reply-edit-trigger[data-reply-id="r2"]');
        saveBtn.click();

        await new Promise((r) => setTimeout(r, 10));

        expect(fb.updateDoc).toHaveBeenCalledWith(
          'comments/t1/c1/replies/r2',
          expect.objectContaining({
            text: 'Updated nested text',
            isEdited: true,
            editedAt: 'mock-ts',
            updatedAt: 'mock-ts',
          })
        );

        const textDisplay = document.getElementById('reply-text-display-r2');
        expect(textDisplay.textContent).toBe('Updated nested text');
        expect(document.querySelector('#reply-r2 .edited-badge')).not.toBeNull();
      });

      it('silencing (soft-deleting) parent reply preserves its child replies in the hierarchy', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        vi.mocked(fb.getDocs)
          .mockResolvedValueOnce({
            empty: false,
            docs: [
              {
                id: 'c1',
                data: () => ({
                  authorId: 'u2',
                  authorName: 'TopAuthor',
                  text: 'Echo',
                  createdAt: { seconds: 123 },
                }),
              },
            ],
          })
          .mockResolvedValueOnce({
            empty: false,
            docs: [
              {
                id: 'r1',
                data: () => ({
                  authorId: 'u1', // Current user
                  authorName: 'Hero',
                  text: 'Parent reply to delete',
                  createdAt: { seconds: 124 },
                }),
              },
              {
                id: 'r2',
                data: () => ({
                  authorId: 'u3',
                  authorName: 'OtherAuthor',
                  text: 'Child reply that should remain visible',
                  replyToId: 'r1',
                  replyToAuthorName: 'Hero',
                  createdAt: { seconds: 125 },
                }),
              },
            ],
          });

        await listenToComments('t1');

        const deleteR1Btn = document.querySelector('.delete-reply-trigger[data-reply-id="r1"]');
        expect(deleteR1Btn).not.toBeNull();

        deleteR1Btn.click();

        await new Promise((r) => setTimeout(r, 10));

        // Parent reply is soft-deleted
        expect(fb.updateDoc).toHaveBeenCalledWith(
          'comments/t1/c1/replies/r1',
          expect.objectContaining({
            text: '',
            isDeleted: true,
            deletedAt: 'mock-ts',
            updatedAt: 'mock-ts',
          })
        );

        const r1Display = document.getElementById('reply-text-display-r1');
        expect(r1Display.textContent).toBe('This has been deleted by the user.');

        // r1 action triggers are removed
        expect(document.querySelector('.delete-reply-trigger[data-reply-id="r1"]')).toBeNull();
        expect(document.querySelector('.edit-reply-trigger[data-reply-id="r1"]')).toBeNull();
        expect(document.querySelector('.reply-to-reply-trigger[data-reply-id="r1"]')).toBeNull();

        // Crucial: Child replies container AND r2 are preserved and still in DOM
        const childContainer = document.getElementById('child-replies-r1');
        expect(childContainer).not.toBeNull();
        const r2Element = document.getElementById('reply-r2');
        expect(r2Element).not.toBeNull();
        expect(document.getElementById('reply-text-display-r2').textContent).toBe(
          'Child reply that should remain visible'
        );
      });
    });
  });
});
