import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarJob = {
  id: string;
  status: string;
  scheduled_date: string | null;          // legacy 'date' column
  scheduled_end_date?: string | null;     // legacy multi-day end
  scheduled_start?: string | null;        // new 'timestamptz' column written by Marine Tech App
  scheduled_end?: string | null;          // new 'timestamptz' end
  customers: { name: string | null } | null;
  boats: { name: string | null; make: string | null; model: string | null } | null;
};

// Prefer the new timestamptz columns when present; fall back to the legacy
// date columns. The portal calendar grid is date-resolution so we just need
// 'YYYY-MM-DD' for whichever column was populated.
function dateFromJob(j: CalendarJob, kind: "start" | "end"): string | null {
  if (kind === "start") {
    if (j.scheduled_start) return j.scheduled_start.slice(0, 10);
    return j.scheduled_date ?? null;
  }
  if (j.scheduled_end) return j.scheduled_end.slice(0, 10);
  return j.scheduled_end_date ?? null;
}

const STATUS_BAR: Record<string, string> = {
  new: "bg-blue-500/25 border-blue-400/50 text-blue-100 hover:bg-blue-500/35",
  in_progress: "bg-amber-500/25 border-amber-400/50 text-amber-100 hover:bg-amber-500/35",
  completed: "bg-emerald-500/25 border-emerald-400/50 text-emerald-100 hover:bg-emerald-500/35",
};

const STATUS_DOT: Record<string, string> = {
  new: "bg-blue-400",
  in_progress: "bg-amber-400",
  completed: "bg-emerald-400",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}

function parseMonth(value: string | undefined): { year: number; month0: number } {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    if (y >= 1970 && m >= 1 && m <= 12) return { year: y, month0: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month0: now.getMonth() };
}

function formatMonth(year: number, month0: number): string {
  return `${year}-${pad2(month0 + 1)}`;
}

function shiftMonth(year: number, month0: number, delta: number) {
  const d = new Date(year, month0 + delta, 1);
  return { year: d.getFullYear(), month0: d.getMonth() };
}

function boatLabel(j: CalendarJob): string {
  return (
    j.boats?.name ||
    [j.boats?.make, j.boats?.model].filter(Boolean).join(" ") ||
    j.customers?.name ||
    "Job"
  );
}

export function buildMonthRange(value: string | undefined): {
  start: string;
  end: string;
  gridStart: string;
  gridEnd: string;
  year: number;
  month0: number;
} {
  const { year, month0 } = parseMonth(value);
  const first = new Date(year, month0, 1);
  const last = new Date(year, month0 + 1, 0);
  const gridStart = new Date(year, month0, 1 - first.getDay());
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);
  return {
    start: toISODate(first),
    end: toISODate(last),
    gridStart: toISODate(gridStart),
    gridEnd: toISODate(gridEnd),
    year,
    month0,
  };
}

type Segment = {
  job: CalendarJob;
  colStart: number;
  colSpan: number;
  startsHere: boolean;
  endsHere: boolean;
  lane: number;
};

function buildWeekSegments(week: Date[], jobs: CalendarJob[]): Segment[] {
  const weekStart = week[0];
  const weekEnd = week[6];
  const segments: Omit<Segment, "lane">[] = [];

  for (const j of jobs) {
    const startStr = dateFromJob(j, "start");
    if (!startStr) continue;
    const start = parseISODate(startStr);
    const endStr = dateFromJob(j, "end");
    const end = endStr ? parseISODate(endStr) : start;
    if (end < weekStart || start > weekEnd) continue;

    const segStart = start < weekStart ? weekStart : start;
    const segEnd = end > weekEnd ? weekEnd : end;
    segments.push({
      job: j,
      colStart: daysBetween(weekStart, segStart) + 1,
      colSpan: daysBetween(segStart, segEnd) + 1,
      startsHere: start >= weekStart,
      endsHere: end <= weekEnd,
    });
  }

  segments.sort((a, b) =>
    a.colStart - b.colStart || b.colSpan - a.colSpan
  );

  const lanes: number[] = [];
  const placed: Segment[] = [];
  for (const seg of segments) {
    let lane = 0;
    while (lane < lanes.length && lanes[lane] >= seg.colStart) lane++;
    if (lane === lanes.length) lanes.push(0);
    lanes[lane] = seg.colStart + seg.colSpan - 1;
    placed.push({ ...seg, lane });
  }
  return placed;
}

export function MarineTechCalendar({
  jobs,
  monthParam,
}: {
  jobs: CalendarJob[];
  monthParam: string | undefined;
}) {
  const { year, month0 } = parseMonth(monthParam);
  const monthKey = formatMonth(year, month0);

  const { gridStart } = buildMonthRange(monthParam);
  const gridStartDate = parseISODate(gridStart);

  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(gridStartDate);
      day.setDate(gridStartDate.getDate() + w * 7 + d);
      row.push(day);
    }
    weeks.push(row);
  }

  const todayISO = toISODate(new Date());
  const prev = shiftMonth(year, month0, -1);
  const next = shiftMonth(year, month0, +1);

  return (
    <div className="rounded-xl border border-border bg-bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
            Schedule
          </h2>
          <p className="text-xs text-text-secondary">
            {jobs.length} job{jobs.length === 1 ? "" : "s"} scheduled in {MONTHS[month0]} {year} · click a job to reschedule
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/portal/marine-tech?month=${formatMonth(prev.year, prev.month0)}`}
            scroll={false}
            aria-label="Previous month"
            className="rounded-lg border border-border bg-bg-primary p-1.5 text-text-secondary transition-colors hover:text-gold"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-[140px] text-center text-sm font-medium text-text-primary">
            {MONTHS[month0]} {year}
          </div>
          <Link
            href={`/portal/marine-tech?month=${formatMonth(next.year, next.month0)}`}
            scroll={false}
            aria-label="Next month"
            className="rounded-lg border border-border bg-bg-primary p-1.5 text-text-secondary transition-colors hover:text-gold"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/portal/marine-tech"
            scroll={false}
            className="ml-1 rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-gold"
          >
            Today
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border text-[11px] uppercase tracking-wide text-text-secondary">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            {d}
          </div>
        ))}
      </div>

      <div>
        {weeks.map((week, wi) => {
          const segments = buildWeekSegments(week, jobs);
          const laneCount = segments.reduce(
            (max, s) => Math.max(max, s.lane + 1),
            0
          );
          const eventsHeight = Math.max(1, laneCount) * 22 + 8;
          return (
            <div
              key={wi}
              className={`relative grid grid-cols-7 ${
                wi < weeks.length - 1 ? "border-b border-border" : ""
              }`}
              style={{ minHeight: `${56 + eventsHeight}px` }}
            >
              {week.map((day, di) => {
                const inMonth = day.getMonth() === month0;
                const iso = toISODate(day);
                const isToday = iso === todayISO;
                return (
                  <div
                    key={di}
                    className={`border-r border-border px-1.5 pb-1.5 pt-1 ${
                      di === 6 ? "border-r-0" : ""
                    } ${inMonth ? "" : "bg-bg-primary/40"}`}
                  >
                    <span
                      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] ${
                        isToday
                          ? "bg-gold font-semibold text-bg-primary"
                          : inMonth
                          ? "text-text-secondary"
                          : "text-text-secondary/40"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}

              <div
                className="pointer-events-none absolute inset-x-0 grid grid-cols-7 gap-y-1 px-1"
                style={{ top: "28px" }}
              >
                {segments.map((seg, si) => {
                  const cls = STATUS_BAR[seg.job.status] ?? "bg-slate-500/25 border-slate-400/40 text-slate-100";
                  const rounded =
                    (seg.startsHere ? "rounded-l-md " : "") +
                    (seg.endsHere ? "rounded-r-md " : "");
                  const label = boatLabel(seg.job);
                  const customer = seg.job.customers?.name;
                  return (
                    <Link
                      key={si}
                      href={`/portal/marine-tech?month=${monthKey}&job=${seg.job.id}`}
                      scroll={false}
                      style={{
                        gridColumnStart: seg.colStart,
                        gridColumnEnd: seg.colStart + seg.colSpan,
                        gridRow: seg.lane + 1,
                      }}
                      className={`pointer-events-auto mx-0.5 flex items-center gap-1 truncate border px-1.5 py-0.5 text-[11px] transition-colors ${cls} ${rounded}`}
                      title={`${label}${customer ? ` · ${customer}` : ""} · ${seg.job.status.replace(
                        "_",
                        " "
                      )}`}
                    >
                      {seg.startsHere && (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            STATUS_DOT[seg.job.status] ?? "bg-slate-300"
                          }`}
                        />
                      )}
                      <span className="truncate">
                        {seg.startsHere ? label : `↳ ${label}`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border p-3 text-[11px] text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400" /> New
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> In Progress
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Completed
        </span>
      </div>
    </div>
  );
}
