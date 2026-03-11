"use client";

import { useState } from "react";
import {
  Shield,
  Navigation,
  Anchor,
  Wrench,
  FileText,
  ShieldCheck,
  CheckCircle,
  Upload,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Static demo data                                                   */
/* ------------------------------------------------------------------ */

const SERVICE_CARDS = [
  {
    icon: Shield,
    iconColor: "text-success",
    iconBg: "bg-success/10",
    title: "Insurance",
    description:
      "Full coverage marine insurance. Renewal due Mar 28, 2026.",
    badge: "Active",
    badgeColor: "bg-success/10 text-success",
  },
  {
    icon: Navigation,
    iconColor: "text-info",
    iconBg: "bg-info/10",
    title: "Captain & Crew",
    description:
      "Full-time captain and 4 crew members on retainer.",
    badge: "Active",
    badgeColor: "bg-success/10 text-success",
  },
  {
    icon: Anchor,
    iconColor: "text-gold",
    iconBg: "bg-gold-muted",
    title: "Berth & Marina",
    description:
      "Premium berth at Port Hercules, Monaco. Year-round.",
    badge: "Active",
    badgeColor: "bg-success/10 text-success",
  },
  {
    icon: Wrench,
    iconColor: "text-error",
    iconBg: "bg-error/10",
    title: "Engine Service",
    description:
      "Scheduled MTU engine overhaul. Next service Mar 18.",
    badge: "Scheduled",
    badgeColor: "bg-info/10 text-info",
  },
] as const;

const MAINTENANCE_RECORDS = [
  {
    date: "Feb 15, 2026",
    service: "Hull inspection & antifouling",
    status: "Complete",
    statusColor: "bg-success/10 text-success",
    cost: "$18,500",
  },
  {
    date: "Jan 08, 2026",
    service: "Navigation system update v2.3",
    status: "Complete",
    statusColor: "bg-success/10 text-success",
    cost: "$4,200",
  },
  {
    date: "Mar 18, 2026",
    service: "MTU engine overhaul (scheduled)",
    status: "Pending",
    statusColor: "bg-warning/10 text-warning",
    cost: "$32,000",
  },
  {
    date: "Nov 22, 2025",
    service: "Annual safety equipment inspection",
    status: "Complete",
    statusColor: "bg-success/10 text-success",
    cost: "$6,800",
  },
] as const;

const DOCUMENTS = [
  {
    icon: FileText,
    iconColor: "text-error",
    iconBg: "bg-error/10",
    title: "Registration Certificate",
    meta: "PDF \u00b7 2.4 MB \u00b7 Updated Jan 2026",
  },
  {
    icon: ShieldCheck,
    iconColor: "text-info",
    iconBg: "bg-info/10",
    title: "Insurance Policy",
    meta: "PDF \u00b7 1.8 MB \u00b7 Updated Feb 2025",
  },
  {
    icon: CheckCircle,
    iconColor: "text-success",
    iconBg: "bg-success/10",
    title: "Survey Report",
    meta: "PDF \u00b7 5.1 MB \u00b7 Updated Dec 2025",
  },
  {
    icon: FileText,
    iconColor: "text-text-secondary",
    iconBg: "bg-bg-secondary",
    title: "Owner\u2019s Manual",
    meta: "PDF \u00b7 12.3 MB \u00b7 Original",
  },
] as const;

const TABS = ["Services", "Maintenance", "Documents", "Location"] as const;
type Tab = (typeof TABS)[number];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function YachtDetailPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Services");

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* ── Hero banner ── */}
      <div className="relative h-72 w-full overflow-hidden sm:h-80 md:h-96">
        {/* Gradient placeholder for yacht image */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 to-bg-card" />
        {/* Subtle noise overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
        {/* Yacht name */}
        <div className="absolute bottom-8 left-8 z-10 sm:bottom-10 sm:left-12">
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light tracking-wide text-text-primary sm:text-5xl">
            Serenity II
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Benetti &middot; 42m Motor Yacht &middot; 2022
          </p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <nav className="-mb-px flex gap-8" aria-label="Yacht tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "whitespace-nowrap border-b-2 py-4 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "border-gold text-gold"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                )}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
        {activeTab === "Services" && <ServicesTab />}
        {activeTab === "Maintenance" && <MaintenanceTab />}
        {activeTab === "Documents" && <DocumentsTab />}
        {activeTab === "Location" && <LocationTab />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Services tab                                                       */
/* ------------------------------------------------------------------ */

function ServicesTab() {
  return (
    <div className="space-y-12">
      {/* Service cards */}
      <section>
        <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-text-primary mb-6">
          Active Services
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-lg border border-border bg-bg-card p-5 transition-colors hover:bg-bg-card-hover"
              >
                <div
                  className={cn(
                    "mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg",
                    card.iconBg
                  )}
                >
                  <Icon className={cn("h-5 w-5", card.iconColor)} />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {card.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                  {card.description}
                </p>
                <span
                  className={cn(
                    "mt-4 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                    card.badgeColor
                  )}
                >
                  {card.badge}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Maintenance records */}
      <MaintenanceSection />

      {/* Documents */}
      <DocumentsSection />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Maintenance section (shared between Services & Maintenance tabs)   */
/* ------------------------------------------------------------------ */

function MaintenanceSection() {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-text-primary">
          Maintenance Records
        </h2>
        <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-gold/50 hover:text-gold">
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary/50">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Date
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Service
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Status
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary text-right">
                Cost
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MAINTENANCE_RECORDS.map((row, i) => (
              <tr
                key={i}
                className="transition-colors hover:bg-bg-card-hover"
              >
                <td className="whitespace-nowrap px-5 py-3.5 text-text-secondary">
                  {row.date}
                </td>
                <td className="px-5 py-3.5 text-text-primary">
                  {row.service}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                      row.statusColor
                    )}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right text-text-primary">
                  {row.cost}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Documents section (shared between Services & Documents tabs)       */
/* ------------------------------------------------------------------ */

function DocumentsSection() {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-text-primary">
          Documents &amp; Records
        </h2>
        <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-gold/50 hover:text-gold">
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {DOCUMENTS.map((doc) => {
          const Icon = doc.icon;
          return (
            <div
              key={doc.title}
              className="rounded-lg border border-border bg-bg-card p-5 transition-colors hover:bg-bg-card-hover cursor-pointer"
            >
              <div
                className={cn(
                  "mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg",
                  doc.iconBg
                )}
              >
                <Icon className={cn("h-5 w-5", doc.iconColor)} />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">
                {doc.title}
              </h3>
              <p className="mt-1 text-xs text-text-secondary">{doc.meta}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Maintenance tab                                                    */
/* ------------------------------------------------------------------ */

function MaintenanceTab() {
  return (
    <div className="space-y-10">
      <MaintenanceSection />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Documents tab                                                      */
/* ------------------------------------------------------------------ */

function DocumentsTab() {
  return (
    <div className="space-y-10">
      <DocumentsSection />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Location tab (placeholder)                                         */
/* ------------------------------------------------------------------ */

function LocationTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold-muted">
        <Navigation className="h-6 w-6 text-gold" />
      </div>
      <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-text-primary">
        Port Hercules, Monaco
      </h3>
      <p className="mt-2 max-w-sm text-center text-sm text-text-secondary">
        Last updated Mar 10, 2026. Live tracking and voyage history will be
        available here.
      </p>
    </div>
  );
}
