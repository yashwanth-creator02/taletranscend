// e2e/specs/mobile-dock.spec.js
//
// Mobile dock contract: exactly Home, Library, and Shelf, one active tab synced
// to the current page, >=44px touch targets, and a rectangular floating bar
// that stays inside a 390px viewport.
//
// Firebase auth/firestore network is blocked so the dock renders deterministically.

import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 60000 });

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.route(/(googleapis|firebaseio)\.com/, (route) => route.abort());
  await page.addInitScript(() => localStorage.setItem('tt_has_visited', 'true'));
});

/**
 * Loads a page and waits for the mobile dock to mount.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 */
async function gotoDock(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page
    .locator('#mobile-dock-container .mobile-dock__item')
    .first()
    .waitFor({ state: 'visible', timeout: 30000 });
}

test.describe('mobile dock', () => {
  test('carries only Home, Library, and Shelf', async ({ page }) => {
    await gotoDock(page, '/index.html');

    const items = page.locator('#mobile-dock-container .mobile-dock__item');
    await expect(items).toHaveCount(3);
    await expect(items).toHaveText(['Home', 'Library', 'Shelf']);
    expect(await items.evaluateAll((els) => els.map((el) => el.getAttribute('href')))).toEqual([
      '/index.html',
      '/library.html',
      '/shelf.html',
    ]);

    const dockText = await page.locator('#mobile-dock-container').innerText();
    expect(dockText).not.toMatch(/Write|Profile|Sign In/);
  });

  test('marks the current page as the only active tab', async ({ page }) => {
    await gotoDock(page, '/library.html');

    const active = page.locator('#mobile-dock-container .mobile-dock__item--active');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute('aria-label', 'Library');
    await expect(active).toHaveAttribute('aria-current', 'page');

    const currentMarks = await page
      .locator('#mobile-dock-container .mobile-dock__item[aria-current="page"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
    expect(currentMarks).toEqual(['Library']);
  });

  test('keeps 44px touch targets inside the viewport', async ({ page }) => {
    await gotoDock(page, '/index.html');

    const boxes = await page
      .locator('#mobile-dock-container .mobile-dock__item')
      .evaluateAll((els) =>
        els.map((el) => {
          const rect = el.getBoundingClientRect();
          return { height: rect.height, left: rect.left, right: rect.right };
        })
      );

    expect(boxes).toHaveLength(3);
    for (const box of boxes) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(390);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('stays a rectangular bar on every theme', async ({ page }) => {
    await gotoDock(page, '/index.html');

    for (const theme of ['transcendental', 'dark', 'light']) {
      const { radius, height } = await page.evaluate((value) => {
        document.documentElement.setAttribute('data-app-theme', value);
        const dock = document.querySelector('.mobile-dock');
        const style = getComputedStyle(dock);
        return {
          radius: parseFloat(style.borderTopLeftRadius),
          height: parseFloat(style.height),
        };
      }, theme);

      // A pill would use half the bar height (or more) as its radius.
      expect(radius).toBeLessThan(height / 2);
    }
  });
});
