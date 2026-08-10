"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Check,
  Copy,
  MapPin,
  Camera,
  MessageSquare,
  CircleDashed,
  XCircle,
  StickyNote,
} from "lucide-react";
import type { Lead, LeadStage } from "@/lib/leads";
import { messageScript, STAGE_LABEL, nextAction } from "@/lib/leads";

type Tab = "action" | "waiting" | "queue" | "dead" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "action", label: "Needs You" },
  { key: "waiting", label: "Waiting" },
  { key: "queue", label: "Not Contacted" },
  { key: "dead", label: "Dead" },
  { key: "all", label: "All" },
];

const money = (n: number) => "$" + n.toLocaleString();

const DEAD: LeadStage[] = ["broker_dead", "dead"];
const ACTION: LeadStage[] = ["replied", "negotiating"];
const WAITING: LeadStage[] = ["opener_sent", "pitch_sent", "nudged", "terms_sent"];

/** Local, per-browser overlay: notes and manual ticks Connor adds between syncs.
 *  Server data stays the source of truth for what was actually sent/received. */
const LS_KEY = "gy-fb-leads-overlay-v1";
type Overlay = Record<string, { note?: string; manual?: Record<string, boolean> }>;

function useOverlay() {
  const [overlay, setOverlay] = useState<Overlay>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setOverlay(JSON.parse(raw) as Overlay);
    } catch {
      // corrupt or unavailable storage — start clean rather than crash the page
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(overlay));
    } catch {
      // quota / private mode — the page still works, notes just won't persist
    }
  }, [overlay, ready]);

  return { overlay, setOverlay, ready };
}

function stagePill(stage: LeadStage) {
  const base = "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";
  if (DEAD.includes(stage)) return `${base} bg-red-400/15 text-red-400`;
  if (ACTION.includes(stage)) return `${base} bg-emerald-400/15 text-emerald-400`;
  if (WAITING.includes(stage)) return `${base} bg-amber-400/15 text-amber-400`;
  return `${base} bg-white/5 text-text-secondary`;
}

function verdictPill(lead: Lead) {
  const base = "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";
  if (lead.verdict === "UNDER")
    return { cls: `${base} bg-emerald-400/15 text-emerald-400`, text: `${lead.deltaPct}% under market` };
  if (lead.verdict === "OVER")
    return { cls: `${base} bg-red-400/15 text-red-400`, text: `+${lead.deltaPct}% over market` };
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

/** The four-stage cadence rendered as a checkpoint rail: green tick = actually
 *  done, dashed = still open, red = the lead died at that step. */
function Checkpoints({ lead }: { lead: Lead }) {
  const cp = lead.checkpoints;
  const dead = DEAD.includes(lead.stage);

  const steps = [
    { key: "opener", label: "Opener sent", state: cp.opener },
    { key: "reply", label: "Seller replied", state: cp.reply },
    { key: "pitch", label: "Pitch sent", state: cp.pitch },
    { key: "nudge", label: "Nudged", state: cp.nudge },
    { key: "terms", label: "Terms sent", state: cp.terms },
  ];

  return (
    <ol className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2">
      {steps.map((s, i) => {
        const done = s.state?.done;
        // A dead lead's remaining steps are never going to happen — show them
        // struck rather than pretending they're still pending work.
        const killed = dead && !done && i > 1;
        return (
          <li key={s.key} className="flex items-center gap-1">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                done
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                  : killed
                    ? "border-border bg-transparent text-text-secondary/40 line-through"
                    : "border-border bg-transparent text-text-secondary"
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
  note,
  onNote,
}: {
  lead: Lead;
  index: number;
  note: string;
  onNote: (v: string) => void;
}) {
  const [openScript, setOpenScript] = useState(false);
  const [openNote, setOpenNote] = useState(false);
  const verdict = verdictPill(lead);
  const script = messageScript(lead);
  const action = nextAction(lead);
  const dead = DEAD.includes(lead.stage);

  // Once a seller confirms it's a private sale, the pitch is the live move —
  // surface it expanded rather than buried behind a toggle.
  const highlightStep = lead.stage === "replied" ? 1 : -1;

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-bg-card transition-colors ${
        ACTION.includes(lead.stage) ? "border-emerald-400/40" : "border-border hover:border-gold"
      } ${dead ? "opacity-70" : ""}`}
    >
      <div className="flex flex-col sm:flex-row">
        {lead.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lead.photo}
            alt={lead.title}
            className="h-48 w-full object-cover sm:h-auto sm:w-52 sm:shrink-0"
          />
        )}

        <div className="min-w-0 flex-1 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold tabular-nums text-text-secondary">
                {index}
              </span>
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-text-primary">
                  {lead.askLabel}
                </p>
                <h3 className="mt-0.5 text-sm font-medium text-text-primary">{lead.title}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {lead.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera className="h-3 w-3" /> {lead.photoCount}
                  </span>
                  {lead.seller && <span>· {lead.seller}</span>}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={stagePill(lead.stage)}>{STAGE_LABEL[lead.stage]}</span>
              {verdict && <span className={verdict.cls}>{verdict.text}</span>}
            </div>
          </div>

          <Checkpoints lead={lead} />

          {lead.checkpoints.reply?.done && lead.checkpoints.reply.body && (
            <div className="mt-4 rounded-lg border border-border bg-bg-secondary/60 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                <MessageSquare className="h-3.5 w-3.5" />
                {lead.seller ?? "Seller"} replied
              </p>
              <p className="text-sm text-text-primary">&ldquo;{lead.checkpoints.reply.body}&rdquo;</p>
            </div>
          )}

          {lead.outcome && (
            <p className="mt-3 border-l-2 border-red-400/60 pl-3 text-xs leading-relaxed text-text-secondary">
              {lead.outcome}
            </p>
          )}

          {action && (
            <p className="mt-3 text-sm font-medium text-gold">→ {action}</p>
          )}

          {lead.pitchAngle && !dead && (
            <p className="mt-3 border-l-2 border-gold pl-3 font-[family-name:var(--font-cormorant)] text-base leading-relaxed text-text-primary">
              {lead.pitchAngle}
            </p>
          )}

          {lead.compNote && (
            <p className="mt-3 text-xs leading-relaxed text-text-secondary">
              <span className="font-semibold text-text-primary">Comps.</span> {lead.compNote}
              {lead.confidence && <span> · confidence: {lead.confidence}</span>}
            </p>
          )}

          {lead.note && (
            <p className="mt-2 text-xs italic leading-relaxed text-text-secondary">{lead.note}</p>
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
              onClick={() => setOpenNote((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              <StickyNote className="h-3.5 w-3.5" />
              {note ? "Note ✓" : "Add note"}
            </button>
            {lead.relistAt && lead.ask > 0 && !dead && (
              <span className="text-xs tabular-nums text-text-secondary">
                Relist {money(lead.relistAt)} · you {money(lead.commission ?? 0)} · seller nets{" "}
                {money(lead.ask)}
              </span>
            )}
          </div>

          {openNote && (
            <textarea
              value={note}
              onChange={(e) => onNote(e.target.value)}
              placeholder="Your notes on this lead — saved in this browser."
              rows={3}
              className="mt-3 w-full rounded-lg border border-border bg-bg-secondary/60 px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-gold"
            />
          )}

          {openScript && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              {script
                .filter((s) => s.body)
                .map((s, i) => (
                  <div key={s.step}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      {i + 1} · {s.step}
                      {i === highlightStep && <span className="ml-2 text-gold">← send this now</span>}
                    </p>
                    <div className="flex items-start gap-2">
                      <pre
                        className={`min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border px-3 py-2 font-sans text-xs leading-relaxed text-text-primary ${
                          i === highlightStep
                            ? "border-gold bg-gold-muted"
                            : "border-border bg-bg-secondary/60"
                        }`}
                      >
                        {s.body}
                      </pre>
                      <CopyButton text={s.body} />
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
  leads,
  sweptAt,
  totalFound,
  survivedFiltering,
}: {
  leads: Lead[];
  sweptAt: string;
  totalFound: number;
  survivedFiltering: number;
}) {
  const [tab, setTab] = useState<Tab>("action");
  const { overlay, setOverlay } = useOverlay();

  const groups = useMemo(() => {
    const action = leads.filter((l) => ACTION.includes(l.stage));
    const waiting = leads.filter((l) => WAITING.includes(l.stage));
    const dead = leads.filter((l) => DEAD.includes(l.stage));
    const queue = leads.filter((l) => l.stage === "new");
    return { action, waiting, dead, queue };
  }, [leads]);

  const shown =
    tab === "action"
      ? groups.action
      : tab === "waiting"
        ? groups.waiting
        : tab === "dead"
          ? groups.dead
          : tab === "queue"
            ? groups.queue
            : leads;

  const counts: Record<Tab, number> = {
    action: groups.action.length,
    waiting: groups.waiting.length,
    queue: groups.queue.length,
    dead: groups.dead.length,
    all: leads.length,
  };

  const contactedCount = leads.filter((l) => l.checkpoints.opener?.done).length;
  const repliedCount = leads.filter((l) => l.checkpoints.reply?.done).length;

  const stats = [
    { label: "Listings swept", value: totalFound },
    { label: "FSBO targets", value: survivedFiltering },
    { label: "Contacted", value: contactedCount },
    { label: "Replied", value: repliedCount },
  ];

  const setNote = (id: string, note: string) =>
    setOverlay((prev) => ({ ...prev, [id]: { ...prev[id], note } }));

  return (
    <div className="p-6 lg:p-10">
      <div>
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary lg:text-4xl">
          FB Marketplace Leads
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          FSBO yacht sellers · Portland OR → Alaska · $150K–$2M · swept {sweptAt}
        </p>
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
            <span className="ml-1.5 text-xs opacity-60 tabular-nums">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-10 text-center text-sm text-text-secondary">
          {tab === "action"
            ? "No lead is waiting on you right now."
            : "Nothing in this bucket."}
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((l, i) => (
            <LeadCard
              key={l.id}
              lead={l}
              index={i + 1}
              note={overlay[l.id]?.note ?? ""}
              onNote={(v) => setNote(l.id, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
