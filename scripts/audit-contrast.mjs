#!/usr/bin/env node
/**
 * Measures WCAG 2.2 AA contrast on every visible text node of each page, in a
 * chosen interface theme. The design audit's contrast numbers were measured by
 * hand once; this script makes the measurement repeatable so a regression is a
 * command, not a review comment.
 *
 *   node scripts/audit-contrast.mjs                      # light theme, default pages
 *   node scripts/audit-contrast.mjs --theme transcendental --pages index,library
 *   node scripts/audit-contrast.mjs --json                # machine-readable
 *
 * Exits 1 when a page has failures, so it can gate CI.
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const port = Number(readFileSync(new URL('../.dev-port', import.meta.url), 'utf8').trim() || 5173);
const base = process.env.AUDIT_BASE ?? `http://127.0.0.1:${port}`;

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const theme = flag('theme', 'light');
const pages = flag(
  'pages',
  'index,library,shelf,toc,profile,tale,reader,settings,login,contribution'
).split(',');
const asJson = args.includes('--json');

/** Runs in the page: every visible text node's colour against its painted background. */
function measure() {
  const rgb = (value) => {
    const parts = value.match(/[\d.]+/g);
    return parts ? parts.map(Number) : null;
  };
  const channel = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const composite = (fg, bg) => {
    const a = fg[3] ?? 1;
    return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)];
  };
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  // The painted backdrop of an element is the composite of every ancestor
  // background, bottom-up. Gradients cannot be sampled without rendering, so
  // they are reported separately instead of guessed at.
  const backdrop = (el) => {
    const layers = [];
    let gradient = false;
    for (let node = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none') gradient = true;
      const bg = rgb(style.backgroundColor);
      if (bg && (bg[3] ?? 1) > 0) layers.push(bg);
      if ((bg?.[3] ?? 0) === 1) break;
    }
    let result = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) result = composite(layers[i], result);
    return { color: result, gradient };
  };

  const path = (el) => {
    const parts = [];
    for (
      let node = el;
      node && node !== document.body && parts.length < 4;
      node = node.parentElement
    ) {
      parts.unshift(
        node.tagName.toLowerCase() +
          (node.className && typeof node.className === 'string'
            ? '.' + node.className.trim().split(/\s+/).slice(0, 2).join('.')
            : '')
      );
    }
    return parts.join(' > ');
  };

  const failures = [];
  let checked = 0;
  let skipped = 0;

  for (const el of document.body.querySelectorAll('*')) {
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (!text) continue;

    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0)
      continue;
    if (box.width === 0 || box.height === 0) continue;
    if (el.closest('[aria-hidden="true"]')) continue;

    const fg = rgb(style.color);
    if (!fg) continue;
    const back = backdrop(el);
    if (back.gradient) {
      skipped++;
      continue;
    }

    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? 3 : 4.5;
    const ratio = contrast(composite(fg, back.color), back.color);
    checked++;
    if (ratio + 0.005 < required) {
      failures.push({
        ratio: Number(ratio.toFixed(2)),
        required,
        size,
        weight,
        text: text.slice(0, 60),
        color: style.color,
        background: `rgb(${back.color.map(Math.round).join(' ')})`,
        selector: path(el),
      });
    }
  }
  return { checked, skipped, failures };
}

const browser = await chromium.launch();
const results = {};
let total = 0;

for (const page of pages) {
  const context = await browser.newContext();
  await context.addInitScript((value) => localStorage.setItem('tt_app_theme', value), theme);
  const tab = await context.newPage();
  const errors = [];
  tab.on('pageerror', (e) => errors.push(String(e)));
  await tab.goto(`${base}/${page}.html`, { waitUntil: 'load' });
  await tab.waitForTimeout(600); // let anonymous auth settle and render the first state
  const result = await tab.evaluate(measure);
  results[page] = { ...result, errors: errors.length };
  total += result.failures.length;
  await context.close();
}

await browser.close();

if (asJson) {
  console.log(JSON.stringify({ theme, base, total, results }, null, 2));
} else {
  console.log(`theme: ${theme}   base: ${base}\n`);
  for (const [page, r] of Object.entries(results)) {
    const worst = r.failures.slice(0, 5);
    console.log(
      `${page.padEnd(13)} ${String(r.failures.length).padStart(3)} fail  ${String(r.checked).padStart(4)} checked  ${r.skipped} gradient-skipped  ${r.errors} js-errors`
    );
    for (const f of worst) {
      console.log(
        `   ${String(f.ratio).padStart(5)}:1 (need ${f.required})  "${f.text}"  ${f.color} on ${f.background}  ${f.selector}`
      );
    }
    if (r.failures.length > worst.length)
      console.log(`   ... ${r.failures.length - worst.length} more`);
  }
  console.log(`\ntotal: ${total}`);
}

process.exit(total > 0 ? 1 : 0);
