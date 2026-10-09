import { describe, expect, it } from "vitest";
import { applyVerification, buildVerifyQuestions, trimPageText, PAGE_TEXT_LIMIT, type VerifiableRecord } from "./scrape-verify";

const base: VerifiableRecord = {
  name: "2008 Christensen 157", builder: "Christensen", model: "157", year: 2008,
  lengthFt: 157, beamFt: 29.5, maxSpeed: 16, cabins: 5, engine: "2x CAT 3512B", range: 4000,
};

describe("buildVerifyQuestions", () => {
  it("asks only about present fields, identity always", () => {
    const q = buildVerifyQuestions({ ...base, beamFt: null, range: null, cabins: null });
    expect(Object.keys(q).sort()).toEqual(["engine", "identity", "length_ft", "max_speed_kn", "year"].sort());
  });
});

describe("applyVerification", () => {
  it("drops builder/model/name when the page is about a different boat", () => {
    const r = applyVerification({ ...base, builder: "Benetti", model: "Classic 120", name: "Benetti Classic 120" }, {
      identity: { choice: "contradicted", confidence: 0.95 },
    });
    expect(r.identityContradicted).toBe(true);
    expect(r.record.builder).toBeNull();
    expect(r.record.model).toBeNull();
    expect(r.flags[0]).toMatch(/identity/);
  });
  it("nulls a contradicted spec and keeps a supported one", () => {
    const r = applyVerification(base, {
      identity: { choice: "supported", confidence: 0.9 },
      beam_ft: { choice: "contradicted", confidence: 0.9 },
      length_ft: { choice: "supported", confidence: 0.9 },
    });
    expect(r.record.beamFt).toBeNull();
    expect(r.record.lengthFt).toBe(157);
    expect(r.flags).toHaveLength(1);
    expect(r.flags[0]).toMatch(/^beam:/);
  });
  it("flags silent fields as unconfirmed but keeps the value", () => {
    const r = applyVerification(base, { identity: { choice: "supported", confidence: 0.9 }, range_nm: { choice: "silent", confidence: 0.8 } });
    expect(r.record.range).toBe(4000);
    expect(r.flags[0]).toMatch(/range: 4000 is not stated/);
  });
  it("treats a low-confidence contradiction as unconfirmed, not dropped", () => {
    const r = applyVerification(base, { identity: { choice: "contradicted", confidence: 0.5 }, cabins: { choice: "contradicted", confidence: 0.55 } });
    expect(r.identityContradicted).toBe(false);
    expect(r.record.cabins).toBe(5);
    expect(r.flags[0]).toMatch(/unconfirmed/);
  });
});

describe("trimPageText", () => {
  it("collapses whitespace and caps length", () => {
    expect(trimPageText("a   b\n\n c")).toBe("a b c");
    expect(trimPageText("x".repeat(PAGE_TEXT_LIMIT + 500))).toHaveLength(PAGE_TEXT_LIMIT);
  });
});
