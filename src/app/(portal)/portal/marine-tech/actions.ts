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

  const update: Record<string, string | null> = {
    scheduled_date: start,
    scheduled_start: startTs,
    scheduled_end: endTs,
    status: status || "new",
  };

  const withEnd = await db
    .from("jobs")
    .update({ ...update, scheduled_end_date: end })
    .eq("id", id);

  if (withEnd.error) {
    const fallback = await db.from("jobs").update(update).eq("id", id);
    if (fallback.error) throw new Error(fallback.error.message);
  }

  revalidatePath("/portal/marine-tech");
  redirect(`/portal/marine-tech${month ? `?month=${month}` : ""}`);
}
