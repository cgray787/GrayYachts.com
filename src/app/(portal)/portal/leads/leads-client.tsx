"use client";

import { useState } from "react";
import { ExternalLink, Check, Copy, MapPin, Camera } from "lucide-react";
import type { Lead } from "@/lib/leads";
import { messageScript } from "@/lib/leads";

type Tab = "queue" | "contacted" | "brokered" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "queue", label: "Send Queue" },
  { key: "contacted", label: "Contacted" },
  { key: "brokered", label: "Already Brokered" },
  { key: "all", label: "All Leads" },
];

const money = (n: number) => "$" + n.toLocaleString();

function verdictPill(lead: Lead) {
  const base = "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium";
  if (lead.verdict === "UNDER")
    return { cls: `${base} bg-emerald-400/15 text-emerald-400`, text: `Under market ${lead.deltaPct}%` };
  if (lead.verdict === "OVER")
    return { cls: `${base} bg-red-400/15 text-red-400`, text: `Over market +${lead.deltaPct}%` };
  if (lead.verdict === "AT")
    return { cls: `${base} bg-amber-400/15 text-amber-400`, text: "At market" };
  if (lead.verdict === "DISQUALIFIED")
    return { cls: `${base} bg-red-400/15 text-red-400`, text: "Broker listed" };
  if (lead.verdict === "UNKNOWN")
    return { cls: `${base} bg-blue-400/15 text-blue-400`, text: "Comps thin" };
  return { cls: `${base} bg-white/5 text-text-secondary`, text: "Not comped" };
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

function LeadCard({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const pill = verdictPill(lead);
  const script = messageScript(lead);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card transition-colors hover:border-gold">
      <div className="flex flex-col sm:flex-row">
        {lead.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lead.photo}
            alt={lead.title}
            className="h-48 w-full object-cover sm:h-auto sm:w-56 sm:shrink-0"
          />
        )}

        <div className="min-w-0 flex-1 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-text-primary">
                {lead.askLabel}
              </p>
              <h3 className="mt-0.5 truncate text-sm font-medium text-text-primary">{lead.title}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {lead.location}
                </span>
                <span className="flex items-center gap-1">
                  <Camera className="h-3 w-3" /> {lead.photoCount} photo{lead.photoCount === 1 ? "" : "s"}
                </span>
              </p>
            </div>
            <span className={pill.cls}>{pill.text}</span>
          </div>

          {lead.contacted && (
            <p className="mt-3 rounded-lg border border-border bg-bg-secondary/50 px-3 py-2 text-xs text-text-secondary">
              <span className="text-text-primary">{lead.contacted.who}</span> — {lead.contacted.state}
              {lead.contacted.on !== "earlier" && ` (${lead.contacted.on})`}
            </p>
          )}

          {lead.disqualifyReason && (
            <p className="mt-3 border-l-2 border-red-400/60 pl-3 text-xs leading-relaxed text-text-secondary">
              {lead.disqualifyReason}
            </p>
          )}

          {lead.pitchAngle && !lead.disqualifyReason && (
            <p className="mt-3 border-l-2 border-gold pl-3 font-[family-name:var(--font-cormorant)] text-base leading-relaxed text-text-primary">
              {lead.pitchAngle}
            </p>
          )}

          {lead.compNote && (
            <p className="mt-3 text-xs leading-relaxed text-text-secondary">
              <span className="font-semibold text-text-primary">Comps.</span> {lead.compNote}
              {lead.confidence && (
                <span className="text-text-secondary"> · confidence: {lead.confidence}</span>
              )}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={lead.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-gold transition-colors hover:text-gold-hover"
            >
              Open listing <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {lead.verdict !== "DISQUALIFIED" && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                {open ? "Hide message script" : "Message script"}
              </button>
            )}
            {lead.relistAt && lead.commission && lead.verdict !== "DISQUALIFIED" && (
              <span className="text-xs text-text-secondary">
                Relist {money(lead.relistAt)} · you take {money(lead.commission)} · seller nets{" "}
                {money(lead.ask)}
              </span>
            )}
          </div>

          {open && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              {script
                .filter((s) => s.body)
                .map((s, i) => (
                  <div key={s.step}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      {i + 1} · {s.step}
                    </p>
                    <div className="flex items-start gap-2">
                      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-bg-secondary/60 px-3 py-2 font-sans text-xs leading-relaxed text-text-primary">
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
  const [tab, setTab] = useState<Tab>("queue");

  const brokered = leads.filter((l) => l.verdict === "DISQUALIFIED");
  const contacted = leads.filter((l) => l.contacted && l.verdict !== "DISQUALIFIED");
  const queue = leads.filter((l) => !l.contacted && l.verdict !== "DISQUALIFIED");

  const shown = tab === "queue" ? queue : tab === "contacted" ? contacted : tab === "brokered" ? brokered : leads;

  const counts: Record<Tab, number> = {
    queue: queue.length,
    contacted: contacted.length,
    brokered: brokered.length,
    all: leads.length,
  };

  const stats = [
    { label: "Listings found", value: totalFound },
    { label: "Real FSBO targets", value: survivedFiltering },
    { label: "Contacted", value: contacted.length },
    { label: "Already brokered", value: brokered.length },
  ];

  return (
    <div className="p-6 lg:p-10">
      <div>
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary lg:text-4xl">
          Marketplace Leads
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          FSBO yacht sellers · Portland OR → Alaska · $150K–$2M · swept {sweptAt}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-bg-card p-5">
            <p className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
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
            <span className="ml-1.5 text-xs opacity-60">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {tab === "brokered" && (
        <p className="mb-5 rounded-xl border border-border border-l-2 border-l-red-400 bg-bg-card p-4 text-sm text-text-secondary">
          These boats are cross-listed on YachtWorld with a broker — verified before contact.
          Cross-listing is common at this price point, which is why the opener asks the broker
          question first.
        </p>
      )}

      {shown.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-10 text-center text-sm text-text-secondary">
          Nothing here yet.
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((l) => (
            <LeadCard key={l.id} lead={l} />
          ))}
        </div>
      )}
    </div>
  );
}
