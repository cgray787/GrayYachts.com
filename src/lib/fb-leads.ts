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
  nudged: "Nudged",
  terms_sent: "Terms sent",
  negotiating: "Negotiating",
  won: "Won",
  broker_dead: "Broker listed — dead",
  dead: "Dead",
};

export const DEAD_STAGES: LeadStage[] = ["broker_dead", "dead"];
export const ACTION_STAGES: LeadStage[] = ["replied", "negotiating"];
export const WAITING_STAGES: LeadStage[] = ["opener_sent", "pitch_sent", "nudged", "terms_sent"];

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
    case "nudged":
      return "Waiting on reply";
    case "terms_sent":
      return "Waiting on their answer to 5% / 5%";
    case "negotiating":
      return "Close it";
    default:
      return null;
  }
}

const money = (n: number) => "$" + Math.round(n).toLocaleString();

/** Relist 5% over ask; 5% commission off the current listing price; seller nets
 *  their full original ask. */
export function dealTerms(ask: number | null) {
  if (!ask) return null;
  return {
    relistAt: Math.round((ask * 1.05) / 1000) * 1000,
    commission: Math.round(ask * 0.05),
    sellerNets: ask,
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
        "Solid boat. Quick question are you firm on the price or open to the right buyer? I'm with Jeff Brown Yachts & GrayYachts.\n" +
        "We work in the premium marine market out in the PNW.\n" +
        "I may have a buyer interested",
    },
    { step: "No reply", body: "Thoughts?" },
    {
      step: "Terms",
      body: t
        ? `Here's how I'd structure it — I'd price the boat higher to factor in an extra 5%, so it lists at ${money(
            t.relistAt
          )}. My commission is 5%, taken off your current listing price. You'd net ${money(
            t.sellerNets
          )} — your full asking price. Let me know if this is something that would work for you?`
        : "",
    },
  ];
}

/** Which script step is live for this lead, or -1. */
export function liveStep(lead: FbLead): number {
  if (lead.stage === "new") return 0;
  if (lead.stage === "replied") return 1;
  if (lead.stage === "pitch_sent") return 2;
  if (lead.stage === "nudged") return 3;
  return -1;
}
