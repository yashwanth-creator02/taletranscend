// e2e/specs/admin-access.spec.js
//
// The control room is claim-gated. These specs verify the denial path for an
// ordinary signed-in reader and for a guest, plus the mobile rendering of that
// denial. They never sign in as staff.

import { test, expect } from '@playwright/test';

const AUTH_MEMORY_KEY = 'tt_auth';
const WAIT = { timeout: 20000 };

/** Skip the first-visit login gate without claiming a real login. */
async function rememberGuest(page) {
  await page.addInitScript((key) => {
    sessionStorage.setItem(
      key,
      JSON.stringify({ v: 1, uid: null, anonymous: true, method: 'guest', at: 1 })
    );
  }, AUTH_MEMORY_KEY);
}

test.describe('Admin access gate', () => {
  test('denies an ordinary reader and never paints the dashboard shell', async ({ page }) => {
    await rememberGuest(page);
    await page.goto('/admin.html');

    await expect(page.locator('#admin-denied-title')).toBeVisible(WAIT);
    await expect(page.locator('#admin-denied-title')).toContainText(
      'This room is not open to your role'
    );
    await expect(page.locator('.admin-shell')).toHaveCount(0);
    await expect(page.locator('.admin-denied__footnote')).toContainText('admin-access-user');
  });

  test('denies a direct hash route without revealing a module', async ({ page }) => {
    await rememberGuest(page);
    await page.goto('/admin.html#/users');

    await expect(page.locator('#admin-denied-title')).toBeVisible(WAIT);
    await expect(page.locator('#admin-content')).toHaveCount(0);
    await expect(page.locator('[data-admin-module="users"]')).toHaveCount(0);
  });

  test('keeps the denial usable at a mobile viewport without horizontal overflow', async ({
    page,
  }) => {
    await rememberGuest(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin.html');

    await expect(page.locator('#admin-denied-title')).toBeVisible(WAIT);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('a[href="index.html"]').first()).toBeVisible();
  });

  test('keeps the control room out of search indexes', async ({ page }) => {
    await rememberGuest(page);
    await page.goto('/admin.html');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  });
});
