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
import {
  MarineTechCalendar,
  buildMonthRange,
  type CalendarJob,
} from "@/components/portal/MarineTechCalendar";
import {
  JobEditDrawer,
  type EditableJob,
} from "@/components/portal/JobEditDrawer";

export const dynamic = "force-dynamic";

type RecentReport = {
  id: string;
  boat_name: string | null;
  owner_name: string | null;
  make_model: string | null;
  submitted_at: string | null;
};

type PendingJob = {
  id: string;
  status: string;
  created_at: string;
  service_types: string[] | null;
  service_descriptions: Record<string, string> | null;
  notes: string | null;
  customers: { name: string | null } | null;
  boats: { name: string | null; make: string | null; model: string | null } | null;
};

async function loadPendingJobs(
  db: ReturnType<typeof createMarineTechClient>
): Promise<PendingJob[]> {
  // Pending = no date in either scheduling world (legacy date or timestamptz)
  // and not already completed — mirrors the standalone dashboard's
  // PendingJobsPanel (F8c).
  const withDescriptions = await db
    .from("jobs")
    .select(
      "id, status, created_at, service_types, service_descriptions, notes, customers(name), boats(name, make, model)"
    )
    .is("scheduled_start", null)
    .is("scheduled_date", null)
    .neq("status", "completed")
    .order("created_at", { ascending: true })
    .limit(50);
  if (!withDescriptions.error)
    return (withDescriptions.data ?? []) as unknown as PendingJob[];

  // Fallback for environments predating migration 031 (service_descriptions).
  const plain = await db
    .from("jobs")
    .select(
      "id, status, created_at, service_types, notes, customers(name), boats(name, make, model)"
    )
    .is("scheduled_start", null)
    .is("scheduled_date", null)
    .neq("status", "completed")
    .order("created_at", { ascending: true })
    .limit(50);
  return (plain.data ?? []) as unknown as PendingJob[];
}

async function loadMonthJobs(
  db: ReturnType<typeof createMarineTechClient>,
  start: string,
  end: string
): Promise<CalendarJob[]> {
  // Two write paths land jobs on a date:
  //   (a) scheduled_date (date) — legacy + the portal's own edit drawer
  //   (b) scheduled_start (timestamptz) — what the Marine Tech App's calendar
  //       writes when an operator uses the inline Schedule picker
  // Either may be NULL on a given row. We pull both columns + the matching
  // _end fields, then OR-filter so a row in either world is found:
  //   scheduled_start in [startTs, endTs]  OR  scheduled_date in [start, end]
  // The PostgREST `or` operator wraps the two `and` clauses below.
  const startTs = `${start}T00:00:00.000Z`;
  const endTs = `${end}T23:59:59.999Z`;
  const withEnd = await db
    .from("jobs")
    .select(
      "id, status, scheduled_date, scheduled_end_date, scheduled_start, scheduled_end, customers(name), boats(name, make, model)"
    )
    .or(
      `and(scheduled_start.gte.${startTs},scheduled_start.lte.${endTs}),and(scheduled_date.gte.${start},scheduled_date.lte.${end})`
    )
    .order("scheduled_start", { ascending: true, nullsFirst: false })
    .limit(500);
  if (!withEnd.error) return (withEnd.data ?? []) as unknown as CalendarJob[];

  // Fallback for projects where scheduled_start hasn't been added yet.
  const single = await db
    .from("jobs")
    .select(
      "id, status, scheduled_date, customers(name), boats(name, make, model)"
    )
    .gte("scheduled_date", start)
    .lte("scheduled_date", end)
    .order("scheduled_date", { ascending: true })
    .limit(500);
  return (single.data ?? []) as unknown as CalendarJob[];
}

async function loadOverview(monthParam: string | undefined) {
  try {
    const db = createMarineTechClient();
    const { start, end } = buildMonthRange(monthParam);
    const [
      { count: totalJobs },
      { count: newJobs },
      { count: inProgressJobs },
      { count: completedJobs },
      { count: totalReports },
      { count: totalPDI },
      { count: totalTechs },
      { data: recentReports },
      monthJobs,
      pendingJobs,
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
      loadMonthJobs(db, start, end),
      loadPendingJobs(db),
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
      monthJobs,
      pendingJobs,
    };
  } catch {
    return { configured: false as const };
  }
}

async function loadEditableJob(id: string): Promise<EditableJob | null> {
  try {
    const db = createMarineTechClient();
    const withEnd = await db
      .from("jobs")
      .select(
        "id, status, scheduled_date, scheduled_end_date, scheduled_start, scheduled_end, service_types, service_descriptions, notes, customers(name), boats(name, make, model), profiles!jobs_assigned_to_fkey(full_name)"
      )
      .eq("id", id)
      .maybeSingle();
    if (!withEnd.error && withEnd.data) {
      return withEnd.data as unknown as EditableJob;
    }
    const fallback = await db
      .from("jobs")
      .select(
        "id, status, scheduled_date, service_types, notes, customers(name), boats(name, make, model), profiles!jobs_assigned_to_fkey(full_name)"
      )
      .eq("id", id)
      .maybeSingle();
    if (fallback.error || !fallback.data) return null;
    return fallback.data as unknown as EditableJob;
  } catch {
    return null;
  }
}

export default async function MarineTechPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; job?: string }>;
}) {
  const { month, job: jobId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/portal/marine-tech");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  const [overview, editableJob] = await Promise.all([
    loadOverview(month),
    jobId ? loadEditableJob(jobId) : Promise.resolve(null),
  ]);

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
              hint={`${overview.counts.newJobs} new · ${overview.counts.inProgressJobs} in progress · ${overview.pendingJobs.length} pending schedule`}
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

          {overview.pendingJobs.length > 0 && (
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
                  Pending Jobs
                </h2>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                  {overview.pendingJobs.length}
                </span>
                <span className="text-xs text-text-secondary">
                  no date scheduled yet
                </span>
              </div>
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5">
                <ul className="divide-y divide-border">
                  {overview.pendingJobs.map((j) => {
                    const boatLabel =
                      j.boats?.name ||
                      [j.boats?.make, j.boats?.model].filter(Boolean).join(" ") ||
                      "Unknown vessel";
                    return (
                      <li
                        key={j.id}
                        className="flex items-center justify-between gap-4 p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text-primary">
                            {[j.customers?.name, boatLabel]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {j.service_types && j.service_types.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {j.service_types.map((s) => (
                                <span
                                  key={s}
                                  className="rounded-full border border-border bg-bg-card px-2 py-0.5 text-[11px] text-text-secondary"
                                >
                                  {s}
                                  {j.service_descriptions?.[s] && (
                                    <span className="text-text-secondary/70">
                                      {" "}
                                      — {j.service_descriptions[s]}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/portal/marine-tech?job=${j.id}${month ? `&month=${month}` : ""}`}
                          scroll={false}
                          className="shrink-0 rounded-lg bg-gold px-3 py-1.5 text-sm font-medium text-bg-primary transition-colors hover:bg-gold-hover"
                        >
                          Schedule
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

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
                              {r.owner_name ?? "Unknown client"}
                            </p>
                            <p className="mt-0.5 truncate text-sm text-text-secondary">
                              {[r.boat_name, r.make_model].filter(Boolean).join(" · ")}
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

          <div className="mt-8">
            <MarineTechCalendar
              jobs={overview.monthJobs}
              monthParam={month}
            />
          </div>
        </>
      )}

      {editableJob && (
        <JobEditDrawer job={editableJob} monthParam={month} />
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
