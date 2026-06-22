"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

// Iterate the inclusive day span [start, end] as 'YYYY-MM-DD' strings, in UTC
// to match the rest of the calendar's day math (spans.ts). Capped so a bad end
// date can't spin the loop.
const MAX_SPAN_DAYS = 60;
function spanDays(start: string, end: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return [];
  }
  if (end <= start) return [];
  const out: string[] = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (isNaN(cur.getTime()) || isNaN(last.getTime())) return [];
  let guard = 0;
  while (cur <= last && guard < MAX_SPAN_DAYS) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard += 1;
  }
  return out;
}

function labelFor(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (isNaN(d.getTime())) return day;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Per-day location editor. Renders one place input per day across the span the
 * operator has chosen (start..end, inclusive) and submits them as
 * `day_loc__<YYYY-MM-DD>` form fields — the server action collects these into
 * the job's `day_locations` jsonb. Only shows when end date is after start date.
 *
 * It watches the drawer's `scheduled_date` / `scheduled_end_date` date inputs
 * (rendered by DateFieldWithCalendar) so the list stays in sync as the operator
 * changes the schedule in the same session.
 */
export function PerDayLocations({
  startName = "scheduled_date",
  endName = "scheduled_end_date",
  initialStart,
  initialEnd,
  initialDayLocations,
  fallbackPlace,
}: {
  startName?: string;
  endName?: string;
  initialStart: string;
  initialEnd: string;
  initialDayLocations?: Record<string, string> | null;
  /** Marina/override place, shown as the placeholder when a day has no entry. */
  fallbackPlace?: string | null;
}) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  // Poll the sibling date inputs. They're independent client islands
  // (DateFieldWithCalendar) so there's no shared React state to subscribe to;
  // reading their values keeps this list reactive without a parent refactor.
  useEffect(() => {
    const startEl = document.querySelector<HTMLInputElement>(
      `input[name="${startName}"]`,
    );
    const endEl = document.querySelector<HTMLInputElement>(
      `input[name="${endName}"]`,
    );
    function sync() {
      if (startEl) setStart(startEl.value);
      if (endEl) setEnd(endEl.value);
    }
    sync();
    const id = window.setInterval(sync, 300);
    startEl?.addEventListener("change", sync);
    endEl?.addEventListener("change", sync);
    return () => {
      window.clearInterval(id);
      startEl?.removeEventListener("change", sync);
      endEl?.removeEventListener("change", sync);
    };
  }, [startName, endName]);

  const days = spanDays(start, end);
  if (days.length === 0) return null;

  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-text-secondary">
        Location per day
      </label>
      <p className="mt-0.5 text-[11px] text-text-secondary/70">
        Leave a day blank to use {fallbackPlace ? `“${fallbackPlace}”` : "the job's marina"}.
      </p>
      <div className="mt-2 space-y-2">
        {days.map((day) => (
          <div key={day} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-text-secondary">
              {labelFor(day)}
            </span>
            <div className="relative flex-1">
              <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary/60" />
              <input
                type="text"
                name={`day_loc__${day}`}
                defaultValue={initialDayLocations?.[day] ?? ""}
                placeholder={fallbackPlace ?? "Place for this day"}
                className="w-full rounded-lg border border-border bg-bg-primary py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-gold focus:outline-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
