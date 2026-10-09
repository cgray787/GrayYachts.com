/**
 * Durable copy of a /sell valuation request.
 *
 * Until 2026-10 the only record of a lead was the Resend email to Connor:
 * photos lived in that one message and nothing could pick the lead up later.
 * This writes the lead to `valuation_leads` and the photos to the public
 * `valuation-photos` Storage bucket so the n8n auto-reply (GY-010) can poll
 * for `status = 'new'` and the seller's own photo can appear in the reply.
 *
 * Plain REST on purpose: the Worker already talks to Supabase this way for
 * the newsletter, and it keeps supabase-js out of this route's bundle. Every
 * failure is logged and swallowed — storage must never block the lead email.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "valuation-photos";

export type StoredPhoto = { url: string; path: string; bytes: number };

export type ValuationLeadInput = {
  name: string;
  email: string;
  phone: string;
  answers: Record<string, string>;
  attribution: Record<string, string>;
};

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_KEY!,
    Authorization: `Bearer ${SERVICE_KEY}`,
    ...extra,
  };
}

export function storageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

/** Insert the lead row first so a photo-upload failure still leaves a lead. */
export async function insertLead(input: ValuationLeadInput): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/valuation_leads`, {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: headers({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify({
      status: "held", // Release only after photo uploads finish.
      name: input.name,
      email: input.email,
      phone: input.phone,
      intent: input.answers.intent ?? null,
      timeframe: input.answers.timeframe ?? null,
      length: input.answers.length ?? null,
      brand: input.answers.brand ?? null,
      year_make_model: input.answers.year_make_model ?? null,
      engine_hours: input.answers.engine_hours ?? null,
      condition: input.answers.condition ?? null,
      attribution: input.attribution,
    }),
  });
  if (!res.ok) {
    console.error("[valuation] lead insert failed", res.status, await res.text());
    return null;
  }
  const rows = (await res.json()) as { id: string }[];
  return rows[0]?.id ?? null;
}

/** Upload one base64 JPEG to `valuation-photos/<leadId>/<n>.jpg`; returns its public URL. */
export async function uploadPhoto(
  leadId: string,
  index: number,
  base64: string,
): Promise<StoredPhoto | null> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const path = `${leadId}/${index + 1}.jpg`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: headers({ "Content-Type": "image/jpeg", "x-upsert": "true" }),
    body: bytes,
  });
  if (!res.ok) {
    console.error("[valuation] photo upload failed", res.status, await res.text());
    return null;
  }
  return {
    url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`,
    path,
    bytes: bytes.byteLength,
  };
}

export async function attachPhotos(leadId: string, photos: StoredPhoto[]): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/valuation_leads?id=eq.${leadId}`, {
    method: "PATCH",
    signal: AbortSignal.timeout(20000),
    headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ photos, status: "new" }),
  });
  if (!res.ok) {
    console.error("[valuation] photo attach failed", res.status, await res.text());
  }
}
