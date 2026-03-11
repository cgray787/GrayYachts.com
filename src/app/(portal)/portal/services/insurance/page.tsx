import Link from "next/link";
import {
  CheckCircle,
  Phone,
  Mail,
  Shield,
  Users,
  Anchor,
  Globe,
} from "lucide-react";

const agents = [
  {
    name: "Michael Torres",
    role: "Senior Marine Insurance Advisor",
    company: "Pacific Maritime Insurance Group",
    description:
      "Specializing in yacht hull coverage and P&I liability for vessels 30ft and above. Over 15 years of experience insuring Pacific Northwest pleasure craft and charter yachts.",
    phone: "(206) 555-0142",
    email: "mtorres@pacificmarine.com",
    initials: "MT",
  },
  {
    name: "Sarah Lindgren",
    role: "Marine Claims Specialist",
    company: "Northwest Boat Underwriters",
    description:
      "Expert in marine claims resolution with deep knowledge of storm damage, collision, total loss, and salvage claims. Works closely with adjusters to expedite claim settlements.",
    phone: "(206) 555-0287",
    email: "slindgren@nwboatuw.com",
    initials: "SL",
  },
  {
    name: "David Nakamura",
    role: "Yacht Policy Specialist",
    company: "Sound Marine Insurance",
    description:
      "Tailored policies for luxury yachts including agreed-value hull coverage, personal effects, towing, and environmental liability. Competitive rates for well-maintained vessels.",
    phone: "(425) 555-0319",
    email: "dnakamura@soundmarine.com",
    initials: "DN",
  },
];

const coverageItems = [
  {
    icon: Shield,
    label: "Hull & Machinery",
  },
  {
    icon: Users,
    label: "P&I Liability",
  },
  {
    icon: Anchor,
    label: "Crew Coverage",
  },
  {
    icon: Globe,
    label: "Cruising Endorsements",
  },
];

export default function InsurancePage() {
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
          <span className="text-gold">Insurance</span>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
              Insurance Services
            </h1>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              GY Preferred Partner
            </span>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Trusted marine insurance partners recommended by Gray Yachts
          </p>
        </div>
      </div>

      {/* Preferred Partners Banner */}
      <div className="mb-6 rounded-xl border border-gold/30 bg-gold/5 px-5 py-3">
        <p className="text-sm font-medium text-gold">
          Preferred Partner — Referral from Gray Yachts
        </p>
      </div>

      {/* Agent Cards */}
      <div className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className="rounded-xl border border-border bg-bg-card p-6"
          >
            {/* Photo placeholder */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bg-secondary text-lg font-semibold text-text-secondary">
                {agent.initials}
              </div>
            </div>

            {/* Info */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-text-primary">
                {agent.name}
              </h3>
              <p className="mt-1 text-sm font-medium text-gold">{agent.role}</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {agent.company}
              </p>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              {agent.description}
            </p>

            {/* Contact Info */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Phone className="h-3.5 w-3.5 text-text-secondary" />
                {agent.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Mail className="h-3.5 w-3.5 text-text-secondary" />
                {agent.email}
              </div>
            </div>

            {/* CTA */}
            <button className="mt-5 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-bg-primary transition-colors hover:bg-gold-hover">
              Contact Now
            </button>
          </div>
        ))}
      </div>

      {/* Coverage We Help With */}
      <div>
        <h2 className="mb-5 font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
          Coverage We Help With
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {coverageItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex flex-col items-center gap-3 rounded-xl border border-border bg-bg-card p-5 text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-muted">
                  <Icon className="h-5 w-5 text-gold" />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
