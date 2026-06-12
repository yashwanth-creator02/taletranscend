// src/ui/__tests__/font.registry.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyReaderFont, loadReaderFont, READER_FONTS } from '../font.registry.js';

describe('FontRegistry', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--reader-font-family');
  });

  describe('applyReaderFont', () => {
    it('sets CSS variable and saves to localStorage', () => {
      applyReaderFont('mono');
      expect(document.documentElement.style.getPropertyValue('--reader-font-family')).toBe(
        READER_FONTS.mono.css
      );
      expect(localStorage.getItem('taletranscend:reader-font')).toBe('mono');
    });

    it('does nothing for invalid font keys', () => {
      applyReaderFont('invalid');
      expect(document.documentElement.style.getPropertyValue('--reader-font-family')).toBe('');
      expect(localStorage.getItem('taletranscend:reader-font')).toBeNull();
    });
  });

  describe('loadReaderFont', () => {
    it('returns saved font key', () => {
      localStorage.setItem('taletranscend:reader-font', 'sans');
      expect(loadReaderFont()).toBe('sans');
    });

    it('falls back to serif if nothing is saved', () => {
      expect(loadReaderFont()).toBe('serif');
    });

    it('falls back to serif if saved key is invalid', () => {
      localStorage.setItem('taletranscend:reader-font', 'corrupt-data');
      expect(loadReaderFont()).toBe('serif');
    });
  });
});
