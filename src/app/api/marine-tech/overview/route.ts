import { NextResponse } from "next/server";
import { requireMarineTechAdmin } from "@/lib/marine-tech/guard";
import { createMarineTechClient } from "@/lib/marine-tech/supabase";

export const runtime = "edge";

export async function GET() {
  const gate = await requireMarineTechAdmin();
  if (!gate.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let db;
  try {
    db = createMarineTechClient();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const [
    { count: totalJobs },
    { count: newJobs },
    { count: inProgressJobs },
    { count: completedJobs },
    { count: totalReports },
    { count: totalPDI },
    { count: totalTechs },
  ] = await Promise.all([
    db.from("jobs").select("*", { count: "exact", head: true }),
    db.from("jobs").select("*", { count: "exact", head: true }).eq("status", "new"),
    db.from("jobs").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    db.from("jobs").select("*", { count: "exact", head: true }).eq("status", "completed"),
    db.from("service_reports").select("*", { count: "exact", head: true }),
    db.from("pdi_reports").select("*", { count: "exact", head: true }),
    db.from("profiles").select("*", { count: "exact", head: true }).eq("role", "tech"),
  ]);

  const { data: recentReports } = await db
    .from("service_reports")
    .select("id, boat_name, owner_name, make_model, submitted_at, tech_id")
    .order("submitted_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    counts: {
      totalJobs: totalJobs ?? 0,
      newJobs: newJobs ?? 0,
      inProgressJobs: inProgressJobs ?? 0,
      completedJobs: completedJobs ?? 0,
      totalReports: totalReports ?? 0,
      totalPDI: totalPDI ?? 0,
      totalTechs: totalTechs ?? 0,
    },
    recentReports: recentReports ?? [],
  });
}
