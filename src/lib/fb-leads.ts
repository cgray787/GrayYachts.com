/**
 * FB Marketplace lead pipeline — live data layer.
 *
 * Rows live in public.fb_leads / public.fb_lead_messages (Supabase project
 * eorkwxzhtidstznpzlyg). Reads on the server go through the service-role admin
 * client behind the isAdmin() page gate; the browser subscribes to the same
 * tables over Realtime using the signed-in session, which RLS restricts to the
 * admin email.
 */

export const STAGES = [
  "new",
  "opener_sent",
  "replied",
  "pitch_sent",
  "pitch_replied",
  "nudged",
  "terms_sent",
  "negotiating",
  "won",
  "broker_dead",
  "dead",
] as const;

export type LeadStage = (typeof STAGES)[number];

export type FbLead = {
  listing_id: string;
  title: string;
  ask: number | null;
  ask_label: string | null;
  location: string | null;
  photo: string | null;
  photo_count: number | null;
  url: string;
  fsbo: string | null;
  verdict: string | null;
  delta_pct: number | null;
  comp_note: string | null;
  pitch_angle: string | null;
  confidence: string | null;
  comp_source: string | null;
  disqualify_reason: string | null;
  stage: LeadStage;
  seller_name: string | null;
  rank: number | null;
  note: string | null;
  opener_sent_at: string | null;
  reply_at: string | null;
  reply_text: string | null;
  pitch_sent_at: string | null;
  nudge_sent_at: string | null;
  terms_sent_at: string | null;
  updated_at: string;
  // CRM columns (migration 003). next_touch_at is stored, not computed in
  // the browser, so the queue and a 7am cron read the same rows.
  next_touch_at: string | null;
  touch_reason: string | null;
  touch_count: number;
  closed_reason: string | null;
  is_hot: boolean;
  hot_since: string | null;
  image_path: string | null;
  reminder_email_id: string | null;
  reminder_scheduled_at: string | null;
  listing_description: string | null;
  messenger_url: string | null;
  seller_profile_url: string | null;
  is_broker_listed: boolean;
  broker_name: string | null;
  scraped_at: string | null;
  seller_phone?: string | null;
  thread_id?: string | null;
  listed_at?: string | null;
  wants_timeframe?: string | null;
  wants_flexibility?: string | null;
  wants_motivation?: string | null;
  wants_notes?: string | null;
};

export type FbLeadMessage = {
  id: number;
  listing_id: string;
  direction: "in" | "out";
  step: string | null;
  body: string;
  sent_at: string;
};

export const STAGE_LABEL: Record<LeadStage, string> = {
  new: "Not contacted",
  opener_sent: "Opener sent — awaiting reply",
  replied: "Replied — needs your move",
  pitch_sent: "Pitch sent",
  pitch_replied: "Pitch replied — respond personally",
  nudged: "Nudged",
  terms_sent: "Terms sent",
  negotiating: "Negotiating",
  won: "Won",
  broker_dead: "Broker listed — dead",
  dead: "Dead",
};

export const DEAD_STAGES: LeadStage[] = ["broker_dead", "dead"];
export const ACTION_STAGES: LeadStage[] = ["replied", "pitch_replied", "negotiating"];
export const WAITING_STAGES: LeadStage[] = ["opener_sent", "pitch_sent", "nudged", "terms_sent"];

const DAY = 24 * 60 * 60 * 1000;
const daysSince = (iso: string | null) =>
  iso ? (Date.now() - new Date(iso).getTime()) / DAY : null;

/**
 * Does this lead need Connor right now?
 *
 * Stage alone isn't enough — a lead sitting in `opener_sent` for a week needs
 * a nudge just as much as one that replied, but stage-based bucketing left it
 * in "Waiting" forever. This adds the time dimension, so "Needs You" is a real
 * to-do list rather than a category you maintain by hand.
 */
export function needsYou(lead: FbLead): { need: boolean; why: string | null } {
  if (DEAD_STAGES.includes(lead.stage)) return { need: false, why: null };

  // Seller spoke and is waiting on us.
  if (ACTION_STAGES.includes(lead.stage)) {
    return { need: true, why: "Seller replied — your move" };
  }

  // Outbound has gone quiet.
  const quiet: Partial<Record<LeadStage, { days: number; why: string }>> = {
    opener_sent: { days: 3, why: "No reply in 3+ days — nudge" },
    pitch_sent: { days: 5, why: "Pitch went quiet — send “Thoughts?”" },
    nudged: { days: 5, why: "Nudge went unanswered" },
    terms_sent: { days: 4, why: "Terms sent — chase the answer" },
  };
  const rule = quiet[lead.stage];
  if (rule) {
    const sentAt =
      lead.stage === "opener_sent"
        ? lead.opener_sent_at
        : lead.stage === "pitch_sent"
          ? lead.pitch_sent_at
          : lead.stage === "nudged"
            ? lead.nudge_sent_at
            : lead.terms_sent_at;
    const d = daysSince(sentAt);
    if (d !== null && d >= rule.days && !lead.reply_at) {
      return { need: true, why: rule.why };
    }
  }
  return { need: false, why: null };
}

export function nextAction(lead: FbLead): string | null {
  switch (lead.stage) {
    case "new":
      return "Send the opener";
    case "opener_sent":
      return "Waiting on seller — nudge if quiet 3+ days";
    case "replied":
      return "Private seller confirmed — send the pitch";
    case "pitch_sent":
      return "Waiting — send “Thoughts?” if it goes quiet";
    case "pitch_replied":
      return "Respond personally — qualify their goals and timing";
    case "nudged":
      return "Waiting on reply — long-tail follow-up stays automatic";
    case "terms_sent":
      return "Waiting on their answer to the listing plan";
    case "negotiating":
      return "Work through the listing terms";
    default:
      return null;
  }
}

const money = (n: number) => "$" + Math.round(n).toLocaleString();

/** Conventional 10% listing commission at the seller's current ask. Half is
 * reserved for the buyer's broker so the co-broke network is paid to show it. */
export function dealTerms(ask: number | null) {
  if (!ask) return null;
  return {
    relistAt: ask,
    commission: Math.round(ask * 0.1),
    sellerNets: Math.round(ask * 0.9),
  };
}

export type ScriptStep = { step: string; body: string };

export function messageScript(lead: FbLead): ScriptStep[] {
  const t = dealTerms(lead.ask);
  return [
    { step: "Opener", body: "Is this a broker listing?" },
    {
      step: "If private seller",
      body:
        "Thanks for confirming. Private sellers can't list directly on YachtWorld — that's one place I can materially widen the buyer pool for you.\n" +
        "I'm with Jeff Brown Yachts and Gray Yachts in the PNW, and I also handle the professional photo and video package.\n" +
        "Would you be open to a quick conversation about what I would do differently to market the boat?",
    },
    { step: "No reply", body: "Thoughts?" },
    {
      step: "Terms",
      body: t
        ? `Here's how I'd structure it: keep the working price at ${money(
            t.relistAt
          )} with a 10% total commission — 5% reserved for the buyer's broker so the co-broke network is motivated to show the boat. At that price, before negotiation and closing costs, commission would be ${money(
            t.commission
          )} and estimated seller proceeds would be ${money(
            t.sellerNets
          )}. Would you be open to reviewing the full marketing plan and listing terms together?`
        : "",
    },
  ];
}

/** Which script step is live for this lead, or -1. */
export function liveStep(lead: FbLead): number {
  if (lead.stage === "new") return 0;
  if (lead.stage === "replied") return 1;
  if (lead.stage === "pitch_sent") return 2;
  return -1;
}

const STAGE_WEIGHT: Partial<Record<LeadStage, number>> = {
  replied: 4,
  pitch_replied: 4,
  negotiating: 4,
  terms_sent: 2,
  pitch_sent: 1.5,
  nudged: 1.2,
  opener_sent: 1,
  new: 1,
};

/**
 * Queue ordering: overdue-ness x boat value x how engaged the seller is.
 *
 * Value is log-compressed deliberately — a $750k boat is worth more attention
 * than a $170k one, but not 4.4x more, and raw multiplication buries every
 * modest lead. Engagement is weighted hardest because a seller who actually
 * replied is the scarcest thing on the board.
 *
 * Returns 0 for anything unscheduled so it can never surface in the queue.
 */
export function queuePriority(lead: FbLead, now: number = Date.now()): number {
  if (!lead.next_touch_at) return 0;
  const overdueDays = Math.max(0, (now - new Date(lead.next_touch_at).getTime()) / 86_400_000);
  // sqrt, not linear: with a linear multiplier a 30-day-stale $150k lead scored
  // ~4x a seller who replied yesterday, burying the only warm conversation on
  // the board. Staleness still sorts, with diminishing returns — a lead 30 days
  // cold is not 30x more urgent than one 1 day cold.
  const urgency = 1 + Math.sqrt(overdueDays);
  const value = Math.log10(Math.max(lead.ask ?? 1, 1));
  const weight = STAGE_WEIGHT[lead.stage] ?? 1;
  const hot = lead.is_hot ? 2 : 1;
  return urgency * value * weight * hot;
}

/** State parsed from the location SUFFIX. A substring test also matches
 *  "Harbor" and "Portland", which once reported more states than rows. */
export function leadState(location: string | null): "AK" | "WA" | "OR" | null {
  if (!location) return null;
  const m = location.match(/,\s*(AK|WA|OR)\s*$/i);
  return m ? (m[1].toUpperCase() as "AK" | "WA" | "OR") : null;
}

/**
 * Can Connor actually work this lead?
 *
 * WA/OR only — an Alaska boat cannot be shown, surveyed or sea-trialled from
 * Seattle, and there is no local buyer pool for one marketed by a PNW broker.
 * Under $500k — the tier above that proved broker-saturated (4 of the 8
 * highest-value leads researched were already on YachtWorld). Not closed.
 */
export function isServicable(lead: FbLead): boolean {
  if (
    DEAD_STAGES.includes(lead.stage) ||
    lead.stage === "won" ||
    lead.is_broker_listed ||
    lead.closed_reason ||
    lead.disqualify_reason
  ) {
    return false;
  }
  const st = leadState(lead.location);
  if (st !== "WA" && st !== "OR") return false;
  return (lead.ask ?? 0) > 0 && (lead.ask ?? 0) < 500_000;
}

/** The actual home-screen workload: due now, workable from the PNW, warmest
 * opportunity first. Future, closed and geographically impractical rows stay
 * available in the full list without turning the home screen into a database. */
export function todaysQueue(leads: FbLead[], now: number = Date.now()): FbLead[] {
  return leads
    .filter((lead) => {
      if (!lead.next_touch_at || !isServicable(lead)) return false;
      const dueAt = new Date(lead.next_touch_at).getTime();
      return Number.isFinite(dueAt) && dueAt <= now;
    })
    .sort((a, b) => queuePriority(b, now) - queuePriority(a, now));
}

/** Re-derive from each refreshed server payload while retaining the immediate
 * optimistic dismissal of cards already completed in this browser. */
export function visibleQueue(
  leads: FbLead[],
  dismissedListingIds: string[],
  now: number = Date.now(),
): FbLead[] {
  const dismissed = new Set(dismissedListingIds);
  return todaysQueue(leads, now).filter((lead) => !dismissed.has(lead.listing_id));
}
