import { describe, it, expect } from 'vitest';
import {
  ROUTES,
  getRouteByUrl,
  isAppShellRoute,
  isStandalonePage,
  isSmallChange,
} from '../routes.js';

describe('Route Registry', () => {
  it('contains definitions for all standard routes', () => {
    const ids = ROUTES.map((r) => r.id);
    expect(ids).toContain('home');
    expect(ids).toContain('library');
    expect(ids).toContain('profile');
    expect(ids).toContain('shelf');
    expect(ids).toContain('contribution');
    expect(ids).toContain('tale');
    expect(ids).toContain('reader');
    expect(ids).toContain('login');
    expect(ids).toContain('404');
  });

  it('matches URLs to route definitions', () => {
    expect(getRouteByUrl('/')?.id).toBe('home');
    expect(getRouteByUrl('/index.html')?.id).toBe('home');
    expect(getRouteByUrl('/library.html')?.id).toBe('library');
    expect(getRouteByUrl('/profile.html')?.id).toBe('profile');
    expect(getRouteByUrl('/shelf.html')?.id).toBe('shelf');
    expect(getRouteByUrl('/contribution.html')?.id).toBe('contribution');
    expect(getRouteByUrl('/tales/ancient-scroll')?.id).toBe('tale');
    expect(getRouteByUrl('/reader.html')?.id).toBe('reader');
    expect(getRouteByUrl('/login.html')?.id).toBe('login');
  });

  it('correctly classifies app shell versus standalone', () => {
    expect(isAppShellRoute('/')).toBe(true);
    expect(isAppShellRoute('/library.html')).toBe(true);
    expect(isAppShellRoute('/profile.html')).toBe(true);
    expect(isAppShellRoute('/toc.html')).toBe(true);

    expect(isAppShellRoute('/shelf.html')).toBe(false);
    expect(isAppShellRoute('/tales/123')).toBe(false);
    expect(isAppShellRoute('/reader.html')).toBe(false);

    expect(isStandalonePage('/shelf.html')).toBe(true);
    expect(isStandalonePage('/reader.html')).toBe(true);
  });

  it('determines small change (app shell to app shell)', () => {
    expect(isSmallChange('http://localhost:5173/', 'http://localhost:5173/library.html')).toBe(
      true
    );
    expect(
      isSmallChange('http://localhost:5173/library.html', 'http://localhost:5173/shelf.html')
    ).toBe(false);
    expect(
      isSmallChange('http://localhost:5173/library.html', 'http://localhost:5173/tales/123')
    ).toBe(false);
  });
});
