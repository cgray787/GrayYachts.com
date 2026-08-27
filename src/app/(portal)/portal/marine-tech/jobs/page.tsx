import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { createMarineTechClient } from "@/lib/marine-tech/supabase";
import { JobsList, type Job, type JobPhoto } from "./jobs-list";

export const dynamic = "force-dynamic";

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
  let photos: Record<string, JobPhoto[]> = {};
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

    // Work-area photos the techs shot from the field app. Fetched in one query
    // for every job on screen rather than per job — a hundred jobs would
    // otherwise be a hundred round-trips.
    if (jobs.length > 0) {
      const { data: pics } = await db
        .from("report_photos")
        .select("id, job_id, photo_url, caption")
        .in("job_id", jobs.map((j) => j.id))
        .is("campaign_log_id", null)
        .order("created_at");
      for (const p of (pics ?? []) as unknown as JobPhoto[]) {
        if (!p.job_id) continue;
        (photos[p.job_id] ??= []).push(p);
      }
    }
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
        <JobsList jobs={jobs ?? []} photos={photos} />
      )}
    </div>
  );
}
