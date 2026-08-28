import { describe, it, expect } from "vitest";

import {
  runSanityChecks,
  isSiteBrandName,
  hostBrandTokens,
  maxPlausibleSpeed,
  speedIsEnginePower,
} from "@/lib/scrape-sanity";
import { comparePrice } from "@/lib/yacht-catalog";

/**
 * These lock down the rule the comparison card depends on: never show a number
 * the page did not actually support. Every case here is a real failure that
 * reached a card, or the near-miss version of one.
 *
 * The concrete incident: a 2002 Christensen 145' Tri-Deck on yachtway.com came
 * back named "YachtWay", dated 2026, doing 80 knots, with 24 engine hours —
 * and shipped with an empty `flags` array, so the card showed no warning.
 */

const CURRENT_YEAR = new Date().getFullYear();

/** A result shaped like the scraper's output, with everything unset. */
function draft(over: Record<string, unknown> = {}) {
  return {
    name: "Some Boat",
    builder: null,
    model: null,
    type: null,
    year: null,
    price: null,
    priceNum: null,
    lengthFt: null,
    lengthM: null,
    beamFt: null,
    beamM: null,
    maxSpeed: null,
    cabins: null,
    guests: null,
    range: null,
    engine: null,
    engineHours: null,
    location: null,
    imageUrl: null,
    source: "Listing",
    url: "https://example.com/x",
    flags: [],
    confidence: "medium",
    ...over,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const ctx = (over: Record<string, unknown> = {}) => ({
  inferredLengthFt: null,
  urlLengthFt: null,
  urlYear: null,
  host: null,
  pageTitle: null,
  sourceUrl: null,
  ...over,
});

describe("hostBrandTokens", () => {
  it("pulls the brand label out of a hostname", () => {
    expect(hostBrandTokens("yachtway.com")).toContain("yachtway");
    expect(hostBrandTokens("www.boattrader.com")).toContain("boattrader");
  });

  it("drops generic suffixes and www", () => {
    expect(hostBrandTokens("www.example.co.uk")).toEqual(["example"]);
  });

  it("is empty for a missing host", () => {
    expect(hostBrandTokens(null)).toEqual([]);
  });
});

describe("isSiteBrandName", () => {
  it("catches the exact YachtWay regression", () => {
    expect(isSiteBrandName("YachtWay", "yachtway.com")).toBe(true);
  });

  it("matches regardless of case and punctuation", () => {
    expect(isSiteBrandName("yacht-way", "yachtway.com")).toBe(true);
    expect(isSiteBrandName("Boat Trader", "www.boattrader.com")).toBe(true);
  });

  it("leaves a real vessel name alone", () => {
    expect(isSiteBrandName("I Love This Boat", "yachtway.com")).toBe(false);
    expect(isSiteBrandName("2026 Riva 82' Diva", "yachtworld.com")).toBe(false);
  });
});

describe("maxPlausibleSpeed", () => {
  it("scales the ceiling down as hulls get longer", () => {
    expect(maxPlausibleSpeed(40)).toBeGreaterThan(maxPlausibleSpeed(100));
    expect(maxPlausibleSpeed(145)).toBeLessThan(50);
  });
});

describe("speedIsEnginePower", () => {
  it("catches horsepower reappearing as top speed", () => {
    expect(speedIsEnginePower(56, "1x Yanmar 4JH4E 56hp")).toBe(true);
    expect(speedIsEnginePower(600, "Triple Mercury Verado 600 V12 600 HP")).toBe(true);
  });

  it("leaves a genuine speed alone", () => {
    expect(speedIsEnginePower(32, "Twin MAN V12-1900 (2 x 1900 HP)")).toBe(false);
    expect(speedIsEnginePower(18, null)).toBe(false);
  });
});

describe("maxPlausibleSpeed — sail", () => {
  it("holds a sailing yacht to hull speed", () => {
    expect(maxPlausibleSpeed(44, "Sailing Yacht")).toBeLessThanOrEqual(20);
    expect(maxPlausibleSpeed(44, "Sloop")).toBeLessThanOrEqual(20);
  });

  it("still allows a fast planing powerboat", () => {
    expect(maxPlausibleSpeed(42, "Center Console")).toBeGreaterThan(50);
  });
});

describe("runSanityChecks — the Hunter 44 incident", () => {
  it("discards 56 knots that is really the Yanmar's 56hp", () => {
    const out = runSanityChecks(
      draft({
        name: '2007 Hunter 44 Deck Salon "Whitehawk"',
        builder: "Hunter",
        type: "Sailing Yacht",
        year: 2007,
        lengthFt: 43.17,
        priceNum: 149000,
        engine: "1x Yanmar 4JH4E 56hp",
        maxSpeed: 56,
        location: "Seattle, WA",
      }),
      ctx(),
    );
    expect(out.maxSpeed).toBeNull();
    expect(out.flags.join(" ")).toMatch(/horsepower/);
    expect(out.confidence).not.toBe("high");
  });

  it("keeps a real sailing speed", () => {
    const out = runSanityChecks(
      draft({ type: "Sailing Yacht", lengthFt: 44, maxSpeed: 8, engine: "1x Yanmar 4JH4E 56hp" }),
      ctx(),
    );
    expect(out.maxSpeed).toBe(8);
  });

  it("keeps a fast center console at its real speed", () => {
    const out = runSanityChecks(
      draft({
        type: "Center Console",
        lengthFt: 41.58,
        maxSpeed: 57,
        engine: "Triple Mercury Verado 600 V12",
      }),
      ctx(),
    );
    expect(out.maxSpeed).toBe(57);
  });
});

describe("runSanityChecks — the YachtWay incident", () => {
  it("replaces the site name with the vessel description and flags it", () => {
    const out = runSanityChecks(
      draft({ name: "YachtWay", builder: "Christensen", model: "145 Tri-Deck", year: 2002 }),
      ctx({ host: "yachtway.com" }),
    );
    expect(out.name).toBe("2002 Christensen 145 Tri-Deck");
    expect(out.flags.join(" ")).toMatch(/website's own name/);
  });

  it("discards 80 knots on a 145 ft hull", () => {
    const out = runSanityChecks(
      draft({ lengthFt: 145, maxSpeed: 80 }),
      ctx(),
    );
    expect(out.maxSpeed).toBeNull();
    expect(out.flags.join(" ")).toMatch(/maxSpeed/);
  });

  it("keeps a fast speed that suits a small hull", () => {
    const out = runSanityChecks(draft({ lengthFt: 38, maxSpeed: 55 }), ctx());
    expect(out.maxSpeed).toBe(55);
  });

  it("discards a current-year copyright date masquerading as a model year", () => {
    const out = runSanityChecks(
      draft({ year: CURRENT_YEAR }),
      ctx({ host: "yachtway.com", pageTitle: "Christensen 145' Tri-Deck", sourceUrl: "https://yachtway.com/models/christensen-145-tri-deck/" }),
    );
    expect(out.year).toBeNull();
    expect(out.flags.join(" ")).toMatch(/copyright/);
  });

  it("keeps a current model year when the title corroborates it", () => {
    const out = runSanityChecks(
      draft({ year: CURRENT_YEAR }),
      ctx({ pageTitle: `${CURRENT_YEAR} Riva 82' Diva` }),
    );
    expect(out.year).toBe(CURRENT_YEAR);
  });

  it("keeps a historical year without needing corroboration", () => {
    const out = runSanityChecks(draft({ year: 2002 }), ctx());
    expect(out.year).toBe(2002);
  });

  it("discards 24 engine hours on a two-decade-old hull", () => {
    const out = runSanityChecks(draft({ year: 2002, engineHours: 24 }), ctx());
    expect(out.engineHours).toBeNull();
    expect(out.flags.join(" ")).toMatch(/engineHours/);
  });

  it("keeps low hours on a nearly new boat", () => {
    const out = runSanityChecks(
      draft({ year: CURRENT_YEAR, engineHours: 49 }),
      ctx({ pageTitle: String(CURRENT_YEAR) }),
    );
    expect(out.engineHours).toBe(49);
  });

  it("drops isolated junk numbers when the page is not a real listing", () => {
    // The exact shape the YachtWay model page produced: no length, no price,
    // no year, but a stray 80 kn and 24 hrs picked up from unrelated copy.
    const out = runSanityChecks(
      draft({ name: "YachtWay", maxSpeed: 80, engineHours: 24, cabins: 6 }),
      ctx({ host: "yachtway.com" }),
    );
    expect(out.maxSpeed).toBeNull();
    expect(out.engineHours).toBeNull();
    expect(out.cabins).toBeNull();
    expect(out.name).toBe("Unknown listing");
    expect(out.flags.join(" ")).toMatch(/did not read as a single vessel listing/);
  });

  it("does not rebuild a name out of a year it just rejected", () => {
    const out = runSanityChecks(
      draft({ name: "YachtWay", year: CURRENT_YEAR }),
      ctx({ host: "yachtway.com" }),
    );
    expect(out.year).toBeNull();
    expect(out.name).not.toBe(String(CURRENT_YEAR));
    expect(out.name).toBe("Unknown listing");
  });

  it("caps speed even when the length is unknown", () => {
    const out = runSanityChecks(draft({ priceNum: 100000, maxSpeed: 80 }), ctx());
    expect(out.maxSpeed).toBeNull();
  });

  it("never returns low confidence with an empty flags array", () => {
    // A page that yielded almost nothing used to come back low/[] and render
    // as though it were fine.
    const out = runSanityChecks(draft({}), ctx());
    expect(out.confidence).toBe("low");
    expect(out.flags.length).toBeGreaterThan(0);
  });

  it("flags an estimated price instead of passing it off as the asking price", () => {
    const out = runSanityChecks(
      draft({
        name: "Benetti Oasis 40m",
        year: 2022,
        lengthFt: 131.2,
        price: "~$1,742,000 (estimated)",
        priceNum: 1742000,
        engine: "2x MTU 16V 4000",
        location: "Italy",
        maxSpeed: 17,
      }),
      ctx(),
    );
    expect(out.flags.join(" ")).toMatch(/our own estimate/);
    expect(out.confidence).not.toBe("high");
  });

  it("leaves a well-read listing untouched and confident", () => {
    const out = runSanityChecks(
      draft({
        name: "I Love This Boat",
        builder: "Christensen",
        year: 2002,
        lengthFt: 145,
        beamFt: 27,
        priceNum: 8900000,
        engine: "Twin Caterpillar 3512B",
        engineHours: 4350,
        location: "Fort Lauderdale, Florida",
        maxSpeed: 18,
      }),
      ctx({ host: "yachtway.com" }),
    );
    expect(out.flags).toEqual([]);
    expect(out.confidence).toBe("high");
    expect(out.name).toBe("I Love This Boat");
    expect(out.maxSpeed).toBe(18);
  });
});

describe("comparePrice — the double-(lower) bug", () => {
  it("names only the genuinely cheaper boat", () => {
    expect(comparePrice(149000, 849000)).toBe("a");
    expect(comparePrice(849000, 149000)).toBe("b");
  });

  it("declines to pick a winner when a price is missing", () => {
    // Missing prices are stored as 0; a plain compare made them "cheapest".
    expect(comparePrice(0, 849000)).toBe("tie");
    expect(comparePrice(849000, 0)).toBe("tie");
  });

  it("is a tie on equal prices", () => {
    expect(comparePrice(500000, 500000)).toBe("tie");
  });
});
