"use client";

import Link from "next/link";
import {
  Search,
  Bell,
  Ship,
  Wrench,
  FileText,
  Calendar,
} from "lucide-react";

/* ───── Types ───── */

export interface DashboardYacht {
  name: string;
  spec: string;
  badge: string;
  badgeColor: string;
  gradient: string;
}

export interface DashboardActivity {
  title: string;
  detail: string;
  dotColor: string;
}

export interface DashboardStats {
  yachtCount: number;
  pendingServices: number;
  documentCount: number;
  nextAppointment: string | null;
}

interface DashboardClientProps {
  firstName: string;
  yachts: DashboardYacht[];
  activities: DashboardActivity[];
  stats: DashboardStats;
}

/* ───── Component ───── */

export default function DashboardClient({
  firstName,
  yachts,
  activities,
  stats: dashboardStats,
}: DashboardClientProps) {
  const stats = [
    {
      icon: Ship,
      value: String(dashboardStats.yachtCount),
      label: "Active Vessels",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-400/10",
    },
    {
      icon: Wrench,
      value: String(dashboardStats.pendingServices),
      label: "Pending Services",
      iconColor: "text-gold",
      iconBg: "bg-gold-muted",
    },
    {
      icon: FileText,
      value: String(dashboardStats.documentCount),
      label: "Documents",
      iconColor: "text-blue-400",
      iconBg: "bg-blue-400/10",
    },
    {
      icon: Calendar,
      value: dashboardStats.nextAppointment ?? "None",
      label: "Next Appointment",
      iconColor: "text-purple-400",
      iconBg: "bg-purple-400/10",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Here&apos;s an overview of your fleet and services
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search..."
              className="h-10 w-56 rounded-lg border border-border bg-bg-card pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary focus:border-gold focus:outline-none"
            />
          </div>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-card transition-colors hover:bg-bg-card-hover">
            <Bell className="h-[18px] w-[18px] text-text-secondary" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-bg-primary">
              3
            </span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-bg-card p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-text-primary">
                {stat.value}
              </p>
              <p className="mt-0.5 text-sm text-text-secondary">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Fleet & Activity Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Your Fleet - 3/5 width */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
              Your Fleet
            </h2>
            <Link
              href="/portal/my-yachts"
              className="text-sm text-gold transition-colors hover:text-gold-hover"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {yachts.map((yacht) => (
              <div
                key={yacht.name}
                className="overflow-hidden rounded-xl border border-border bg-bg-card"
              >
                {/* Image placeholder */}
                <div
                  className={`h-36 bg-gradient-to-br ${yacht.gradient}`}
                />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-text-primary">
                        {yacht.name}
                      </h3>
                      <p className="mt-0.5 text-sm text-text-secondary">
                        {yacht.spec}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${yacht.badgeColor}`}
                    >
                      {yacht.badge}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity - 2/5 width */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
            Recent Activity
          </h2>
          <div className="rounded-xl border border-border bg-bg-card p-5">
            <ul className="space-y-5">
              {activities.map((activity, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 block h-2.5 w-2.5 flex-shrink-0 rounded-full ${activity.dotColor}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {activity.title}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {activity.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
