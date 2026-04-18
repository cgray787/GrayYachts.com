import { NextResponse } from "next/server";
import { requireMarineTechAdmin } from "@/lib/marine-tech/guard";
import { createMarineTechClient } from "@/lib/marine-tech/supabase";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireMarineTechAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  let db;
  try {
    db = createMarineTechClient();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const [{ data: report, error: reportErr }, { data: checklist }, { data: photos }] =
    await Promise.all([
      db
        .from("service_reports")
        .select(
          "id, job_id, tech_id, boat_name, owner_name, make_model, year, hin, marina, engine_make_model, engine_hours, battery_voltage, service_types, work_description, parts_used, concerns, general_notes, submitted_at, profiles!service_reports_tech_id_fkey(full_name)"
        )
        .eq("id", id)
        .single(),
      db
        .from("checklist_items")
        .select("id, category, item_name, assessment, notes, photo_url, sort_order")
        .eq("report_id", id)
        .order("sort_order", { ascending: true }),
      db
        .from("report_photos")
        .select("id, photo_url, category, caption, created_at")
        .eq("report_id", id)
        .order("created_at", { ascending: true }),
    ]);

  if (reportErr || !report)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    report,
    checklist: checklist ?? [],
    photos: photos ?? [],
  });
}
