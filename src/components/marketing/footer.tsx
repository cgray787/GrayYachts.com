import Link from "next/link";

// Each service links to its landing page (SEO strategy 2026-10-15) instead of /#contact.
const services = [
  { label: "Sell-Side Brokerage", href: "/services/yacht-brokerage" },
  { label: "Boat Valuation", href: "/services/boat-valuation" },
  { label: "Buy-Side Advisory", href: "/services/buyer-representation" },
  { label: "Drone Cinematography", href: "/services/yacht-marketing" },
  { label: "Yacht Photography", href: "/services/yacht-marketing" },
  { label: "3D Walkthroughs", href: "/services/yacht-marketing" },
  { label: "Authority Content", href: "/insights" },
];

const connect = [
  { label: "The Gray Yachts newsletter", href: "/newsletter" },
  { label: "Yacht ownership", href: "/yachts" },
  { label: "Owner guides", href: "/insights" },
  { label: "Featured brands", href: "/brands" },
  { label: "Boat shows", href: "/boat-shows" },
  { label: "Seattle yacht brokerage", href: "/locations/seattle" },
  { label: "Tacoma and South Sound", href: "/locations/tacoma" },
  { label: "Anacortes and North Sound", href: "/locations/anacortes" },
  { label: "Boats for sale in Washington", href: "/locations/washington" },
  { label: "Meet Connor Gray", href: "/about-connor-gray" },
  { label: "425-671-8474", href: "tel:4256718474" },
  { label: "@grayyachts_", href: "https://instagram.com/grayyachts_" },
  { label: "Schedule Consultation", href: "/#contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg-primary">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-12">
        {/* Top section */}
        <div className="grid gap-16 md:grid-cols-3">
          {/* Brand column */}
          <div>
            <h3 className="font-[family-name:var(--font-cormorant)] text-xl tracking-[0.35em] text-text-primary">
              GRAY YACHTS
            </h3>
            <p className="mt-4 text-[11px] tracking-[0.15em] text-text-secondary">
              Cinematic Yacht Brokerage / Pacific Northwest
            </p>
          </div>

          {/* Services column */}
          <div>
            <h4 className="text-[11px] font-medium tracking-[0.2em] text-gold mb-6">
              SERVICES
            </h4>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service.label}>
                  <Link
                    href={service.href}
                    className="text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
                  >
                    {service.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect column */}
          <div>
            <h4 className="text-[11px] font-medium tracking-[0.2em] text-gold mb-6">
              CONNECT
            </h4>
            <ul className="space-y-3">
              {connect.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    {...(item.href.startsWith("http")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-text-secondary">
            &copy; 2026 Gray Yachts. All rights reserved.
          </p>
          <p className="text-xs text-text-secondary">
            Pacific Northwest Yacht Brokerage
          </p>
          <Link
            href="/privacy"
            className="text-xs text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
