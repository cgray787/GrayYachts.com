import type { CalendarJob } from "@/components/portal/MarineTechCalendar";

/** Hard cap so a bad/huge scheduled_end_date can never spin the day loop. */
const MAX_SPAN_DAYS = 60;

/**
 * The job's start day as 'yyyy-MM-dd'. Prefers the new timestamptz
 * `scheduled_start` (what the Marine Tech App writes), falling back to the
 * legacy `scheduled_date` (what the portal's own edit drawer writes). Returns
 * null when the job is unscheduled in both worlds.
 */
export function jobStartDay(job: CalendarJob): string | null {
  if (job.scheduled_start) return job.scheduled_start.slice(0, 10);
  return job.scheduled_date ?? null;
}

/**
 * The job's end day as 'yyyy-MM-dd'. Prefers `scheduled_end` (timestamptz),
 * then the legacy `scheduled_end_date`. Returns null when there is no explicit
 * end (caller treats that as a single-day job).
 */
export function jobEndDay(job: CalendarJob): string | null {
  if (job.scheduled_end) return job.scheduled_end.slice(0, 10);
  return job.scheduled_end_date ?? null;
}

/**
 * Every calendar day (yyyy-MM-dd) a job occupies.
 * Span = the start day → end day (inclusive). A job with no end day (or an end
 * <= start) is a single day. Unscheduled jobs return [].
 *
 * Day strings are sliced/iterated in UTC to match how the rest of the calendar
 * helpers derive the day (start.slice(0,10)), so the spanning bar, the markers,
 * and the day lists all agree. Mirrors marine-tech-app/lib/calendar/spans.ts,
 * adapted to the portal's snake_case CalendarJob shape.
 */
export function jobDays(job: CalendarJob): string[] {
  const start = jobStartDay(job);
  if (!start) return [];
  const rawEnd = jobEndDay(job);
  const end = rawEnd && rawEnd > start ? rawEnd : start;
  if (end === start) return [start];

  const days: string[] = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (isNaN(cur.getTime()) || isNaN(last.getTime())) return [start];
  let guard = 0;
  while (cur <= last && guard < MAX_SPAN_DAYS) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard += 1;
  }
  return days;
}

export type DayJob = CalendarJob & { dayIndex: number; dayCount: number };

/**
 * Jobs occurring on a given day (yyyy-MM-dd), including multi-day jobs that span
 * through it. Each is annotated with dayIndex/dayCount ("Day N of M"). Sorted by
 * start (timestamptz first, then legacy date).
 */
export function jobsForDay(jobs: CalendarJob[], day: string): DayJob[] {
  const out: DayJob[] = [];
  for (const j of jobs) {
    const days = jobDays(j);
    const idx = days.indexOf(day);
    if (idx === -1) continue;
    out.push({ ...j, dayIndex: idx + 1, dayCount: days.length });
  }
  out.sort((a, b) => (sortKey(a)).localeCompare(sortKey(b)));
  return out;
}

/**
 * Distinct scheduled jobs whose span intersects [weekStartDay, weekEndDay]
 * (both yyyy-MM-dd, inclusive). Each job appears once. Sorted by start.
 */
export function jobsForWeek(
  jobs: CalendarJob[],
  weekStartDay: string,
  weekEndDay: string,
): CalendarJob[] {
  return jobs
    .filter((j) => {
      const days = jobDays(j);
      if (days.length === 0) return false;
      // intersect: job's first day <= week end AND job's last day >= week start
      return days[0] <= weekEndDay && days[days.length - 1] >= weekStartDay;
    })
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

/** Sort by timestamptz start when present, else the legacy date, else ''. */
function sortKey(j: CalendarJob): string {
  return j.scheduled_start ?? j.scheduled_date ?? "";
}
