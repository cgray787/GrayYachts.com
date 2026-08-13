import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import type { FbLead, FbLeadMessage } from "@/lib/fb-leads";

import LeadsClient from "./leads-client";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/portal/leads");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  const db = createAdminClient();

  const [{ data: leads, error: leadsError }, { data: messages }] = await Promise.all([
    db.from("fb_leads").select("*").order("rank", { ascending: true }),
    db.from("fb_lead_messages").select("*").order("sent_at", { ascending: true }),
  ]);

  if (leadsError) {
    return (
      <div className="p-6 lg:p-10">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
          FB Marketplace Leads
        </h1>
        <p className="mt-4 rounded-xl border border-border bg-bg-card p-5 text-sm text-text-secondary">
          Could not load leads: {leadsError.message}
        </p>
      </div>
    );
  }

  return (
    <LeadsClient
      initialLeads={(leads ?? []) as FbLead[]}
      initialMessages={(messages ?? []) as FbLeadMessage[]}
    />
  );
}
