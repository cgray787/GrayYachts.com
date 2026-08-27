import Link from "next/link";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import type { FbLead, FbLeadMessage } from "@/lib/fb-leads";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import LeadsClient from "../leads-client";

export const dynamic = "force-dynamic";

export default async function AllLeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/portal/leads/all");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  const db = createAdminClient();
  const [{ data: leads, error }, { data: messages }] = await Promise.all([
    db.from("fb_leads").select("*").order("rank", { ascending: true }),
    db.from("fb_lead_messages").select("*").order("sent_at", { ascending: true }),
  ]);

  if (error) {
    return (
      <div className="p-6 lg:p-10">
        <Link href="/portal/leads" className="text-sm text-gold hover:text-gold-hover">
          ← Today&apos;s queue
        </Link>
        <p className="mt-5 rounded-xl border border-border bg-bg-card p-5 text-sm text-text-secondary">
          Could not load leads: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-6 pt-6 lg:px-10 lg:pt-10">
        <Link href="/portal/leads" className="text-sm text-gold hover:text-gold-hover">
          ← Today&apos;s queue
        </Link>
      </div>
      <LeadsClient
        initialLeads={(leads ?? []) as FbLead[]}
        initialMessages={(messages ?? []) as FbLeadMessage[]}
      />
    </div>
  );
}
