import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck,
  Wrench,
  ClipboardList,
  Users,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { createMarineTechClient } from "@/lib/marine-tech/supabase";

export const dynamic = "force-dynamic";

type RecentReport = {
  id: string;
  boat_name: string | null;
  owner_name: string | null;
  make_model: string | null;
  submitted_at: string | null;
};

async function loadOverview() {
  try {
    const db = createMarineTechClient();
    const [
      { count: totalJobs },
      { count: newJobs },
      { count: inProgressJobs },
      { count: completedJobs },
      { count: totalReports },
      { count: totalPDI },
      { count: totalTechs },
      { data: recentReports },
    ] = await Promise.all([
      db.from("jobs").select("*", { count: "exact", head: true }),
      db.from("jobs").select("*", { count: "exact", head: true }).eq("status", "new"),
      db.from("jobs").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
      db.from("jobs").select("*", { count: "exact", head: true }).eq("status", "completed"),
      db.from("service_reports").select("*", { count: "exact", head: true }),
      db.from("pdi_reports").select("*", { count: "exact", head: true }),
      db.from("profiles").select("*", { count: "exact", head: true }).eq("role", "tech"),
      db
        .from("service_reports")
        .select("id, boat_name, owner_name, make_model, submitted_at")
        .order("submitted_at", { ascending: false })
        .limit(5),
    ]);

    return {
      configured: true as const,
      counts: {
        totalJobs: totalJobs ?? 0,
        newJobs: newJobs ?? 0,
        inProgressJobs: inProgressJobs ?? 0,
        completedJobs: completedJobs ?? 0,
        totalReports: totalReports ?? 0,
        totalPDI: totalPDI ?? 0,
        totalTechs: totalTechs ?? 0,
      },
      recentReports: (recentReports ?? []) as RecentReport[],
    };
  } catch {
    return { configured: false as const };
  }
}

export default async function MarineTechPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/portal/marine-tech");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  const overview = await loadOverview();

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary lg:text-4xl">
          Marine Tech
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Service reports, pre-delivery inspections, and technician activity from the field app.
        </p>
      </div>

      {!overview.configured ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8">
          <p className="text-sm text-amber-200">
            Marine Tech bridge is not configured yet. Set
            {" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">MARINE_TECH_SUPABASE_URL</code>
            {" "}and{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">MARINE_TECH_SUPABASE_SERVICE_ROLE_KEY</code>
            {" "}in <code>.env.local</code> (or Wrangler secrets) and redeploy.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
            <StatCard
              href="/portal/marine-tech/jobs"
              icon={<Wrench className="h-5 w-5 text-gold" />}
              iconBg="bg-gold-muted"
              value={overview.counts.totalJobs}
              label="Total Jobs"
              hint={`${overview.counts.newJobs} new · ${overview.counts.inProgressJobs} in progress`}
            />
            <StatCard
              href="/portal/marine-tech/jobs?status=completed"
              icon={<ClipboardCheck className="h-5 w-5 text-emerald-400" />}
              iconBg="bg-emerald-400/10"
              value={overview.counts.completedJobs}
              label="Completed Jobs"
            />
            <StatCard
              icon={<ClipboardList className="h-5 w-5 text-blue-400" />}
              iconBg="bg-blue-400/10"
              value={overview.counts.totalReports}
              label="Service Reports"
              hint={`${overview.counts.totalPDI} PDI reports`}
            />
            <StatCard
              icon={<Users className="h-5 w-5 text-purple-400" />}
              iconBg="bg-purple-400/10"
              value={overview.counts.totalTechs}
              label="Technicians"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
                  Recent Service Reports
                </h2>
                <Link
                  href="/portal/marine-tech/jobs"
                  className="text-sm text-gold transition-colors hover:text-gold-hover"
                >
                  View Jobs
                </Link>
              </div>
              <div className="rounded-xl border border-border bg-bg-card">
                {overview.recentReports.length === 0 ? (
                  <p className="p-6 text-sm text-text-secondary">
                    No service reports yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {overview.recentReports.map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/portal/marine-tech/reports/${r.id}`}
                          className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-bg-card-hover"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text-primary">
                              {r.boat_name ?? "Unnamed vessel"}
                            </p>
                            <p className="mt-0.5 truncate text-sm text-text-secondary">
                              {[r.make_model, r.owner_name].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <time className="shrink-0 text-xs text-text-secondary">
                            {r.submitted_at
                              ? new Date(r.submitted_at).toLocaleDateString()
                              : "—"}
                          </time>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <h2 className="mb-4 font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
                Activity
              </h2>
              <div className="rounded-xl border border-border bg-bg-card p-5">
                <div className="flex items-start gap-3">
                  <Activity className="mt-0.5 h-5 w-5 text-gold" />
                  <p className="text-sm text-text-secondary">
                    Live data from the Marine Tech field app. Jobs flow in from
                    technicians in the field; reports and checklists sync when
                    they submit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  value,
  label,
  hint,
  href,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: number;
  label: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      <p className="mt-0.5 text-sm text-text-secondary">{label}</p>
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </>
  );
  const cls = "block rounded-xl border border-border bg-bg-card p-5";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-gold`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
