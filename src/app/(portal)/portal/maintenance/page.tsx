"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  FolderOpen,
  FileText,
  CalendarDays,
  AlertTriangle,
  DollarSign,
  SlidersHorizontal,
  ArrowUpDown,
  Wrench,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ───── Types ───── */

type RecordCategory =
  | "All Records"
  | "Engine"
  | "Hull & Paint"
  | "Electrical"
  | "Rigging"
  | "Cleaning"
  | "Annual Survey";

interface MaintenanceRecord {
  id: string;
  badge: { label: string; color: string };
  extraBadge?: { label: string; color: string };
  date: string;
  title: string;
  description: string;
  techName: string;
  cost: string;
  previewIcon: React.ElementType;
  previewFileName: string;
  previewFileSize: string;
  previewAction: string;
  category: RecordCategory[];
  group: string;
}

/* ───── Static data ───── */

const stats = [
  {
    icon: FileText,
    value: "24",
    label: "Total Records",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-400/10",
    valueColor: "text-text-primary",
  },
  {
    icon: CalendarDays,
    value: "3",
    label: "Upcoming",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-400/10",
    valueColor: "text-text-primary",
  },
  {
    icon: AlertTriangle,
    value: "1",
    label: "Overdue",
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-400/10",
    valueColor: "text-red-400",
  },
  {
    icon: DollarSign,
    value: "$12,450",
    label: "Total Spent YTD",
    iconColor: "text-purple-400",
    iconBg: "bg-purple-400/10",
    valueColor: "text-text-primary",
  },
];

const tabs: { label: RecordCategory; count?: number }[] = [
  { label: "All Records", count: 24 },
  { label: "Engine" },
  { label: "Hull & Paint" },
  { label: "Electrical" },
  { label: "Rigging" },
  { label: "Cleaning" },
  { label: "Annual Survey" },
];

const records: MaintenanceRecord[] = [
  {
    id: "oil-change-mar",
    badge: { label: "Engine", color: "bg-orange-500/20 text-orange-400" },
    date: "Mar 1, 2026 \u00b7 10:30 AM",
    title: "Oil Change & Filter Replacement \u2014 Twin Volvo D6",
    description:
      "Full oil and filter change on both engines. Replaced fuel filters and checked impellers. All systems running within spec.",
    techName: "Derik Swenson",
    cost: "$1,240.00",
    previewIcon: FileText,
    previewFileName: "Invoice_0312.pdf",
    previewFileSize: "240 KB",
    previewAction: "View Invoice",
    category: ["All Records", "Engine"],
    group: "March 2026",
  },
  {
    id: "bottom-paint",
    badge: { label: "Hull & Paint", color: "bg-cyan-500/20 text-cyan-400" },
    date: "Mar 12, 2026 \u00b7 2:15 PM",
    title: "Bottom Paint & Zinc Replacement",
    description:
      "Hauled out at Elliott Bay Marina. Applied two coats Interlux Micron CSC antifouling. Replaced all anodes. Hull inspection passed \u2014 no blisters or osmosis detected.",
    techName: "Carlos Medina",
    cost: "$3,850.00",
    previewIcon: Image,
    previewFileName: "Receipt_0312.jpg",
    previewFileSize: "12 KB",
    previewAction: "View Receipt",
    category: ["All Records", "Hull & Paint"],
    group: "March 2026",
  },
  {
    id: "shore-power",
    badge: { label: "Electrical", color: "bg-emerald-500/20 text-emerald-400" },
    extraBadge: {
      label: "Follow-up Overdue",
      color: "bg-red-500/20 text-red-400",
    },
    date: "Feb 14, 2026 \u00b7 9:00 AM",
    title: "Shore Power Converter Replacement & Wiring Inspection",
    description:
      "Replaced 50A shore power converter. Full wiring inspection from helm to engines. Found minor corrosion on starboard panel \u2014 repair scheduled. Battery bank tested at 98% capacity.",
    techName: "Pacific Marine Electric",
    cost: "$2,180.00",
    previewIcon: FileText,
    previewFileName: "PME_Invoice.pdf",
    previewFileSize: "280 KB",
    previewAction: "View Invoice",
    category: ["All Records", "Electrical"],
    group: "February 2026",
  },
];

const groupMeta: Record<string, string> = {
  "March 2026": "bg-gold",
  "February 2026": "bg-blue-400",
};

/* ───── Component ───── */

export default function MaintenancePage() {
  const [activeTab, setActiveTab] = useState<RecordCategory>("All Records");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const filtered = records.filter((r) => r.category.includes(activeTab));

  // Group by month
  const grouped = filtered.reduce<Record<string, MaintenanceRecord[]>>(
    (acc, rec) => {
      if (!acc[rec.group]) acc[rec.group] = [];
      acc[rec.group].push(rec);
      return acc;
    },
    {}
  );

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
            Maintenance Records
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track all service history, invoices, and receipts for your vessel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary">
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary">
            <ArrowUpDown className="h-4 w-4" />
            Sort by Date
          </button>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "mb-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragOver
            ? "border-gold bg-gold-muted"
            : "border-border bg-bg-card/50"
        )}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-400/10">
          <Upload className="h-6 w-6 text-blue-400" />
        </div>
        <p className="text-lg font-medium text-text-primary">
          Drag &amp; Drop Maintenance Records Here
        </p>
        <p className="mt-1 max-w-md text-sm text-text-secondary">
          Upload invoices, receipts, service reports, and photos. Supports PDF,
          JPG, PNG
        </p>
        <div className="mt-5 flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-bg-primary transition-colors hover:bg-gold-hover">
            <FolderOpen className="h-4 w-4" />
            Browse Files
          </button>
          <span className="text-sm text-text-secondary">
            or drop files above
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-8 grid grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-bg-card p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    stat.iconBg
                  )}
                >
                  <Icon className={cn("h-5 w-5", stat.iconColor)} />
                </div>
              </div>
              <p
                className={cn("text-2xl font-semibold", stat.valueColor)}
              >
                {stat.value}
              </p>
              <p className="mt-0.5 text-sm text-text-secondary">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="mb-8 flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-bg-card p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.label)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.label
                ? "bg-gold-muted text-gold"
                : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                  activeTab === tab.label
                    ? "bg-gold/20 text-gold"
                    : "bg-border text-text-secondary"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Maintenance Record Groups */}
      <div className="space-y-10">
        {Object.entries(grouped).map(([groupName, recs]) => (
          <section key={groupName}>
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  groupMeta[groupName] ?? "bg-text-secondary"
                )}
              />
              <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
                {groupName}
              </h2>
            </div>

            <div className="space-y-4">
              {recs.map((rec) => {
                const PreviewIcon = rec.previewIcon;
                return (
                  <div
                    key={rec.id}
                    className="overflow-hidden rounded-xl border border-border bg-bg-card transition-colors"
                  >
                    <div className="flex">
                      {/* Content */}
                      <div className="flex-1 p-5">
                        {/* Badge + date row */}
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                              rec.badge.color
                            )}
                          >
                            {rec.badge.label}
                          </span>
                          {rec.extraBadge && (
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                                rec.extraBadge.color
                              )}
                            >
                              {rec.extraBadge.label}
                            </span>
                          )}
                          <span className="ml-auto text-xs text-text-secondary">
                            {rec.date}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold text-text-primary">
                          {rec.title}
                        </h3>

                        {/* Description */}
                        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                          {rec.description}
                        </p>

                        {/* Tech + cost */}
                        <div className="mt-4 flex items-center gap-5 text-xs text-text-secondary">
                          <span className="flex items-center gap-1.5">
                            <Wrench className="h-3.5 w-3.5" />
                            {rec.techName}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5" />
                            {rec.cost}
                          </span>
                        </div>
                      </div>

                      {/* Preview card */}
                      <div className="flex w-52 shrink-0 flex-col items-center justify-center border-l border-border bg-bg-secondary/50 p-5">
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-bg-card">
                          <PreviewIcon className="h-6 w-6 text-text-secondary" />
                        </div>
                        <p className="mb-0.5 text-xs font-medium text-text-primary">
                          {rec.previewFileName}
                        </p>
                        <p className="mb-3 text-[11px] text-text-secondary">
                          {rec.previewFileSize}
                        </p>
                        <button className="rounded-lg border border-border bg-bg-card px-4 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-bg-card-hover">
                          {rec.previewAction}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
