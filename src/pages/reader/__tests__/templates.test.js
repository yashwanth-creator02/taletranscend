// src/pages/reader/__tests__/templates.test.js
import { describe, it, expect } from 'vitest';
import {
  renderTocPanel,
  renderTypographyPanel,
  renderThemePanel,
  renderHighlightsPanel,
  renderQuoteCardModal,
  renderCommentsPanel,
  buildReplyTree,
  renderInfoPanel,
} from '../templates.js';

describe('ReaderTemplates', () => {
  describe('renderTocPanel', () => {
    it('renders chapters and progress', () => {
      const chapters = [{ id: 'c1', title: 'Ch 1', number: 1, wordCount: 1000 }];
      const html = renderTocPanel(chapters, 'c1', 50, null, 'My Tale');
      expect(html).toContain('50%');
      expect(html).toContain('My Tale');
      expect(html).toContain('Ch 1');
      expect(html).toContain('1,000 words');
      expect(html).toContain('data-toc-menu-trigger="c1"');
      expect(html).toContain('data-action="mark-read"');
      expect(html).toContain('data-action="mark-unread"');
      expect(html).toContain('data-action="download-chapter"');
    });

    it('renders bookmark indicator when chapter is bookmarked', () => {
      const chapters = [
        { id: 'c1', title: 'Ch 1', number: 1, wordCount: 1000 },
        { id: 'c2', title: 'Ch 2', number: 2, wordCount: 1200 },
      ];
      const html = renderTocPanel(chapters, 'c1', 25, null, 'My Tale', {
        bookmarkedChapterIndex: 1,
      });
      expect(html).toContain('toc-bookmark-label');
      expect(html).toContain('Bookmarked');
    });
  });

  describe('renderTypographyPanel', () => {
    it('renders with current state', () => {
      const state = { fontFamily: 'serif', fontSize: 18, lineHeight: 1.75, measure: 68 };
      const html = renderTypographyPanel(state);
      expect(html).toContain('18px');
      expect(html).toContain('1.75');
      expect(html).toContain('68ch');
    });
  });

  describe('renderThemePanel', () => {
    it('renders theme options', () => {
      const html = renderThemePanel('noir');
      expect(html).toContain('Mythic Noir');
      expect(html).toContain('theme-btn hover-lift active');
    });
  });

  describe('renderHighlightsPanel', () => {
    it('renders empty state', () => {
      const html = renderHighlightsPanel([]);
      expect(html).toContain('No highlights yet');
    });

    it('renders highlights with jump target and share card button', () => {
      const highlights = [{ id: 'h1', text: 'Important text', color: 'gold', at: Date.now() }];
      const html = renderHighlightsPanel(highlights);
      expect(html).toContain('Important text');
      expect(html).toContain('highlight-gold');
      expect(html).toContain('data-jump-hl="h1"');
      expect(html).toContain('data-share-quote="h1"');
      expect(html).toContain('data-rm-hl="h1"');
    });
  });

  describe('renderQuoteCardModal', () => {
    it('renders big bold quote, author, tale title, and cover background', () => {
      const html = renderQuoteCardModal({
        quote: 'The stars whisper forgotten truths.',
        taleTitle: 'The Celestial Scribe',
        authorName: 'Aurelius Vance',
        coverUrl: 'https://images.unsplash.com/photo-stars.jpg',
        chapterNum: 3,
      });

      expect(html).toContain('The stars whisper forgotten truths.');
      expect(html).toContain('The Celestial Scribe');
      expect(html).toContain('by Aurelius Vance');
      expect(html).toContain('https://images.unsplash.com/photo-stars.jpg');
      expect(html).toContain('Fragment 3');
      expect(html).toContain('data-copy-quote');
      expect(html).toContain('data-modal-close');
    });

    it('renders fallback values gracefully when options omitted', () => {
      const html = renderQuoteCardModal();
      expect(html).toContain('Untitled Tale');
      expect(html).toContain('by Unknown Scribe');
      expect(html).toContain('Fragment 1');
    });
  });

  describe('renderCommentsPanel', () => {
    it('renders existing comments', () => {
      const comments = [{ body: 'Nice tale!', author: 'User 1', initials: 'U1' }];
      const html = renderCommentsPanel(comments, '');
      expect(html).toContain('Nice tale!');
      expect(html).toContain('U1');
    });

    it('renders author badge when isTaleAuthor is true', () => {
      const comments = [
        { body: 'Note from author', author: 'Author Scribe', initials: 'AS', isTaleAuthor: true },
      ];
      const html = renderCommentsPanel(comments, '');
      expect(html).toContain('Author');
      expect(html).toContain('author-tag');
    });

    it('renders edited badge when isEdited is true', () => {
      const comments = [{ body: 'Edited note', author: 'Reader', initials: 'RD', isEdited: true }];
      const html = renderCommentsPanel(comments, '');
      expect(html).toContain('Edited');
      expect(html).toContain('edited-badge');
    });

    it('renders date and time for comments', () => {
      const fixedTime = new Date('2026-10-12T15:30:00Z').getTime();
      const comments = [{ body: 'Hello world', author: 'User', at: fixedTime }];
      const html = renderCommentsPanel(comments, '');
      expect(html).toContain('Oct 12, 2026');
      expect(html).toContain(':'); // Contains time component
    });

    it('renders deleted notice when isDeleted is true', () => {
      const comments = [
        {
          id: 'c1',
          body: '',
          author: 'Reader',
          authorId: 'u1',
          isDeleted: true,
        },
      ];
      const html = renderCommentsPanel(comments, '', 'u1');
      expect(html).toContain('This comment has been deleted by the user.');
      expect(html).not.toContain('delete-trigger');
      expect(html).not.toContain('edit-trigger');
    });

    it('renders reply and like buttons', () => {
      const comments = [
        {
          id: 'c1',
          body: 'Great chapter!',
          author: 'Reader',
          authorId: 'u2',
          likes: 5,
          liked: true,
        },
      ];
      const html = renderCommentsPanel(comments, '', 'u1');
      expect(html).toContain('reply-trigger');
      expect(html).toContain('like-trigger');
      expect(html).toContain('5');
    });

    it('renders edit and delete buttons for comment owner', () => {
      const comments = [
        {
          id: 'c1',
          body: 'My own comment',
          author: 'Me',
          authorId: 'u1',
        },
      ];
      const html = renderCommentsPanel(comments, '', 'u1');
      expect(html).toContain('edit-trigger');
      expect(html).toContain('delete-trigger');
      expect(html).toContain('comment-edit-form-c1');
      expect(html).toContain('comment-cancel-btn');
      expect(html).toContain('flex-wrap');
    });

    it('renders nested replies when present', () => {
      const comments = [
        {
          id: 'c1',
          body: 'Top level',
          author: 'User 1',
          replies: [
            {
              id: 'r1',
              parentId: 'c1',
              body: 'Nested reply here',
              author: 'Replier',
              authorId: 'u2',
              likes: 2,
            },
          ],
        },
      ];
      const html = renderCommentsPanel(comments, '');
      expect(html).toContain('Nested reply here');
      expect(html).toContain('reply-r1');
      expect(html).toContain('Replier');
      expect(html).toContain('reply-to-reply-trigger');
      expect(html).toContain('reply-to-reply-form-r1');
    });

    it('renders arbitrary multi-level nested replies with reply target badges', () => {
      const comments = [
        {
          id: 'c1',
          body: 'Root comment',
          author: 'Author A',
          replies: [
            {
              id: 'r1',
              parentId: 'c1',
              replyToId: null,
              author: 'Responder B',
              body: 'First-level reply',
            },
            {
              id: 'r2',
              parentId: 'c1',
              replyToId: 'r1',
              replyToAuthor: 'Responder B',
              author: 'Responder C',
              body: 'Second-level reply',
            },
            {
              id: 'r3',
              parentId: 'c1',
              replyToId: 'r2',
              replyToAuthor: 'Responder C',
              author: 'Responder D',
              body: 'Third-level reply',
            },
          ],
        },
      ];
      const html = renderCommentsPanel(comments, '');
      expect(html).toContain('First-level reply');
      expect(html).toContain('Second-level reply');
      expect(html).toContain('Third-level reply');
      expect(html).toContain('@Responder B');
      expect(html).toContain('@Responder C');
      expect(html).toContain('reply-to-reply-form-r1');
      expect(html).toContain('reply-to-reply-form-r2');
      expect(html).toContain('reply-to-reply-form-r3');
    });
  });

  describe('buildReplyTree', () => {
    it('returns an empty array when given empty or null list', () => {
      expect(buildReplyTree([])).toEqual([]);
      expect(buildReplyTree(null)).toEqual([]);
      expect(buildReplyTree(undefined)).toEqual([]);
    });

    it('returns flat nodes when none have replyToId', () => {
      const replies = [
        { id: 'r1', body: 'Reply 1' },
        { id: 'r2', body: 'Reply 2' },
      ];
      const tree = buildReplyTree(replies);
      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('r1');
      expect(tree[0].children).toEqual([]);
      expect(tree[1].id).toBe('r2');
      expect(tree[1].children).toEqual([]);
    });

    it('builds multi-level nested hierarchy accurately', () => {
      const replies = [
        { id: 'r1', body: 'Level 1' },
        { id: 'r2', replyToId: 'r1', body: 'Level 2' },
        { id: 'r3', replyToId: 'r2', body: 'Level 3' },
        { id: 'r4', replyToId: 'r1', body: 'Another Level 2' },
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

    it('falls back to root level for orphaned replies with nonexistent replyToId', () => {
      const replies = [{ id: 'r1', replyToId: 'missing-parent', body: 'Orphan reply' }];
      const tree = buildReplyTree(replies);
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('r1');
    });
  });

  describe('renderInfoPanel', () => {
    it('renders stats', () => {
      const state = {
        estimatedReadMins: 5,
        wordCount: 1200,
        progress: 25,
        era: 'Modern',
        language: 'En',
      };
      const html = renderInfoPanel(state);
      expect(html).toContain('5 min');
      expect(html).toContain('1,200');
      expect(html).toContain('25 %');
      expect(html).toContain('Modern');
    });

    it('renders author info when provided', () => {
      const state = {
        estimatedReadMins: 5,
        wordCount: 1200,
        authorName: 'Eldritch Scribe',
        authorHandle: '@eldritch',
        authorBio: 'Keeper of forgotten mythologies.',
      };
      const html = renderInfoPanel(state);
      expect(html).toContain('Eldritch Scribe');
      expect(html).toContain('@eldritch');
      expect(html).toContain('Keeper of forgotten mythologies.');
      expect(html).toContain('ES');
    });
  });
});
