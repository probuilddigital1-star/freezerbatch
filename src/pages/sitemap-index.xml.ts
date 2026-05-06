import type { APIRoute } from 'astro';
import cocktailsData from '../data/cocktails.json';

const SITE = 'https://freezerbatchcocktails.com';

// Static pages excluded from indexing (utility / legal-only)
const STATIC_PAGES: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/cocktails', priority: '0.9', changefreq: 'weekly' },
  { path: '/blog', priority: '0.9', changefreq: 'weekly' },
  { path: '/how-it-works', priority: '0.8', changefreq: 'monthly' },
  { path: '/about', priority: '0.6', changefreq: 'monthly' },
  { path: '/blog/why-your-batch-is-too-sweet', priority: '0.8', changefreq: 'monthly' },
  { path: '/blog/fresh-citrus-in-batches', priority: '0.8', changefreq: 'monthly' },
  { path: '/blog/choosing-vermouth', priority: '0.8', changefreq: 'monthly' },
  { path: '/blog/dilution-guide', priority: '0.8', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
];

export const GET: APIRoute = () => {
  const today = new Date().toISOString().split('T')[0];

  const cocktailUrls = cocktailsData.cocktails.map((c) => ({
    path: `/cocktails/${c.slug}`,
    priority: '0.9',
    changefreq: 'monthly',
  }));

  const allUrls = [...STATIC_PAGES, ...cocktailUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${SITE}${u.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
