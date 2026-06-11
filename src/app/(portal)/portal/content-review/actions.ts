"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) throw new Error("forbidden");
}

// ── Outreach ────────────────────────────────────────────────────────────────

export async function approveOutreach(id: string) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db
    .from("outreach_sequences")
    .update({ status: "approved", rejection_note: null })
    .eq("id", id)
    .eq("status", "pending_approval");
  if (error) throw new Error(error.message);
  revalidatePath("/portal/content-review/outreach");
  revalidatePath("/portal/content-review");
}

export async function rejectOutreach(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !note) throw new Error("id and note required");
  const db = createAdminClient();
  const { error } = await db
    .from("outreach_sequences")
    .update({ status: "rejected", rejection_note: note })
    .eq("id", id)
    .eq("status", "pending_approval");
  if (error) throw new Error(error.message);
  revalidatePath("/portal/content-review/outreach");
  revalidatePath("/portal/content-review");
}

// ── Blog / Newsletter ───────────────────────────────────────────────────────

export async function publishBlog(id: string) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db
    .from("blog_posts")
    .update({
      published: true,
      published_at: new Date().toISOString(),
      qa_status: "approved",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/portal/content-review/blog");
  revalidatePath(`/portal/content-review/blog/${id}`);
  revalidatePath("/portal/content-review");
}

export async function rejectBlog(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !note) throw new Error("id and note required");
  const db = createAdminClient();
  const { error } = await db
    .from("blog_posts")
    .update({
      qa_status: "rejected",
      qa_last_feedback: note,
      qa_attempt: 0,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/portal/content-review/blog");
  revalidatePath(`/portal/content-review/blog/${id}`);
  revalidatePath("/portal/content-review");
}
