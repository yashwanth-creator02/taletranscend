// e2e/specs/nav-notifications.spec.js
//
// Floating notification trigger contract: the bell lives outside the header
// (body-level, fixed just below the nav bar), starts hidden, appears only when
// unread or pinned notices exist, and its drawer anchors beneath it.
//
// Firebase auth/firestore network is blocked so the run is deterministic: the
// page's own notification module is imported by URL (module identity preserved)
// and its exported state functions drive the trigger.
//
// Run with --workers=1 (the dev server transforms the whole module graph per
// page, so parallel pages overload it).

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe.configure({ timeout: 60000 });

test.beforeEach(async ({ page }) => {
  await page.route(/(googleapis|firebaseio)\.com|127\.0\.0\.1:(8080|9099)/, (route) =>
    route.abort()
  );
  await page.addInitScript(() => localStorage.setItem('tt_has_visited', 'true'));
});

/**
 * Resolves the dev-server URL of an app module (Vite root is `src/views`, so
 * source modules are served through `/@fs/`).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} relativePath e.g. 'ui/components/nav/notifications.popover.js'
 */
async function moduleUrl(page, relativePath) {
  const file = relativePath.split('/').pop();
  const fromPage = await page.evaluate(
    (needle) =>
      performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .find((name) => name.includes(needle)),
    file
  );
  if (fromPage) return fromPage;

  const repoRoot = path.resolve(__dirname, '..', '..');
  const abs = path.resolve(repoRoot, 'src', relativePath).replace(/\\/g, '/');
  return `/@fs/${abs}`;
}

/**
 * Loads a page and waits for the universal nav plus its floating trigger.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 */
async function gotoNav(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.locator('#app-nav').waitFor({ state: 'attached', timeout: 30000 });
  await page.locator('#nav-notifications-container').waitFor({ state: 'attached', timeout: 30000 });
  // Let the app's own auth callback settle first — a late `updateNavUser(null)`
  // would reset the counts injected by the test.
  await page
    .locator('#nav-user .signin-btn, #nav-user .nav-avatar')
    .first()
    .waitFor({ state: 'attached', timeout: 30000 });
}

/**
 * Applies notification counts through the page's own module instance.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ unread?: number, pinned?: number }} counts
 */
async function applyNotificationCounts(page, { unread = 0, pinned = 0 } = {}) {
  const url = await moduleUrl(page, 'ui/components/nav/notifications.popover.js');
  await page.evaluate(
    async ({ moduleUrl: modUrl, unreadCount, pinnedCount }) => {
      const mod = await import(/* @vite-ignore */ modUrl);
      mod.updateNotificationBadge(unreadCount);
      mod.updatePinnedCount(pinnedCount);
    },
    { moduleUrl: url, unreadCount: unread, pinnedCount: pinned }
  );
}

test.describe('floating notification trigger', () => {
  test('lives outside the header and starts hidden', async ({ page }) => {
    await gotoNav(page, '/library.html');

    await expect(page.locator('#app-nav #nav-notifications-container')).toHaveCount(0);
    await expect(page.locator('#app-nav #nav-notifications-btn')).toHaveCount(0);
    await expect(page.locator('#nav-notifications-container')).toHaveCount(1);
    await expect(page.locator('#nav-notifications-container')).toHaveClass(/is-hidden/);
    await expect(page.locator('#nav-notifications-btn')).toBeHidden();
  });

  test('appears below the nav bar with an unread badge', async ({ page }) => {
    await gotoNav(page, '/library.html');
    await applyNotificationCounts(page, { unread: 3 });

    const float = page.locator('#nav-notifications-container');
    await expect(float).toBeVisible();
    await expect(float).not.toHaveClass(/is-hidden/);
    await expect(page.locator('#nav-notifications-badge')).toHaveText('3');

    const navBox = await page.locator('#app-nav').boundingBox();
    const box = await float.boundingBox();
    const viewport = page.viewportSize();

    // Pinned just under the bar, not inside it.
    expect(box.y).toBeGreaterThanOrEqual(navBox.y + navBox.height - 1);
    // Right-aligned to the nav content edge.
    expect(box.x + box.width).toBeGreaterThanOrEqual(viewport.width - 32);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 20);
  });

  test('stays floating while a notice is pinned, even with nothing unread', async ({ page }) => {
    await gotoNav(page, '/library.html');
    await applyNotificationCounts(page, { unread: 2, pinned: 0 });
    await expect(page.locator('#nav-notifications-container')).toBeVisible();

    await applyNotificationCounts(page, { unread: 0, pinned: 1 });
    const float = page.locator('#nav-notifications-container');
    await expect(float).toBeVisible();
    await expect(float).toHaveClass(/nav-notifications-float--pinned/);
    await expect(page.locator('#nav-notifications-badge')).toBeHidden();

    await applyNotificationCounts(page, { unread: 0, pinned: 0 });
    await expect(float).toHaveClass(/is-hidden/);
    await expect(float).toBeHidden();
  });

  test('shifts the toast stack clear of the trigger while it is visible', async ({ page }) => {
    await gotoNav(page, '/library.html');

    await page.evaluate(() => {
      const region = document.createElement('div');
      region.className = 'toast-region';
      region.id = 'e2e-toast-region';
      document.body.appendChild(region);
    });

    const topOf = () =>
      page.locator('#e2e-toast-region').evaluate((el) => parseFloat(getComputedStyle(el).top));

    const hiddenTop = await topOf();
    await applyNotificationCounts(page, { unread: 1 });
    const visibleTop = await topOf();

    expect(hiddenTop).toBeLessThanOrEqual(80);
    expect(visibleTop).toBeGreaterThanOrEqual(hiddenTop + 40);
  });

  test('drawer opens beneath the trigger and closes via Escape and outside click', async ({
    page,
  }) => {
    await gotoNav(page, '/library.html');
    await applyNotificationCounts(page, { unread: 1 });

    const trigger = page.locator('#nav-notifications-btn');
    const drawer = page.locator('#nav-notifications-popover');
    await expect(drawer).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-controls', 'nav-notifications-popover');

    await trigger.click();
    await expect(drawer).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const triggerBox = await trigger.boundingBox();
    const box = await drawer.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height - 1);
    const viewport = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);

    await page.keyboard.press('Escape');
    await expect.poll(() => drawer.isHidden(), { timeout: 3000 }).toBe(true);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(drawer).toBeVisible();
    await page.mouse.click(viewport.width - 4, viewport.height - 4);
    await expect.poll(() => drawer.isHidden(), { timeout: 3000 }).toBe(true);
  });
});

test.describe('mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('trigger and drawer fit the screen', async ({ page }) => {
    await gotoNav(page, '/library.html');
    await applyNotificationCounts(page, { unread: 9 });

    const trigger = page.locator('#nav-notifications-btn');
    await expect(trigger).toBeVisible();

    const triggerBox = await trigger.boundingBox();
    expect(triggerBox.x).toBeGreaterThanOrEqual(0);
    expect(triggerBox.x + triggerBox.width).toBeLessThanOrEqual(390);

    await trigger.click();
    const drawer = page.locator('#nav-notifications-popover');
    await expect(drawer).toBeVisible();

    const box = await drawer.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });
});
