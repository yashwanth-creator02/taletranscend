// scripts/generate-sitemap.js
// Generates a static public/sitemap.xml for SEO indexing and static hosting fallback.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.resolve(root, 'public');
const sitemapPath = path.resolve(publicDir, 'sitemap.xml');

const BASE_URL = 'https://taletranscend.web.app';
const TODAY = new Date().toISOString().split('T')[0];

const CORE_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/library', changefreq: 'daily', priority: '0.9' },
  { path: '/toc', changefreq: 'daily', priority: '0.8' },
  { path: '/shelf', changefreq: 'weekly', priority: '0.7' },
  { path: '/contribution', changefreq: 'monthly', priority: '0.6' },
];

const KNOWN_TALES = [
  { id: 'gilgamesh', chapters: 3 },
  { id: 'alexandria-beacon', chapters: 2 },
  { id: 'cosmic-weaver', chapters: 4 },
  { id: 'lemuria-chart', chapters: 2 },
  { id: 'hall-of-two-truths', chapters: 3 },
];

function generateXml() {
  const urls = [];

  // Core portals
  for (const route of CORE_ROUTES) {
    urls.push(`  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
  }

  // Canonical Tales & Chapters
  for (const tale of KNOWN_TALES) {
    urls.push(`  <url>
    <loc>${BASE_URL}/tales/${tale.id}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);

    for (let i = 0; i < tale.chapters; i++) {
      urls.push(`  <url>
    <loc>${BASE_URL}/tales/${tale.id}/read/${i}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(sitemapPath, generateXml(), 'utf-8');
console.log(`Successfully generated ${sitemapPath}`);
