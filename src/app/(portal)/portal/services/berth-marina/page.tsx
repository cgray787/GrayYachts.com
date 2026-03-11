import Link from "next/link";
import {
  Star,
  MapPin,
  Anchor,
  Zap,
  Droplets,
  Wifi,
  Shield,
  Car,
} from "lucide-react";

const marinas = [
  {
    name: "Elliott Bay Marina",
    location: "Puget Sound, Seattle WA",
    description:
      "Premier deepwater marina on the shores of Elliott Bay with stunning views of the Olympic Mountains. Full-service facility with experienced staff, concierge services, and easy access to downtown Seattle.",
    stats: [
      { label: "Total Slips", value: "1,200+" },
      { label: "Vessel Size", value: "30-130ft" },
    ],
    available: true,
    gradient: "from-slate-700 via-blue-900 to-slate-800",
  },
  {
    name: "Leschi Marina",
    location: "Lake Washington, Seattle WA",
    description:
      "Sheltered freshwater marina on beautiful Lake Washington. Protected moorage with calm waters, ideal for year-round storage. Minutes from the I-90 bridge and Mercer Island.",
    stats: [
      { label: "Total Slips", value: "140+" },
      { label: "Vessel Size", value: "20-80ft" },
    ],
    available: true,
    gradient: "from-slate-800 via-teal-900 to-slate-700",
  },
];

const amenities = [
  { icon: Zap, label: "Shore Power" },
  { icon: Droplets, label: "Fresh Water" },
  { icon: Wifi, label: "Wi-Fi" },
  { icon: Shield, label: "24/7 Security" },
  { icon: Car, label: "Parking" },
];

export default function BerthMarinaPage() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/portal/services"
            className="text-gold transition-colors hover:text-gold-hover"
          >
            Services
          </Link>
          <span className="text-text-secondary">/</span>
          <span className="text-gold">Berth & Marina</span>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
          Berth & Marina
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Premium moorage options in the Seattle area. Jeff Brown Yachts
          customers receive priority access and preferred rates at our
          designated marina locations.
        </p>
      </div>

      {/* Priority Banner */}
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-5 py-3">
        <Star className="h-4 w-4 text-gold" />
        <p className="text-sm font-medium text-gold">
          JBY Customer Preference — Priority placement at designated marina
          locations
        </p>
      </div>

      {/* Marina Cards */}
      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {marinas.map((marina) => (
          <div
            key={marina.name}
            className="overflow-hidden rounded-xl border border-border bg-bg-card"
          >
            {/* Image Placeholder */}
            <div
              className={`h-44 bg-gradient-to-br ${marina.gradient}`}
            />

            <div className="p-6">
              <h3 className="text-lg font-semibold text-text-primary">
                {marina.name}
              </h3>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
                <MapPin className="h-3.5 w-3.5" />
                {marina.location}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {marina.description}
              </p>

              {/* Stats */}
              <div className="mt-4 flex items-center gap-6">
                {marina.stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-lg font-semibold text-text-primary">
                      {stat.value}
                    </p>
                    <p className="text-xs text-text-secondary">{stat.label}</p>
                  </div>
                ))}
                {marina.available && (
                  <div className="ml-auto flex items-center gap-1.5 text-sm text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Slips Available
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Marina Amenities */}
      <div className="mb-8">
        <h2 className="mb-5 font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
          Marina Amenities
        </h2>
        <div className="flex flex-wrap gap-3">
          {amenities.map((amenity) => {
            const Icon = amenity.icon;
            return (
              <span
                key={amenity.label}
                className="flex items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-sm font-medium text-text-primary"
              >
                <Icon className="h-4 w-4 text-gold" />
                {amenity.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        <button className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-bg-primary transition-colors hover:bg-gold-hover">
          <Anchor className="h-4 w-4" />
          Inquire About Slips
        </button>
      </div>
    </div>
  );
}
