import { NextResponse } from "next/server";
import { requireMarineTechAdmin } from "@/lib/marine-tech/guard";
import { createMarineTechClient } from "@/lib/marine-tech/supabase";

export const runtime = "edge";

export async function GET(req: Request) {
  const gate = await requireMarineTechAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  let db;
  try {
    db = createMarineTechClient();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let query = db
    .from("jobs")
    .select(
      "id, status, service_types, scheduled_date, created_at, notes, assigned_to, customer_id, boat_id, customers(name), boats(name, make, model, year, hin), profiles!jobs_assigned_to_fkey(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ jobs: data ?? [] });
}
