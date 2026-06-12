// src/pages/reader/__tests__/theme.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initTheme,
  setTheme,
  setFontFamily,
  setFontSize,
  setLineHeight,
  setMeasure,
  applyCloudPrefs,
} from '../theme.js';
import { readerState } from '../state.js';

describe('ReaderTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div class="reader-surface"></div>
      <div id="atmosphere"></div>
      <div id="particles"></div>
      <input id="font-size" />
      <input id="fs-range" />
      <div id="size-val"></div>
    `;
    vi.clearAllMocks();
  });

  describe('setTheme', () => {
    it('updates state, localStorage, and DOM', () => {
      setTheme('sepia');
      expect(readerState.theme).toBe('sepia');
      expect(localStorage.getItem('tt-reader-theme')).toBe('sepia');
      expect(document.querySelector('.reader-surface').dataset.readerTheme).toBe('sepia');
    });

    it('toggles atmosphere/particles for dark themes', () => {
      setTheme('noir'); //noir is a dark theme
      expect(document.getElementById('atmosphere').style.display).toBe('block');

      setTheme('light'); //light theme
      expect(document.getElementById('atmosphere').style.display).toBe('none');
    });
  });

  describe('setFontSize', () => {
    it('clamps value and updates DOM', () => {
      setFontSize(50); // High bound
      expect(readerState.fontSize).toBe(32); // Max from TYPOGRAPHY_BOUNDS.fontSize
      expect(
        document.querySelector('.reader-surface').style.getPropertyValue('--reader-font-size')
      ).toBe('32px');
      expect(document.getElementById('size-val').textContent).toBe('32px');
    });

    it('clamps low value', () => {
      setFontSize(5);
      expect(readerState.fontSize).toBe(12); // Min is 12 in config
    });
  });

  describe('initTheme', () => {
    it('loads from localStorage', () => {
      localStorage.setItem('tt-reader-theme', 'solar');
      localStorage.setItem('tt-reader-size', '20');

      initTheme();

      expect(readerState.theme).toBe('solar');
      expect(readerState.fontSize).toBe(20);
    });
  });

  describe('applyCloudPrefs', () => {
    it('overrides local state with cloud prefs', () => {
      readerState.theme = 'noir';
      applyCloudPrefs({ theme: 'sepia', fontSize: 24 });

      expect(readerState.theme).toBe('sepia');
      expect(readerState.fontSize).toBe(24);
      expect(document.querySelector('.reader-surface').dataset.readerTheme).toBe('sepia');
    });
  });
});
