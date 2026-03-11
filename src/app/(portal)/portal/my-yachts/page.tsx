"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

const DEMO_YACHTS = [
  {
    id: "serenity-ii",
    name: "Serenity II",
    spec: "42m · Motor Yacht · 2022",
    status: "Active",
    statusColor: "bg-emerald-400/15 text-emerald-400",
    gradient: "from-slate-700 via-slate-600 to-blue-900",
  },
  {
    id: "windchaser",
    name: "Windchaser",
    spec: "28m · Sailing Yacht · 2021",
    status: "In Marina",
    statusColor: "bg-blue-400/15 text-blue-400",
    gradient: "from-blue-900 via-indigo-800 to-slate-700",
  },
  {
    id: "aegean-star",
    name: "Aegean Star",
    spec: "35m · Catamaran · 2020",
    status: "Maintenance",
    statusColor: "bg-amber-400/15 text-amber-400",
    gradient: "from-slate-800 via-teal-900 to-slate-700",
  },
];

export default function MyYachtsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
          My Yachts
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Select a vessel to view details, services, and documents
        </p>
      </div>

      {/* Yacht Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {DEMO_YACHTS.map((yacht) => (
          <Link
            key={yacht.id}
            href={`/portal/my-yachts/${yacht.id}`}
            className="group overflow-hidden rounded-xl border border-border bg-bg-card transition-colors hover:border-border-light"
          >
            {/* Image placeholder */}
            <div className={`h-40 bg-gradient-to-br ${yacht.gradient}`} />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
                    {yacht.name}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {yacht.spec}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${yacht.statusColor}`}
                >
                  {yacht.status}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-gold transition-colors group-hover:text-gold-hover">
                View Details
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
