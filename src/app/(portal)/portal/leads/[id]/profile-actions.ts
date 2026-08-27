"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) throw new Error("forbidden");
}

const FLEXIBILITY = ["firm", "open", "motivated"];
const MOTIVATIONS = ["upgrading", "downsizing", "relocating", "estate", "other"];
const IMAGE_BUCKET = "fb-lead-images";
const REMINDER_TO = process.env.LEAD_TO || "connorgray@jeffbrownyachts.com";
const REMINDER_FROM = process.env.LEAD_FROM || "Gray Yachts <onboarding@resend.dev>";
const refresh = (id: string) => {
  revalidatePath(`/portal/leads/${id}`);
  revalidatePath("/portal/leads");
  revalidatePath("/portal/leads/all");
};

export async function saveLeadProfile(listingId: string, values: {
  is_hot: boolean; seller_phone: string | null; wants_timeframe: string | null;
  wants_flexibility: string | null; wants_motivation: string | null; wants_notes: string | null;
  is_broker_listed: boolean; broker_name: string | null;
}) {
  await requireAdmin();
  if (values.wants_flexibility && !FLEXIBILITY.includes(values.wants_flexibility)) throw new Error("bad flexibility");
  if (values.wants_motivation && !MOTIVATIONS.includes(values.wants_motivation)) throw new Error("bad motivation");
  const clean = (value: string | null) => value?.trim() || null;
  const db = createAdminClient();
  const { data: existing, error: readError } = await db
    .from("fb_leads")
    .select("is_broker_listed,stage,closed_reason,next_touch_at,touch_reason")
    .eq("listing_id", listingId)
    .single();
  if (readError) throw new Error(readError.message);
  const brokerRemoved = existing.is_broker_listed && !values.is_broker_listed;
  const brokerAdded = values.is_broker_listed;
  const { error } = await db.from("fb_leads").update({
    is_hot: values.is_hot, seller_phone: clean(values.seller_phone),
    wants_timeframe: clean(values.wants_timeframe), wants_flexibility: clean(values.wants_flexibility),
    wants_motivation: clean(values.wants_motivation), wants_notes: clean(values.wants_notes),
    is_broker_listed: values.is_broker_listed,
    broker_name: clean(values.broker_name),
    stage: brokerAdded ? "broker_dead" : brokerRemoved ? "new" : existing.stage,
    closed_reason: brokerAdded ? "broker" : brokerRemoved ? null : existing.closed_reason,
    next_touch_at: brokerAdded ? null : brokerRemoved ? new Date().toISOString() : existing.next_touch_at,
    touch_reason: brokerAdded ? null : brokerRemoved ? "Broker flag removed — review lead" : existing.touch_reason,
  }).eq("listing_id", listingId);
  if (error) throw new Error(error.message);
  refresh(listingId);
}

export async function logProfileMessage(listingId: string, direction: "in" | "out", body: string) {
  await requireAdmin();
  const message = body.trim();
  if (!message) throw new Error("message is required");
  const { error } = await createAdminClient().from("fb_lead_messages").insert({
    listing_id: listingId, direction, step: direction === "in" ? "Reply" : "Manual note", body: message,
  });
  if (error) throw new Error(error.message);
  refresh(listingId);
}

async function saveImage(listingId: string, bytes: ArrayBuffer, contentType: string) {
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("image is larger than 10MB");
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `${listingId}/hero.${extension}`;
  const db = createAdminClient();
  const { error: uploadError } = await db.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await db.from("fb_leads").update({ image_path: path }).eq("listing_id", listingId);
  if (error) throw new Error(error.message);
  refresh(listingId);
}

export async function captureLeadImage(listingId: string) {
  await requireAdmin();
  const db = createAdminClient();
  const { data: lead, error } = await db.from("fb_leads").select("photo,image_path").eq("listing_id", listingId).single();
  if (error) throw new Error(error.message);
  if (lead.image_path || !lead.photo) return;
  const response = await fetch(lead.photo, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.facebook.com/" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Facebook image returned ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) throw new Error("Facebook did not return an image");
  await saveImage(listingId, await response.arrayBuffer(), contentType);
}

export async function uploadLeadImage(listingId: string, formData: FormData) {
  await requireAdmin();
  const file = formData.get("image");
  if (!(file instanceof File) || !file.type.startsWith("image/")) throw new Error("choose a JPG, PNG, or WebP image");
  await saveImage(listingId, await file.arrayBuffer(), file.type);
}

const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
})[char] ?? char);

export async function scheduleFollowUp(listingId: string, scheduledAt: string, note: string) {
  await requireAdmin();
  const when = new Date(scheduledAt);
  if (!Number.isFinite(when.getTime()) || when.getTime() < Date.now() + 60_000) throw new Error("choose a future follow-up time");
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("email reminders are not configured");
  const db = createAdminClient();
  const { data: lead, error } = await db.from("fb_leads").select("title,url,reminder_email_id").eq("listing_id", listingId).single();
  if (error) throw new Error(error.message);
  if (lead.reminder_email_id) {
    await fetch(`https://api.resend.com/emails/${lead.reminder_email_id}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${key}` } });
  }
  const reason = note.trim() || "Follow up with this seller";
  const send = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: REMINDER_FROM, to: [REMINDER_TO], subject: `Follow up — ${lead.title}`,
      scheduled_at: when.toISOString(),
      html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:600px"><p style="color:#C9A96E;text-transform:uppercase;letter-spacing:.14em;font-size:12px">Gray Yachts · FB CRM reminder</p><h2>${esc(lead.title)}</h2><p>${esc(reason)}</p><p><a href="https://grayyachts.com/portal/leads/${encodeURIComponent(listingId)}">Open the lead profile</a> · <a href="${esc(lead.url)}">Open Facebook listing</a></p></div>`,
    }),
  });
  if (!send.ok) throw new Error(`Resend scheduling failed (${send.status})`);
  const sent = (await send.json()) as { id?: string };
  if (!sent.id) throw new Error("Resend did not return a reminder id");
  const { error: updateError } = await db.from("fb_leads").update({
    next_touch_at: when.toISOString(), touch_reason: reason,
    reminder_email_id: sent.id, reminder_scheduled_at: when.toISOString(),
  }).eq("listing_id", listingId);
  if (updateError) {
    await fetch(`https://api.resend.com/emails/${sent.id}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${key}` } });
    throw new Error(updateError.message);
  }
  refresh(listingId);
}
