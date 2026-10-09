/**
 * FSBO reply triage — pure logic, no I/O.
 *
 * The DB trigger (fb_lead_messages_sync) already does a regex pass the moment a
 * reply is inserted. This layer asks Jev what the seller actually meant and
 * turns that into a patch for fb_leads. The trigger result stays in place when
 * Jev is unavailable or unsure.
 *
 * Why: the regex sent "Listed with a broker. Unhappy with broker. Contract ends
 * in November" to broker_dead. That reply is the hottest kind of lead there is.
 */
import { choice, noul } from "@/lib/jev";

export const REPLY_CLASSES = {
  broker_listed: "The boat is listed with a broker and the seller gives no sign of wanting to change that",
  broker_but_open:
    "Listed with a broker, but the seller is unhappy, the contract is ending, or they are open to switching brokers",
  private_seller: "A private sale with no broker; the seller confirms they own it and are selling it themselves",
  interested: "The seller wants to hear the pitch, discuss terms or commission, or asks Connor to send a contract",
  not_interested: "The seller declines, says no thanks, or asks not to be contacted",
  sold_or_unavailable: "The boat is sold, pending, withdrawn, or otherwise no longer available",
  question: "The seller asks Connor a question that needs a personal answer before the conversation can move",
  unclear: "Too short or ambiguous to tell what the seller means",
} as const;

export type ReplyClass = keyof typeof REPLY_CLASSES;

export type ReplyThreadMessage = { direction: "in" | "out"; step: string | null; body: string; sent_at?: string };

export function buildReplyState(lead: { title: string; ask_label?: string | null; stage: string }, thread: ReplyThreadMessage[], reply: string) {
  return {
    context: {
      who_connor_is: "Connor is a yacht broker (Gray Yachts / Jeff Brown Yachts) messaging private sellers on Facebook Marketplace.",
      opener_question: "Is this a broker listing?",
      pitch: "Connor offers to list the boat at +5% so the seller nets their full asking price.",
    },
    lead: { title: lead.title, asking: lead.ask_label ?? null, pipeline_stage: lead.stage },
    thread: thread.slice(-8).map((m) => ({ from: m.direction === "out" ? "connor" : "seller", step: m.step, text: m.body })),
    reply: { from: "seller", text: reply },
  };
}

export function buildReplyQuestions() {
  return {
    reply_class: choice(
      {
        question: "What does the seller mean in `reply.text`, read in the context of `thread`?",
        focus: "Classify the seller's position toward working with Connor, not the tone.",
        note: "If the opener was just asked, a bare 'yes' means broker_listed and a bare 'no' means private_seller.",
      },
      REPLY_CLASSES,
    ),
    hot: noul(
      {
        question: "Does the seller show readiness to engage a new broker or move forward with Connor soon?",
        inspect: ["`reply.text`", "`thread`"],
      },
      {
        true: { what: "Signals openness: unhappy with current broker, contract ending, asks for terms, says send the contract, names a timeline" },
        false: { what: "No forward movement: declines, happy with broker, boat sold, or a neutral factual answer" },
      },
    ),
    needs_reply: noul(
      { question: "Does `reply.text` need a personal response from Connor to keep the conversation alive?", inspect: ["`reply.text`"] },
      {
        true: { what: "Asks a question, invites a next step, or leaves the ball in Connor's court" },
        false: { what: "Closes the conversation (no thanks, sold, broker listing) or needs nothing back" },
      },
    ),
  };
}

export type ReplyAnswers = {
  reply_class: { choice: ReplyClass; confidence: number; probabilities: Record<string, number> };
  hot: { noul: number };
  needs_reply: { noul: number };
};

export type ReplyPatch = Record<string, unknown>;

const ADVANCED = new Set(["terms_sent", "negotiating", "won"]);
const PITCHED = new Set(["pitch_sent", "nudged"]);
const CONFIDENT = 0.7;

/**
 * Turn Jev's answers into an fb_leads patch. Always records the raw judgment;
 * only moves the stage when confident, and never drags a lead backwards past
 * terms_sent / negotiating / won.
 */
export function decideReplyPatch(answers: ReplyAnswers, lead: { stage: string }, now = new Date()): ReplyPatch {
  const cls = answers.reply_class.choice;
  const conf = answers.reply_class.confidence;
  const hot = answers.hot.noul;
  const needsReply = answers.needs_reply.noul;

  const patch: ReplyPatch = {
    reply_class: cls,
    reply_class_confidence: round(conf),
    reply_hot_p: round(hot),
    reply_needs_reply_p: round(needsReply),
    reply_classified_at: now.toISOString(),
  };

  const nowIso = now.toISOString();
  const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000).toISOString();

  if (conf < CONFIDENT || cls === "unclear") {
    // Class is uncertain, but a strong "hot" signal is still worth surfacing.
    if (hot >= CONFIDENT) patch.is_hot = true;
    patch.touch_reason = hot >= CONFIDENT ? "Review reply — looks hot, AI unsure of intent" : "Review reply — AI unsure";
    patch.next_touch_at = nowIso;
    return patch;
  }

  if (ADVANCED.has(lead.stage)) {
    // Deal is already in motion; only surface signals, never move the stage.
    if (hot >= CONFIDENT) patch.is_hot = true;
    if (needsReply >= CONFIDENT) {
      patch.touch_reason = "Seller replied — respond";
      patch.next_touch_at = nowIso;
    }
    return patch;
  }

  switch (cls) {
    case "broker_listed":
      Object.assign(patch, { stage: "broker_dead", is_broker_listed: true, closed_reason: "broker", next_touch_at: null, touch_reason: null });
      break;
    case "broker_but_open":
      Object.assign(patch, {
        stage: "replied",
        is_hot: true,
        is_broker_listed: false,
        closed_reason: null,
        touch_reason: "Broker-listed but open — unhappy or contract ending. Follow up.",
        next_touch_at: needsReply >= CONFIDENT ? nowIso : inDays(7),
      });
      break;
    case "private_seller":
      Object.assign(patch, { stage: "replied", is_broker_listed: false, closed_reason: null, touch_reason: "Private seller confirmed — send pitch", next_touch_at: nowIso });
      break;
    case "interested":
      Object.assign(patch, {
        stage: PITCHED.has(lead.stage) ? "pitch_replied" : "replied",
        is_hot: true,
        touch_reason: "Seller interested — respond",
        next_touch_at: nowIso,
      });
      break;
    case "not_interested":
      Object.assign(patch, { stage: "dead", closed_reason: "not_interested", next_touch_at: null, touch_reason: null });
      break;
    case "sold_or_unavailable":
      Object.assign(patch, { stage: "dead", closed_reason: "sold_elsewhere", next_touch_at: null, touch_reason: null });
      break;
    case "question":
      Object.assign(patch, { touch_reason: "Seller asked a question — reply", next_touch_at: nowIso });
      break;
  }
  if (hot >= CONFIDENT && patch.stage !== "dead" && patch.stage !== "broker_dead") patch.is_hot = true;
  return patch;
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
