import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isSmallChange,
  isStandalonePage,
  updateNavActiveLinks,
  softNavigate,
  initRouter,
} from '../router.js';

describe('Router & Soft Navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app-nav">
        <a href="/index.html" class="nav-link nav-link--active">Home</a>
        <a href="/library.html" class="nav-link">Library</a>
        <a href="/shelf.html" class="nav-link">Shelf</a>
      </div>
      <div id="mobile-dock-container">
        <a href="/index.html" class="dock-item dock-item--active">Home</a>
        <a href="/library.html" class="dock-item">Library</a>
      </div>
      <main id="main-content" class="old-main">
        <h1>Old Page</h1>
      </main>
    `;
  });

  describe('isStandalonePage', () => {
    it('identifies standalone views correctly', () => {
      expect(isStandalonePage('/reader.html')).toBe(true);
      expect(isStandalonePage('/tales/tale1/read/0')).toBe(true);
      expect(isStandalonePage('/login.html')).toBe(true);
      expect(isStandalonePage('/404.html')).toBe(true);

      expect(isStandalonePage('/library.html')).toBe(false);
      expect(isStandalonePage('/shelf.html')).toBe(false);
      expect(isStandalonePage('/tales/tale1')).toBe(false);
      expect(isStandalonePage('/')).toBe(false);
    });
  });

  describe('isSmallChange', () => {
    it('returns true for shell-to-shell navigations', () => {
      expect(isSmallChange('http://localhost:5173/', 'http://localhost:5173/library.html')).toBe(
        true
      );
      expect(
        isSmallChange('http://localhost:5173/library.html', 'http://localhost:5173/shelf.html')
      ).toBe(true);
      expect(
        isSmallChange('http://localhost:5173/shelf.html', 'http://localhost:5173/profile.html')
      ).toBe(true);
      expect(
        isSmallChange(
          'http://localhost:5173/library.html',
          'http://localhost:5173/tales/my-tale-123'
        )
      ).toBe(true);
    });

    it('returns false for large changes (reader, login, 404, assets, external)', () => {
      // Reader (large change: immersive reading experience)
      expect(
        isSmallChange('http://localhost:5173/library.html', 'http://localhost:5173/reader.html')
      ).toBe(false);
      expect(
        isSmallChange('http://localhost:5173/tales/123', 'http://localhost:5173/tales/123/read/0')
      ).toBe(false);

      // Login
      expect(
        isSmallChange('http://localhost:5173/shelf.html', 'http://localhost:5173/login.html')
      ).toBe(false);

      // External URL
      expect(isSmallChange('http://localhost:5173/library.html', 'https://google.com')).toBe(false);

      // Static assets
      expect(isSmallChange('http://localhost:5173/', 'http://localhost:5173/sitemap.xml')).toBe(
        false
      );
      expect(isSmallChange('http://localhost:5173/', 'http://localhost:5173/logo.png')).toBe(false);
    });
  });

  describe('updateNavActiveLinks', () => {
    it('swaps active class in desktop nav and mobile dock', () => {
      updateNavActiveLinks('http://localhost:5173/library.html');

      const homeLink = document.querySelector('#app-nav a[href="/index.html"]');
      const libLink = document.querySelector('#app-nav a[href="/library.html"]');
      const homeDock = document.querySelector('#mobile-dock-container a[href="/index.html"]');
      const libDock = document.querySelector('#mobile-dock-container a[href="/library.html"]');

      expect(homeLink?.classList.contains('nav-link--active')).toBe(false);
      expect(libLink?.classList.contains('nav-link--active')).toBe(true);
      expect(libLink?.getAttribute('aria-current')).toBe('page');

      expect(homeDock?.classList.contains('dock-item--active')).toBe(false);
      expect(libDock?.classList.contains('dock-item--active')).toBe(true);
    });
  });

  describe('softNavigate', () => {
    it('swaps #main-content container when navigating to a shell page', async () => {
      const target = `${window.location.origin}/library.html`;
      // Mock fetch
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head><title>Library Page</title></head>
          <body>
            <main id="main-content" class="new-library-main">
              <h1>Library Content</h1>
            </main>
          </body>
        </html>
      `;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      await softNavigate(target);

      const main = document.getElementById('main-content');
      expect(main?.classList.contains('new-library-main')).toBe(true);
      expect(main?.innerHTML).toContain('Library Content');
      expect(document.title).toBe('Library Page');
    });

    it('falls back to full reload for large changes', async () => {
      const target = `${window.location.origin}/reader.html`;
      const originalLocation = window.location.href;

      delete window.location;
      window.location = {
        href: originalLocation,
        origin: 'http://localhost:3000',
        pathname: '/library.html',
      };

      await softNavigate(target);
      expect(window.location.href).toBe(target);
    });

    it('initializes router event listeners without error', () => {
      expect(() => initRouter()).not.toThrow();
    });
  });
});
