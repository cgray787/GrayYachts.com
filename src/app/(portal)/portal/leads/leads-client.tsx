"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ExternalLink,
  Check,
  Copy,
  MapPin,
  Camera,
  MessageSquare,
  CircleDashed,
  XCircle,
  Send,
  Radio,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  type FbLead,
  type FbLeadMessage,
  type LeadStage,
  STAGE_LABEL,
  DEAD_STAGES,
  ACTION_STAGES,
  WAITING_STAGES,
  needsYou,
  nextAction,
  messageScript,
  dealTerms,
  liveStep,
} from "@/lib/fb-leads";
import { setStage, logSent, logReply, saveNote } from "./actions";

type Tab = "action" | "waiting" | "queue" | "dead" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "action", label: "Needs You" },
  { key: "waiting", label: "Waiting" },
  { key: "queue", label: "Not Contacted" },
  { key: "dead", label: "Dead" },
  { key: "all", label: "All" },
];

const money = (n: number) => "$" + Math.round(n).toLocaleString();

/**
 * Lead thumbnail with a failover chain.
 *
 * Facebook CDN URLs are signed and time-limited (`oh=` / `oe=`), so a photo
 * scraped days ago starts 403ing and the card renders a broken-image icon with
 * raw alt text. Locally cached bytes under /leads/<id>.jpg are preferred when
 * present; otherwise:
 *   1. the stored FB URL — fine while its token is valid
 *   2. /api/yacht-image?url=<listing> — the durable proxy that re-fetches
 *      through the provider chain and re-hosts under our own domain
 *   3. a clean placeholder — never a broken image
 */
function LeadPhoto({ lead }: { lead: FbLead }) {
  const [tier, setTier] = useState<0 | 1 | 2>(lead.photo ? 0 : 1);
  const box = "h-48 w-full object-cover sm:h-auto sm:w-52 sm:shrink-0";

  if (tier === 2) {
    return (
      <div
        className={`${box} flex items-center justify-center bg-bg-secondary sm:h-auto`}
        aria-hidden
      >
        <Camera className="h-6 w-6 text-text-secondary/40" />
      </div>
    );
  }

  const src =
    tier === 0
      ? (lead.photo as string)
      : `/api/yacht-image?url=${encodeURIComponent(lead.url)}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={lead.title}
      loading="lazy"
      onError={() => setTier((t) => (t === 0 ? 1 : 2))}
      className={box}
    />
  );
}

/**
 * One-click assisted send.
 *
 * Facebook has no API for sending Marketplace DMs — Meta's Messenger Platform
 * only covers Pages replying inside a 24h window, and FSBO listings are
 * personal-account threads. Driving the logged-in session with a headless
 * browser would work until it got the account banned, and that account IS the
 * pipeline. So: copy the exact message, open the thread, log the send. Connor
 * pastes and hits enter — two seconds, zero ban risk, and he stays the human
 * sender, which also reads better to a private seller.
 */
function SendStepButton({
  lead,
  step,
  pending,
  onSend,
}: {
  lead: FbLead;
  step: { step: string; body: string } | undefined;
  pending: boolean;
  onSend: (listingId: string, step: string, body: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!step || !step.body) return null;

  const verb =
    step.step === "Opener"
      ? "Send the opener"
      : step.step === "If private seller"
        ? "Send the pitch"
        : step.step === "No reply"
          ? "Send the nudge"
          : "Send the terms";

  async function go() {
    try {
      await navigator.clipboard.writeText(step!.body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      // Clipboard can be blocked; the script stays visible below either way.
    }
    window.open(lead.url, "_blank", "noopener,noreferrer");
    onSend(lead.listing_id, step!.step, step!.body);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover disabled:opacity-60"
      >
        {pending ? "LOGGING…" : verb.toUpperCase()} →
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
        {copied ? (
          <span className="text-gold">
            Copied. Paste into the Marketplace thread that just opened, then send.
          </span>
        ) : (
          <>Copies the message, opens the listing, and marks it sent.</>
        )}
      </p>
    </div>
  );
}


const since = (iso: string | null) => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  return days === 1 ? "1 day ago" : `${days} days ago`;
};

function stagePillCls(stage: LeadStage) {
  const base = "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";
  if (DEAD_STAGES.includes(stage)) return `${base} bg-red-400/15 text-red-400`;
  if (ACTION_STAGES.includes(stage)) return `${base} bg-emerald-400/15 text-emerald-400`;
  if (WAITING_STAGES.includes(stage)) return `${base} bg-amber-400/15 text-amber-400`;
  return `${base} bg-white/5 text-text-secondary`;
}

function verdictPill(lead: FbLead) {
  const base = "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";
  if (lead.verdict === "UNDER")
    return { cls: `${base} bg-emerald-400/15 text-emerald-400`, text: `${lead.delta_pct}% under market` };
  if (lead.verdict === "OVER")
    return { cls: `${base} bg-red-400/15 text-red-400`, text: `+${lead.delta_pct}% over market` };
  if (lead.verdict === "AT") return { cls: `${base} bg-blue-400/15 text-blue-400`, text: "At market" };
  if (lead.verdict === "UNKNOWN")
    return { cls: `${base} bg-white/5 text-text-secondary`, text: "Comps thin" };
  return null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-gold hover:text-gold"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Checkpoints({ lead }: { lead: FbLead }) {
  const dead = DEAD_STAGES.includes(lead.stage);
  const steps = [
    { label: "Opener sent", at: lead.opener_sent_at },
    { label: "Seller replied", at: lead.reply_at },
    { label: "Pitch sent", at: lead.pitch_sent_at },
    { label: "Nudged", at: lead.nudge_sent_at },
    { label: "Terms sent", at: lead.terms_sent_at },
  ];

  return (
    <ol className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2">
      {steps.map((s, i) => {
        const done = Boolean(s.at);
        const killed = dead && !done && i > 1;
        return (
          <li key={s.label} className="flex items-center gap-1">
            <span
              title={s.at ? new Date(s.at).toLocaleString() : undefined}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                done
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                  : killed
                    ? "border-border text-text-secondary/40 line-through"
                    : "border-border text-text-secondary"
              }`}
            >
              {done ? (
                <Check className="h-3.5 w-3.5" />
              ) : killed ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                <CircleDashed className="h-3.5 w-3.5" />
              )}
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="text-text-secondary/30">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

function LeadCard({
  lead,
  index,
  messages,
}: {
  lead: FbLead;
  index: number;
  messages: FbLeadMessage[];
}) {
  const [openScript, setOpenScript] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState(lead.note ?? "");
  const [showReply, setShowReply] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [pending, startTransition] = useTransition();

  // Shared by the one-click send button and the script rows below it, so
  // both routes log identically and advance the stage the same way.
  const onSendStep = (listingId: string, step: string, body: string) =>
    startTransition(async () => {
      await logSent(listingId, step, body);
    });

  // Server is the source of truth — if a realtime update changes the note,
  // adopt it rather than keeping a stale local draft.
  useEffect(() => setNoteDraft(lead.note ?? ""), [lead.note]);

  const verdict = verdictPill(lead);
  const script = messageScript(lead);
  const action = nextAction(lead);
  const attention = needsYou(lead);
  const dead = DEAD_STAGES.includes(lead.stage);
  const terms = dealTerms(lead.ask);
  const live = liveStep(lead);
  const inbound = messages.filter((m) => m.direction === "in");

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-bg-card transition-colors ${
        ACTION_STAGES.includes(lead.stage)
          ? "border-emerald-400/40"
          : "border-border hover:border-gold"
      } ${dead ? "opacity-70" : ""} ${pending ? "animate-pulse" : ""}`}
    >
      <div className="flex flex-col sm:flex-row">
        <LeadPhoto lead={lead} />

        <div className="min-w-0 flex-1 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold tabular-nums text-text-secondary">
                {index}
              </span>
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-text-primary">
                  {lead.ask_label ?? (lead.ask ? money(lead.ask) : "—")}
                </p>
                <h3 className="mt-0.5 text-sm font-medium text-text-primary">{lead.title}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {lead.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera className="h-3 w-3" /> {lead.photo_count}
                  </span>
                  {lead.seller_name && <span>· {lead.seller_name}</span>}
                  {lead.opener_sent_at && <span>· opener {since(lead.opener_sent_at)}</span>}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={stagePillCls(lead.stage)}>{STAGE_LABEL[lead.stage]}</span>
              {verdict && <span className={verdict.cls}>{verdict.text}</span>}
            </div>
          </div>

          <Checkpoints lead={lead} />

          {inbound.length > 0 && (
            <div className="mt-4 space-y-2">
              {inbound.map((m) => (
                <div key={m.id} className="rounded-lg border border-border bg-bg-secondary/60 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {lead.seller_name ?? "Seller"} · {since(m.sent_at)}
                  </p>
                  <p className="text-sm text-text-primary">&ldquo;{m.body}&rdquo;</p>
                </div>
              ))}
            </div>
          )}

          {lead.disqualify_reason && (
            <p className="mt-3 border-l-2 border-red-400/60 pl-3 text-xs leading-relaxed text-text-secondary">
              {lead.disqualify_reason}
            </p>
          )}

          {attention.need && attention.why && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-medium text-emerald-400">
              {attention.why}
            </p>
          )}

          {live >= 0 && !dead ? (
            <SendStepButton
              lead={lead}
              step={script[live]}
              pending={pending}
              onSend={onSendStep}
            />
          ) : (
            action && <p className="mt-3 text-sm font-medium text-gold">→ {action}</p>
          )}

          {lead.pitch_angle && !dead && (
            <p className="mt-3 border-l-2 border-gold pl-3 font-[family-name:var(--font-cormorant)] text-base leading-relaxed text-text-primary">
              {lead.pitch_angle}
            </p>
          )}

          {lead.comp_note && (
            <p className="mt-3 text-xs leading-relaxed text-text-secondary">
              <span className="font-semibold text-text-primary">Comps.</span> {lead.comp_note}
              {lead.confidence && <span> · confidence: {lead.confidence}</span>}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a
              href={lead.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-gold transition-colors hover:text-gold-hover"
            >
              Open listing <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {!dead && (
              <button
                type="button"
                onClick={() => setOpenScript((v) => !v)}
                className="text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                {openScript ? "Hide script" : "Message script"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowReply((v) => !v)}
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Log a reply
            </button>
            <button
              type="button"
              onClick={() => setShowNote((v) => !v)}
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {lead.note ? "Note ✓" : "Add note"}
            </button>
            {!dead && (
              <select
                value={lead.stage}
                disabled={pending}
                onChange={(e) =>
                  startTransition(async () => {
                    await setStage(lead.listing_id, e.target.value);
                  })
                }
                className="rounded-md border border-border bg-bg-secondary/60 px-2 py-1 text-xs text-text-secondary outline-none focus:border-gold"
              >
                {Object.entries(STAGE_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            )}
            {terms && !dead && (
              <span className="text-xs tabular-nums text-text-secondary">
                Relist {money(terms.relistAt)} · you {money(terms.commission)} · seller nets{" "}
                {money(terms.sellerNets)}
              </span>
            )}
          </div>

          {showReply && (
            <div className="mt-3 flex items-start gap-2">
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                rows={2}
                placeholder="Paste what the seller said — the pipeline reclassifies itself."
                className="flex-1 rounded-lg border border-border bg-bg-secondary/60 px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-gold"
              />
              <button
                type="button"
                disabled={pending || !replyDraft.trim()}
                onClick={() =>
                  startTransition(async () => {
                    await logReply(lead.listing_id, replyDraft);
                    setReplyDraft("");
                    setShowReply(false);
                  })
                }
                className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-gold-hover disabled:opacity-40"
              >
                Save
              </button>
            </div>
          )}

          {showNote && (
            <div className="mt-3 flex items-start gap-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={2}
                placeholder="Your notes on this lead."
                className="flex-1 rounded-lg border border-border bg-bg-secondary/60 px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-gold"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await saveNote(lead.listing_id, noteDraft);
                    setShowNote(false);
                  })
                }
                className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-gold-hover disabled:opacity-40"
              >
                Save
              </button>
            </div>
          )}

          {lead.note && !showNote && (
            <p className="mt-3 rounded-lg border border-border bg-bg-secondary/40 px-3 py-2 text-xs italic text-text-secondary">
              {lead.note}
            </p>
          )}

          {openScript && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              {script
                .filter((s) => s.body)
                .map((s, i) => (
                  <div key={s.step}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      {i + 1} · {s.step}
                      {i === live && <span className="ml-2 text-gold">← send this now</span>}
                    </p>
                    <div className="flex items-start gap-2">
                      <pre
                        className={`min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border px-3 py-2 font-sans text-xs leading-relaxed text-text-primary ${
                          i === live ? "border-gold bg-gold-muted" : "border-border bg-bg-secondary/60"
                        }`}
                      >
                        {s.body}
                      </pre>
                      <div className="flex flex-col gap-1.5">
                        <CopyButton text={s.body} />
                        <button
                          type="button"
                          disabled={pending}
                          title="Mark as sent — stamps the checkpoint"
                          onClick={() =>
                            startTransition(async () => {
                              await logSent(lead.listing_id, s.step, s.body);
                            })
                          }
                          className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-emerald-400 hover:text-emerald-400 disabled:opacity-40"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Sent
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LeadsClient({
  initialLeads,
  initialMessages,
}: {
  initialLeads: FbLead[];
  initialMessages: FbLeadMessage[];
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [messages, setMessages] = useState(initialMessages);
  const [tab, setTab] = useState<Tab>("action");
  const [connected, setConnected] = useState(false);
  const seenMessageIds = useRef(new Set(initialMessages.map((m) => m.id)));

  // Server props win on refresh/revalidate.
  useEffect(() => setLeads(initialLeads), [initialLeads]);
  useEffect(() => {
    setMessages(initialMessages);
    seenMessageIds.current = new Set(initialMessages.map((m) => m.id));
  }, [initialMessages]);

  // Live updates: any change from another tab, another device, or the sync
  // script lands here without a refresh.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("fb-leads-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fb_leads" },
        (payload) => {
          const row = payload.new as FbLead;
          if (!row?.listing_id) return;
          setLeads((prev) => {
            const i = prev.findIndex((l) => l.listing_id === row.listing_id);
            if (i === -1) return [...prev, row];
            const next = [...prev];
            next[i] = { ...next[i], ...row };
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "fb_lead_messages" },
        (payload) => {
          const row = payload.new as FbLeadMessage;
          // Realtime can redeliver; dedupe so a reply never renders twice.
          if (!row?.id || seenMessageIds.current.has(row.id)) return;
          seenMessageIds.current.add(row.id);
          setMessages((prev) => [...prev, row]);
        }
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const groups = useMemo(() => {
    const byRank = [...leads].sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
    return {
      // Time-aware: a lead parked in opener_sent for a week needs you as
      // much as one that replied. Waiting excludes anything that has aged
      // into Needs You, so a lead never appears in both.
      action: byRank.filter((l) => needsYou(l).need),
      waiting: byRank.filter(
        (l) => WAITING_STAGES.includes(l.stage) && !needsYou(l).need,
      ),
      dead: byRank.filter((l) => DEAD_STAGES.includes(l.stage)),
      queue: byRank.filter((l) => l.stage === "new"),
      all: byRank,
    };
  }, [leads]);

  const shown = groups[tab];

  const messagesByLead = useMemo(() => {
    const map = new Map<string, FbLeadMessage[]>();
    for (const m of messages) {
      const list = map.get(m.listing_id) ?? [];
      list.push(m);
      map.set(m.listing_id, list);
    }
    return map;
  }, [messages]);

  const stats = [
    { label: "Total leads", value: leads.length },
    { label: "Contacted", value: leads.filter((l) => l.opener_sent_at).length },
    { label: "Replied", value: leads.filter((l) => l.reply_at).length },
    { label: "Needs you", value: groups.action.length },
  ];

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary lg:text-4xl">
            FB Marketplace Leads
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            FSBO yacht sellers · Portland OR → Alaska · $150K–$2M
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
            connected
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
              : "border-border text-text-secondary"
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          {connected ? "Live" : "Connecting…"}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-bg-card p-5">
            <p className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold tabular-nums text-text-primary">
              {s.value}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 mt-8 flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-bg-card p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-gold-muted text-gold"
                : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs tabular-nums opacity-60">{groups[t.key].length}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-10 text-center text-sm text-text-secondary">
          {tab === "action" ? "No lead is waiting on you right now." : "Nothing in this bucket."}
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((l, i) => (
            <LeadCard
              key={l.listing_id}
              lead={l}
              index={i + 1}
              messages={messagesByLead.get(l.listing_id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
