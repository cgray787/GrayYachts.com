import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { leads, sweptAt, totalFound, survivedFiltering } from "@/lib/leads";

import LeadsClient from "./leads-client";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/portal/leads");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  return (
    <LeadsClient
      leads={leads}
      sweptAt={sweptAt}
      totalFound={totalFound}
      survivedFiltering={survivedFiltering}
    />
  );
}
