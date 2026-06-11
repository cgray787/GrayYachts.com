import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { createMarineTechClient } from "@/lib/marine-tech/supabase";

export const dynamic = "force-dynamic";

type Job = {
  id: string;
  status: string;
  scheduled_date: string | null;          // legacy date column
  scheduled_start: string | null;         // new timestamptz column (Marine Tech App writes)
  scheduled_end_date: string | null;
  created_at: string;
  service_types: string[] | null;
  service_descriptions: Record<string, string> | null;
  notes: string | null;
  customers: { name: string | null } | null;
  boats: { name: string | null; make: string | null; model: string | null } | null;
  profiles: { full_name: string | null } | null;
};

// "When was this job scheduled?" — prefer the new timestamptz; fall back to
// the legacy date column. Returns 'YYYY-MM-DD' or null.
function jobScheduledDate(j: { scheduled_start: string | null; scheduled_date: string | null }): string | null {
  if (j.scheduled_start) return j.scheduled_start.slice(0, 10);
  return j.scheduled_date;
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-300",
  in_progress: "bg-amber-500/15 text-amber-300",
  completed: "bg-emerald-500/15 text-emerald-300",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/portal/marine-tech/jobs");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  const { status } = await searchParams;

  let jobs: Job[] | null = null;
  let configured = true;
  try {
    const db = createMarineTechClient();
    let query = db
      .from("jobs")
      .select(
        "id, status, scheduled_date, scheduled_start, scheduled_end_date, created_at, service_types, service_descriptions, notes, customers(name), boats(name, make, model), profiles!jobs_assigned_to_fkey(full_name)"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (status) query = query.eq("status", status);
    const { data } = await query;
    jobs = (data ?? []) as unknown as Job[];
  } catch {
    configured = false;
  }

  const tabs: { label: string; value: string | null }[] = [
    { label: "All", value: null },
    { label: "New", value: "new" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
  ];

  return (
    <div className="p-6 lg:p-10">
      <Link
        href="/portal/marine-tech"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-gold"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Marine Tech
      </Link>

      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary lg:text-4xl">
            Jobs
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            All technician jobs from the Marine Tech field app.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = (status ?? null) === tab.value;
          const href = tab.value
            ? `/portal/marine-tech/jobs?status=${tab.value}`
            : "/portal/marine-tech/jobs";
          return (
            <Link
              key={tab.label}
              href={href}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-gold text-bg-primary"
                  : "border border-border bg-bg-card text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {!configured ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
          <p className="text-sm text-amber-200">
            Marine Tech bridge is not configured.
          </p>
        </div>
      ) : (
      <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
        {!jobs || jobs.length === 0 ? (
          <p className="p-6 text-sm text-text-secondary">No jobs found.</p>
        ) : (
          <ul className="divide-y divide-border">
            {jobs.map((j) => {
              const boatLabel = j.boats?.name
                ? j.boats.name
                : [j.boats?.make, j.boats?.model].filter(Boolean).join(" ") ||
                  "Unknown vessel";
              return (
                <li key={j.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          STATUS_STYLES[j.status] ?? "bg-slate-700/40 text-slate-300"
                        }`}
                      >
                        {j.status.replace("_", " ")}
                      </span>
                      <p className="truncate font-medium text-text-primary">
                        {boatLabel}
                      </p>
                    </div>
                    <p className="mt-1 truncate text-sm text-text-secondary">
                      {[
                        j.customers?.name,
                        j.profiles?.full_name &&
                          `Tech: ${j.profiles.full_name}`,
                        j.service_types?.length &&
                          j.service_types.join(", "),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {j.service_descriptions &&
                      Object.keys(j.service_descriptions).length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {Object.entries(j.service_descriptions).map(
                            ([service, desc]) => (
                              <li
                                key={service}
                                className="truncate text-xs text-text-secondary/80"
                              >
                                <span className="text-text-secondary">
                                  {service}:
                                </span>{" "}
                                {desc}
                              </li>
                            )
                          )}
                        </ul>
                      )}
                  </div>
                  <div className="shrink-0 text-right text-xs text-text-secondary">
                    <time className="block">
                      {new Date(j.created_at).toLocaleDateString()}
                    </time>
                    {(() => {
                      const start = jobScheduledDate(j);
                      if (!start) return null;
                      const end = j.scheduled_end_date;
                      const fmt = (d: string) =>
                        new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        });
                      return (
                        <span className="mt-0.5 block text-gold">
                          {end && end !== start
                            ? `${fmt(start)} – ${fmt(end)}`
                            : fmt(start)}
                        </span>
                      );
                    })()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      )}
    </div>
  );
}
