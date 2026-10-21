// Capture settings-page section screenshots
//
// Opens /settings.html, switches to each sidebar section, and saves a
// full-page screenshot per section under .tmp/settings-redesign/<theme>/.
// Intermediate evidence only — never committed.
//
// Usage:
//   1. Start a dev server for this checkout (npm run dev uses .dev-port):
//        npm run dev
//   2. node execution/capture_settings_sections.mjs
//
// Env overrides:
//   SETTINGS_PORT    dev server port (default: read .dev-port, else 5173)
//   SETTINGS_THEME   app theme to capture: light | dark | transcendental
//                    (default: light)
//   SETTINGS_WIDTH   viewport width (default: 1440)
//   SETTINGS_HEIGHT  viewport height (default: 900)
//   SETTINGS_OUT     output directory (default: .tmp/settings-redesign/<theme>)
//   SETTINGS_SEED_STORAGE  when 1, seed demo reading records for the storage capture

import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

async function resolvePort() {
  const override = Number.parseInt(process.env.SETTINGS_PORT ?? '', 10);
  if (Number.isInteger(override) && override > 0) return override;
  try {
    const raw = await readFile(path.join(ROOT, '.dev-port'), 'utf-8');
    const port = Number.parseInt(raw.trim(), 10);
    if (Number.isInteger(port) && port > 0) return port;
  } catch {
    // Fall through to Vite's default.
  }
  return 5173;
}

const PORT = await resolvePort();
const BASE = `http://127.0.0.1:${PORT}`;
const THEME = process.env.SETTINGS_THEME || 'light';
const WIDTH = Number(process.env.SETTINGS_WIDTH || 1440);
const HEIGHT = Number(process.env.SETTINGS_HEIGHT || 900);
const SEED_STORAGE = process.env.SETTINGS_SEED_STORAGE === '1';

const SECTIONS = [
  { id: 'profile', label: 'Chronicler Profile' },
  { id: 'general', label: 'General & Theme' },
  { id: 'reader', label: 'Reader & Codex' },
  { id: 'atmosphere', label: 'Atmosphere & Motion' },
  { id: 'storage', label: 'Archival Storage' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'about', label: 'About Codex' },
];

const OUT_DIR = path.resolve(
  ROOT,
  process.env.SETTINGS_OUT || path.join('.tmp', 'settings-redesign', THEME)
);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});

// First-time visitors are redirected to login.html; the theme is pinned so
// every capture shows the same palette.
await context.addInitScript(
  ({ theme, seedStorage }) => {
    try {
      localStorage.setItem('tt_has_visited', 'true');
      localStorage.setItem('tt_app_theme', theme);
      if (seedStorage) {
        localStorage.setItem('tt_progress_the-hollow-crown', JSON.stringify({ pct: 64 }));
        localStorage.setItem('tt_progress_ember-archive', JSON.stringify({ scrollTop: 1240 }));
        localStorage.setItem(
          'tt_inquiries_the-hollow-crown',
          JSON.stringify([
            { message: 'A question about the ending.' },
            { message: 'A note on the third chapter.' },
          ])
        );
      }
    } catch {
      // The redirect guard below reports storage-unavailable runs.
    }
  },
  { theme: THEME, seedStorage: SEED_STORAGE }
);

const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(err.message));

await mkdir(OUT_DIR, { recursive: true });

// Vite may still be warming up; retry the first navigation briefly.
let loaded = false;
for (let attempt = 1; attempt <= 20 && !loaded; attempt += 1) {
  try {
    await page.goto(`${BASE}/settings.html`, { waitUntil: 'domcontentloaded' });
    loaded = true;
  } catch (error) {
    if (attempt === 20) throw error;
    await page.waitForTimeout(500);
  }
}

await page.waitForSelector('body.booted', { timeout: 20000 }).catch(() => {});
await page
  .evaluate(() =>
    Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))])
  )
  .catch(() => {});

const landedOn = new URL(page.url()).pathname;
if (landedOn === '/login.html') {
  throw new Error('onboarding gate redirected to /login.html; tt_has_visited was not honoured');
}

const results = [];
for (const section of SECTIONS) {
  const navItem = page.locator(`.settings-nav-item[data-target="section-${section.id}"]`);
  await navItem.click();
  const panel = page.locator(`#section-${section.id}`);
  await panel.waitFor({ state: 'visible', timeout: 10000 });
  // Smooth scroll + reveal transitions settle.
  await page.waitForTimeout(500);

  const file = path.join(OUT_DIR, `${section.id}.png`);
  await page.screenshot({ path: file, fullPage: true });

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    documentHeight: document.documentElement.scrollHeight,
  }));

  results.push({
    section: section.id,
    label: section.label,
    theme: THEME,
    viewport: { width: WIDTH, height: HEIGHT },
    ...metrics,
    screenshot: path.relative(ROOT, file).replaceAll('\\', '/'),
  });
  console.log(
    `${section.id.padEnd(11)} ${WIDTH}x${HEIGHT} — ` +
      `scroll ${metrics.scrollWidth}/${metrics.clientWidth}, height ${metrics.documentHeight}`
  );
}

await writeFile(
  path.join(OUT_DIR, 'summary.json'),
  JSON.stringify({ theme: THEME, sections: results, pageErrors }, null, 2)
);
await browser.close();

console.log(`\nDone. ${results.length} section captures in ${OUT_DIR}`);
if (pageErrors.length) {
  console.log(`Page errors: ${pageErrors.length} (see summary.json)`);
}
