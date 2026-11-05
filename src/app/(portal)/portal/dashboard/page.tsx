import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";
import type { DashboardYacht, DashboardActivity, DashboardStats } from "./dashboard-client";

const EMPTY_STATS: DashboardStats = {
  yachtCount: 0,
  pendingServices: 0,
  documentCount: 0,
  nextAppointment: null,
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
  let firstName = "";
  let dataUnavailable = !process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Empty data is distinct from unavailable data; never display seeded clients.
  let yachts: DashboardYacht[] = [];
  let activities: DashboardActivity[] = [];
  let stats: DashboardStats = EMPTY_STATS;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    try {
      /* ── Profile (first name for greeting) ── */
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const fullName = profile?.full_name ?? "";
      firstName = fullName.trim().split(/\s+/)[0] || "";

      /* ── Yachts ── */
      const yachtsResult = await supabase
        .from("yachts")
        .select("id, name, length_m, type, status")
        .eq("user_id", user.id)
        .order("name");

      // Once authenticated, always show the user's actual yachts — even when
      // that's an empty array. This is the line that prevents a logged-in
      // client with no yachts from seeing demo seeds.
      if (yachtsResult.data) {
        yachts = yachtsResult.data.map((y, i) => ({
          name: y.name,
          spec: `${y.length_m ? `${y.length_m}m · ` : ""}${y.type ?? "Yacht"}`,
          ...yachtBadge(y.status),
          gradient: GRADIENTS[i % GRADIENTS.length],
        }));
      }

      /* ── Activity log ── */
      const activityResult = await supabase
        .from("activity_log")
        .select("id, action, description, created_at, yachts(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (activityResult.data) {
        activities = activityResult.data.map((a, i) => {
          const yachtRaw = a.yachts as unknown;
          const yachtData = Array.isArray(yachtRaw) ? (yachtRaw[0] as { name: string } | undefined) ?? null : (yachtRaw as { name: string } | null);
          return {
            title: a.action,
            detail: `${yachtData?.name ?? ""}${yachtData?.name ? " · " : ""}${timeAgo(a.created_at)}`,
            dotColor: DOT_COLORS[i % DOT_COLORS.length],
          };
        });
      }

      /* ── Document count ── */
      const docResult = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      /* ── Next upcoming maintenance ── */
      const maintResult = await supabase
        .from("maintenance_records")
        .select("service_date")
        .eq("user_id", user.id)
        .gte("service_date", new Date().toISOString())
        .order("service_date", { ascending: true })
        .limit(1);

      /* ── Pending services ── */
      const pendingResult = await supabase
        .from("maintenance_records")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("service_date", new Date().toISOString());

      if ([yachtsResult, activityResult, docResult, maintResult, pendingResult].some(result => result.error)) {
        throw new Error("Dashboard data is unavailable");
      }

      if (yachtsResult.data) {
        stats = {
          yachtCount: yachtsResult.data.length,
          pendingServices: pendingResult.count ?? 0,
          documentCount: docResult.count ?? 0,
          nextAppointment: maintResult.data?.[0]?.service_date
            ? shortDate(maintResult.data[0].service_date)
            : null,
        };
      }
    } catch {
      dataUnavailable = true;
    }
  }

  return (
    <DashboardClient
      firstName={firstName}
      yachts={yachts}
      activities={activities}
      stats={stats}
      dataUnavailable={dataUnavailable}
    />
  );
}
