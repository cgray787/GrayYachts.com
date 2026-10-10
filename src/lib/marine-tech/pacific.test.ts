import { describe, expect, it } from "vitest";
import { pacificDay, pacificTime, pacificWallToUtc } from "./pacific";
import { jobDays } from "./spans";

describe("pacific helpers (portal renders in UTC)", () => {
  it("gives the Pacific day, not the UTC day, for evening timestamps", () => {
    expect(pacificDay("2026-10-16T00:00:00.000Z")).toBe("2026-10-15"); // 5 PM PDT
    expect(pacificDay("2026-12-16T01:00:00.000Z")).toBe("2026-12-15"); // 5 PM PST
    expect(pacificDay("2026-10-15T16:00:00+00:00")).toBe("2026-10-15"); // 9 AM
  });

  it("converts Pacific wall-clock to UTC across DST", () => {
    expect(pacificWallToUtc("2026-10-14", 9, 0)).toBe("2026-10-14T16:00:00.000Z"); // PDT
    expect(pacificWallToUtc("2026-12-14", 9, 0)).toBe("2026-12-14T17:00:00.000Z"); // PST
    expect(pacificWallToUtc("2026-11-01", 9, 0)).toBe("2026-11-01T17:00:00.000Z"); // fall-back day
    expect(pacificWallToUtc("2026-03-08", 17, 0)).toBe("2026-03-09T00:00:00.000Z"); // spring-forward day
  });

  it("reads Pacific time of day", () => {
    expect(pacificTime("2026-10-14T16:30:00.000Z")).toEqual({ hour: 9, minute: 30 });
  });
});

// Mobile stores a multi-day job's end at 17:00 Pacific on the last day, which
// is the NEXT UTC day. A job scheduled Oct 13–15 rendered as Oct 13–16.
it("spans a mobile multi-day job over exactly its scheduled days", () => {
  const job = {
    id: "j1",
    status: "new",
    scheduled_date: "2026-10-13",
    scheduled_start: "2026-10-13T16:00:00.000Z", // 9 AM PDT Oct 13
    scheduled_end: "2026-10-16T00:00:00.000Z", // 5 PM PDT Oct 15
    scheduled_end_date: "2026-10-15",
  } as never;
  expect(jobDays(job)).toEqual(["2026-10-13", "2026-10-14", "2026-10-15"]);
});
