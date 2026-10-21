// src/ui/components/nav/__tests__/nav.staff.test.js
import { describe, expect, it } from 'vitest';
import { buildAccountMenu, buildBrandMark } from '../nav.templates.js';
import { STAFF_LINKS, USER_LINKS } from '../nav.config.js';

const user = {
  uid: 'staff-1',
  displayName: 'Archivist',
  email: 'archivist@example.com',
  isAnonymous: false,
};

describe('staff navigation', () => {
  it('hides the control room from an ordinary signed-in reader', () => {
    const html = buildAccountMenu(user, 'index.html', USER_LINKS, false);
    expect(html).toContain('profile.html');
    expect(html).not.toContain('admin.html');
    expect(html).not.toContain('Control Room');
  });

  it('adds one control room entry for staff, after the standard links', () => {
    const html = buildAccountMenu(user, 'index.html', USER_LINKS, true);
    expect(html).toContain('admin.html');
    expect(html).toContain('Control Room');
    expect(html.match(/admin\.html/g)).toHaveLength(1);
    expect(STAFF_LINKS).toHaveLength(1);
  });

  it('passes the staff flag through the brand mark', () => {
    const html = buildBrandMark(user, 'index.html', USER_LINKS, true);
    expect(html).toContain('id="user-dropdown"');
    expect(html).toContain('Control Room');
  });
});
