import type { Metadata } from 'next';

export const SITE_URL = 'https://grayyachts.com';

// Each nested object is complete: Next merges metadata shallowly, so relying on
// the root layout can give a listing the homepage's social title or URL.
export function searchMetadata(title: string, description: string, path: string, image = '/sell/img/hero.jpg'): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title, description, url: new URL(path, SITE_URL).href,
      siteName: 'Gray Yachts', locale: 'en_US', type: 'website',
      images: [{ url: new URL(image, SITE_URL).href }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [new URL(image, SITE_URL).href] },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name,
      item: new URL(item.path, SITE_URL).href,
    })),
  };
}

export const businessSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization', '@id': `${SITE_URL}/#organization`,
      name: 'Gray Yachts', url: SITE_URL,
      description: 'Yacht brokerage for buyers and sellers in Seattle and the Pacific Northwest.',
      logo: `${SITE_URL}/sell/img/logo-gy.png`,
      sameAs: ['https://www.instagram.com/grayyachts_/'],
      areaServed: ['Seattle', 'Pacific Northwest'],
    },
    {
      '@type': 'WebSite', '@id': `${SITE_URL}/#website`,
      name: 'Gray Yachts', url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
};
