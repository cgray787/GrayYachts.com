export interface ScrapedYacht {
  name: string | null;
  builder: string | null;
  model: string | null;
  type: string | null;
  year: number | null;
  price: string | null;
  priceNum: number | null;
  lengthFt: number | null;
  lengthM: number | null;
  beamFt: number | null;
  beamM: number | null;
  maxSpeed: number | null;
  cabins: number | null;
  guests: number | null;
  range: number | null;
  engine: string | null;
  engineHours: number | null;
  location: string | null;
  imageUrl: string | null;
  source: string;
  url: string;
  /**
   * Per-field warnings produced by the post-merge sanity-check pass. Empty
   * array = nothing implausible detected. Each entry names a field and a
   * short reason ("length: vision said 14.6ft but model 435 implies 43.5ft —
   * preferred URL value"). The frontend uses this to flag cards as
   * "Needs review" before the user shares them with a client.
   */
  flags: string[];
  /** Coarse confidence rollup for at-a-glance UI badges. */
  confidence: "high" | "medium" | "low";
}

export function hostBrandTokens(host: string | null): string[] {
  if (!host) return [];
  const GENERIC = new Set([
    "com","net","org","co","uk","us","io","ca","au","biz","info","www","the",
  ]);
  return host
    .toLowerCase()
    .split(".")
    .filter((label) => label.length > 2 && !GENERIC.has(label));
}

/** Normalise for comparison: "YachtWay" and "yacht-way" both become "yachtway". */
function squash(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * True when a candidate vessel name is really the website's own brand.
 *
 * This is the failure that put "YachtWay" on a comparison card as though it
 * were the boat: the page title on a thin listing is often just the site name,
 * and the existing phrase blocklist ("boats for sale", "search"…) cannot know
 * what any given site is called. Deriving the brand from the hostname covers
 * every site without a hand-maintained list.
 */
export function isSiteBrandName(name: string | null, host: string | null): boolean {
  if (!name) return false;
  const n = squash(name);
  if (!n) return false;
  return hostBrandTokens(host).some(
    (tok) => n === squash(tok) || n === squash(tok) + "yachts" || n === squash(tok) + "yacht",
  );
}

/**
 * Highest speed worth believing for a hull of a given length. A 145 ft
 * tri-deck reported at 80 knots is not a fast yacht, it is a number scraped
 * off the wrong part of the page.
 */
export function maxPlausibleSpeed(
  lengthFt: number | null,
  type?: string | null,
): number {
  /* A sailing yacht is bounded by hull speed, not horsepower. A 44 ft cruiser
     does about 7 knots and motors at about the same, so the planing-hull
     ceilings below are meaningless for her — they let "56 knots" onto a Hunter
     44's card. Nothing under sail in a brokerage listing exceeds ~20 kn. */
  if (type && /sail|sloop|ketch|yawl|catamaran\s*sail|schooner/i.test(type)) return 20;

  // With no length there is nothing to sanity-check against, so hold the line
  // at roughly the fastest thing a brokerage actually lists.
  if (lengthFt === null) return 60;
  if (lengthFt < 50) return 70;
  if (lengthFt < 80) return 55;
  if (lengthFt < 120) return 45;
  return 35;
}

/**
 * True when the "top speed" is really the engine's horsepower.
 *
 * "1x Yanmar 4JH4E 56hp" alongside maxSpeed 56 is not a coincidence — the
 * extractor grabbed the same number twice. Any speed that reappears as a
 * horsepower figure in the engine string is discarded rather than shown.
 */
export function speedIsEnginePower(
  maxSpeed: number | null,
  engine: string | null,
): boolean {
  if (maxSpeed === null || !engine) return false;
  const hp = [...engine.matchAll(/(\d{2,4})\s*(?:hp|bhp|horsepower)\b/gi)].map((m) =>
    parseInt(m[1], 10),
  );
  return hp.includes(Math.round(maxSpeed));
}

export function runSanityChecks(
  y: ScrapedYacht,
  ctx: {
    inferredLengthFt: number | null;
    urlLengthFt: number | null;
    urlYear: number | null;
    host?: string | null;
    pageTitle?: string | null;
    sourceUrl?: string | null;
  },
): ScrapedYacht {
  const flags: string[] = [];

  // The site's own brand is not the name of a boat. Note it now, but rebuild
  // the replacement at the very end — the year and other fields it draws on
  // have not been validated yet at this point.
  const brandName = isSiteBrandName(y.name, ctx.host ?? null) ? y.name : null;

  // Length cross-check against URL-derived anchor (model number).
  const anchorFt = ctx.urlLengthFt ?? ctx.inferredLengthFt;
  if (anchorFt && y.lengthFt) {
    const ratio = y.lengthFt / anchorFt;
    // > 40% off in either direction is too much variance to ignore.
    if (ratio < 0.6 || ratio > 1.4) {
      flags.push(
        `length: extracted ${y.lengthFt.toFixed(1)} ft conflicts with model-derived ${anchorFt.toFixed(1)} ft — preferred model-derived value`,
      );
      y.lengthFt = anchorFt;
      y.lengthM = Math.round(anchorFt * 0.3048 * 10) / 10;
    }
  }

  // Plausibility bounds: drop values that no real yacht listing would show.
  if (y.lengthFt !== null && (y.lengthFt < 12 || y.lengthFt > 600)) {
    flags.push(`length: implausible value ${y.lengthFt} ft — discarded`);
    y.lengthFt = null;
    y.lengthM = null;
  }
  if (y.beamFt !== null && y.lengthFt !== null) {
    const ratio = y.beamFt / y.lengthFt;
    if (ratio < 0.15 || ratio > 0.55) {
      flags.push(`beam: ${y.beamFt} ft is outside 15–55% of length — discarded`);
      y.beamFt = null;
      y.beamM = null;
    }
  }
  // The engine's horsepower is not the boat's top speed.
  if (speedIsEnginePower(y.maxSpeed, y.engine)) {
    flags.push(
      `maxSpeed: ${y.maxSpeed} kn is the engine's horsepower read twice ("${y.engine}") — discarded`,
    );
    y.maxSpeed = null;
  }

  const speedCap = maxPlausibleSpeed(y.lengthFt, y.type);
  if (y.maxSpeed !== null && (y.maxSpeed < 4 || y.maxSpeed > speedCap)) {
    flags.push(
      `maxSpeed: ${y.maxSpeed} kn is not plausible for a ${y.lengthFt ? `${Math.round(y.lengthFt)} ft ` : ""}${y.type ? `${y.type.toLowerCase()} ` : "hull "}(cap ${speedCap} kn) — discarded`,
    );
    y.maxSpeed = null;
  }
  if (y.range !== null && (y.range < 30 || y.range > 12000)) {
    flags.push(`range: ${y.range} nm is outside 30–12,000 nm — discarded`);
    y.range = null;
  }
  // A 40-something-foot outboard center-console with > 1500 nm range is
  // unrealistic — that pattern is almost always the prompt-example leak
  // ("range of 2,800nm") sneaking through.
  const looksOutboard = (y.engine ?? "").toLowerCase().match(/\b(yamaha|mercury|suzuki|honda|outboard|f\d{3})\b/);
  const isCenterConsole = (y.type ?? "").toLowerCase().includes("center console");
  if (y.range !== null && y.range > 1500 && (looksOutboard || isCenterConsole) && (y.lengthFt ?? 0) < 60) {
    flags.push(`range: ${y.range} nm is unrealistic for an outboard / center-console under 60 ft — discarded`);
    y.range = null;
  }
  if (y.engineHours !== null && (y.engineHours < 0 || y.engineHours > 60000)) {
    flags.push(`engineHours: ${y.engineHours} is outside 0–60,000 — discarded`);
    y.engineHours = null;
  }
  if (y.year !== null) {
    const currentYear = new Date().getFullYear();
    if (y.year < 1900 || y.year > currentYear + 2) {
      flags.push(`year: ${y.year} is outside 1900–${currentYear + 2} — discarded`);
      y.year = null;
    } else if (y.year >= currentYear) {
      /* A current-or-future model year is legitimate for a new boat, but it is
         also exactly what a footer copyright line looks like — that is how a
         2002 Christensen came back as a 2026. Believe it only when the year is
         corroborated somewhere that describes the vessel: the URL slug or the
         page title. A genuine new-model listing says so in both. */
      const corroborated =
        ctx.urlYear === y.year ||
        (ctx.pageTitle ?? "").includes(String(y.year)) ||
        (ctx.sourceUrl ?? "").includes(String(y.year));
      if (!corroborated) {
        flags.push(
          `year: ${y.year} appears only in page furniture (likely a copyright line), not in the title or URL — discarded`,
        );
        y.year = null;
      }
    }
  }

  /* Near-zero hours on a boat that is not nearly new is a mis-read, not a
     barely-used vessel. A 2002 hull reported at 24 hours is the scraper
     picking up an unrelated number. */
  if (y.engineHours !== null && y.year !== null) {
    const age = new Date().getFullYear() - y.year;
    if (age > 5 && y.engineHours < 100) {
      flags.push(
        `engineHours: ${y.engineHours} hrs is not credible on a ${y.year} vessel — discarded`,
      );
      y.engineHours = null;
    }
  }
  if (y.cabins !== null && (y.cabins < 0 || y.cabins > 30)) {
    flags.push(`cabins: ${y.cabins} is outside 0–30 — discarded`);
    y.cabins = null;
  }
  if (y.guests !== null && (y.guests < 0 || y.guests > 100)) {
    flags.push(`guests: ${y.guests} is outside 0–100 — discarded`);
    y.guests = null;
  }

  /* If none of length, price or year could be read, this page did not parse as
     a single vessel listing — it is a model/marketing/search page. Whatever
     isolated numbers did come back are noise scraped from unrelated copy (that
     is where "80 knots" and "24 engine hours" came from on a 145 ft tri-deck).
     Showing one plausible-looking number next to a row of N/A invites more
     trust than the page has earned, so they all go. */
  if (y.lengthFt === null && y.priceNum === null && y.year === null) {
    const dropped: string[] = [];
    const speculative = ["maxSpeed", "engineHours", "range", "cabins", "guests", "beamFt", "beamM"] as const;
    for (const f of speculative) {
      if (y[f] !== null && y[f] !== undefined) { dropped.push(f); (y[f] as unknown) = null; }
    }
    flags.push(
      dropped.length
        ? `page did not read as a single vessel listing — discarded unsupported ${dropped.join(", ")}`
        : `page did not read as a single vessel listing`,
    );
  }

  // Now that every field has been validated, rebuild a name if the scraper
  // had handed us the website's own brand.
  if (brandName !== null) {
    const rebuilt = [y.year, y.builder, y.model].filter(Boolean).join(" ").trim();
    flags.push(
      `name: "${brandName}" is the website's own name, not the vessel — ${rebuilt ? `replaced with "${rebuilt}"` : "no vessel name could be read"}`,
    );
    y.name = rebuilt || "Unknown listing";
  }

  /* A price we calculated from length and age is a guess, not an asking price.
     It was previously counted as a filled critical field, so a listing whose
     price we invented could report "high confidence, no flags" — the card then
     showed a dollar figure with no hint it was ours. On big hulls the formula
     is off by an order of magnitude, which next to a real asking price reads
     as a bargain. Always flag it. */
  const priceWasEstimated = typeof y.price === "string" && /\(estimated\)/i.test(y.price);
  if (priceWasEstimated) {
    flags.push(
      `price: no asking price was published — ${y.price} is our own estimate from length and age, not the broker's figure`,
    );
  }

  // Critical-field coverage → coarse confidence rollup.
  const critical = [y.lengthFt, y.year, y.priceNum, y.engine, y.location];
  const filled = critical.filter((v) => v !== null && v !== undefined && v !== "").length;
  let confidence: ScrapedYacht["confidence"];
  if (flags.length === 0 && filled >= 4) confidence = "high";
  else if (flags.length <= 1 && filled >= 3) confidence = "medium";
  else confidence = "low";

  /* The card keys its warning banner off `flags`, so a low-confidence result
     with an empty flags array renders as though nothing were wrong — which is
     how a page that yielded almost no real data still looked presentable.
     Low confidence must always carry a reason the reader can see. */
  if (confidence === "low" && flags.length === 0) {
    flags.push(
      `only ${filled} of ${critical.length} key fields could be read from this page — treat every value as unconfirmed`,
    );
  }

  return { ...y, flags, confidence };
}
