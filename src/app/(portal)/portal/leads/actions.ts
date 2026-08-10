"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { STAGES, type LeadStage } from "@/lib/fb-leads";

/** Every mutation re-checks the caller. Server actions are public endpoints —
 *  the page-level gate does not protect them. */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) throw new Error("forbidden");
  return user;
}

const STAGE_TIMESTAMP: Partial<Record<LeadStage, string>> = {
  opener_sent: "opener_sent_at",
  pitch_sent: "pitch_sent_at",
  nudged: "nudge_sent_at",
  terms_sent: "terms_sent_at",
};

export async function setStage(listingId: string, stage: string) {
  await requireAdmin();
  if (!STAGES.includes(stage as LeadStage)) throw new Error(`unknown stage: ${stage}`);

  const patch: Record<string, unknown> = { stage };
  // Stamp the matching timestamp so the checkpoint rail reflects reality
  // without the caller having to know the column names.
  const col = STAGE_TIMESTAMP[stage as LeadStage];
  if (col) patch[col] = new Date().toISOString();

  const db = createAdminClient();
  const { error } = await db.from("fb_leads").update(patch).eq("listing_id", listingId);
  if (error) throw new Error(error.message);

  revalidatePath("/portal/leads");
}

/** Log an outbound message and advance the stage in one step. */
export async function logSent(listingId: string, step: string, body: string) {
  await requireAdmin();
  const db = createAdminClient();

  const { error: msgError } = await db
    .from("fb_lead_messages")
    .insert({ listing_id: listingId, direction: "out", step, body });
  if (msgError) throw new Error(msgError.message);

  const stage: LeadStage =
    step === "Opener"
      ? "opener_sent"
      : step === "If private seller"
        ? "pitch_sent"
        : step === "No reply"
          ? "nudged"
          : step === "Terms"
            ? "terms_sent"
            : "opener_sent";

  await setStage(listingId, stage);
}

/**
 * Record what a seller said. The DB trigger reads the body and moves the lead
 * itself — an affirmative answer to the broker question lands in broker_dead,
 * a denial in replied — so this deliberately does not set the stage.
 */
export async function logReply(listingId: string, body: string) {
  await requireAdmin();
  const trimmed = body.trim();
  if (!trimmed) return;

  const db = createAdminClient();
  const { error } = await db
    .from("fb_lead_messages")
    .insert({ listing_id: listingId, direction: "in", body: trimmed, step: "Reply" });
  if (error) throw new Error(error.message);

  revalidatePath("/portal/leads");
}

export async function saveNote(listingId: string, note: string) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db
    .from("fb_leads")
    .update({ note: note.trim() || null })
    .eq("listing_id", listingId);
  if (error) throw new Error(error.message);

  revalidatePath("/portal/leads");
}
