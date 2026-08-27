"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { STAGES, type LeadStage } from "@/lib/fb-leads";

/** Every mutation re-checks the caller. Server actions are public endpoints —
 * the page-level gate does not protect them. */
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
  const { error } = await db.rpc("fb_lead_log_sent", {
    p_listing_id: listingId,
    p_step: step,
    p_body: body,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/portal/leads");
  revalidatePath("/portal/leads/all");
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

export async function snooze(listingId: string, days: number) {
  await requireAdmin();
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error("bad snooze");

  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  const db = createAdminClient();
  const { error } = await db
    .from("fb_leads")
    .update({ next_touch_at: until, touch_reason: `Snoozed ${days}d` })
    .eq("listing_id", listingId);
  if (error) throw new Error(error.message);

  revalidatePath("/portal/leads");
}

const CLOSE_REASONS = ["broker", "not_interested", "sold_elsewhere", "won"] as const;

export async function closeLead(listingId: string, reason: string) {
  await requireAdmin();
  if (!CLOSE_REASONS.includes(reason as (typeof CLOSE_REASONS)[number])) {
    throw new Error(`bad close reason: ${reason}`);
  }

  const stage: LeadStage =
    reason === "won" ? "won" : reason === "broker" ? "broker_dead" : "dead";
  const db = createAdminClient();
  const { error } = await db
    .from("fb_leads")
    .update({ closed_reason: reason, stage })
    .eq("listing_id", listingId);
  if (error) throw new Error(error.message);

  revalidatePath("/portal/leads");
  revalidatePath("/portal/leads/all");
}
