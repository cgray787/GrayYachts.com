// Product structured data for /fleet/<slug> listing pages.
//
// Search Console (2026-10-17) flagged the listings for missing "shippingDetails" and
// "hasMerchantReturnPolicy" (Merchant listings) and "review"/"aggregateRating"
// (Product snippets). Reviews and ratings are deliberately absent: there are no real
// reviews of these boats, and inventing them violates Google's policy and ours.
// The old schema also had real defects: brand = make + model ("Ocean Alexander 548"),
// relative image URLs, and additionalProperty built from the brochure's display strip,
// whose label/value split is visual ("548" over "Ocean Alexander").
import { SITE } from '@/lib/editorial';
import type { Vessel } from '@/lib/fleet';

// Builders whose name prefixes a `make` in src/lib/fleet.ts. Unknown builders get no brand.
const BUILDERS = ['Ocean Alexander', 'Sea Ray', 'Back Cove', 'Jeanneau', 'Cobalt', 'Yamaha', 'Quicksilver',
  'Bénéteau', 'Beneteau', 'Defiance', 'Rozema', 'Hunter', 'Trojan', 'Norsco'];

export function brandOf(make: string): string | undefined {
  const m = make.replace(/^Custom\s+/i, '');
  return BUILDERS.find(b => m.toLowerCase().startsWith(b.toLowerCase()));
}

const absolute = (src: string) => (src.startsWith('http') ? src : `${SITE}${src.startsWith('/') ? '' : '/'}${src}`);

export function listingJsonLd(vessel: Vessel & { slug: string }, description: string) {
  const url = `${SITE}/fleet/${vessel.slug}`;
  const sameName = vessel.make.toLowerCase().includes(vessel.name.toLowerCase());
  const brand = brandOf(vessel.make);
  const price = vessel.price.replace(/,/g, '').match(/\$\s*(\d+)/)?.[1];
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: sameName ? `${vessel.year} ${vessel.make}` : `${vessel.year} ${vessel.make}, ${vessel.name}`,
    description,
    url,
    image: vessel.gallery.map(g => absolute(g.src)),
    ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
    model: vessel.make,
    category: 'Boats and yachts for sale',
    productionDate: String(vessel.year),
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Year built', value: String(vessel.year) },
      { '@type': 'PropertyValue', name: 'Length overall', value: vessel.length },
      { '@type': 'PropertyValue', name: 'Location', value: vessel.location },
    ],
    ...(price ? {
      offers: {
        '@type': 'Offer',
        url,
        price,
        priceCurrency: 'USD',
        itemCondition: 'https://schema.org/UsedCondition',
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Gray Yachts' },
        // Boats are sold where they lie; the buyer arranges transport.
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          doesNotShip: true,
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' },
        },
        // A closed brokerage sale is final; the buyer's protection is the survey and sea trial before closing.
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'US',
          returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
        },
      },
    } : {}),
  };
}
