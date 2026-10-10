import { expect, it } from "vitest";
import { drawerSchedule } from "./drawer-schedule";

// A job the tech set for Wed Oct 14, 9:00–11:00 AM PDT.
const start = "2026-10-14T16:00:00.000Z";
const end = "2026-10-14T18:00:00.000Z";

it("a status-only save keeps the tech's real time (was rewritten to 5 AM)", () => {
  expect(drawerSchedule("2026-10-14", "2026-10-14", start, end)).toEqual({
    scheduled_start: start,
    scheduled_end: end,
  });
});

it("moving the day keeps the time of day and duration", () => {
  expect(drawerSchedule("2026-10-20", "2026-10-20", start, end)).toEqual({
    scheduled_start: "2026-10-20T16:00:00.000Z",
    scheduled_end: "2026-10-20T18:00:00.000Z",
  });
});

it("a newly scheduled job defaults to 9 AM Pacific for an hour", () => {
  expect(drawerSchedule("2026-12-01", null, null, null)).toEqual({
    scheduled_start: "2026-12-01T17:00:00.000Z",
    scheduled_end: "2026-12-01T18:00:00.000Z",
  });
});

it("a multi-day span ends at 5 PM Pacific on its last day", () => {
  expect(drawerSchedule("2026-10-14", "2026-10-16", start, end).scheduled_end).toBe("2026-10-17T00:00:00.000Z");
});

it("an untouched mobile multi-day job is left exactly as stored", () => {
  const mEnd = "2026-10-16T00:00:00.000Z"; // 5 PM PDT Oct 15
  expect(drawerSchedule("2026-10-13", "2026-10-15", "2026-10-13T16:00:00.000Z", mEnd)).toEqual({
    scheduled_start: "2026-10-13T16:00:00.000Z",
    scheduled_end: mEnd,
  });
});

it("clearing the date unschedules", () => {
  expect(drawerSchedule(null, null, start, end)).toEqual({ scheduled_start: null, scheduled_end: null });
});
