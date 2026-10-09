import { describe, expect, it } from "vitest";
import { buildReplyState, decideReplyPatch, type ReplyAnswers } from "./reply-triage";

const NOW = new Date("2026-10-08T20:00:00Z");
const ans = (cls: ReplyAnswers["reply_class"]["choice"], conf = 0.95, hot = 0.1, needs = 0.1): ReplyAnswers => ({
  reply_class: { choice: cls, confidence: conf, probabilities: { [cls]: conf } },
  hot: { noul: hot },
  needs_reply: { noul: needs },
});

describe("decideReplyPatch", () => {
  it("broker but open → replied + hot, never broker_dead", () => {
    const p = decideReplyPatch(ans("broker_but_open", 0.9, 0.85, 0.3), { stage: "broker_dead" }, NOW);
    expect(p.stage).toBe("replied");
    expect(p.is_hot).toBe(true);
    expect(p.is_broker_listed).toBe(false);
    expect(p.next_touch_at).toBe("2026-10-15T20:00:00.000Z");
  });
  it("plain broker listing → broker_dead", () => {
    const p = decideReplyPatch(ans("broker_listed"), { stage: "opener_sent" }, NOW);
    expect(p.stage).toBe("broker_dead");
    expect(p.closed_reason).toBe("broker");
  });
  it("interested after pitch → pitch_replied", () => {
    const p = decideReplyPatch(ans("interested", 0.8, 0.9, 0.9), { stage: "pitch_sent" }, NOW);
    expect(p.stage).toBe("pitch_replied");
    expect(p.is_hot).toBe(true);
  });
  it("low confidence only flags for review and records the judgment", () => {
    const p = decideReplyPatch(ans("broker_listed", 0.55), { stage: "opener_sent" }, NOW);
    expect(p.stage).toBeUndefined();
    expect(p.touch_reason).toMatch(/AI unsure/);
    expect(p.reply_class).toBe("broker_listed");
    expect(p.reply_class_confidence).toBe(0.55);
  });
  it("uncertain class with a hot signal still flags hot", () => {
    const p = decideReplyPatch(ans("interested", 0.46, 0.73, 0.5), { stage: "pitch_sent" }, NOW);
    expect(p.stage).toBeUndefined();
    expect(p.is_hot).toBe(true);
    expect(p.touch_reason).toMatch(/looks hot/);
  });
  it("never moves a negotiating lead backwards", () => {
    const p = decideReplyPatch(ans("not_interested", 0.9), { stage: "negotiating" }, NOW);
    expect(p.stage).toBeUndefined();
    expect(p.closed_reason).toBeUndefined();
  });
  it("sold → dead/sold_elsewhere", () => {
    const p = decideReplyPatch(ans("sold_or_unavailable"), { stage: "replied" }, NOW);
    expect(p.stage).toBe("dead");
    expect(p.closed_reason).toBe("sold_elsewhere");
  });
});

describe("buildReplyState", () => {
  it("keeps the last 8 thread messages and labels speakers", () => {
    const thread = Array.from({ length: 10 }, (_, i) => ({ direction: (i % 2 ? "in" : "out") as "in" | "out", step: null, body: `m${i}` }));
    const s = buildReplyState({ title: "Boat", stage: "opener_sent" }, thread, "yes");
    expect(s.thread).toHaveLength(8);
    expect(s.thread[0].text).toBe("m2");
    expect(s.thread[1].from).toBe("seller");
    expect(s.reply.text).toBe("yes");
  });
});
