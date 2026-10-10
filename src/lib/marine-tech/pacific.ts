// Marine Tech jobs are scheduled in Pacific time, but the portal renders on
// Cloudflare (UTC). Slicing a timestamptz (`iso.slice(0, 10)`) gives the UTC
// day, which is the NEXT day for anything at/after 5 PM PDT (4 PM PST) — and
// mobile stores every multi-day end at 17:00 Pacific, so every multi-day job
// rendered one day too long. These helpers pin the zone explicitly.

export const MARINE_TECH_TZ = "America/Los_Angeles";

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: MARINE_TECH_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: MARINE_TECH_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** The Pacific calendar day ('yyyy-MM-dd') of a timestamptz string. */
export function pacificDay(iso: string): string {
  return dayFmt.format(new Date(iso));
}

/** Pacific wall-clock hour and minute of a timestamptz string. */
export function pacificTime(iso: string): { hour: number; minute: number } {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { hour: Number(p.hour), minute: Number(p.minute) };
}

/** Offset (ms) of Pacific time from UTC at a given instant (negative, e.g. -7h). */
function offsetAt(ms: number): number {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** UTC ISO string for a Pacific wall-clock time on a 'yyyy-MM-dd' day (DST-aware). */
export function pacificWallToUtc(day: string, hour: number, minute: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  let ms = guess - offsetAt(guess);
  ms = guess - offsetAt(ms); // second pass settles DST-boundary days
  return new Date(ms).toISOString();
}
