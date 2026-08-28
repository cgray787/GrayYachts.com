const CHALLENGE_TITLE =
  /security verification|just a moment|are you a human|checking your browser|captcha|access denied|request blocked|enable javascript|attention required|403 forbidden|robot check/i;
const CHALLENGE_MARKUP =
  /cf-browser-verification|challenge-platform|px-captcha|_Incapsula_/i;

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const hex = code[1]?.toLowerCase() === "x";
      const parsed = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function plainText(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractListingTableValue(
  html: string,
  label: string,
): string | null {
  const escaped = escapeRegex(label);
  const row = new RegExp(
    `<tr[^>]*>[\\s\\S]*?<th[^>]*>\\s*${escaped}\\s*</th>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>[\\s\\S]*?</tr>`,
    "i",
  ).exec(html);
  const value = row?.[1] ? plainText(row[1]) : "";
  return value || null;
}

export function parseFeetAndInches(value: string | null): number | null {
  if (!value) return null;
  const feet = value.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|')\b/i);
  if (!feet) return null;
  const inches = value.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|inches|")\b/i);
  const total = Number.parseFloat(feet[1]) + (inches ? Number.parseFloat(inches[1]) / 12 : 0);
  return Number.isFinite(total) ? Math.round(total * 100) / 100 : null;
}

export function extractPrimaryListingImage(html: string): string | null {
  const match = html.match(/\bdata-src_w0=["']([^"']+)["']/i);
  const value = match?.[1] ? decodeHtml(match[1]).trim() : "";
  return /^https?:\/\//i.test(value) ? value : null;
}

export interface ListingTableFacts {
  year?: number;
  price?: string;
  priceNum?: number;
  lengthFt?: number;
  beamFt?: number;
  cabins?: number;
  engine?: string;
  location?: string;
  type?: string;
  imageUrl?: string;
}

export function extractListingTableFacts(html: string): ListingTableFacts {
  const facts: ListingTableFacts = {};
  const year = Number.parseInt(extractListingTableValue(html, "Year") ?? "", 10);
  if (year >= 1900 && year <= new Date().getFullYear() + 2) facts.year = year;

  const rawPrice = extractListingTableValue(html, "Price");
  const priceNum = Number.parseInt(rawPrice?.replace(/[^\d]/g, "") ?? "", 10);
  if (rawPrice && priceNum > 1000) {
    facts.price = `$${priceNum.toLocaleString("en-US")}`;
    facts.priceNum = priceNum;
  }

  const lengthFt = parseFeetAndInches(
    extractListingTableValue(html, "LOA") ??
      extractListingTableValue(html, "Length"),
  );
  if (lengthFt !== null) facts.lengthFt = lengthFt;

  const beamFt = parseFeetAndInches(extractListingTableValue(html, "Beam"));
  if (beamFt !== null) facts.beamFt = beamFt;

  const cabins = Number.parseInt(
    extractListingTableValue(html, "Guest Cabins") ??
      extractListingTableValue(html, "Cabins") ??
      "",
    10,
  );
  if (cabins > 0 && cabins < 30) facts.cabins = cabins;

  const engine = [
    extractListingTableValue(html, "Engine Make"),
    extractListingTableValue(html, "Engine Model"),
    extractListingTableValue(html, "Power"),
  ]
    .filter(Boolean)
    .join(" ");
  if (engine) facts.engine = engine;

  const location = extractListingTableValue(html, "Location");
  if (location) facts.location = location;

  const type = extractListingTableValue(html, "Type");
  if (type) facts.type = type;

  const imageUrl = extractPrimaryListingImage(html);
  if (imageUrl) facts.imageUrl = imageUrl;

  return facts;
}

export function isUsableListingHtml(html: string): boolean {
  if (html.length < 500) return false;
  const title = plainText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  if (CHALLENGE_TITLE.test(title)) return false;

  const hasListingEvidence =
    /id=["']boat-details["']/i.test(html) &&
    extractListingTableValue(html, "Make") !== null &&
    extractListingTableValue(html, "Model") !== null;

  if (CHALLENGE_MARKUP.test(html) && !hasListingEvidence) return false;
  return true;
}
