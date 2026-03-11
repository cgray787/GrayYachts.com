import Link from "next/link";

const services = [
  "Sell-Side Brokerage",
  "Buy-Side Advisory",
  "Drone Cinematography",
  "Yacht Photography",
  "3D Walkthroughs",
  "Authority Content",
];

const connect = [
  { label: "425-671-8474", href: "tel:4256718474" },
  { label: "@grayyachts_", href: "https://instagram.com/grayyachts_" },
  { label: "Schedule Consultation", href: "#contact" },
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
              GRAYACHTS
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
                <li key={service}>
                  <Link
                    href="#services"
                    className="text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
                  >
                    {service}
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
                  <Link
                    href={item.href}
                    className="text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
                  >
                    {item.label}
                  </Link>
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
        </div>
      </div>
    </footer>
  );
}
