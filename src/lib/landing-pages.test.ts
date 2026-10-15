import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import sitemap from '@/app/sitemap';
import { vessels } from '@/lib/fleet';
import { landingPages, landingPath, locationPages } from '@/lib/landing-pages';
import { listingsFor } from '@/components/marketing/landing-page';

const copy = (p: (typeof landingPages)[number]) => [p.description, p.heroTitle, p.intro,
  ...p.sections.flatMap(s => [s.heading, ...s.paragraphs, ...(s.bullets ?? [])]),
  ...p.faq.flatMap(f => [f.question, f.answer])];
const urls = () => sitemap().map(s => s.url.replace('https://grayyachts.com', '') || '/');

describe('service and location landing pages', () => {
  it('have unique titles and descriptions that do not collide with existing pages', () => {
    const titles = landingPages.map(p => p.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(landingPages.map(p => p.description)).size).toBe(landingPages.length);
    expect(titles).not.toContain('Yacht Broker in Seattle and the Pacific Northwest | Gray Yachts'); // homepage
    for (const p of landingPages) {
      expect(p.title.length, p.slug).toBeLessThanOrEqual(70);
      expect(p.description.length, p.slug).toBeGreaterThanOrEqual(110);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(170);
    }
  });
  it('use no dash characters in customer copy (brand rule)', () => {
    for (const p of landingPages) for (const t of copy(p)) expect(t, `${p.slug}: ${t}`).not.toMatch(/[-–—]/);
  });
  it('carry real substance, not thin doorway copy', () => {
    for (const p of landingPages) {
      const words = copy(p).join(' ').split(/\s+/).length;
      expect(words, p.slug).toBeGreaterThanOrEqual(300);
      for (const w of p.primaryKeyword.split(' ')) expect(copy(p).join(' ').toLowerCase(), `${p.slug} lacks "${w}"`).toContain(w);
    }
  });
  it('only link to pages that exist', () => {
    const live = new Set([...urls(), ...landingPages.map(landingPath)]);
    for (const p of landingPages) for (const r of p.related) expect(live.has(r.href), `${p.slug} -> ${r.href}`).toBe(true);
  });
  it('show real listings on every location page', () => {
    const real = new Set(vessels.map(v => v.location));
    for (const p of locationPages()) {
      for (const a of p.listingAreas ?? []) expect(real.has(a), `${p.slug}: ${a}`).toBe(true);
      expect(listingsFor(p).length, p.slug).toBeGreaterThan(0);
    }
  });
  it('are in the sitemap and linked from the footer', () => {
    const footer = readFileSync('src/components/marketing/footer.tsx', 'utf8');
    for (const p of landingPages) {
      expect(urls()).toContain(landingPath(p));
      expect(footer, landingPath(p)).toContain(`"${landingPath(p)}"`);
    }
  });
  it('do not disable dynamicParams (404s on OpenNext without an incremental cache)', () => {
    for (const k of ['services', 'locations']) {
      const src = readFileSync(`src/app/(marketing)/${k}/[slug]/page.tsx`, 'utf8');
      expect(src, k).not.toMatch(/export const dynamicParams/);
    }
  });
});
