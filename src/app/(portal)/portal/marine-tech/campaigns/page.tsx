import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { createMarineTechClient } from "@/lib/marine-tech/supabase";
import {
  type Manufacturer,
  type PortalCampaign,
  type PortalCampaignEntry,
  type PortalCampaignPhoto,
  photosByEntry,
  MANUFACTURER_LABEL,
  MANUFACTURER_MARK,
  STATUS_STYLES,
  hours,
  compensatedHours,
  laborCodeSummary,
  outstanding,
  completed,
  statusLabel,
  variance,
  targetLabel,
} from "@/lib/marine-tech/campaigns";

export const dynamic = "force-dynamic";

const MFGS: Manufacturer[] = ["axopar", "mercury"];

export default async function CampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/portal/marine-tech/campaigns");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  let campaigns: PortalCampaign[] = [];
  let entries: PortalCampaignEntry[] = [];
  let photos: Record<string, PortalCampaignPhoto[]> = {};
  let configured = true;

  try {
    const db = createMarineTechClient();
    const [{ data: cats }, { data: log }, { data: pics }] = await Promise.all([
      db
        .from("service_campaigns")
        .select(
          "id, manufacturer, campaign_code, title, revision, description, compensated_hours, priority, applies_to, engine_model, engine_serial_from, part_code, affected_hins, labor_codes, active"
        )
        .order("manufacturer")
        .order("campaign_code", { ascending: false }),
      db
        .from("campaign_log")
        .select(
          "id, manufacturer, campaign_code, campaign_title, campaign_revision, compensated_hours, actual_hours, boat_name, boat_hin, customer_name, status, conditions_found, claim_number, claim_status, completed_at, voided_reason, backfilled, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(300),
      // The tech's photos from the boat. Fetched alongside rather than per-entry:
      // a fleet's worth of campaigns would otherwise be one request each.
      db
        .from("report_photos")
        .select("id, campaign_log_id, photo_url, caption")
        .not("campaign_log_id", "is", null)
        .order("created_at"),
    ]);
    campaigns = (cats ?? []) as unknown as PortalCampaign[];
    entries = (log ?? []) as unknown as PortalCampaignEntry[];
    photos = photosByEntry((pics ?? []) as unknown as PortalCampaignPhoto[]);
  } catch {
    configured = false;
  }

  const open = outstanding(entries);
  const done = completed(entries);

  return (
    <div className="p-6 lg:p-10">
      <Link
        href="/portal/marine-tech"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-gold"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Marine Tech
      </Link>

      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary lg:text-4xl">
          Service Campaigns
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Axopar and Mercury bulletins, and the permanent record of every one performed.
          Campaigns are created and worked in the Marine Tech dashboard and field app.
        </p>
      </div>

      {!configured && (
        <p className="rounded-xl border border-border bg-bg-card p-5 text-sm text-text-secondary">
          Marine Tech Supabase is not configured for this environment.
        </p>
      )}

      {configured && (
        <>
          {/* Counters */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Outstanding" value={open.length} accent={open.length > 0} />
            <Stat label="Completed" value={done.length} />
            <Stat
              label="Axopar bulletins"
              value={campaigns.filter((c) => c.manufacturer === "axopar" && c.active).length}
            />
            <Stat
              label="Mercury bulletins"
              value={campaigns.filter((c) => c.manufacturer === "mercury" && c.active).length}
            />
          </div>

          {/* Outstanding work first — the only question a manager actually asks. */}
          <Section title="Outstanding">
            {open.length === 0 ? (
              <Empty>Nothing outstanding. Every campaign on record has been closed out.</Empty>
            ) : (
              open.map((e) => <EntryRow key={e.id} entry={e} photos={photos[e.id]} />)
            )}
          </Section>

          {/* The catalog */}
          <Section title="Bulletins on file">
            {campaigns.length === 0 ? (
              <Empty>
                No campaigns in the catalog yet. Add them in the Marine Tech dashboard under
                Work Orders → Settings as each bulletin arrives.
              </Empty>
            ) : (
              MFGS.map((m) => {
                const rows = campaigns.filter((c) => c.manufacturer === m);
                if (rows.length === 0) return null;
                return (
                  <div key={m} className="mb-5 last:mb-0">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.13em] text-text-secondary">
                      {MANUFACTURER_LABEL[m]} · {rows.length}
                    </p>
                    {rows.map((c) => (
                      <div
                        key={c.id}
                        className={`mb-1.5 flex items-start gap-3 rounded-xl border border-border bg-bg-card p-4 ${
                          c.active ? "" : "opacity-50"
                        }`}
                      >
                        <Mark m={c.manufacturer} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-text-primary">
                            {c.campaign_code} · {c.title}
                            {c.priority === "urgent" && (
                              <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                                URGENT
                              </span>
                            )}
                            {!c.active && (
                              <span className="ml-2 text-[10px] uppercase tracking-wider text-text-secondary">
                                retired
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs text-text-secondary">
                            {c.applies_to || c.engine_model || "—"}
                            {c.revision ? ` · rev ${c.revision}` : ""} · {targetLabel(c)}
                          </span>
                          {(c.part_code || c.labor_codes?.length) && (
                            <span className="mt-0.5 block font-mono text-[11px] text-text-secondary/80">
                              {c.part_code}
                              {c.part_code && c.labor_codes?.length ? " · " : ""}
                              {laborCodeSummary(c.labor_codes)}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-mono text-sm text-gold">
                          {compensatedHours(c).toFixed(1)} h
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </Section>

          {/* Permanent record */}
          <Section title="Campaign history">
            {entries.length === 0 ? (
              <Empty>No campaigns have been performed yet.</Empty>
            ) : (
              entries.map((e) => (
                <EntryRow key={e.id} entry={e} showStatus photos={photos[e.id]} />
              ))
            )}
            {entries.length > 0 && (
              <p className="mt-3 text-xs text-text-secondary">
                This record is append-only — entries can be added but never edited or deleted,
                and it follows the hull if a boat is sold.
              </p>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  showStatus,
  photos = [],
}: {
  entry: PortalCampaignEntry;
  showStatus?: boolean;
  photos?: PortalCampaignPhoto[];
}) {
  const v = variance(entry);
  return (
    <div
      className={`mb-1.5 flex items-start gap-3 rounded-xl border border-border bg-bg-card p-4 ${
        entry.status === "voided" ? "opacity-60" : ""
      }`}
    >
      <Mark m={entry.manufacturer} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-text-primary">
          {entry.campaign_code} · {entry.campaign_title}
        </span>
        <span className="mt-0.5 block text-xs text-text-secondary">
          {entry.boat_name ?? "boat removed"}
          {entry.boat_hin ? ` · ${entry.boat_hin}` : ""}
          {entry.customer_name ? ` · ${entry.customer_name}` : ""}
          {entry.campaign_revision ? ` · rev ${entry.campaign_revision}` : ""}
        </span>
        {showStatus && (
          <span className="mt-1 block text-xs text-text-secondary">
            {statusLabel(entry)}
            {entry.completed_at ? ` · ${entry.completed_at.slice(0, 10)}` : ""}
            {entry.claim_number ? ` · claim ${entry.claim_number}` : ""}
            {entry.claim_status ? ` (${entry.claim_status})` : ""}
          </span>
        )}
        {entry.conditions_found && (
          <span className="mt-1 block text-xs italic text-text-secondary/80">
            “{entry.conditions_found}”
          </span>
        )}
        {/* Photos the tech shot at the boat — the evidence behind the claim. */}
        {photos.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-2">
            {photos.map((p) => (
              <a
                key={p.id}
                href={p.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                title={p.caption ?? "Photo from the field"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photo_url}
                  alt={p.caption ?? "Campaign photo from the field"}
                  className="h-16 w-16 rounded-lg border border-border object-cover transition-opacity hover:opacity-80"
                />
              </a>
            ))}
          </span>
        )}
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-sm text-gold">
          {hours(entry.compensated_hours).toFixed(1)} h
        </span>
        {v !== null && (
          <span
            className={`mt-0.5 block font-mono text-[11px] ${
              v > 0 ? "text-amber-300" : "text-emerald-300"
            }`}
            title="Actual hours against what the manufacturer compensates"
          >
            {v > 0 ? "+" : ""}
            {v.toFixed(1)} h
          </span>
        )}
      </span>
      {showStatus && (
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            STATUS_STYLES[entry.status]
          }`}
        >
          {entry.status === "not_applicable" ? "N/A" : entry.status}
        </span>
      )}
    </div>
  );
}

function Mark({ m }: { m: Manufacturer }) {
  return (
    <span
      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
        m === "axopar" ? "bg-sky-500/15 text-sky-300" : "bg-emerald-500/15 text-emerald-300"
      }`}
    >
      {MANUFACTURER_MARK[m]}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-text-secondary">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-border bg-bg-card p-5 text-sm text-text-secondary">
      {children}
    </p>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-text-secondary">{label}</p>
      <p
        className={`mt-1 font-mono text-2xl ${accent ? "text-gold" : "text-text-primary"}`}
      >
        {value}
      </p>
    </div>
  );
}
