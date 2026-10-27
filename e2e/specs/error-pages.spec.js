import { test, expect } from '@playwright/test';

const ERROR_PAGES = [
  { code: 400, title: 'A Broken Inscription' },
  { code: 401, title: 'Identity Not Established' },
  { code: 403, title: 'This Chamber Is Sealed' },
  { code: 404, title: 'Lost in the Archives' },
  { code: 405, title: 'An Unrecognized Rite' },
  { code: 408, title: 'The Hourglass Ran Dry' },
  { code: 429, title: "The Gatekeeper's Patience" },
  { code: 500, title: 'A Fracture in the Archive' },
  { code: 502, title: 'The Bridge Would Not Hold' },
  { code: 503, title: 'The Archive Is Resting' },
  { code: 504, title: 'The Archive Did Not Answer' },
];

test.describe('Error pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('tt_has_visited', 'true');
      } catch {
        // Ignore storage restrictions.
      }
    });
  });

  for (const { code, title } of ERROR_PAGES) {
    test(`${code} renders its own page`, async ({ page }) => {
      await page.goto(`/${code}`, { waitUntil: 'domcontentloaded' });

      await expect(page.locator('h1.error-code-title')).toHaveText(String(code));
      await expect(page.locator('h2')).toHaveText(title);
      await expect(page.locator('body')).toHaveAttribute('data-error-code', String(code));
      await expect(page).toHaveTitle(new RegExp(`\\| TaleTranscend$`));
    });
  }

  test('401 offers sign-in as its primary action', async ({ page }) => {
    await page.goto('/401', { waitUntil: 'domcontentloaded' });

    const signIn = page.locator('a[href="/login.html"]');
    await expect(signIn).toHaveClass(/btn-primary/);
  });

  test('shows the request context written before navigation', async ({ page }) => {
    await page.addInitScript(() => {
      const context = {
        code: 403,
        source: '/library.html?page=2',
        reason: 'permission-denied',
        createdAt: Date.now(),
      };
      sessionStorage.setItem('tt_error_context', JSON.stringify(context));
    });

    await page.goto('/403', { waitUntil: 'domcontentloaded' });

    const panel = page.locator('#error-context');
    await expect(panel).toBeVisible();
    await expect(page.locator('#error-context-source')).toHaveText('/library.html?page=2');
    await expect(page.locator('#error-context-reason')).toHaveText('permission-denied');
    await expect(page.locator('#error-context-time')).not.toBeEmpty();
  });

  test('retry returns to the recorded source', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'tt_error_context',
        JSON.stringify({
          code: 503,
          source: '/library.html?page=2',
          createdAt: Date.now(),
        })
      );
    });

    await page.goto('/503', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-error-retry]').click();

    await page.waitForURL('**/library.html?page=2');
    expect(new URL(page.url()).pathname).toBe('/library.html');
  });

  test('offline hint appears while the connection is down', async ({ page, context }) => {
    await page.goto('/503', { waitUntil: 'domcontentloaded' });

    try {
      await context.setOffline(true);
      await expect(page.locator('#error-offline-hint')).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });
});
