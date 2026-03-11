import Link from "next/link";
import {
  Shield,
  Users,
  Anchor,
  Wrench,
  ChevronRight,
} from "lucide-react";

const serviceCategories = [
  {
    title: "Insurance",
    href: "/portal/services/insurance",
    icon: Shield,
    description:
      "Trusted marine insurance partners recommended by Jeff Brown Yachts. Hull coverage, P&I liability, crew protection, and more.",
    badge: "3 Preferred Partners",
    badgeColor: "bg-emerald-400/15 text-emerald-400",
  },
  {
    title: "Captain & Crew",
    href: "/portal/services/captain-crew",
    icon: Users,
    description:
      "Professional captain and crew services for yacht delivery, training, and charter operations in the Pacific Northwest.",
    badge: "Available Now",
    badgeColor: "bg-emerald-400/15 text-emerald-400",
  },
  {
    title: "Berth & Marina",
    href: "/portal/services/berth-marina",
    icon: Anchor,
    description:
      "Premium moorage options in the Seattle area with priority access and preferred rates at designated marina locations.",
    badge: "Slips Available",
    badgeColor: "bg-blue-400/15 text-blue-400",
  },
  {
    title: "Engine & Boat Service",
    href: "/portal/services/engine-boat",
    icon: Wrench,
    description:
      "Expert marine technicians and specialists for all vessel maintenance and repair needs. Mobile service available throughout Puget Sound.",
    badge: "Mobile Service",
    badgeColor: "bg-gold-muted text-gold",
  },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-2 text-sm text-gold">Services</p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
          Services
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Comprehensive yacht services curated by Jeff Brown Yachts for our
          valued clients.
        </p>
      </div>

      {/* Service Category Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {serviceCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.href}
              href={category.href}
              className="group rounded-xl border border-border bg-bg-card p-6 transition-colors hover:border-border-light"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold-muted">
                  <Icon className="h-6 w-6 text-gold" />
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${category.badgeColor}`}
                >
                  {category.badge}
                </span>
              </div>
              <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
                {category.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {category.description}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-gold transition-colors group-hover:text-gold-hover">
                View Details
                <ChevronRight className="h-4 w-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
