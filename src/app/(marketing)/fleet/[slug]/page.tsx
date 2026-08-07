import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Check, ChevronRight, Download, Mail, Phone } from "lucide-react";

import { ListingGallery } from "@/components/marketing/listing-gallery";
import { ListingStickyBar } from "@/components/marketing/listing-sticky-bar";
import { InquiryForm } from "@/components/marketing/inquiry-form";
import { PaymentCalculator } from "@/components/marketing/payment-calculator";
import { vessels } from "@/lib/fleet";
import { getBrochure } from "@/lib/brochures";

export function generateStaticParams() {
  return vessels.filter((v) => v.slug).map((v) => ({ slug: v.slug as string }));
}

function find(slug: string) {
  const vessel = vessels.find((v) => v.slug === slug);
  return vessel ? { vessel, brochure: getBrochure(slug) } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = find(slug);
  if (!found) return { title: "Listing not found — Gray Yachts" };
  const { vessel, brochure } = found;

  const title = `${vessel.year} ${vessel.make} — ${vessel.name} for sale | ${vessel.price} | Gray Yachts`;
  const description =
    brochure?.narrative[0]?.slice(0, 175) ??
    `${vessel.year} ${vessel.make}, ${vessel.length}, lying ${vessel.location}. Offered at ${vessel.price} by Gray Yachts.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: vessel.image }],
      type: "website",
    },
  };
}

/* ------------------------------------------------------------------ */

function SpecRow({ items }: { items: { label: string; value: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3">
      {items.map((s) => (
        <div key={s.label + s.value} className="text-center">
          <p className="text-[10px] tracking-[0.25em] text-text-secondary">
            {s.label.toUpperCase()}
          </p>
          <p className="mt-2 font-[family-name:var(--font-cormorant)] text-xl font-light text-text-primary">
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-text-primary">
        {title}
      </h3>
      <div className="mt-4 h-px w-full bg-border" />
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const found = find(slug);
  if (!found) notFound();
  const { vessel, brochure } = found;

  const others = vessels.filter((v) => v.slug && v.slug !== slug).slice(0, 3);
  const features = brochure?.highlights.slice(0, 3) ?? [];
  const featureShots = vessel.gallery.slice(1, 4);

  // Product schema — the same structured-data play NGY uses on every listing.
  const priceNumber = vessel.price.replace(/,/g, "").match(/\$\s*(\d+)/)?.[1];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${vessel.year} ${vessel.make} — ${vessel.name}`,
    description: brochure?.narrative[0] ?? `${vessel.year} ${vessel.make} for sale.`,
    image: vessel.gallery.map((g) => g.src),
    brand: { "@type": "Brand", name: vessel.make },
    category: "Yachts for sale",
    productionDate: String(vessel.year),
    ...(priceNumber
      ? {
          offers: {
            "@type": "Offer",
            price: priceNumber,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            seller: { "@type": "Organization", name: "Gray Yachts" },
          },
        }
      : {}),
    additionalProperty: (brochure?.specStrip ?? []).map((s) => ({
      "@type": "PropertyValue",
      name: s.label,
      value: s.value,
    })),
  };

  return (
    <>
      {/* Built entirely from our own static fleet/brochure data — no user input.
          `<` is still escaped so a stray "</script>" in copy can never break out. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="h-24" />

      <div className="mx-auto max-w-6xl px-6 lg:px-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[11px] tracking-[0.18em] text-text-secondary">
          <Link href="/" className="transition-colors hover:text-gold">HOME</Link>
          <ChevronRight size={12} />
          <Link href="/fleet" className="transition-colors hover:text-gold">THE FLEET</Link>
          <ChevronRight size={12} />
          <span className="truncate text-text-primary">{vessel.name.toUpperCase()}</span>
        </nav>

        {/* Title */}
        <div className="mt-6">
          <p className="text-[10px] tracking-[0.35em] text-gold">
            {vessel.year} &middot; {vessel.make.toUpperCase()}
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-cormorant)] text-4xl font-light leading-tight text-text-primary sm:text-5xl md:text-6xl">
            {vessel.name}
          </h1>
        </div>

        {/* Gallery */}
        <div className="mt-8">
          <ListingGallery photos={vessel.gallery} alt={vessel.name} badge={vessel.badge} />
        </div>

        {/* Spec bar */}
        {/* Equal-width columns rather than content-width ones, so the five
            specs sit on a uniform rhythm instead of a ragged flex row. */}
        <div className="mt-8 border-y border-border py-7">
          <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Length", value: vessel.length },
              { label: "Built", value: String(vessel.year) },
              { label: "Builder", value: vessel.make },
              { label: "Location", value: vessel.location },
              { label: "Asking Price", value: vessel.price },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-[10px] tracking-[0.25em] text-text-secondary">
                  {s.label.toUpperCase()}
                </p>
                <p className="mt-2 text-sm text-text-primary">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {vessel.href && (
              <a
                href={vessel.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-border-light px-6 py-3 text-[10px] font-semibold tracking-[0.2em] text-text-secondary transition-colors duration-300 hover:border-gold hover:text-gold"
              >
                <Download size={13} /> BROCHURE
              </a>
            )}
            <a
              href="mailto:connor@grayyachts.com"
              className="bg-gold px-7 py-3 text-[10px] font-semibold tracking-[0.2em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
            >
              CONTACT CONNOR
            </a>
          </div>
        </div>

        {/* Body + sidebar */}
        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_20rem]">
          <div>
            {/* Key features */}
            {features.length > 0 && (
              <section>
                <span className="inline-block rounded-full border border-border px-4 py-1.5 text-[10px] tracking-[0.25em] text-gold">
                  KEY FEATURES
                </span>
                <h2 className="mt-5 font-[family-name:var(--font-cormorant)] text-3xl font-light text-text-primary">
                  Why This One
                </h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-3">
                  {features.map((f, n) => (
                    <div
                      key={f}
                      className="overflow-hidden rounded-xl border border-border bg-bg-card"
                    >
                      {featureShots[n] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={featureShots[n].src}
                          alt={featureShots[n].caption}
                          loading="lazy"
                          className="h-32 w-full object-cover"
                        />
                      )}
                      <p className="p-4 text-sm leading-relaxed text-text-primary">{f}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Narrative */}
            {brochure && (
              <Section title={`More About ${vessel.name}`}>
                <div className="space-y-5">
                  {brochure.narrative.map((p, n) => (
                    <p key={n} className="text-sm leading-relaxed text-text-secondary">
                      {p}
                    </p>
                  ))}
                </div>
              </Section>
            )}

            {/* Specifications — only what we actually hold */}
            {brochure && brochure.specStrip.length > 0 && (
              <Section title="Specifications">
                <SpecRow
                  items={brochure.specStrip.map((s) => ({ label: s.label, value: s.value }))}
                />
              </Section>
            )}

            {/* Full highlight list */}
            {brochure && brochure.highlights.length > 0 && (
              <Section title="Equipment & Highlights">
                <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {brochure.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <Check size={15} className="mt-0.5 shrink-0 text-gold" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Documentation */}
            {brochure?.documentation && (
              <Section title="Documentation">
                <div className="space-y-2 text-sm text-text-secondary">
                  {brochure.documentation.officialNo && (
                    <p>
                      <span className="text-text-primary">USCG Official No.</span>{" "}
                      {brochure.documentation.officialNo}
                    </p>
                  )}
                  {brochure.documentation.callSign && (
                    <p>
                      <span className="text-text-primary">Call Sign</span>{" "}
                      {brochure.documentation.callSign}
                    </p>
                  )}
                  {brochure.documentation.note && (
                    <p className="leading-relaxed">{brochure.documentation.note}</p>
                  )}
                </div>
              </Section>
            )}

            {/* Payment calculator — only where we have a real number to seed it. */}
            {priceNumber && <PaymentCalculator price={Number(priceNumber)} />}

            {/* Brochure download — the ask */}
            {vessel.href && (
              <section className="mt-16 rounded-2xl border border-border bg-bg-card p-8 text-center sm:p-10">
                <p className="text-[10px] tracking-[0.3em] text-gold">FULL SPEC SHEET</p>
                <h3 className="mt-4 font-[family-name:var(--font-cormorant)] text-3xl font-light text-text-primary">
                  Download This Yacht&rsquo;s Brochure
                </h3>
                <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-text-secondary">
                  A three-page Gray Yachts brochure for {vessel.name} — full specifications,
                  highlights and photography, ready to print or forward.
                </p>
                <a
                  href={vessel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-2.5 bg-gold px-9 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
                >
                  <Download size={15} /> DOWNLOAD BROCHURE (PDF)
                </a>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-border bg-bg-card p-6">
              <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-text-primary">
                Interested in this vessel?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Request documentation, schedule a viewing, or ask anything at all. Every
                showing is by appointment.
              </p>
              <div className="mt-6">
                <InquiryForm vessel={`${vessel.year} ${vessel.make} — ${vessel.name}`} />
              </div>
              {vessel.href && (
                <a
                  href={vessel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-full items-center justify-center gap-2 border border-border-light px-6 py-3 text-[10px] font-semibold tracking-[0.2em] text-text-secondary transition-colors duration-300 hover:border-gold hover:text-gold"
                >
                  <Download size={14} /> DOWNLOAD BROCHURE
                </a>
              )}

              <div className="mt-7 border-t border-border pt-6">
                <p className="text-[10px] tracking-[0.25em] text-text-secondary">YOUR BROKER</p>
                <p className="mt-3 font-[family-name:var(--font-cormorant)] text-xl font-light text-text-primary">
                  Connor Gray
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Gray Yachts &middot; Pacific Northwest
                </p>
                <a
                  href="mailto:connor@grayyachts.com"
                  className="mt-4 flex items-center gap-2 text-xs text-text-secondary transition-colors hover:text-gold"
                >
                  <Mail size={13} /> connor@grayyachts.com
                </a>
                {/* Matches the number already published in the site footer. */}
                <a
                  href="tel:4256718474"
                  className="mt-2 flex items-center gap-2 text-xs text-text-secondary transition-colors hover:text-gold"
                >
                  <Phone size={13} /> 425-671-8474
                </a>
              </div>
            </div>
          </aside>
        </div>

        {/* Similar vessels */}
        {others.length > 0 && (
          <section className="mt-24">
            <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-text-primary">
              Also in the Fleet
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/fleet/${o.slug}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-bg-card transition-all duration-500 hover:-translate-y-1 hover:border-gold"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={o.image}
                      alt={o.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] tracking-[0.25em] text-gold">
                      {o.year} &middot; {o.make.toUpperCase()}
                    </p>
                    <h3 className="mt-2 font-[family-name:var(--font-cormorant)] text-xl font-light text-text-primary">
                      {o.name}
                    </h3>
                    <p className="mt-2 text-sm text-text-secondary">{o.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-20 pb-32">
          <Link
            href="/fleet"
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] text-text-secondary transition-colors duration-300 hover:text-gold"
          >
            <ArrowLeft size={14} /> BACK TO THE FLEET
          </Link>
        </div>
      </div>

      <ListingStickyBar name={vessel.name} price={vessel.price} brochureHref={vessel.href} />
    </>
  );
}
