// Capture responsive audit screenshots
//
// Walks every page at a set of viewport widths using the Playwright Chromium
// build, records horizontal-overflow offenders per shot, and saves full-page
// screenshots for manual review. Output lands in .tmp/responsive-audit/
// (intermediate evidence — never committed).
//
// Usage:
//   1. Start a dev server for this checkout on any free port, e.g.
//        npx vite --host 127.0.0.1 --port 5175
//   2. node execution/capture_responsive_audit.mjs
//
// Env overrides:
//   AUDIT_PORT    dev server port (default 5175)
//   AUDIT_WIDTHS  comma-separated viewport widths (default 320,390,768,1280,1440)
//   AUDIT_PAGES   comma-separated page slugs, e.g. "library,tale" (default: all)

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.env.AUDIT_PORT || 5175);
const BASE = `http://127.0.0.1:${PORT}`;
const WIDTHS = (process.env.AUDIT_WIDTHS || '320,390,768,1280,1440')
  .split(',')
  .map((w) => Number(w.trim()))
  .filter(Boolean);

const ALL_PAGES = [
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
// Accept either bare slugs ("library") or full paths ("/tale.html?id=tale-008").
const PAGES = process.env.AUDIT_PAGES
  ? process.env.AUDIT_PAGES.split(',').map((s) => {
      const value = s.trim();
      return value.startsWith('/') ? value : `/${value}.html`;
    })
  : ALL_PAGES;

const OUT_DIR = path.resolve('.tmp/responsive-audit');

// Report elements whose box extends past the viewport horizontally. Decorative
// atmosphere layers are excluded; everything else is a candidate offender to
// examine by hand.
async function collectOverflowOffenders(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const skip = ['.atmosphere-base', '.particle-field', '.boot-crest'];
    const offenders = [];
    for (const el of document.querySelectorAll('body *')) {
      if (skip.some((sel) => el.matches(sel) || el.closest(sel))) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.right <= vw + 1 && rect.left >= -1) continue;
      offenders.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        cls:
          typeof el.className === 'string'
            ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(' ')
            : null,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
      if (offenders.length >= 40) break;
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: vw,
      offenders,
    };
  });
}

const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: 'reduce' });
// The app redirects first-time visitors to login.html. Without this, every
// screenshot below would be the login page and every overflow verdict would
// describe the wrong document.
await context.addInitScript(() => {
  try {
    localStorage.setItem('tt_has_visited', 'true');
  } catch {
    // The per-shot guard below catches a redirect if storage is unavailable.
  }
});
const page = await context.newPage();
await mkdir(OUT_DIR, { recursive: true });

const results = [];
for (const pagePath of PAGES) {
  const slug = pagePath
    .replace(/^\//, '')
    .split('?')[0]
    .replace(/\.html$/, '');
  for (const width of WIDTHS) {
    const shot = { page: pagePath, width, screenshot: null, error: null };
    try {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${BASE}${pagePath}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('body.booted', { timeout: 20000 }).catch(() => {});
      // Fonts can stall on a blocked CDN; bound the wait instead of hanging.
      await page
        .evaluate(() =>
          Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))])
        )
        .catch(() => {});
      await page.waitForTimeout(600);

      const landedOn = new URL(page.url()).pathname;
      if (landedOn === '/login.html' && pagePath !== '/login.html') {
        throw new Error(`onboarding gate redirected to ${landedOn}`);
      }

      const metrics = await collectOverflowOffenders(page);
      const file = path.join(OUT_DIR, `${slug}-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });

      Object.assign(shot, metrics, { screenshot: file, landedOn });
      console.log(
        `${slug} @ ${width}px — scroll ${metrics.scrollWidth}/${metrics.clientWidth}, offenders ${metrics.offenders.length}`
      );
    } catch (error) {
      shot.error = error.message;
      console.log(`${slug} @ ${width}px — FAILED: ${error.message}`);
    }
    results.push(shot);
  }
}

await writeFile(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(results, null, 2));
await browser.close();
console.log(`\nDone. ${results.length} captures in ${OUT_DIR}`);
