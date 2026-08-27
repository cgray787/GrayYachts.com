import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import type { FbLead } from "@/lib/fb-leads";

import QueueClient from "./queue-client";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/portal/leads");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  const db = createAdminClient();

  const now = new Date().toISOString();
  const [{ data: leads, error: leadsError }, { count: totalLeads, error: totalError }] = await Promise.all([
    db
      .from("fb_leads")
      .select("*")
      .not("next_touch_at", "is", null)
      .lte("next_touch_at", now),
    db.from("fb_leads").select("listing_id", { count: "exact", head: true }),
  ]);

  if (leadsError || totalError) {
    return (
      <div className="p-6 lg:p-10">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
          FB CRM
        </h1>
        <p className="mt-4 rounded-xl border border-border bg-bg-card p-5 text-sm text-text-secondary">
          Could not load leads: {(leadsError ?? totalError)?.message}
        </p>
      </div>
    );
  }

  return <QueueClient initialDue={(leads ?? []) as FbLead[]} totalLeads={totalLeads ?? 0} />;
}
