/**
 * I/O half of FSBO reply triage: load the lead + thread, ask Jev, apply the
 * patch. Never throws — the DB trigger already set a stage from regex and a
 * Jev failure must not break logging the reply.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { jev, jevAvailable } from "@/lib/jev";
import { buildReplyQuestions, buildReplyState, decideReplyPatch, type ReplyAnswers, type ReplyThreadMessage } from "@/lib/reply-triage";

export async function triageReply(db: SupabaseClient, listingId: string, reply: string): Promise<void> {
  if (!jevAvailable()) return;
  try {
    const [{ data: lead }, { data: thread }] = await Promise.all([
      db.from("fb_leads").select("title, ask_label, stage").eq("listing_id", listingId).single(),
      db.from("fb_lead_messages").select("direction, step, body, sent_at").eq("listing_id", listingId).order("sent_at", { ascending: true }).limit(12),
    ]);
    if (!lead) return;
    // The reply we just inserted is the last 'in' message; the thread before it is context.
    const prior = ((thread ?? []) as ReplyThreadMessage[]).filter((m) => !(m.direction === "in" && m.body === reply));
    const result = await jev(buildReplyState(lead, prior, reply), buildReplyQuestions(), "reply-triage");
    if (!result) return;
    const patch = decideReplyPatch(result.answers as unknown as ReplyAnswers, lead);
    const { error } = await db.from("fb_leads").update(patch).eq("listing_id", listingId);
    if (error) console.error("[reply-triage] patch failed:", error.message);
    else console.log("[reply-triage]", listingId, patch.reply_class, patch.reply_class_confidence, "→", patch.stage ?? "(stage kept)");
  } catch (error) {
    console.error("[reply-triage] skipped:", error instanceof Error ? error.message : String(error));
  }
}
