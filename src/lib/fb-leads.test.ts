import { describe, it, expect } from "vitest";
import {
  dealTerms,
  liveStep,
  messageScript,
  nextAction,
  queuePriority,
  isServicable,
  todaysQueue,
  visibleQueue,
  type FbLead,
} from "./fb-leads";
import { facebookListingId } from "./facebook-marketplace";

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

  it("ranks an explicitly hot lead above an otherwise identical lead", () => {
    const hot = lead({ is_hot: true, next_touch_at: daysAgo(1) });
    const normal = lead({ is_hot: false, next_touch_at: daysAgo(1) });
    expect(queuePriority(hot)).toBeGreaterThan(queuePriority(normal));
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

  it("rejects won and research-disqualified rows from the private-sale queue", () => {
    expect(isServicable(lead({ stage: "won" }))).toBe(false);
    expect(
      isServicable(lead({ disqualify_reason: "Already broker-represented" })),
    ).toBe(false);
  });

  it("rejects an explicitly broker-listed row from the private-sale queue", () => {
    expect(isServicable(lead({ is_broker_listed: true }))).toBe(false);
  });

  it("does not mistake 'Harbor' or 'Portland' for an Oregon suffix", () => {
    // The substring bug: '%OR%' matched Harbor/Portland and returned more
    // states than there were rows.
    expect(isServicable(lead({ location: "Harbor Springs, MI", ask: 200000 }))).toBe(false);
  });
});

describe("messageScript", () => {
  it("leads with the real YachtWorld access advantage instead of a phantom buyer", () => {
    const script = messageScript(lead({ stage: "replied" }));
    const pitch = script.find((step) => step.step === "If private seller")?.body ?? "";

    expect(pitch).toContain("YachtWorld");
    expect(pitch).toContain("professional photo and video");
    expect(pitch).not.toContain("I may have a buyer");
  });

  it("does not inflate the ask or promise that the seller nets the full ask", () => {
    expect(dealTerms(500_000)).toEqual({
      relistAt: 500_000,
      commission: 50_000,
      sellerNets: 450_000,
    });
  });

  it("explains the co-broke structure without making a guaranteed-net promise", () => {
    const terms = messageScript(lead({ ask: 500_000 }))
      .find((step) => step.step === "Terms")?.body ?? "";

    expect(terms).toContain("10% total commission");
    expect(terms).toContain("5% reserved for the buyer's broker");
    expect(terms).not.toContain("your full asking price");
  });

  it("does not jump from an unanswered nudge directly to terms", () => {
    expect(liveStep(lead({ stage: "nudged" }))).toBe(-1);
  });

  it("routes a pitch reply to a personal response instead of replaying the pitch", () => {
    const pitchReply = lead({ stage: "pitch_replied" });
    expect(liveStep(pitchReply)).toBe(-1);
    expect(nextAction(pitchReply)).toContain("personally");
  });
});

describe("todaysQueue", () => {
  it("keeps only due, workable leads and orders the warmest opportunity first", () => {
    const now = new Date("2026-08-20T12:00:00Z").getTime();
    const due = new Date(now - 86_400_000).toISOString();
    const future = new Date(now + 86_400_000).toISOString();
    const leads = [
      lead({ listing_id: "silent", next_touch_at: due }),
      lead({ listing_id: "reply", stage: "replied", next_touch_at: due }),
      lead({ listing_id: "future", next_touch_at: future }),
      lead({ listing_id: "alaska", location: "Juneau, AK", next_touch_at: due }),
      lead({ listing_id: "closed", stage: "dead", next_touch_at: due }),
    ];

    expect(todaysQueue(leads, now).map((item) => item.listing_id)).toEqual([
      "reply",
      "silent",
    ]);
  });

  it("derives from refreshed props while keeping completed cards dismissed", () => {
    const now = new Date("2026-08-20T12:00:00Z").getTime();
    const due = new Date(now - 86_400_000).toISOString();
    const refreshed = [
      lead({ listing_id: "done", next_touch_at: due }),
      lead({ listing_id: "newly-due", next_touch_at: due }),
    ];

    expect(visibleQueue(refreshed, ["done"], now).map((item) => item.listing_id)).toEqual([
      "newly-due",
    ]);
  });
});

describe("facebookListingId", () => {
  it("extracts a Marketplace item id from a pasted Facebook URL", () => {
    expect(
      facebookListingId("https://www.facebook.com/marketplace/item/1229456801958441/?ref=share"),
    ).toBe("1229456801958441");
  });

  it("rejects non-Marketplace Facebook URLs", () => {
    expect(facebookListingId("https://www.facebook.com/messages/t/123")).toBeNull();
  });
});
