import Link from "next/link";
import { Phone, Mail, Wrench } from "lucide-react";

const specialists = [
  {
    name: "Tony Reeves",
    role: "Fiberglass Specialist",
    description:
      "Expert gelcoat and fiberglass repair, structural reinforcement, blister repair, and custom fabrication.",
    initials: "TR",
  },
  {
    name: "Carlos Medina",
    role: "Painting Specialist",
    description:
      "Professional hull painting, Awlgrip topside refinishing, anti-fouling bottom paint, and custom graphics.",
    initials: "CM",
  },
  {
    name: "Marcus Bell",
    role: "Hull Cleaning Specialist",
    description:
      "Underwater hull cleaning, zinc replacement, propeller service, and through-hull inspection. Eco-friendly methods.",
    initials: "MB",
  },
  {
    name: "Amanda Park",
    role: "Detail Cleaning Specialist",
    description:
      "Premium interior and exterior detailing, teak restoration, canvas care, stainless polishing, and ceramic coating.",
    initials: "AP",
  },
];

export default function EngineBoatPage() {
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
          <span className="text-gold">Engine & Boat Service</span>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
          Engine & Boat Service
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Expert marine technicians and specialists available for all your vessel
          maintenance and repair needs. Mobile service available throughout the
          Puget Sound region.
        </p>
      </div>

      {/* Lead Technician Profile */}
      <div className="mb-8 rounded-xl border border-border bg-bg-card p-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          {/* Photo placeholder */}
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-bg-secondary text-xl font-semibold text-text-secondary">
            DS
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <h2 className="text-xl font-semibold text-text-primary">
                Derik Swenson
              </h2>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-400">
                Lead Technician
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-gold">
              Mobile Engine & Boat Technician
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Providing mobile engine diagnostics, repair, and maintenance
              services throughout the Puget Sound region. Factory-trained on
              major inboard and outboard engine brands including Volvo Penta,
              Cummins, Caterpillar, Yamaha, and Mercury. Specializing in diesel
              engine systems, fuel injection, electrical troubleshooting, and
              seasonal winterization.
            </p>

            {/* Contact Info */}
            <div className="mt-4 flex flex-wrap justify-center gap-4 md:justify-start">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Phone className="h-3.5 w-3.5" />
                (206) 555-0478
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Mail className="h-3.5 w-3.5" />
                derik@pnwmarine.com
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Specialists */}
      <div className="mb-8">
        <h2 className="mb-5 font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
          Service Specialists
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {specialists.map((specialist) => (
            <div
              key={specialist.name}
              className="flex items-start gap-4 rounded-xl border border-border bg-bg-card p-5"
            >
              {/* Photo placeholder */}
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-bg-secondary text-sm font-semibold text-text-secondary">
                {specialist.initials}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text-primary">
                  {specialist.name}
                </h3>
                <p className="mt-0.5 text-sm font-medium text-gold">
                  {specialist.role}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {specialist.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        <button className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-bg-primary transition-colors hover:bg-gold-hover">
          <Wrench className="h-4 w-4" />
          Schedule Service
        </button>
      </div>
    </div>
  );
}
