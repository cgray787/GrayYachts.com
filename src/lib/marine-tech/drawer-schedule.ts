import { pacificDay, pacificTime, pacificWallToUtc } from "./pacific";

const HOUR = 3_600_000;

/**
 * The scheduled_start / scheduled_end the portal's edit drawer should write.
 *
 * The drawer only edits DAYS. It used to stamp `${day}T12:00Z` / `T13:00Z` on
 * every save — even a status-only change — replacing the tech's real time
 * (9:00 AM became 5:00 AM Pacific, 1 h long) on every surface. Now:
 *  - day unchanged          → the stored timestamps are kept as they are;
 *  - day moved              → same Pacific time of day (9:00 AM if none);
 *  - multi-day end          → 17:00 Pacific on the end day (mobile's convention);
 *  - single-day end         → the old duration if it was ≤ 24 h, else 1 h.
 */
export function drawerSchedule(
  startDay: string | null,
  endDay: string | null,
  oldStart: string | null,
  oldEnd: string | null,
): { scheduled_start: string | null; scheduled_end: string | null } {
  if (!startDay) return { scheduled_start: null, scheduled_end: null };

  let start: string;
  if (oldStart && pacificDay(oldStart) === startDay) {
    start = oldStart;
  } else {
    const t = oldStart ? pacificTime(oldStart) : { hour: 9, minute: 0 };
    start = pacificWallToUtc(startDay, t.hour, t.minute);
  }

  const lastDay = endDay && endDay > startDay ? endDay : startDay;
  let end: string;
  if (oldEnd && start === oldStart && pacificDay(oldEnd) === lastDay) {
    end = oldEnd;
  } else if (lastDay > startDay) {
    end = pacificWallToUtc(lastDay, 17, 0);
  } else {
    const old = oldStart && oldEnd ? Date.parse(oldEnd) - Date.parse(oldStart) : 0;
    const dur = old > 0 && old <= 24 * HOUR ? old : HOUR;
    end = new Date(Date.parse(start) + dur).toISOString();
  }
  return { scheduled_start: start, scheduled_end: end };
}
