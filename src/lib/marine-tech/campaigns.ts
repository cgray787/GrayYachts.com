// Service campaigns — mirrored from the Marine Tech app.
//
// Axopar and Mercury both issue campaigns against specific vessels: Axopar a
// "Boat Service Task" scoped by HIN with Compensated Work Hours, Mercury a
// warranty claim scoped by engine serial with part/fail and labor codes. The
// portal is a read-only mirror — campaigns are created and worked in the Marine
// Tech dashboard and field app, and shown here.
//
// Source of truth for the schema: marine-tech-app migration 043/044.

export type Manufacturer = "axopar" | "mercury";

/** A labor line on a Mercury bulletin — MERCNET lists these as Code + Hours. */
export type LaborCode = { code: string; hours: number };

export type CampaignStatus = "open" | "completed" | "not_applicable" | "voided";

export type PortalCampaign = {
  id: string;
  manufacturer: Manufacturer;
  campaign_code: string;
  title: string;
  revision: string | null;
  description: string | null;
  compensated_hours: number;
  priority: "normal" | "urgent";
  applies_to: string | null;
  engine_model: string | null;
  engine_serial_from: string | null;
  part_code: string | null;
  affected_hins: string[] | null;
  labor_codes: LaborCode[] | null;
  active: boolean;
};

export type PortalCampaignEntry = {
  id: string;
  manufacturer: Manufacturer;
  campaign_code: string;
  campaign_title: string;
  campaign_revision: string | null;
  compensated_hours: number;
  actual_hours: number | null;
  boat_name: string | null;
  boat_hin: string | null;
  customer_name: string | null;
  status: CampaignStatus;
  conditions_found: string | null;
  claim_number: string | null;
  claim_status: string | null;
  completed_at: string | null;
  voided_reason: string | null;
  backfilled: boolean;
  created_at: string;
};

/**
 * A photo the tech shot at the boat. Campaign photos live in report_photos with
 * report_id null and campaign_log_id set — the same rows the field app writes and
 * the Marine Tech dashboard reads, so there is one record rather than a copy.
 */
export type PortalCampaignPhoto = {
  id: string;
  campaign_log_id: string;
  photo_url: string;
  caption: string | null;
};

/** Group photos by the campaign entry they belong to. */
export function photosByEntry(
  rows: PortalCampaignPhoto[]
): Record<string, PortalCampaignPhoto[]> {
  const out: Record<string, PortalCampaignPhoto[]> = {};
  for (const p of rows) {
    if (!p.campaign_log_id) continue;
    (out[p.campaign_log_id] ??= []).push(p);
  }
  return out;
}

export const MANUFACTURER_LABEL: Record<Manufacturer, string> = {
  axopar: "Axopar",
  mercury: "Mercury",
};

export const MANUFACTURER_MARK: Record<Manufacturer, string> = {
  axopar: "AX",
  mercury: "MR",
};

/**
 * Coerce a Postgres numeric. PostgREST returns them as strings ("0.50"), so a
 * bare arithmetic use would silently produce NaN or string concatenation.
 */
export function hours(n: unknown): number {
  const v = typeof n === "number" ? n : parseFloat(String(n ?? ""));
  return Number.isFinite(v) ? v : 0;
}

/**
 * What the manufacturer actually pays for a bulletin.
 *
 * Axopar states a single Compensated Work Hours figure. Mercury does not — it
 * pays a set of labor codes (MERCNET shows CA12 .5 + CA18 .5), and rows entered
 * before the settings form existed carry compensated_hours = 0 with the real
 * total living only in labor_codes. Summing here means a Mercury bulletin never
 * displays as 0.0 h just because it was entered by hand.
 */
export function compensatedHours(
  c: Pick<PortalCampaign, "manufacturer" | "compensated_hours" | "labor_codes">
): number {
  if (c.manufacturer === "mercury" && c.labor_codes?.length) {
    const summed = c.labor_codes.reduce((s, l) => s + hours(l.hours), 0);
    if (summed > 0) return Math.round(summed * 100) / 100;
  }
  return hours(c.compensated_hours);
}

export function laborCodeSummary(codes: LaborCode[] | null | undefined): string {
  if (!codes?.length) return "";
  return codes.map((c) => `${c.code} ${hours(c.hours).toFixed(1)}`).join(" · ");
}

/** Voided entries are withdrawn mistakes — never counted, never hidden. */
export function isLive(e: { status: CampaignStatus }): boolean {
  return e.status !== "voided";
}

export function outstanding<T extends { status: CampaignStatus }>(rows: T[]): T[] {
  return rows.filter((r) => r.status === "open");
}

export function completed<T extends { status: CampaignStatus }>(rows: T[]): T[] {
  return rows.filter((r) => r.status === "completed");
}

/** How an entry reads in the history list. */
export function statusLabel(e: {
  status: CampaignStatus;
  backfilled?: boolean;
  voided_reason?: string | null;
}): string {
  switch (e.status) {
    case "voided":
      return e.voided_reason ? `Withdrawn — ${e.voided_reason}` : "Withdrawn";
    case "completed":
      return e.backfilled ? "Completed (recorded later)" : "Completed";
    case "not_applicable":
      return "Not applicable";
    default:
      return "Outstanding";
  }
}

export const STATUS_STYLES: Record<CampaignStatus, string> = {
  open: "bg-amber-500/15 text-amber-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  not_applicable: "bg-slate-500/15 text-slate-300",
  voided: "bg-slate-500/10 text-slate-400",
};

/** Variance between what the manufacturer pays and what the job actually took. */
export function variance(e: { compensated_hours: number; actual_hours: number | null }): number | null {
  if (e.actual_hours == null) return null;
  return Math.round((hours(e.actual_hours) - hours(e.compensated_hours)) * 100) / 100;
}

/** Which identifier a manufacturer uses to decide whether a campaign applies. */
export function targetLabel(c: Pick<PortalCampaign, "manufacturer" | "affected_hins" | "engine_serial_from">): string {
  if (c.manufacturer === "axopar") {
    const n = c.affected_hins?.length ?? 0;
    return n ? `${n} hull${n === 1 ? "" : "s"} by HIN` : "no hulls listed";
  }
  return c.engine_serial_from ? `engine serial ${c.engine_serial_from}+` : "no serial range set";
}
