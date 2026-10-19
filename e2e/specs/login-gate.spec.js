// e2e/specs/login-gate.spec.js
//
// The first-visit login gate: a visitor who has never seen it is sent to
// /login.html once; a visitor who has, or who has a remembered login, is not.
//
// These specs never sign in for real — they drive the storage record the app
// writes (src/services/auth-memory.storage.js) and assert the gate's response.

import { test, expect } from '@playwright/test';

const AUTH_MEMORY_KEY = 'tt_auth';

/** Opens a URL without failing the test if the gate replaces the navigation. */
async function gotoAllowingRedirect(page, url) {
  try {
    await page.goto(url);
  } catch (err) {
    if (!/interrupted|ERR_ABORTED/i.test(err.message)) throw err;
  }
}

test.describe('First-visit login gate', () => {
  test('sends a first-time visitor to the login page', async ({ page }) => {
    await gotoAllowingRedirect(page, '/');
    await expect(page).toHaveURL(/\/login\.html/, { timeout: 15000 });
  });

  test('acknowledges the gate on the login page, so it does not fire again', async ({ page }) => {
    await gotoAllowingRedirect(page, '/login.html');
    await expect(page.locator('#login-heading')).toBeVisible();

    const remembered = await page.evaluate((key) => localStorage.getItem(key), AUTH_MEMORY_KEY);
    expect(remembered).toBeTruthy();
    expect(JSON.parse(remembered)).toMatchObject({ v: 1, method: 'gate' });

    // The next visit goes straight through, whichever page is opened.
    await gotoAllowingRedirect(page, '/');
    await expect(page).toHaveURL(/5173\/$/, { timeout: 15000 });

    await gotoAllowingRedirect(page, '/library.html');
    await expect(page).toHaveURL(/library\.html/, { timeout: 15000 });
  });

  test('skips the gate for a remembered durable login', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({ v: 1, uid: 'e2e-user', anonymous: false, method: 'google', at: 1 })
      );
    }, AUTH_MEMORY_KEY);

    await gotoAllowingRedirect(page, '/');
    await expect(page).toHaveURL(/5173\/$/, { timeout: 15000 });
  });

  test('skips the gate for a session-only login', async ({ page }) => {
    await page.addInitScript((key) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({ v: 1, uid: null, anonymous: true, method: 'guest', at: 1 })
      );
    }, AUTH_MEMORY_KEY);

    await gotoAllowingRedirect(page, '/');
    await expect(page).toHaveURL(/5173\/$/, { timeout: 15000 });
  });

  test('still gates a visitor whose record is corrupt', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, '{not json');
    }, AUTH_MEMORY_KEY);

    await gotoAllowingRedirect(page, '/');
    await expect(page).toHaveURL(/\/login\.html/, { timeout: 15000 });
  });

  test('gates again once the remembered login is cleared', async ({ page }) => {
    // Seeded once, not on every navigation, so the cleared state can be tested.
    await page.addInitScript((key) => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.setItem(
        key,
        JSON.stringify({ v: 1, uid: 'e2e-user', anonymous: false, method: 'google', at: 1 })
      );
    }, AUTH_MEMORY_KEY);

    await gotoAllowingRedirect(page, '/');
    await expect(page).toHaveURL(/5173\/$/, { timeout: 15000 });

    // This is what signOutAndForget() does before signing out.
    await page.evaluate((key) => {
      localStorage.removeItem(key);
      localStorage.removeItem('tt_has_visited');
      sessionStorage.removeItem(key);
    }, AUTH_MEMORY_KEY);

    await gotoAllowingRedirect(page, '/');
    await expect(page).toHaveURL(/\/login\.html/, { timeout: 15000 });
  });
});
