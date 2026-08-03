// src/features/reader/__tests__/templates.test.js
import { describe, it, expect, vi } from 'vitest';
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
  });
});
