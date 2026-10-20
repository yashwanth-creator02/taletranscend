// Mobile shell smoke: every page must render without horizontal overflow at
// phone and small-tablet widths. Scoped to the mobile-chrome (Pixel 7) and
// mobile-safari (iPhone 14) projects by testMatch/testIgnore in
// playwright.config.js.
import { test, expect } from '@playwright/test';

const PAGES = [
  '/index.html',
  '/library.html',
  '/shelf.html',
  // tale/reader redirect or render empty without a real id; tale-008 is the
  // first sample chronicle created by `npm run seed:tales`.
  '/tale.html?id=tale-008',
  '/toc.html',
  '/reader.html?taleId=tale-008&chapterId=0',
  '/contribution.html',
  '/profile.html',
  '/settings.html',
  '/login.html',
  '/404.html',
];

// 320 = smallest common phone, 390 = current iPhone class, 768 = small
// tablet portrait where several page layouts switch columns.
const WIDTHS = [320, 390, 768];

test.describe('Mobile shell — no horizontal overflow', () => {
  // Generous ceiling: cold dev-server transforms plus a loaded machine can
  // push a page past the 30s default.
  test.describe.configure({ timeout: 60_000 });

  for (const path of PAGES) {
    for (const width of WIDTHS) {
      test(`${path} at ${width}px`, async ({ page }) => {
        const pageErrors = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));

        await page.setViewportSize({ width, height: 844 });
        // A fresh browser context has no visit history, so the app's onboarding
        // gate would redirect it to login.html — and this suite would silently
        // measure the login page instead of the page named in the test title.
        // Seed the visited flag the gate reads; the gate itself is covered by
        // unit tests in src/utils/__tests__/navigation.test.js.
        await page.addInitScript(() => {
          try {
            localStorage.setItem('tt_has_visited', 'true');
          } catch {
            // If storage is unavailable the URL assertion below fails loudly.
          }
        });
        // Never wait for the `load` event: external fonts and cover images can
        // stall it well past the 30s default on a slow network. DOMContentLoaded
        // plus the boot gate below are the real readiness signals.
        await page.goto(path, { waitUntil: 'domcontentloaded' });

        // `booted` lands on <body> when the app is ready — or after the 1.5s
        // anti-FOUC fallback script in every page head — so it is a reliable
        // gate on all pages regardless of network state.
        await page.waitForSelector('body.booted', { timeout: 20000 });

        // Safety net: an onboarding redirect must never turn a page test into
        // a login-page test that passes for the wrong reason.
        if (path !== '/login.html') {
          expect(new URL(page.url()).pathname, `redirected to ${page.url()}`).not.toBe(
            '/login.html'
          );
        }

        // Let the post-boot pass settle (fonts, dock injection, first render).
        await page.waitForTimeout(400);

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        expect(
          scrollWidth,
          `horizontal overflow: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`
        ).toBeLessThanOrEqual(clientWidth + 1);

        // Uncaught page errors are attached as evidence instead of failing
        // the run: the audit phase turns any real ones into fixes first.
        if (pageErrors.length > 0) {
          await test.info().attach('page-errors', {
            body: JSON.stringify(pageErrors, null, 2),
            contentType: 'application/json',
          });
        }
      });
    }
  }
});
