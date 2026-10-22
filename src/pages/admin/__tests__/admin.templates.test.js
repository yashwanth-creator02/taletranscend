// src/pages/admin/__tests__/admin.templates.test.js
import { describe, expect, it } from 'vitest';
import {
  buildAccessDenied,
  buildAdminEmptyState,
  buildAdminShell,
  buildDashboardHome,
  buildModuleError,
} from '../admin.templates.js';

const adminAccess = {
  role: 'admin',
  isAdmin: true,
  isModerator: false,
  isAuthor: false,
  isStaff: true,
  canEnter: true,
};

const authorAccess = {
  role: 'author',
  isAdmin: false,
  isModerator: false,
  isAuthor: true,
  isStaff: false,
  canEnter: true,
};

const modules = [
  { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
  { id: 'author', label: 'Author Studio', icon: 'feather' },
];

describe('admin templates', () => {
  it('renders only the supplied modules and marks the active route', () => {
    const html = buildAdminShell({
      access: adminAccess,
      modules,
      activeModule: 'overview',
    });
    expect(html).toContain('data-admin-module="overview"');
    expect(html).toContain('data-admin-module="author"');
    expect(html).toContain('data-admin-module="home"');
    expect(html).not.toContain('data-admin-module="settings"');
    expect(html).toContain('href="#/"');
    expect(html).toContain('Back to archive');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Administrator');
  });

  it('marks the dashboard link current on the landing route', () => {
    const html = buildAdminShell({
      access: adminAccess,
      modules,
      activeModule: null,
    });
    expect(html).toMatch(/data-admin-module="home"\s+aria-current="page"/);
    expect(html).not.toMatch(/data-admin-module="overview"\s+aria-current="page"/);
  });

  it('renders a dashboard card for every allowed module', () => {
    const html = buildDashboardHome(authorAccess, modules);
    expect(html).toContain('Live archive counts');
    expect(html).toContain('Your own tales');
    expect(html).toContain('href="#/overview"');
  });

  it('offers sign in to guests and a return path to signed-in readers', () => {
    const guest = buildAccessDenied({ role: 'guest' });
    expect(guest).toContain('Sign in to enter the control room');
    expect(guest).toContain('login.html');
    expect(guest).toContain('admin-access-guest');

    const reader = buildAccessDenied({ role: 'user' });
    expect(reader).toContain('This room is not open to your role');
    expect(reader).not.toContain('login.html');
    expect(reader).toContain('admin-access-user');
  });

  it('escapes a module id before it reaches the error title', () => {
    const html = buildModuleError('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('builds an empty state with escaped content', () => {
    const html = buildAdminEmptyState({ title: '<b>None</b>', body: 'Nothing waiting' });
    expect(html).toContain('&lt;b&gt;None&lt;/b&gt;');
    expect(html).toContain('Nothing waiting');
  });
});
