// src/ui/components/nav/__tests__/nav.utils.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentPage, getAvatarSeed, getNavElements } from '../nav.utils.js';

describe('Nav Utils', () => {
  describe('getCurrentPage', () => {
    it('returns filename from pathname', () => {
      vi.stubGlobal('location', { pathname: '/folder/library.html' });
      expect(getCurrentPage()).toBe('library.html');
    });

    it('falls back to index.html for root', () => {
      vi.stubGlobal('location', { pathname: '/' });
      expect(getCurrentPage()).toBe('index.html');
    });
  });

  describe('getAvatarSeed', () => {
    it('returns first 8 chars of uid', () => {
      expect(getAvatarSeed({ uid: '1234567890' })).toBe('12345678');
    });

    it('returns guest if user is null', () => {
      expect(getAvatarSeed(null)).toBe('guest');
    });
  });

  describe('getNavElements', () => {
    it('returns object with element references', () => {
      document.body.innerHTML = `
        <nav id="app-nav"></nav>
        <button id="avatar-btn"></button>
      `;
      const elements = getNavElements();
      expect(elements.nav).toBeTruthy();
      expect(elements.avatarButton).toBeTruthy();
      expect(elements.dropdown).toBeNull();
    });
  });
});
