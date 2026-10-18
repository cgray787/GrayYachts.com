// /llms.txt: a plain-text map of the site for AI agents and answer engines (llmstxt.org format).
// Built from the same data as the pages, so it stays current; static at build time.
import { vessels } from '@/lib/fleet';
import { publishedArticles } from '@/lib/editorial';
import { landingPages, landingPath } from '@/lib/landing-pages';

export const dynamic = 'force-static';
const SITE = 'https://grayyachts.com';

export function GET() {
  const services = landingPages.filter(p => p.kind === 'service');
  const locations = landingPages.filter(p => p.kind === 'location');
  const listed = vessels.filter(v => v.slug);
  const body = [
    '# Gray Yachts',
    '',
    '> Gray Yachts is a yacht brokerage in Seattle and the Pacific Northwest, working with Jeff Brown Yachts. Connor Gray helps owners sell boats and yachts and helps buyers find and purchase them.',
    '',
    'Contact: Connor Gray, 425-671-8474, connor@grayyachts.com. Free, no obligation boat valuations start at https://grayyachts.com/sell.',
    '',
    '## Services',
    ...services.map(p => `- [${p.eyebrow}](${SITE}${landingPath(p)}): ${p.description}`),
    '',
    '## Areas served',
    ...locations.map(p => `- [${p.eyebrow}](${SITE}${landingPath(p)}): ${p.description}`),
    '',
    '## Guides',
    ...publishedArticles().map(a => `- [${a.title}](${SITE}/insights/${a.slug}): ${a.description}`),
    `- [The Gray Yachts newsletter](${SITE}/newsletter): practical guidance for yacht buyers and sellers.`,
    '',
    '## Boats currently listed',
    `- [All listings](${SITE}/fleet): ${listed.length} boats and yachts with prices, specifications and brochures.`,
    ...listed.map(v => `- [${v.year} ${v.make}](${SITE}/fleet/${v.slug}): ${v.length}, ${v.location}, ${v.price}`),
    '',
    '## About',
    `- [Connor Gray](${SITE}/about-connor-gray)`,
    `- [Featured brands](${SITE}/brands)`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
