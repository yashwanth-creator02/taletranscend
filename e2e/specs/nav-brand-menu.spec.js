// e2e/specs/nav-brand-menu.spec.js
//
// Brand-block contract: the logo mark opens the account menu for members (and
// shows a hamburger glyph on hover), stays a plain home link for guests, the
// wordmark navigates home, and the avatar is a direct link to the profile page.
//
// Header-action contract: no standalone Settings icon lives in the header (the
// account menu and palette own that route), and the quick-tools trigger carries
// the active theme's full accent treatment at every breakpoint.
//
// Firebase auth/firestore network is blocked so nav state is deterministic:
// each test drives `updateNavUser()` from the page context instead of waiting
// for a real sign-in. Run with --workers=1 (the dev server transforms the whole
// module graph per page, so parallel pages overload it).

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe.configure({ timeout: 60000 });

const MEMBER = {
  uid: 'e2e-brand-menu-uid',
  displayName: 'E2E Scribe',
  email: 'scribe@tale.test',
  isAnonymous: false,
  emailVerified: false,
};

/** Reads an element's computed opacity as a number. */
const opacityOf = (locator) => locator.evaluate((el) => getComputedStyle(el).opacity).then(Number);

test.beforeEach(async ({ page }) => {
  // Keep the nav state deterministic: no live Firebase auth/notification calls.
  await page.route(/(googleapis|firebaseio)\.com/, (route) => route.abort());
  await page.addInitScript(() => localStorage.setItem('tt_has_visited', 'true'));
});

/**
 * Resolves the dev-server URL of an app module. Vite's root is `src/views`, so
 * source modules are served through `/@fs/` URLs — read them from the page's
 * loaded resources (this preserves module identity) with a constructed fallback.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} file
 */
async function appModuleUrl(page, file) {
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
  const abs = path.resolve(repoRoot, 'src/ui/components/nav', file).replace(/\\/g, '/');
  return `/@fs/${abs}`;
}

/**
 * Loads a page and waits for the universal nav to mount and for the app's own
 * auth callback to settle (guest CTA or real avatar), so a late
 * `onAuthStateChanged` cannot overwrite the state injected by the test.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 */
async function gotoNav(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.locator('#nav-brand-anchor').waitFor({ state: 'attached', timeout: 30000 });
  await page
    .locator('#nav-user .signin-btn, #nav-user .nav-avatar')
    .first()
    .waitFor({ state: 'attached', timeout: 30000 });
}

/**
 * Applies the given auth state to the nav. Prefers the real auth→DOM sync;
 * falls back to the template swaps if the notification subscription throws in
 * an offline run.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object | null} user
 */
async function applyNavUser(page, user) {
  const urls = {
    templates: await appModuleUrl(page, 'nav.templates.js'),
    interactions: await appModuleUrl(page, 'nav.interactions.js'),
    config: await appModuleUrl(page, 'nav.config.js'),
    icons: await appModuleUrl(page, 'icons.js'),
  };

  const mode = await page.evaluate(
    async ({ member, modules }) => {
      const [templates, interactions, config] = await Promise.all([
        import(/* @vite-ignore */ modules.templates),
        import(/* @vite-ignore */ modules.interactions),
        import(/* @vite-ignore */ modules.config),
      ]);

      try {
        interactions.updateNavUser(member);
        return 'updateNavUser';
      } catch {
        const navUser = document.getElementById('nav-user');
        if (navUser) {
          navUser.outerHTML = member
            ? templates.buildAuthenticatedUser(member)
            : templates.buildGuestUser();
        }
        const anchor = document.getElementById('nav-brand-anchor');
        if (anchor) {
          anchor.innerHTML = templates.buildBrandMark(member, 'index.html', config.USER_LINKS);
        }
        const { initIcons } = await import(/* @vite-ignore */ modules.icons);
        await initIcons();
        return 'fallback';
      }
    },
    { member: user, modules: urls }
  );

  await expect
    .poll(() => page.locator('#app-nav svg[data-lucide]').count(), { timeout: 10000 })
    .toBeGreaterThan(0);

  return mode;
}

test.describe('guest brand block', () => {
  test('mark is a home link and no account menu exists', async ({ page }) => {
    await gotoNav(page, '/library.html');
    await applyNavUser(page, null);

    const mark = page.locator('#nav-brand-anchor > a.nav-logo__mark');
    await expect(mark).toBeVisible();
    await expect(mark).toHaveAttribute('aria-label', 'TaleTranscend home');
    await expect(mark).toHaveAttribute('href', /index\.html$/);
    await expect(mark.locator('.nav-logo__img')).toBeVisible();
    await expect(page.locator('#nav-menu-btn')).toHaveCount(0);
    await expect(page.locator('#nav-brand-anchor [data-lucide="menu"]')).toHaveCount(0);
    await expect(page.locator('#user-dropdown')).toHaveCount(0);

    // Hovering a guest mark must keep the logo in place: there is no glyph to
    // swap in, so a logo that faded out would leave an empty box.
    await mark.hover();
    await expect
      .poll(() => opacityOf(mark.locator('.nav-logo__img')), { timeout: 3000 })
      .toBeGreaterThan(0.9);
  });

  test('wordmark navigates home', async ({ page }) => {
    await gotoNav(page, '/toc.html');
    await applyNavUser(page, null);

    const wordmark = page.locator('.nav-logo__wordmark');
    await expect(wordmark).toHaveText('TaleTranscend');
    await expect(wordmark).toHaveAttribute('href', /index\.html$/);
    await wordmark.click();
    await page.waitForURL(/\/index\.html$/);
    await expect(page).toHaveURL(/\/index\.html$/);
  });
});

test.describe('member brand block', () => {
  test('mark is the account-menu trigger with a hover hamburger glyph', async ({ page }) => {
    await gotoNav(page, '/library.html');
    await applyNavUser(page, MEMBER);

    const btn = page.locator('#nav-menu-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('aria-haspopup', 'menu');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(btn).toHaveAttribute('aria-controls', 'user-dropdown');
    await expect(btn).toHaveAttribute('aria-label', 'Open account menu for E2E Scribe');

    const glyph = btn.locator('svg[data-lucide="menu"]');
    await expect(glyph).toHaveCount(1);

    // At rest the logo shows; the hamburger is hidden.
    expect(await opacityOf(glyph)).toBeLessThan(0.05);
    expect(await opacityOf(btn.locator('.nav-logo__img'))).toBeGreaterThan(0.9);

    // Hovering swaps the logo for the hamburger.
    await btn.hover();
    await expect.poll(() => opacityOf(glyph), { timeout: 3000 }).toBeGreaterThan(0.9);
    expect(await opacityOf(btn.locator('.nav-logo__img'))).toBeLessThan(0.2);

    // Keyboard focus exposes it too. Tab reaches the mark instead of calling
    // focus(): programmatic focus after mouse input does not match
    // :focus-visible in every engine.
    await page.mouse.move(0, 0);
    await expect.poll(() => opacityOf(glyph), { timeout: 3000 }).toBeLessThan(0.05);
    await btn.evaluate((el) => el.blur());
    for (let i = 0; i < 25; i += 1) {
      if (await btn.evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(btn).toBeFocused();
    await expect.poll(() => opacityOf(glyph), { timeout: 3000 }).toBeGreaterThan(0.9);
  });

  test('avatar links straight to the profile page', async ({ page }) => {
    await gotoNav(page, '/library.html');
    await applyNavUser(page, MEMBER);

    const avatar = page.locator('#nav-user #nav-profile-link');
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute('href', /\/profile\.html$/);
    await expect(avatar).toHaveAttribute('aria-label', 'Open profile for E2E Scribe');
    await expect(avatar).not.toHaveAttribute('aria-haspopup', /.*/);

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('/profile.html')),
      avatar.click(),
    ]);
    expect(request.url()).toContain('profile.html');
  });

  test('menu opens under the brand mark and closes via Escape and outside click', async ({
    page,
  }) => {
    await gotoNav(page, '/library.html');
    await applyNavUser(page, MEMBER);

    const btn = page.locator('#nav-menu-btn');
    const dropdown = page.locator('#user-dropdown');
    await expect(dropdown).toBeHidden();
    await expect(dropdown).toHaveAttribute('aria-labelledby', 'nav-menu-btn');
    await expect(page.locator('#nav-brand-anchor > #user-dropdown')).toHaveCount(1);

    await btn.click();
    await expect(dropdown).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');

    // Anchored beneath the mark, not the far-right avatar corner.
    const markBox = await btn.boundingBox();
    const box = await dropdown.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(markBox.x - 1);
    expect(box.x).toBeLessThanOrEqual(markBox.x + 24);
    expect(box.y).toBeGreaterThanOrEqual(markBox.y + markBox.height);
    const viewport = page.viewportSize();
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 8);

    // Escape closes and returns focus to the trigger.
    await page.keyboard.press('Escape');
    await expect.poll(() => dropdown.isHidden(), { timeout: 3000 }).toBe(true);
    await expect(btn).toBeFocused();

    // Outside click closes too.
    await btn.click();
    await expect(dropdown).toBeVisible();
    await page.mouse.click(viewport.width - 4, viewport.height - 4);
    await expect.poll(() => dropdown.isHidden(), { timeout: 3000 }).toBe(true);
  });

  test('quick-tools trigger still renders in the reworked header', async ({ page, isMobile }) => {
    await gotoNav(page, '/library.html');
    await applyNavUser(page, MEMBER);

    const trigger = page.locator(isMobile ? '#nav-command-button-mobile' : '#nav-command-button');
    await expect(trigger).toBeVisible();
    await expect(trigger.locator('svg[data-lucide="look-up"]')).toHaveCount(1);
    await expect(page.locator('#nav-brand-anchor')).toHaveCount(1);
    await expect(page.locator('#nav-command-button-mobile')).toHaveCount(1);
  });
});

test.describe('mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('brand menu opens fully on screen', async ({ page }) => {
    await gotoNav(page, '/library.html');
    await applyNavUser(page, MEMBER);

    const btn = page.locator('#nav-menu-btn');
    await expect(btn).toBeVisible();
    await btn.click();

    const dropdown = page.locator('#user-dropdown');
    await expect(dropdown).toBeVisible();
    const box = await dropdown.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });

  test('icon-only quick-tools trigger is a 38px accent square', async ({ page }) => {
    await gotoNav(page, '/library.html');
    await applyNavUser(page, null);

    await expect(page.locator('#nav-settings-btn')).toHaveCount(0);

    const trigger = page.locator('#nav-command-button-mobile');
    await expect(trigger).toBeVisible();
    const box = await trigger.boundingBox();
    expect(Math.round(box.width)).toBe(38);
    expect(Math.round(box.height)).toBe(38);

    const background = await trigger.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(background).toContain('linear-gradient');

    // The accent square + sign-in CTA must not push the header past the viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('brand wordmark remains visible on mobile viewport', async ({ page }) => {
    await gotoNav(page, '/library.html');
    await applyNavUser(page, null);

    const wordmark = page.locator('.nav-logo__wordmark');
    await expect(wordmark).toBeVisible();
    await expect(wordmark).toHaveText('TaleTranscend');

    const mark = page.locator('#nav-brand-anchor');
    await expect(mark).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('header actions', () => {
  test('no standalone Settings icon is left in the header', async ({ page, isMobile }) => {
    await gotoNav(page, '/library.html');
    await applyNavUser(page, MEMBER);

    await expect(page.locator('#nav-settings-btn')).toHaveCount(0);
    await expect(page.locator('#app-nav .nav-actions a[href$="/settings.html"]')).toHaveCount(0);
    await expect(page.locator('#app-nav .nav-actions [data-lucide="settings"]')).toHaveCount(0);

    // The search trigger and user area remain the header's action pair.
    await expect(
      page.locator(isMobile ? '#nav-command-button-mobile' : '#nav-command-button')
    ).toBeVisible();
    await expect(page.locator('#nav-user #nav-profile-link')).toBeVisible();
  });

  test('Settings stays reachable from the account menu', async ({ page }) => {
    await gotoNav(page, '/library.html');
    await applyNavUser(page, MEMBER);

    await page.locator('#nav-menu-btn').click();

    const settings = page.locator('#user-dropdown a[href$="/settings.html"]');
    await expect(settings).toBeVisible();
    await expect(settings).toHaveText(/Settings/);
  });

  test('quick-tools trigger is filled with the active theme accent', async ({ page }) => {
    await gotoNav(page, '/library.html');
    await applyNavUser(page, null);

    for (const theme of ['transcendental', 'dark', 'light']) {
      await page.evaluate(
        (value) => document.documentElement.setAttribute('data-app-theme', value),
        theme
      );

      const styles = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.backgroundImage = 'var(--accent-gradient)';
        probe.style.color = 'var(--text-on-accent)';
        document.body.appendChild(probe);
        const expected = getComputedStyle(probe);
        const expectedImage = expected.backgroundImage;
        const expectedColor = expected.color;
        probe.remove();

        const trigger = getComputedStyle(document.getElementById('nav-command-button'));
        return {
          image: trigger.backgroundImage,
          color: trigger.color,
          expectedImage,
          expectedColor,
        };
      });

      expect(styles.image, `accent gradient for ${theme}`).toContain(styles.expectedImage);
      expect(styles.image, `gradient present for ${theme}`).not.toBe('none');
      expect(styles.color, `on-accent text for ${theme}`).toBe(styles.expectedColor);
    }
  });
});
