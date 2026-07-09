import Link from "next/link";
import { Calendar, AlertCircle, ChevronRight, MapPin } from "lucide-react";
import { type CalendarJob, isPaperwork } from "@/components/portal/MarineTechCalendar";
import {
  jobsForDay,
  jobsForWeek,
  jobDays,
  placeForDay,
  type DayJob,
} from "@/lib/marine-tech/spans";

// Unscheduled jobs (no date in either world) arrive in the page's PendingJob
// shape. We only need a label + status + id here, so accept a structurally
// compatible subset.
export type UnscheduledJob = {
  id: string;
  status: string;
  kind?: string | null;
  notes?: string | null;
  customers: { name: string | null } | null;
  boats: { name: string | null; make: string | null; model: string | null } | null;
};

type Props = {
  /** Jobs scheduled within the visible month (already fetched by the page). */
  scheduledJobs: CalendarJob[];
  /** Jobs with no date yet (the page's "Pending Jobs"). */
  unscheduledJobs: UnscheduledJob[];
  /** The selected day, 'yyyy-MM-dd' (UTC-sliced to match jobDays). */
  selectedDate: string;
  /** The month query param to preserve on the job-edit links. */
  monthParam: string | undefined;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Sunday-based week containing `day` — matches the calendar grid's week start.
function weekBounds(day: string): { start: string; end: string } {
  const d = parseISODate(day);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toISODate(start), end: toISODate(end) };
}

function formatLongDay(day: string): string {
  return parseISODate(day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(start: string | null | undefined): string {
  if (!start) return "";
  // Only the timestamptz column carries a time; legacy date-only rows have none.
  if (!start.includes("T")) return "";
  const d = new Date(start);
  if (isNaN(d.getTime())) return "";
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return minutes === 0
    ? `${hours} ${period}`
    : `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function boatLabel(j: {
  kind?: string | null;
  notes?: string | null;
  customers: { name: string | null } | null;
  boats: { name: string | null; make: string | null; model: string | null } | null;
}): string {
  if (isPaperwork(j)) {
    const note = j.notes?.trim();
    return note ? `📋 Paperwork — ${note}` : "📋 Paperwork";
  }
  return (
    j.boats?.name ||
    [j.boats?.make, j.boats?.model].filter(Boolean).join(" ") ||
    j.customers?.name ||
    "Job"
  );
}

const STATUS_DOT: Record<string, string> = {
  new: "bg-blue-400",
  in_progress: "bg-amber-400",
  completed: "bg-emerald-400",
};

// Three stacked sections (Layout A):
//   ① the selected day's jobs (each tagged "Day N of M" when multi-day)
//   ② the rest of the week (each job once, excluding ①)
//   ③ unscheduled — needs a time (with a Schedule affordance)
export function DayFocusPanel({
  scheduledJobs,
  unscheduledJobs,
  selectedDate,
  monthParam,
}: Props) {
  const { start: weekStartDay, end: weekEndDay } = weekBounds(selectedDate);

  // ① the selected day's jobs (including multi-day jobs spanning through it)
  const dayJobs = jobsForDay(scheduledJobs, selectedDate);

  // ② the rest of the week — distinct jobs whose span touches this week, minus
  // anything already shown under the selected day (no ①/② duplicates).
  const weekJobs = jobsForWeek(scheduledJobs, weekStartDay, weekEndDay).filter(
    (j) => !jobDays(j).includes(selectedDate)
  );

  const total = dayJobs.length + weekJobs.length + unscheduledJobs.length;
  const selectedLabel = formatLongDay(selectedDate);
  const monthQs = monthParam ? `&month=${monthParam}` : "";

  if (total === 0) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-bg-card p-6 text-center text-sm text-text-secondary">
        Nothing scheduled around {selectedLabel}.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
          {selectedLabel}
        </h2>
        <span className="text-[11px] uppercase tracking-wide text-text-secondary">
          {dayJobs.length + weekJobs.length} scheduled · {unscheduledJobs.length} unscheduled
        </span>
      </div>

      <div className="space-y-4">
        {/* ① Selected day */}
        <Section
          title={selectedLabel}
          count={dayJobs.length}
          accent="var(--gold)"
          empty="Nothing scheduled for this day."
        >
          {dayJobs.map((j) => (
            <JobRow
              key={j.id}
              job={j}
              scheduled
              dayIndex={j.dayIndex}
              dayCount={j.dayCount}
              place={placeForDay(j, selectedDate)}
              monthQs={monthQs}
            />
          ))}
        </Section>

        {/* ② Rest of the week */}
        <Section
          title="Scheduled this week"
          count={weekJobs.length}
          accent="#4ade80"
          empty="Nothing else scheduled this week."
        >
          {weekJobs.map((j) => {
            // Show the place for the job's first day that falls in this week.
            const days = jobDays(j);
            const dayInWeek =
              days.find((d) => d >= weekStartDay && d <= weekEndDay) ?? days[0];
            return (
              <JobRow
                key={j.id}
                job={j}
                scheduled
                place={dayInWeek ? placeForDay(j, dayInWeek) : null}
                monthQs={monthQs}
              />
            );
          })}
        </Section>

        {/* ③ Unscheduled */}
        <Section
          title="Unscheduled — needs a time"
          count={unscheduledJobs.length}
          accent="#94a3b8"
          empty="No unscheduled jobs."
        >
          {unscheduledJobs.map((j) => (
            <JobRow key={j.id} job={j} scheduled={false} monthQs={monthQs} />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  accent,
  empty,
  children,
}: {
  title: string;
  count: number;
  accent: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
      <div
        className="flex items-center justify-between border-b border-border px-4 py-3"
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-primary">
          {title}
        </span>
        <span className="text-[11px] text-text-secondary">{count}</span>
      </div>
      {count === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-text-secondary">{empty}</div>
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </div>
  );
}

function JobRow({
  job,
  scheduled,
  dayIndex,
  dayCount,
  place,
  monthQs,
}: {
  job: DayJob | CalendarJob | UnscheduledJob;
  scheduled: boolean;
  dayIndex?: number;
  dayCount?: number;
  /** The place (text) this job is at on the day this row represents. */
  place?: string | null;
  monthQs: string;
}) {
  const paperwork = isPaperwork(job);
  const start = "scheduled_start" in job ? job.scheduled_start : null;
  const time = formatTime(start);
  const multiDay = dayCount != null && dayCount > 1;
  const label = boatLabel(job);
  const customer = paperwork ? undefined : job.customers?.name?.trim() || undefined;
  // Paperwork blocks have no client — show the per-day place instead (or nothing).
  // Service rows: unscheduled + no client prompts that tapping opens the
  // assign/edit drawer; scheduled rows keep the plain "No client" fallback.
  const customerLine = paperwork
    ? place ?? undefined
    : customer ?? (scheduled ? "No client" : "No client — tap to assign");
  // Both scheduled rows and unscheduled rows open the existing JobEditDrawer
  // (the portal's only scheduling/editing surface). For unscheduled rows this
  // is the "Schedule" action; for scheduled rows it's "open / reschedule".
  const href = `/portal/marine-tech?job=${job.id}${monthQs}`;

  return (
    <li className="flex items-stretch transition-colors hover:bg-bg-card-hover">
      <Link
        href={href}
        scroll={false}
        prefetch={false}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            paperwork ? "bg-gold" : STATUS_DOT[job.status] ?? "bg-slate-400"
          }`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            {scheduled && time && <span className="tabular-nums text-gold">{time}</span>}
            <span className="truncate">{label}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate text-xs text-text-secondary">
            <span className="truncate">
              {customerLine}
              {multiDay ? ` · Day ${dayIndex} of ${dayCount}` : ""}
            </span>
            {/* Per-day place. Paperwork already shows the place as its main line. */}
            {!paperwork && place && (
              <span className="inline-flex shrink-0 items-center gap-0.5 text-gold/80">
                <MapPin className="h-3 w-3" aria-hidden />
                <span className="truncate">{place}</span>
              </span>
            )}
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            scheduled
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-amber-500/15 text-amber-300"
          }`}
        >
          {scheduled ? (
            <>
              <Calendar className="h-2.5 w-2.5" aria-hidden /> On calendar
            </>
          ) : (
            <>
              <AlertCircle className="h-2.5 w-2.5" aria-hidden /> Unscheduled
            </>
          )}
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden />
      </Link>

      {!scheduled && (
        <Link
          href={href}
          scroll={false}
          prefetch={false}
          className="flex items-center self-stretch border-l border-border bg-gold px-3 text-xs font-semibold text-bg-primary transition-colors hover:bg-gold-hover"
        >
          Schedule
        </Link>
      )}
    </li>
  );
}
