import type { MetadataRoute } from 'next';
import { vessels } from '@/lib/fleet';

const SITE = 'https://grayyachts.com';

// Main sitemap. Answer engines (Google AI Overviews, Bing Copilot, ChatGPT search) can only cite
// pages that are indexed, and the live site previously exposed only the newsletter sitemap.
// /sell is left out on purpose: public/sell.html is noindex. Newsletter issues keep their own
// sitemap at /newsletter/sitemap.xml, which robots.txt also lists.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/fleet', '/catalog', '/compare', '/marine-tech', '/marine-tech/support', '/newsletter'];
  return [
    ...pages.map(path => ({ url: `${SITE}${path}` })),
    ...vessels.filter(v => v.slug).map(v => ({ url: `${SITE}/fleet/${v.slug}` })),
  ];
}
