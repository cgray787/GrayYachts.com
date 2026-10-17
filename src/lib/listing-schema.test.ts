import { describe, it, expect } from 'vitest';
import { vessels } from '@/lib/fleet';
import { brandOf, listingJsonLd } from '@/lib/listing-schema';

const listed = vessels.filter((v): v is typeof v & { slug: string } => !!v.slug);

describe('listing Product structured data', () => {
  it('uses the builder as brand, never make plus model', () => {
    expect(brandOf('Ocean Alexander 548')).toBe('Ocean Alexander');
    expect(brandOf('Sea Ray Sundancer 350')).toBe('Sea Ray');
    expect(brandOf('Custom Norsco Aluminum Patrol')).toBe('Norsco');
    expect(brandOf('Wood Sloop')).toBeUndefined();
  });

  it('gives Google the merchant listing fields it flagged, for every listing', () => {
    for (const v of listed) {
      const d = listingJsonLd(v, 'x');
      expect(d.url, v.slug).toBe(`https://grayyachts.com/fleet/${v.slug}`);
      for (const src of d.image) expect(src, v.slug).toMatch(/^https:\/\//);
      if (!d.offers) continue;
      expect(d.offers.shippingDetails.doesNotShip, v.slug).toBe(true);
      expect(d.offers.hasMerchantReturnPolicy.applicableCountry, v.slug).toBe('US');
      expect(Number(d.offers.price), v.slug).toBeGreaterThan(0);
    }
  });

  it('builds specs from vessel fields, not the brochure display strip', () => {
    const oa = listingJsonLd(listed.find(v => v.slug === 'ocean-alexander-548')!, 'x');
    expect(oa.name).toBe('1996 Ocean Alexander 548');
    expect(oa.additionalProperty.map(p => p.name)).toEqual(['Year built', 'Length overall', 'Location']);
  });

  it('never claims reviews or ratings (none exist)', () => {
    for (const v of listed) {
      const d = listingJsonLd(v, 'x') as Record<string, unknown>;
      expect(d.review).toBeUndefined();
      expect(d.aggregateRating).toBeUndefined();
    }
  });
});
