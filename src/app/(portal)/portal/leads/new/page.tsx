import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import AddLeadClient from "./add-lead-client";

export const dynamic = "force-dynamic";

export default async function NewFacebookLeadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/portal/leads/new");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");
  return <AddLeadClient />;
}
