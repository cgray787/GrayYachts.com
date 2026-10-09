/**
 * Compare Yachts — Jev verification of the scraped record against the page.
 *
 * The merge step takes builder/model/name from vision, Firecrawl, HTML and the
 * URL in priority order, and numeric specs can come from a builder "profile"
 * (estimateFromProfile) that invents plausible values. Nothing cross-checks the
 * result against what the page actually says — which is how a Christensen
 * listing came back as a Benetti at high confidence.
 *
 * This module asks Jev, per field, whether the page text supports, contradicts,
 * or is silent on the value. Contradicted values are dropped; silent values are
 * flagged. Pure functions here; the route owns the call.
 */
import { choice } from "@/lib/jev";

export type VerifiableRecord = {
  name: string | null;
  builder: string | null;
  model: string | null;
  year: number | null;
  lengthFt: number | null;
  beamFt: number | null;
  maxSpeed: number | null;
  cabins: number | null;
  engine: string | null;
  range: number | null;
};

const VERDICT = {
  supported: "The page text states this value, or something equivalent (unit conversions, rounding, 'twin' vs '2x')",
  contradicted: "The page text states a clearly different value for this field, or names a different boat",
  silent: "The page text does not mention this field at all, so the value cannot be checked",
} as const;

export type Verdict = keyof typeof VERDICT;

export const PAGE_TEXT_LIMIT = 7_000;

/** Trim page text to the part most likely to hold the spec block. */
export function trimPageText(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > PAGE_TEXT_LIMIT ? cleaned.slice(0, PAGE_TEXT_LIMIT) : cleaned;
}

export function buildVerifyState(record: VerifiableRecord, pageText: string, pageTitle: string | null, url: string) {
  return {
    page: { url, title: pageTitle, text: trimPageText(pageText) },
    extracted: {
      identity: [record.year, record.builder, record.model].filter(Boolean).join(" ") || record.name,
      builder: record.builder,
      model: record.model,
      year: record.year,
      length_ft: record.lengthFt,
      beam_ft: record.beamFt,
      max_speed_kn: record.maxSpeed,
      cabins: record.cabins,
      engine: record.engine,
      range_nm: record.range,
    },
  };
}

type FieldKey = "identity" | "year" | "length_ft" | "beam_ft" | "max_speed_kn" | "cabins" | "engine" | "range_nm";

const FIELD_QUESTION: Record<FieldKey, string> = {
  identity: "Is `extracted.identity` the boat that `page.text` is about (same builder and model; year may differ by one)?",
  year: "Does `page.text` state a model year matching `extracted.year`?",
  length_ft: "Does `page.text` state an overall length matching `extracted.length_ft` feet (allow ±1 ft or the metric equivalent)?",
  beam_ft: "Does `page.text` state a beam matching `extracted.beam_ft` feet (allow ±0.5 ft or the metric equivalent)?",
  max_speed_kn: "Does `page.text` state a top or max speed matching `extracted.max_speed_kn` knots (allow ±3)?",
  cabins: "Does `page.text` state a cabin or stateroom count matching `extracted.cabins`?",
  engine: "Does `page.text` describe engines matching `extracted.engine` (make, model, or horsepower)?",
  range_nm: "Does `page.text` state a cruising range matching `extracted.range_nm` nautical miles (allow ±10%)?",
};

/** One Choice per present field. Absent fields are not asked about. */
export function buildVerifyQuestions(record: VerifiableRecord) {
  const present: FieldKey[] = ["identity"];
  if (record.year) present.push("year");
  if (record.lengthFt) present.push("length_ft");
  if (record.beamFt) present.push("beam_ft");
  if (record.maxSpeed) present.push("max_speed_kn");
  if (record.cabins) present.push("cabins");
  if (record.engine) present.push("engine");
  if (record.range) present.push("range_nm");
  const questions: Partial<Record<FieldKey, ReturnType<typeof choice>>> = {};
  for (const key of present) {
    questions[key] = choice({ question: FIELD_QUESTION[key], focus: "Compare only against the page text; do not use outside knowledge of the model." }, VERDICT);
  }
  return questions as Record<FieldKey, ReturnType<typeof choice>>;
}

export type VerifyAnswers = Partial<Record<FieldKey, { choice: Verdict; confidence: number }>>;

export type VerifyOutcome<T extends VerifiableRecord> = {
  record: T;
  flags: string[];
  /** true when the page is about a different boat — caller should downgrade confidence hard */
  identityContradicted: boolean;
  verdicts: Partial<Record<FieldKey, Verdict>>;
};

const CONFIDENT = 0.7;

const FIELD_TO_RECORD: Record<Exclude<FieldKey, "identity">, (keyof VerifiableRecord)[]> = {
  year: ["year"],
  length_ft: ["lengthFt"],
  beam_ft: ["beamFt"],
  max_speed_kn: ["maxSpeed"],
  cabins: ["cabins"],
  engine: ["engine"],
  range_nm: ["range"],
};

const LABEL: Record<Exclude<FieldKey, "identity">, string> = {
  year: "year",
  length_ft: "length",
  beam_ft: "beam",
  max_speed_kn: "max speed",
  cabins: "cabins",
  engine: "engine",
  range_nm: "range",
};

/**
 * Apply verdicts. Contradicted (confident) → field nulled + flag.
 * Silent → kept but flagged as unconfirmed. Supported → untouched.
 * Identity contradicted → builder/model/name nulled; every other spec is
 * suspect, so they are all flagged.
 */
export function applyVerification<T extends VerifiableRecord>(record: T, answers: VerifyAnswers): VerifyOutcome<T> {
  const out = { ...record };
  const flags: string[] = [];
  const verdicts: Partial<Record<FieldKey, Verdict>> = {};

  const id = answers.identity;
  const identityContradicted = Boolean(id && id.choice === "contradicted" && id.confidence >= CONFIDENT);
  if (id) verdicts.identity = id.choice;
  if (identityContradicted) {
    flags.push(
      `identity: the page does not describe a ${[record.year, record.builder, record.model].filter(Boolean).join(" ") || record.name} — builder and model were dropped; check the listing directly`,
    );
    out.builder = null;
    out.model = null;
    out.name = null;
  }

  for (const key of Object.keys(FIELD_TO_RECORD) as (keyof typeof FIELD_TO_RECORD)[]) {
    const a = answers[key];
    if (!a) continue;
    verdicts[key] = a.choice;
    const current = record[FIELD_TO_RECORD[key][0]];
    if (a.choice === "contradicted" && a.confidence >= CONFIDENT) {
      for (const rk of FIELD_TO_RECORD[key]) (out as VerifiableRecord)[rk] = null as never;
      if (key === "beam_ft") (out as VerifiableRecord & { beamM?: number | null }).beamM = null;
      if (key === "length_ft") (out as VerifiableRecord & { lengthM?: number | null }).lengthM = null;
      flags.push(`${LABEL[key]}: the page states a different value than ${String(current)} — dropped`);
    } else if (a.choice === "silent" || (a.choice === "contradicted" && a.confidence < CONFIDENT)) {
      flags.push(`${LABEL[key]}: ${String(current)} is not stated on the page — unconfirmed`);
    }
  }

  return { record: out, flags, identityContradicted, verdicts };
}

/** Minimal HTML → text for the non-Firecrawl fetch paths (no markdown there). */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6]|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}
