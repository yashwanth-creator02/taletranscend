// src/pages/reader/__tests__/templates.test.js
import { describe, it, expect } from 'vitest';
import {
  renderTocPanel,
  renderTypographyPanel,
  renderThemePanel,
  renderHighlightsPanel,
  renderCommentsPanel,
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

    it('renders highlights', () => {
      const highlights = [{ id: 'h1', text: 'Important text', color: 'gold', at: Date.now() }];
      const html = renderHighlightsPanel(highlights);
      expect(html).toContain('Important text');
      expect(html).toContain('highlight-gold');
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
