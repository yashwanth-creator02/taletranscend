// functions/src/sitemap.ts
// Dynamic XML Sitemap Cloud Function for TaleTranscend.
//
// Automatically queries all published tales and their chapters from Firestore
// and serves an SEO-optimized sitemap.xml with accurate lastmod dates and priorities.

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const BASE_URL = 'https://taletranscend.web.app';
const TALES_COLLECTION = 'v1/taletranscend/projects/v1/public/data/tales';

interface TaleDoc {
  title?: string;
  status?: string;
  chapterCount?: number;
  updatedAt?: Timestamp | { toDate?: () => Date };
  publishedAt?: Timestamp | { toDate?: () => Date };
  createdAt?: Timestamp | { toDate?: () => Date };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(timestamp?: Timestamp | { toDate?: () => Date }): string {
  if (!timestamp) return new Date().toISOString().split('T')[0];
  try {
    const d = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date();
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export const sitemap = onRequest(
  {
    cors: true,
    maxInstances: 10,
    region: 'asia-south1',
  },
  async (_req, res) => {
    try {
      const db = getFirestore();
      const snapshot = await db
        .collection(TALES_COLLECTION)
        .where('status', '==', 'published')
        .get();

      const staticRoutes = [
        { path: '/', changefreq: 'daily', priority: '1.0' },
        { path: '/library', changefreq: 'daily', priority: '0.9' },
        { path: '/toc', changefreq: 'daily', priority: '0.8' },
        { path: '/shelf', changefreq: 'weekly', priority: '0.7' },
        { path: '/contribution', changefreq: 'monthly', priority: '0.6' },
      ];

      const today = new Date().toISOString().split('T')[0];
      const urls: string[] = [];

      // 1. Static Core Routes
      for (const route of staticRoutes) {
        urls.push(`  <url>
    <loc>${escapeXml(`${BASE_URL}${route.path}`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
      }

      // 2. Dynamic Tales and Chapters
      for (const doc of snapshot.docs) {
        const data = doc.data() as TaleDoc;
        const taleId = doc.id;
        const lastmod = formatDate(data.updatedAt || data.publishedAt || data.createdAt);
        const chapterCount = data.chapterCount || 1;

        // Tale detail view
        urls.push(`  <url>
    <loc>${escapeXml(`${BASE_URL}/tales/${encodeURIComponent(taleId)}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);

        // Tale reading chapters
        for (let ch = 0; ch < chapterCount; ch++) {
          urls.push(`  <url>
    <loc>${escapeXml(`${BASE_URL}/tales/${encodeURIComponent(taleId)}/read/${ch}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
        }
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      res.status(200).send(xml);
    } catch (err) {
      logger.error('Failed to generate sitemap.xml', err);
      res
        .status(500)
        .send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>');
    }
  }
);
