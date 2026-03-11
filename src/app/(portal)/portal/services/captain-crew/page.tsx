import Link from "next/link";
import {
  Shield,
  MapPin,
  Award,
  Ship,
  GraduationCap,
  Users,
  Phone,
} from "lucide-react";

const credentials = [
  { icon: Shield, label: "100-Ton Master" },
  { icon: MapPin, label: "PNW Specialist" },
  { icon: Award, label: "USCG Licensed" },
];

const services = [
  {
    icon: Ship,
    title: "Yacht Delivery",
    description:
      "Professional delivery of your vessel anywhere in the Pacific Northwest and beyond. Safe, insured, and on schedule.",
  },
  {
    icon: GraduationCap,
    title: "Owner Training",
    description:
      "Hands-on training aboard your own vessel. Learn docking, navigation, systems management, and emergency procedures at your pace.",
  },
  {
    icon: Users,
    title: "Charter Captain",
    description:
      "Experienced charter captain available for day cruises, corporate events, and extended voyages throughout the San Juan Islands and Puget Sound.",
  },
];

const crewMembers = [
  {
    name: "Jake Morrison",
    role: "First Mate · Navigation & Docking",
    status: "Available",
    initials: "JM",
  },
  {
    name: "Lisa Chen",
    role: "Engineer · Systems & Mechanical",
    status: "Available",
    initials: "LC",
  },
];

export default function CaptainCrewPage() {
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
          <span className="text-gold">Captain & Crew</span>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
          Captain & Crew Services
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Professional captain and crew services for yacht delivery, training,
          and charter operations in the Pacific Northwest.
        </p>
      </div>

      {/* Main Captain Profile */}
      <div className="mb-8 rounded-xl border border-border bg-bg-card p-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          {/* Photo placeholder */}
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-bg-secondary text-xl font-semibold text-text-secondary">
            CR
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-semibold text-text-primary">
              Coleman Rogers
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Licensed Captain & Training Instructor
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              USCG 100-Ton Master licensed captain with extensive experience in
              Pacific Northwest waters. Specializing in yacht delivery, owner
              training, and charter operations. Known for patient instruction and
              deep knowledge of Puget Sound, San Juan Islands, and the Inside
              Passage.
            </p>

            {/* Credential Badges */}
            <div className="mt-4 flex flex-wrap justify-center gap-3 md:justify-start">
              {credentials.map((cred) => {
                const Icon = cred.icon;
                return (
                  <span
                    key={cred.label}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-primary"
                  >
                    <Icon className="h-3.5 w-3.5 text-gold" />
                    {cred.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Services Offered */}
      <div className="mb-8">
        <h2 className="mb-5 font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
          Services Offered
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className="rounded-xl border border-border bg-bg-card p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gold-muted">
                  <Icon className="h-5 w-5 text-gold" />
                </div>
                <h3 className="text-base font-semibold text-text-primary">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Crew Available */}
      <div className="mb-8">
        <h2 className="mb-5 font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
          Crew Available
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {crewMembers.map((crew) => (
            <div
              key={crew.name}
              className="flex items-center gap-4 rounded-xl border border-border bg-bg-card p-5"
            >
              {/* Photo placeholder */}
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-bg-secondary text-sm font-semibold text-text-secondary">
                {crew.initials}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text-primary">{crew.name}</h3>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {crew.role}
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {crew.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Book CTA */}
      <div className="flex justify-center">
        <button className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-bg-primary transition-colors hover:bg-gold-hover">
          <Phone className="h-4 w-4" />
          Book Captain Rogers
        </button>
      </div>
    </div>
  );
}
