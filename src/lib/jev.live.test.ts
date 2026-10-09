/**
 * Live Jev checks — skipped unless JEV_LIVE=1 and TYPESAFE_API_KEY are set.
 *   JEV_LIVE=1 TYPESAFE_API_KEY=... npx vitest run src/lib/jev.live.test.ts
 */
import { describe, expect, it } from "vitest";
import { jev } from "./jev";
import { buildReplyQuestions, buildReplyState, decideReplyPatch, type ReplyAnswers } from "./reply-triage";
import { applyVerification, buildVerifyQuestions, buildVerifyState } from "./scrape-verify";

const live = process.env.JEV_LIVE === "1" && Boolean(process.env.TYPESAFE_API_KEY);

describe.skipIf(!live)("Jev live", () => {
  const thread = [{ direction: "out" as const, step: "Opener", body: "Is this a broker listing?" }];
  const lead = { title: "1990 Hatteras 65 Convertible", ask_label: "$395,000", stage: "opener_sent" };

  it("unhappy-with-broker reply is broker_but_open and hot, not broker_dead", async () => {
    const reply = "Listed with a broker. Unhappy with broker. Contract ends in November";
    const r = await jev(buildReplyState(lead, thread, reply), buildReplyQuestions(), "live");
    expect(r).not.toBeNull();
    const a = r!.answers as unknown as ReplyAnswers;
    console.log("reply1", a.reply_class.choice, a.reply_class.confidence, "hot", a.hot.noul, "needs", a.needs_reply.noul);
    const patch = decideReplyPatch(a, lead);
    expect(patch.stage).toBe("replied");
    expect(patch.is_hot).toBe(true);
  });

  it("bare 'yes' to the opener is broker_listed", async () => {
    const r = await jev(buildReplyState(lead, thread, "Yes"), buildReplyQuestions(), "live");
    const a = r!.answers as unknown as ReplyAnswers;
    console.log("reply2", a.reply_class.choice, a.reply_class.confidence);
    expect(decideReplyPatch(a, lead).stage).toBe("broker_dead");
  });

  it("'Net 200k river moorage. Sending contract.' after pitch is interested", async () => {
    const t2 = [...thread, { direction: "in" as const, step: "Reply", body: "No" }, { direction: "out" as const, step: "Pitch", body: "Solid boat. Are you firm on price or open to the right buyer? I'm with Jeff Brown Yachts & GrayYachts." }];
    const l2 = { ...lead, stage: "pitch_sent" };
    const r = await jev(buildReplyState(l2, t2, "Net 200k river moorage. Sending contract. Follow up in a week."), buildReplyQuestions(), "live");
    const a = r!.answers as unknown as ReplyAnswers;
    console.log("reply3", a.reply_class.choice, a.reply_class.confidence, "hot", a.hot.noul);
    const patch = decideReplyPatch(a, l2);
    // Either confidently interested, or flagged for review with the hot signal surfaced.
    if (a.reply_class.confidence >= 0.7) expect(patch.stage).toBe("pitch_replied");
    else expect(patch.touch_reason).toMatch(/Review reply/);
    expect(patch.is_hot).toBe(true);
  });

  it("verification catches a wrong builder against real page text", async () => {
    const page = `2008 Christensen 157 Tri-Deck Motor Yacht for sale. LOA 157 ft (47.85 m). Beam 29 ft 6 in. Draft 8 ft.
      Twin Caterpillar 3512B diesels, 2,250 hp each. Cruising speed 12 knots, max speed 16 knots. Range 4,000 nm at 10 knots.
      Five staterooms accommodate ten guests, plus crew quarters for eleven. Built by Christensen Shipyards, Vancouver, Washington.
      Asking price $19,900,000. Lying Fort Lauderdale, Florida.`;
    const wrong = { name: "Benetti Classic 120", builder: "Benetti", model: "Classic 120", year: 2008, lengthFt: 157, beamFt: 29.5, maxSpeed: 25, cabins: 5, engine: "2x CAT 3512B", range: 4000 };
    const r = await jev(buildVerifyState(wrong, page, "2008 Christensen 157", "https://example.com/x"), buildVerifyQuestions(wrong), "live-verify");
    const out = applyVerification(wrong, r!.answers as Parameters<typeof applyVerification>[1]);
    console.log("verify", JSON.stringify(out.verdicts), out.flags);
    expect(out.identityContradicted).toBe(true);
    expect(out.record.builder).toBeNull();
    expect(out.verdicts.max_speed_kn).toBe("contradicted");
    expect(out.verdicts.length_ft).toBe("supported");
    expect(out.record.maxSpeed).toBeNull();
  });
});
