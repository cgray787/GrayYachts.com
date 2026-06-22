"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { createMarineTechClient } from "@/lib/marine-tech/supabase";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    throw new Error("Not authorized");
  }
}

const ALLOWED_STATUSES = new Set(["new", "in_progress", "completed"]);

function normalizeDate(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

export async function updateJobSchedule(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing job id");

  const start = normalizeDate(formData.get("scheduled_date"));
  const endRaw = normalizeDate(formData.get("scheduled_end_date"));
  const status = String(formData.get("status") ?? "").trim();
  const month = String(formData.get("month") ?? "");
  const isPaperwork = String(formData.get("kind") ?? "") === "paperwork";

  if (status && !ALLOWED_STATUSES.has(status)) {
    throw new Error("Invalid status");
  }
  if (start && endRaw && endRaw < start) {
    throw new Error("End date must be on or after start date");
  }

  const end = endRaw ?? start;

  // Also write scheduled_start / scheduled_end (timestamptz) at top-of-day so
  // the Marine Tech App's calendar — which only reads scheduled_start — sees
  // edits made here. Default to noon UTC so the date renders consistently in
  // every browser's local TZ.
  const startTs = start ? `${start}T12:00:00.000Z` : null;
  const endTs = end ? `${end}T13:00:00.000Z` : null;

  const db = createMarineTechClient();

  const update: Record<string, unknown> = {
    scheduled_date: start,
    scheduled_start: startTs,
    scheduled_end: endTs,
    status: status || "new",
  };

  // Per-service descriptions (migration 031): textareas named
  // service_desc__<service type> in the drawer → jsonb keyed by type.
  const serviceDescriptions: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("service_desc__") && typeof value === "string") {
      const serviceType = key.slice("service_desc__".length);
      const trimmed = value.trim();
      if (trimmed) serviceDescriptions[serviceType] = trimmed;
    }
  }

  // Per-day locations (migration 039): inputs named day_loc__<YYYY-MM-DD> in
  // the per-day editor → jsonb { 'YYYY-MM-DD': '<place>' }. Only days inside the
  // chosen span are submitted; blanks are dropped (fall back to marina).
  const dayLocations: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("day_loc__") && typeof value === "string") {
      const day = key.slice("day_loc__".length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      const trimmed = value.trim();
      if (trimmed) dayLocations[day] = trimmed;
    }
  }

  // Paperwork blocks carry their title/note in `notes` (editable in the drawer).
  if (isPaperwork) {
    const note = String(formData.get("notes") ?? "").trim();
    update.notes = note || null;
  }

  const withEnd = await db
    .from("jobs")
    .update({
      ...update,
      scheduled_end_date: end,
      service_descriptions: serviceDescriptions,
      day_locations: dayLocations,
    })
    .eq("id", id);

  if (withEnd.error) {
    // Fallback for environments predating scheduled_end_date / migration 031.
    const fallback = await db.from("jobs").update(update).eq("id", id);
    if (fallback.error) throw new Error(fallback.error.message);
  }

  revalidatePath("/portal/marine-tech");
  redirect(`/portal/marine-tech${month ? `?month=${month}` : ""}`);
}
