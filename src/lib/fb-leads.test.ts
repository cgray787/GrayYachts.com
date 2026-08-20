import { describe, it, expect } from "vitest";
import { queuePriority, isServicable, type FbLead } from "./fb-leads";

const lead = (over: Partial<FbLead>): FbLead =>
  ({
    listing_id: "x",
    title: "t",
    ask: 100000,
    ask_label: null,
    location: "Seattle, WA",
    photo: null,
    photo_count: 0,
    url: "u",
    fsbo: null,
    verdict: null,
    delta_pct: null,
    comp_note: null,
    pitch_angle: null,
    confidence: null,
    comp_source: null,
    disqualify_reason: null,
    stage: "opener_sent",
    seller_name: null,
    rank: null,
    note: null,
    opener_sent_at: null,
    reply_at: null,
    reply_text: null,
    pitch_sent_at: null,
    nudge_sent_at: null,
    terms_sent_at: null,
    updated_at: "2026-01-01T00:00:00Z",
    next_touch_at: null,
    touch_reason: null,
    touch_count: 0,
    closed_reason: null,
    ...over,
  }) as FbLead;

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

describe("queuePriority", () => {
  it("ranks a seller who replied above a silent one of equal value", () => {
    const replied = lead({ stage: "replied", next_touch_at: daysAgo(1) });
    const silent = lead({ stage: "opener_sent", next_touch_at: daysAgo(1) });
    expect(queuePriority(replied)).toBeGreaterThan(queuePriority(silent));
  });

  it("ranks a more valuable boat above a cheaper one at the same stage", () => {
    const big = lead({ ask: 750000, next_touch_at: daysAgo(1) });
    const small = lead({ ask: 170000, next_touch_at: daysAgo(1) });
    expect(queuePriority(big)).toBeGreaterThan(queuePriority(small));
  });

  it("ranks a longer-overdue lead above one just due", () => {
    expect(queuePriority(lead({ next_touch_at: daysAgo(10) }))).toBeGreaterThan(
      queuePriority(lead({ next_touch_at: daysAgo(0) })),
    );
  });

  it("gives an unscheduled lead zero, so it never surfaces", () => {
    expect(queuePriority(lead({ next_touch_at: null }))).toBe(0);
  });

  it("does not let a cheap boat outrank a replying seller on overdue-ness alone", () => {
    // A $150k lead 30 days overdue must still sit below a $150k seller who
    // actually replied — engagement is the strongest signal we have.
    const stale = lead({ ask: 150000, next_touch_at: daysAgo(30) });
    const replied = lead({ ask: 150000, stage: "replied", next_touch_at: daysAgo(1) });
    expect(queuePriority(replied)).toBeGreaterThan(queuePriority(stale));
  });
});

describe("isServicable", () => {
  it("accepts a WA boat under 500k", () => {
    expect(isServicable(lead({ location: "Gig Harbor, WA", ask: 239000 }))).toBe(true);
  });

  it("accepts an OR boat under 500k", () => {
    expect(isServicable(lead({ location: "Portland, OR", ask: 180000 }))).toBe(true);
  });

  it("rejects Alaska — cannot be shown, surveyed or sea-trialled from Seattle", () => {
    expect(isServicable(lead({ location: "Ketchikan, AK", ask: 242000 }))).toBe(false);
  });

  it("rejects over 500k — that tier proved broker-saturated", () => {
    expect(isServicable(lead({ location: "Seattle, WA", ask: 650000 }))).toBe(false);
  });

  it("rejects a broker-listed boat wherever it is", () => {
    expect(isServicable(lead({ location: "Seattle, WA", ask: 300000, stage: "broker_dead" }))).toBe(
      false,
    );
  });

  it("does not mistake 'Harbor' or 'Portland' for an Oregon suffix", () => {
    // The substring bug: '%OR%' matched Harbor/Portland and returned more
    // states than there were rows.
    expect(isServicable(lead({ location: "Harbor Springs, MI", ask: 200000 }))).toBe(false);
  });
});
