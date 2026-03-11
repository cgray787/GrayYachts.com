import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";
import type { DashboardYacht, DashboardActivity, DashboardStats } from "./dashboard-client";

/* ───── Demo / fallback data ───── */

const DEMO_YACHTS: DashboardYacht[] = [
  {
    name: "Serenity II",
    spec: "42m · Motor Yacht",
    badge: "Active",
    badgeColor: "bg-emerald-400/15 text-emerald-400",
    gradient: "from-slate-700 via-slate-600 to-blue-900",
  },
  {
    name: "Windchaser",
    spec: "28m · Sailing Yacht",
    badge: "In Marina",
    badgeColor: "bg-blue-400/15 text-blue-400",
    gradient: "from-blue-900 via-indigo-800 to-slate-700",
  },
  {
    name: "Aegean Star",
    spec: "35m · Catamaran",
    badge: "Maintenance",
    badgeColor: "bg-amber-400/15 text-amber-400",
    gradient: "from-slate-800 via-teal-900 to-slate-700",
  },
];

const DEMO_ACTIVITIES: DashboardActivity[] = [
  {
    title: "Hull inspection completed",
    detail: "Serenity II · 2 hours ago",
    dotColor: "bg-emerald-400",
  },
  {
    title: "Engine service scheduled",
    detail: "Windchaser · Yesterday",
    dotColor: "bg-gold",
  },
  {
    title: "New document uploaded",
    detail: "Aegean Star · 2 days ago",
    dotColor: "bg-blue-400",
  },
  {
    title: "Insurance renewal due",
    detail: "Serenity II · 3 days ago",
    dotColor: "bg-red-400",
  },
  {
    title: "Charter booking confirmed",
    detail: "Windchaser · 5 days ago",
    dotColor: "bg-emerald-400",
  },
];

const DEMO_STATS: DashboardStats = {
  yachtCount: 3,
  pendingServices: 2,
  documentCount: 12,
  nextAppointment: "Mar 18",
};

/* ───── Helpers ───── */

/** Map a yacht status to display badge + color */
function yachtBadge(status: string | null): {
  badge: string;
  badgeColor: string;
} {
  switch (status) {
    case "in_marina":
      return { badge: "In Marina", badgeColor: "bg-blue-400/15 text-blue-400" };
    case "maintenance":
      return {
        badge: "Maintenance",
        badgeColor: "bg-amber-400/15 text-amber-400",
      };
    case "active":
    default:
      return { badge: "Active", badgeColor: "bg-emerald-400/15 text-emerald-400" };
  }
}

/** Pick a gradient based on yacht index for visual variety */
const GRADIENTS = [
  "from-slate-700 via-slate-600 to-blue-900",
  "from-blue-900 via-indigo-800 to-slate-700",
  "from-slate-800 via-teal-900 to-slate-700",
];

/** Pick a dot color for activity items */
const DOT_COLORS = [
  "bg-emerald-400",
  "bg-gold",
  "bg-blue-400",
  "bg-red-400",
  "bg-emerald-400",
];

/** Format a date as short month + day (e.g. "Mar 18") */
function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Human-friendly relative time */
function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minutes ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;

  return shortDate(dateStr);
}

/* ───── Page ───── */

export default async function DashboardPage() {
  const supabase = await createClient();

  /* ── Auth check ── */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /* ── Profile (first name for greeting) ── */
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name ?? "";
  const firstName = fullName.split(" ")[0] || "there";

  /* ── Yachts ── */
  const yachtsResult = await supabase
    .from("yachts")
    .select("id, name, length_m, type, status")
    .eq("owner_id", user.id)
    .order("name");

  const yachts: DashboardYacht[] = yachtsResult.data?.length
    ? yachtsResult.data.map((y, i) => ({
        name: y.name,
        spec: `${y.length_m ? `${y.length_m}m · ` : ""}${y.type ?? "Yacht"}`,
        ...yachtBadge(y.status),
        gradient: GRADIENTS[i % GRADIENTS.length],
      }))
    : DEMO_YACHTS;

  /* ── Activity log ── */
  const activityResult = await supabase
    .from("activity_log")
    .select("id, title, yacht_name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const activities: DashboardActivity[] = activityResult.data?.length
    ? activityResult.data.map((a, i) => ({
        title: a.title,
        detail: `${a.yacht_name ?? ""}${a.yacht_name ? " · " : ""}${timeAgo(a.created_at)}`,
        dotColor: DOT_COLORS[i % DOT_COLORS.length],
      }))
    : DEMO_ACTIVITIES;

  /* ── Document count ── */
  const docResult = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  const documentCount = docResult.count ?? 0;

  /* ── Next upcoming maintenance ── */
  const maintResult = await supabase
    .from("maintenance_records")
    .select("scheduled_date")
    .eq("owner_id", user.id)
    .gte("scheduled_date", new Date().toISOString())
    .order("scheduled_date", { ascending: true })
    .limit(1);

  const nextAppointment = maintResult.data?.[0]?.scheduled_date
    ? shortDate(maintResult.data[0].scheduled_date)
    : null;

  /* ── Pending services (maintenance records in the future) ── */
  const pendingResult = await supabase
    .from("maintenance_records")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .gte("scheduled_date", new Date().toISOString());

  const pendingServices = pendingResult.count ?? 0;

  /* ── Assemble stats (fall back to demo if no yachts found) ── */
  const hasRealData = !!yachtsResult.data?.length;

  const stats: DashboardStats = hasRealData
    ? {
        yachtCount: yachtsResult.data!.length,
        pendingServices,
        documentCount,
        nextAppointment,
      }
    : DEMO_STATS;

  return (
    <DashboardClient
      firstName={firstName}
      yachts={yachts}
      activities={activities}
      stats={stats}
    />
  );
}
