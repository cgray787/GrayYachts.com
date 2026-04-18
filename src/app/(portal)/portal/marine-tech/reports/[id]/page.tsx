import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { createMarineTechClient } from "@/lib/marine-tech/supabase";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type Report = {
  id: string;
  boat_name: string | null;
  owner_name: string | null;
  make_model: string | null;
  year: number | null;
  hin: string | null;
  marina: string | null;
  engine_make_model: string | null;
  engine_hours: number | null;
  battery_voltage: number | null;
  service_types: string[] | null;
  work_description: string | null;
  parts_used: string | null;
  concerns: string | null;
  general_notes: string | null;
  submitted_at: string | null;
  profiles: { full_name: string | null } | null;
};

type ChecklistItem = {
  id: string;
  category: string;
  item_name: string;
  assessment: "good" | "bad" | null;
  notes: string | null;
  sort_order: number | null;
};

type Photo = {
  id: string;
  photo_url: string;
  category: string | null;
  caption: string | null;
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  const { id } = await params;

  let db;
  try {
    db = createMarineTechClient();
  } catch {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-sm text-amber-200">
          Marine Tech bridge is not configured.
        </p>
      </div>
    );
  }

  const [{ data: report }, { data: checklist }, { data: photos }] =
    await Promise.all([
      db
        .from("service_reports")
        .select(
          "id, boat_name, owner_name, make_model, year, hin, marina, engine_make_model, engine_hours, battery_voltage, service_types, work_description, parts_used, concerns, general_notes, submitted_at, profiles!service_reports_tech_id_fkey(full_name)"
        )
        .eq("id", id)
        .single(),
      db
        .from("checklist_items")
        .select("id, category, item_name, assessment, notes, sort_order")
        .eq("report_id", id)
        .order("sort_order", { ascending: true }),
      db
        .from("report_photos")
        .select("id, photo_url, category, caption, created_at")
        .eq("report_id", id)
        .order("created_at", { ascending: true }),
    ]);

  if (!report) notFound();

  const r = report as unknown as Report;
  const items = (checklist ?? []) as ChecklistItem[];
  const pics = (photos ?? []) as Photo[];

  const byCategory = items.reduce<Record<string, ChecklistItem[]>>((acc, i) => {
    (acc[i.category] ||= []).push(i);
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-10">
      <Link
        href="/portal/marine-tech"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-gold"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Marine Tech
      </Link>

      <div className="mb-6">
        <p className="text-sm text-text-secondary">Service Report</p>
        <h1 className="mt-1 font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary lg:text-4xl">
          {r.boat_name ?? "Unnamed vessel"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {[
            r.make_model,
            r.year,
            r.owner_name && `Owner: ${r.owner_name}`,
            r.profiles?.full_name && `Tech: ${r.profiles.full_name}`,
            r.submitted_at && new Date(r.submitted_at).toLocaleDateString(),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-border bg-bg-card p-5 lg:grid-cols-4">
        <DetailField label="HIN" value={r.hin} />
        <DetailField label="Marina" value={r.marina} />
        <DetailField label="Engine" value={r.engine_make_model} />
        <DetailField
          label="Engine Hours"
          value={r.engine_hours != null ? String(r.engine_hours) : null}
        />
        <DetailField
          label="Battery Voltage"
          value={r.battery_voltage != null ? `${r.battery_voltage}V` : null}
        />
        <DetailField
          label="Service Types"
          value={r.service_types?.join(", ") ?? null}
        />
      </div>

      {(r.work_description || r.parts_used || r.concerns || r.general_notes) && (
        <div className="mb-6 space-y-4 rounded-xl border border-border bg-bg-card p-5">
          {r.work_description && (
            <NoteBlock label="Work Description" value={r.work_description} />
          )}
          {r.parts_used && <NoteBlock label="Parts Used" value={r.parts_used} />}
          {r.concerns && <NoteBlock label="Concerns" value={r.concerns} />}
          {r.general_notes && (
            <NoteBlock label="General Notes" value={r.general_notes} />
          )}
        </div>
      )}

      {Object.keys(byCategory).length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
            Checklist
          </h2>
          <div className="space-y-4">
            {Object.entries(byCategory).map(([category, entries]) => (
              <div
                key={category}
                className="rounded-xl border border-border bg-bg-card p-5"
              >
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-secondary">
                  {category}
                </h3>
                <ul className="space-y-2">
                  {entries.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-start gap-3 rounded-lg border border-border/60 bg-bg-primary/40 p-3"
                    >
                      {i.assessment === "good" ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                      ) : i.assessment === "bad" ? (
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                      ) : (
                        <span className="mt-1 inline-block h-4 w-4 shrink-0 rounded-full border border-border" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary">
                          {i.item_name}
                        </p>
                        {i.notes && (
                          <p className="mt-0.5 text-xs text-text-secondary">
                            {i.notes}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {pics.length > 0 && (
        <div>
          <h2 className="mb-3 font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
            Photos
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {pics.map((p) => (
              <a
                key={p.id}
                href={p.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-bg-card"
              >
                <Image
                  src={p.photo_url}
                  alt={p.caption ?? p.category ?? "photo"}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform group-hover:scale-105"
                  unoptimized
                />
                {(p.caption || p.category) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="truncate text-xs text-white">
                      {p.caption ?? p.category}
                    </p>
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p className="mt-1 text-sm text-text-primary">{value ?? "—"}</p>
    </div>
  );
}

function NoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
        {value}
      </p>
    </div>
  );
}
