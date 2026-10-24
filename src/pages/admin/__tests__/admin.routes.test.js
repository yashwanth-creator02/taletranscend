// src/pages/admin/__tests__/admin.routes.test.js
import { describe, expect, it } from 'vitest';
import { moduleIdFromHash, resolveAdminRoute } from '../admin.routes.js';

const admin = {
  role: 'admin',
  isAdmin: true,
  isModerator: false,
  isAuthor: false,
  isStaff: true,
  canEnter: true,
};

const moderator = {
  role: 'moderator',
  isAdmin: false,
  isModerator: true,
  isAuthor: false,
  isStaff: true,
  canEnter: true,
};

const author = {
  role: 'author',
  isAdmin: false,
  isModerator: false,
  isAuthor: true,
  isStaff: false,
  canEnter: true,
};

describe('admin route resolution', () => {
  it('extracts a lowercase module slug from hash variants', () => {
    expect(moduleIdFromHash('#/users')).toBe('users');
    expect(moduleIdFromHash('#users')).toBe('users');
    expect(moduleIdFromHash('#/Users/abc')).toBe('users');
    expect(moduleIdFromHash('#/')).toBeNull();
    expect(moduleIdFromHash('#')).toBeNull();
    expect(moduleIdFromHash('')).toBeNull();
  });

  it('opens a module the role may access', () => {
    expect(resolveAdminRoute(admin, '#/users')).toEqual({
      requested: 'users',
      active: 'users',
      denied: false,
    });
    expect(resolveAdminRoute(moderator, '#/reports')).toEqual({
      requested: 'reports',
      active: 'reports',
      denied: false,
    });
    expect(resolveAdminRoute(author, '#/author')).toEqual({
      requested: 'author',
      active: 'author',
      denied: false,
    });
  });

  it('renders the home route when no module is requested', () => {
    for (const hash of ['', '#', '#/']) {
      expect(resolveAdminRoute(admin, hash)).toEqual({
        requested: null,
        active: null,
        denied: false,
      });
    }
  });

  it('denies a known module the role cannot open', () => {
    expect(resolveAdminRoute(moderator, '#/users')).toEqual({
      requested: 'users',
      active: null,
      denied: true,
    });
    expect(resolveAdminRoute(author, '#/reports')).toEqual({
      requested: 'reports',
      active: null,
      denied: true,
    });
  });

  it('denies unknown and malformed module ids instead of silently showing the dashboard home', () => {
    expect(resolveAdminRoute(admin, '#/does-not-exist')).toEqual({
      requested: 'does-not-exist',
      active: null,
      denied: true,
    });
    for (const hash of ['#/123', '#//users', '#/../users']) {
      expect(resolveAdminRoute(admin, hash)).toEqual({
        requested: hash,
        active: null,
        denied: true,
      });
    }
  });
});
