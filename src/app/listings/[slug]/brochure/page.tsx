import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { vessels } from "@/lib/fleet";
import { getBrochure } from "@/lib/brochures";
import "./brochure.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BrochurePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vessel = vessels.find((v) => v.slug === slug);
  const b = getBrochure(slug);
  if (!vessel || !b) notFound();

  const [priceMain, ...priceRest] = vessel.price.split(/\s+(?=or\b)/i);
  const obo = priceRest.join(" ");
  const heroCaption = vessel.gallery[0]?.caption ?? vessel.name;

  return (
    <div className="bx">
      {/* PAGE 1 */}
      <section className="bx-page">
        <div className="bx-topbar">
          <span>Gray Yachts · Pacific Northwest Brokerage</span>
          {vessel.badge && <span className="badge">{vessel.badge}</span>}
        </div>
        <img className="bx-hero" src={vessel.image} alt={heroCaption} />
        <div className="bx-specs">
          {b.specStrip.map((s) => (
            <div className="bx-spec" key={s.label}>
              <div className="v bx-serif">{s.value}</div>
              <div className="l">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="bx-pricerow">
          <div className="bx-price">
            {priceMain}
            {obo && <span className="obo">{obo}</span>}
          </div>
          <div className="bx-port">
            <div className="h">Hailing Port</div>
            <div>{vessel.location}</div>
            {b.documentation?.officialNo && <div>USCG Doc #{b.documentation.officialNo}</div>}
          </div>
        </div>
        <hr className="bx-rule" />
        <div className="bx-eyebrow">The Vessel</div>
        <h1 className="bx-headline">
          {b.tagline.lead} <em>{b.tagline.emphasis}</em> {b.tagline.tail}
        </h1>
        <div className="bx-body">
          <p>{b.narrative[0]}</p>
        </div>
      </section>

      {/* PAGE 2 */}
      <section className="bx-page">
        <div className="bx-body">
          {b.narrative.slice(1).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="bx-eyebrow" style={{ marginTop: "0.3in" }}>Vessel Highlights</div>
        <div className="bx-highlights">
          {b.highlights.map((h, i) => (
            <div className="bx-hl" key={i}>{h}</div>
          ))}
        </div>
      </section>

      {/* PAGE 3 */}
      <section className="bx-page">
        {b.documentation?.note && (
          <div className="bx-doc">
            <span className="anchor">⚓</span>
            <div>
              <div className="bx-eyebrow">USCG Documented &amp; Passenger Inspected</div>
              <p className="bx-body" style={{ marginTop: "8px", color: "var(--muted)" }}>
                {b.documentation.officialNo && <>Official #{b.documentation.officialNo} · </>}
                {b.documentation.callSign && <>Call Sign {b.documentation.callSign} · </>}
                {b.documentation.note}
              </p>
            </div>
          </div>
        )}
        {b.photoCredit && (
          <>
            <div className="bx-eyebrow" style={{ marginTop: "0.3in" }}>Photography</div>
            <p className="bx-body" style={{ marginTop: "8px" }}>
              Photographed at {b.photoCredit} · Gray Yachts Media
            </p>
          </>
        )}
        <div className="bx-cta">
          <div className="bx-eyebrow">Serious Inquiries Welcome</div>
          <div className="ci">Request a private showing or full survey packet</div>
          <div style={{ color: "var(--muted)", fontSize: "13px" }}>
            Full documentation, survey history, and spec sheet on file. Talk soon.
          </div>
          <span className="btn">Message Gray Yachts</span>
        </div>
        <div className="bx-footer">
          <span className="bx-serif" style={{ fontSize: "14px", letterSpacing: 0, textTransform: "none" }}>
            Gray Yachts
          </span>
          <span>Sell Correctly · Pacific Northwest</span>
        </div>
      </section>
    </div>
  );
}
