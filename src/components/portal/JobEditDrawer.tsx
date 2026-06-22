import Link from "next/link";
import { X } from "lucide-react";
import { updateJobSchedule } from "@/app/(portal)/portal/marine-tech/actions";
import { DateFieldWithCalendar } from "@/components/portal/DateFieldWithCalendar";
import { PerDayLocations } from "@/components/portal/PerDayLocations";

export type EditableJob = {
  id: string;
  status: string;
  kind?: string | null;
  scheduled_date: string | null;
  scheduled_end_date?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  location_override?: string | null;
  day_locations?: Record<string, string> | null;
  service_types: string[] | null;
  service_descriptions?: Record<string, string> | null;
  notes: string | null;
  customers: { name: string | null } | null;
  boats: { name: string | null; make: string | null; model: string | null } | null;
  marinas?: { name: string | null } | null;
  profiles: { full_name: string | null } | null;
};

export function JobEditDrawer({
  job,
  monthParam,
}: {
  job: EditableJob;
  monthParam: string | undefined;
}) {
  const monthQs = monthParam ? `?month=${monthParam}` : "";
  const paperwork = job.kind === "paperwork";
  // Show what's actually scheduled, preferring the new timestamptz columns
  // (which the Marine Tech App writes) and falling back to legacy date columns.
  const startVal = (job.scheduled_start ? job.scheduled_start.slice(0, 10) : job.scheduled_date) ?? "";
  const endVal = (job.scheduled_end ? job.scheduled_end.slice(0, 10) : job.scheduled_end_date ?? job.scheduled_date) ?? "";
  const boatLine =
    job.boats?.name ||
    [job.boats?.make, job.boats?.model].filter(Boolean).join(" ") ||
    "Unnamed vessel";
  // Place shown as the per-day fallback: the job's marina, else its free-text
  // location override.
  const fallbackPlace = job.marinas?.name?.trim() || job.location_override?.trim() || null;

  return (
    <>
      <Link
        href={`/portal/marine-tech${monthQs}`}
        scroll={false}
        aria-label="Close"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
              {paperwork ? "Paperwork block" : "Schedule job"}
            </h3>
            {paperwork ? (
              <p className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold-muted px-2 py-0.5 text-[11px] font-medium text-gold">
                📋 Paperwork
              </p>
            ) : (
              <>
                <p className="mt-0.5 text-xs text-text-secondary">{boatLine}</p>
                {job.customers?.name && (
                  <p className="text-xs text-text-secondary">
                    Customer: {job.customers.name}
                  </p>
                )}
              </>
            )}
            {job.profiles?.full_name && (
              <p className="text-xs text-text-secondary">
                Tech: {job.profiles.full_name}
              </p>
            )}
          </div>
          <Link
            href={`/portal/marine-tech${monthQs}`}
            scroll={false}
            aria-label="Close drawer"
            className="rounded-lg border border-border p-1.5 text-text-secondary transition-colors hover:text-gold"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>

        <form action={updateJobSchedule} className="flex flex-1 flex-col">
          <input type="hidden" name="id" value={job.id} />
          <input type="hidden" name="month" value={monthParam ?? ""} />
          <input type="hidden" name="kind" value={paperwork ? "paperwork" : "service"} />

          <div className="flex-1 space-y-4 p-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-text-secondary">
                Start date
              </label>
              <DateFieldWithCalendar
                name="scheduled_date"
                defaultValue={startVal}
                required
                ariaLabel="Start date"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-text-secondary">
                End date <span className="text-text-secondary/70">(same as start for single-day)</span>
              </label>
              <DateFieldWithCalendar
                name="scheduled_end_date"
                defaultValue={endVal}
                clearable
                ariaLabel="End date"
              />
            </div>

            {/* Per-day location editor — only renders when end date > start. */}
            <PerDayLocations
              initialStart={startVal}
              initialEnd={endVal}
              initialDayLocations={job.day_locations}
              fallbackPlace={fallbackPlace}
            />

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-text-secondary">
                Status
              </label>
              <select
                name="status"
                defaultValue={job.status || "new"}
                className="mt-1 w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-gold focus:outline-none"
              >
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {!paperwork && job.service_types && job.service_types.length > 0 && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Services
                </label>
                <div className="mt-1 space-y-2">
                  {job.service_types.map((s) => (
                    <div key={s}>
                      <p className="text-sm text-text-primary">{s}</p>
                      <textarea
                        name={`service_desc__${s}`}
                        defaultValue={job.service_descriptions?.[s] ?? ""}
                        placeholder="Details for this service…"
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-gold focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {paperwork ? (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Title / Note
                </label>
                <textarea
                  name="notes"
                  defaultValue={job.notes ?? ""}
                  placeholder="What is this paperwork block for?"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-gold focus:outline-none"
                />
              </div>
            ) : (
              job.notes && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-text-secondary">
                    Notes from tech
                  </label>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
                    {job.notes}
                  </p>
                </div>
              )
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border p-4">
            <Link
              href={`/portal/marine-tech${monthQs}`}
              scroll={false}
              className="rounded-lg border border-border bg-bg-primary px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-gold-hover"
            >
              Save schedule
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
