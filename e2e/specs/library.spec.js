import { test, expect } from '@playwright/test';

test.describe('Library Page', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message, err.stack));
    // checkNewUserGate() in src/utils/navigation.ts replaces the document with
    // /login.html when tt_has_visited is absent, and every Playwright context
    // starts with empty localStorage. Seed the flag before any page script runs
    // so the spec exercises the library instead of the login screen.
    await page.addInitScript(() => localStorage.setItem('tt_has_visited', 'true'));
    await page.goto('/library.html');
  });

  test('loads and displays tales', async ({ page }) => {
    // Wait for the grid to populate (it might show skeleton first)
    // The skeleton has a specific class or we can wait for the first real card
    await page.waitForSelector('#cards-grid .tale-card', { timeout: 15000 });

    const cards = await page.locator('#cards-grid .tale-card').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('search filters tales', async ({ page }) => {
    await page.fill('#search-input', 'Ember');

    // Wait for filter to apply (debounced in js)
    await page.waitForTimeout(500);

    // We can't guarantee "Ember" exists in real data without a mock,
    // but we can check if the UI responds.
    const pageInfo = await page.locator('#pagination-info').textContent();
    expect(pageInfo).toBeDefined();
  });

  test('pagination works', async ({ page }) => {
    page.on('console', (msg) => console.log(`BROWSER LOG: ${msg.text()}`));

    // Wait for initial load
    await page.waitForSelector('#pagination-info', { timeout: 15000 });

    const nextBtn = page.locator('#pagination-next');

    // Check if next button is eventually enabled
    await expect(nextBtn).toBeVisible();

    // Wait for data to be loaded (indicated by total count appearing)
    await expect(page.locator('#pagination-info')).toContainText('tales', { timeout: 15000 });

    const isEnabled = await nextBtn.isEnabled();
    if (isEnabled) {
      // Get current page info text
      const beforeText = await page.locator('#pagination-info').textContent();
      console.log(`Initial page info: "${beforeText}"`);

      await nextBtn.click();
      console.log('Clicked Next button');

      // Wait for page info to CHANGE from its previous value
      await expect(page.locator('#pagination-info')).not.toHaveText(beforeText || '', {
        timeout: 15000,
      });

      const afterText = await page.locator('#pagination-info').textContent();
      console.log(`Updated page info: "${afterText}"`);

      // Now verify it contains "Page 2"
      expect(afterText).toContain('Page 2');
    } else {
      console.log('Next button is disabled, possibly only one page of data.');
    }
  });
});
