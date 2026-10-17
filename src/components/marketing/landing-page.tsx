import Link from 'next/link';
import { EditorialShell, SellerContact } from '@/components/marketing/editorial';
import { jsonLd, SITE } from '@/lib/editorial';
import { vessels } from '@/lib/fleet';
import { landingPath, type LandingPage } from '@/lib/landing-pages';
import { responsive } from '@/lib/responsive-image';

// /sell is static HTML in public/, not a Next.js route: a <Link> prefetch of it 404s.
const STATIC_PAGES = new Set(['/sell']);

export function listingsFor(page: LandingPage) {
  if (!page.listingAreas) return [];
  return vessels.filter(v => v.slug && page.listingAreas!.includes(v.location));
}

export function LandingPageView({ page }: { page: LandingPage }) {
  const listings = listingsFor(page);
  const heroImage = listings[0]?.image ?? '/sell/img/hero.jpg';
  const url = `${SITE}${landingPath(page)}`;
  const schema = {
    '@context': 'https://schema.org', '@type': 'Service', name: page.eyebrow, serviceType: page.primaryKeyword,
    url, description: page.description,
    provider: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Gray Yachts', url: SITE },
    areaServed: page.kind === 'location' ? page.eyebrow : 'Pacific Northwest',
  };
  return (
    <EditorialShell eyebrow={page.eyebrow} title={page.heroTitle} intro={page.intro}
      hero={{ title: page.heroTitle, image: heroImage, imageAlt: listings[0] ? `${listings[0].year} ${listings[0].make}` : 'Yacht on the water', action: 'Read more' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <div className="max-w-3xl">
        {page.sections.map(s => (
          <section key={s.heading} className="mb-12">
            <h2 className="mb-4 font-[family-name:var(--font-cormorant)] text-3xl md:text-4xl">{s.heading}</h2>
            {s.paragraphs.map(p => <p key={p} className="mb-4 text-lg leading-8 text-text-secondary">{p}</p>)}
            {s.bullets && <ul className="my-5 list-disc space-y-3 pl-6 leading-7 text-text-secondary">{s.bullets.map(b => <li key={b}>{b}</li>)}</ul>}
          </section>
        ))}
      </div>
      {listings.length > 0 && (
        <section className="mb-14">
          <h2 className="mb-6 font-[family-name:var(--font-cormorant)] text-3xl md:text-4xl">Currently listed in {page.eyebrow}</h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map(v => (
              <li key={v.slug} className="overflow-hidden rounded-xl border border-border bg-bg-card">
                <Link href={`/fleet/${v.slug}`} className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img {...responsive(v.image, "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw")} alt={`${v.year} ${v.make} for sale in ${v.location}`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  <div className="p-4"><p className="font-medium">{v.year} {v.make}</p><p className="text-sm text-text-secondary">{v.name} · {v.location} · {v.price}</p></div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {page.events && page.events.length > 0 && (
        <section className="mb-14 max-w-3xl">
          <h2 className="mb-4 font-[family-name:var(--font-cormorant)] text-3xl">Upcoming boat show</h2>
          {page.events.map(e => <p key={e.name} className="text-lg leading-8 text-text-secondary"><a className="text-gold underline underline-offset-4" href={e.url}>{e.name}</a>: {e.dates}, per the organizer.</p>)}
        </section>
      )}
      <section className="mb-14 max-w-3xl">
        <h2 className="mb-4 font-[family-name:var(--font-cormorant)] text-3xl">Questions owners ask</h2>
        {page.faq.map(f => <div key={f.question} className="mt-6"><h3 className="text-lg font-medium">{f.question}</h3><p className="mt-2 leading-7 text-text-secondary">{f.answer}</p></div>)}
      </section>
      <nav aria-label="Related" className="max-w-3xl">
        <h2 className="mb-4 text-xl">Related on Gray Yachts</h2>
        <ul className="space-y-2">{page.related.map(r => <li key={r.href}>{STATIC_PAGES.has(r.href)
          ? <a href={r.href} className="text-gold underline underline-offset-4">{r.label}</a>
          : <Link href={r.href} className="text-gold underline underline-offset-4">{r.label}</Link>}</li>)}</ul>
      </nav>
      <SellerContact />
    </EditorialShell>
  );
}
