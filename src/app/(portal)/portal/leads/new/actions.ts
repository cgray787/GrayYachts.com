"use server";

import { isAdmin } from "@/lib/admin";
import { facebookListingId, scrapeFacebookListing } from "@/lib/facebook-marketplace";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "fb-lead-images";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) throw new Error("forbidden");
}

const imageExtension = (contentType: string) =>
  contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

async function capturePhotos(listingId: string, urls: string[]) {
  const db = createAdminClient();
  const rows: { listing_id: string; storage_path: string; source_url: string; sort_order: number }[] = [];
  for (const [index, url] of urls.slice(0, 12).entries()) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.facebook.com/" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) continue;
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 10 * 1024 * 1024) continue;
      const path = `${listingId}/listing-${String(index + 1).padStart(2, "0")}.${imageExtension(contentType)}`;
      const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
        contentType,
        upsert: true,
      });
      if (!error) rows.push({ listing_id: listingId, storage_path: path, source_url: url, sort_order: index });
    } catch {
      // One expired Facebook CDN image must not discard the rest of the lead.
    }
  }
  await db.from("fb_lead_images").delete().eq("listing_id", listingId);
  if (rows.length) {
    const { error } = await db.from("fb_lead_images").insert(rows);
    if (error) throw new Error(error.message);
  }
  return rows;
}

export async function addFacebookLead(values: {
  listingUrl: string;
  messengerUrl: string;
  chatTranscript: string;
  isBrokerListed: boolean;
  brokerName: string;
}) {
  await requireAdmin();
  const listingId = facebookListingId(values.listingUrl);
  if (!listingId) throw new Error("Paste a Facebook Marketplace item URL");

  const details = await scrapeFacebookListing(listingId);
  const db = createAdminClient();
  const { data: existing } = await db
    .from("fb_leads")
    .select("title,ask,ask_label,location,seller_name,stage,closed_reason")
    .eq("listing_id", listingId)
    .maybeSingle();
  const photos = await capturePhotos(listingId, details.images);
  const firstLine = details.description?.split("\n").find((line) => line.trim())?.trim();
  const title = details.title || existing?.title || firstLine || `Facebook Marketplace lead ${listingId}`;
  const brokerName = values.brokerName.trim() || null;
  const isBroker = values.isBrokerListed;

  const { error } = await db.from("fb_leads").upsert({
    listing_id: listingId,
    title,
    ask: details.ask ?? existing?.ask ?? null,
    ask_label: details.askLabel ?? existing?.ask_label ?? null,
    location: details.location ?? existing?.location ?? null,
    photo: details.images[0] ?? null,
    photo_count: details.images.length,
    url: details.url,
    source: "facebook",
    seller_name: details.sellerName ?? existing?.seller_name ?? null,
    seller_profile_url: details.sellerProfileUrl,
    listing_description: details.description,
    messenger_url: values.messengerUrl.trim() || null,
    image_path: photos[0]?.storage_path ?? null,
    scraped_at: new Date().toISOString(),
    is_broker_listed: isBroker,
    broker_name: brokerName,
    stage: isBroker ? "broker_dead" : existing?.stage ?? "new",
    closed_reason: isBroker ? "broker" : existing?.closed_reason ?? null,
    next_touch_at: isBroker ? null : new Date().toISOString(),
    touch_reason: isBroker ? null : "New Facebook lead — send the opener",
  }, { onConflict: "listing_id" });
  if (error) throw new Error(error.message);

  const transcript = values.chatTranscript.trim();
  if (transcript) {
    const { error: messageError } = await db.from("fb_lead_messages").insert({
      listing_id: listingId,
      direction: "in",
      step: "Imported chat",
      body: transcript,
    });
    if (messageError) throw new Error(messageError.message);
  }

  return { listingId, photosCaptured: photos.length, scrapedPhotoCount: details.images.length };
}
