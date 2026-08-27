"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Flame, MapPin, Plus } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  liveStep,
  messageScript,
  visibleQueue,
  type FbLead,
} from "@/lib/fb-leads";
import { closeLead, logSent, snooze } from "./actions";

const money = (value: number | null) =>
  value === null ? "Price not listed" : `$${Math.round(value).toLocaleString()}`;

function dueLabel(nextTouchAt: string | null) {
  if (!nextTouchAt) return "Due now";
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(nextTouchAt).getTime()) / 86_400_000),
  );
  if (days === 0) return "Due today";
  return days === 1 ? "1 day overdue" : `${days} days overdue`;
}

export default function QueueClient({
  initialDue,
  totalLeads,
}: {
  initialDue: FbLead[];
  totalLeads: number;
}) {
  const router = useRouter();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const leads = useMemo(
    () => visibleQueue(initialDue, dismissedIds),
    [initialDue, dismissedIds],
  );

  // A due timer or an external reply can change the queue with no local click.
  // Refresh server props once a minute; visibleQueue derives from each payload
  // rather than trapping the first payload in client state.
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [router]);

  function finish(listingId: string, action: () => Promise<void>) {
    setPendingId(listingId);
    setError(null);
    startTransition(async () => {
      try {
        await action();
        setDismissedIds((current) =>
          current.includes(listingId) ? current : [...current, listingId],
        );
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "The lead could not be updated.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">FB CRM</p>
          <h1 className="mt-2 font-[family-name:var(--font-cormorant)] text-4xl font-semibold text-text-primary lg:text-5xl">
            Today&apos;s queue
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            Work the warmest private-sale opportunities first. Future follow-ups and out-of-area
            research stay in the full list.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/leads/new" className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-gold-hover"><Plus className="h-4 w-4" /> Add lead</Link>
          <Link
            href="/portal/leads/all"
            className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-gold hover:text-gold"
          >
            View all {totalLeads} leads
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-bg-card p-5">
          <p className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
            {leads.length}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-text-secondary">Due now</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-5">
          <p className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
            {leads.filter((lead) => lead.stage === "replied").length}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-text-secondary">Seller replied</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-5">
          <p className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
            {totalLeads}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-text-secondary">Leads on file</p>
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {leads.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-bg-card p-12 text-center">
          <Check className="mx-auto h-7 w-7 text-emerald-400" />
          <h2 className="mt-3 font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-text-primary">
            Nothing due today
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            The queue will refill automatically when the next follow-up is due.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {leads.map((lead) => {
            const stepIndex = liveStep(lead);
            const step = stepIndex >= 0 ? messageScript(lead)[stepIndex] : undefined;
            const isPending = pending && pendingId === lead.listing_id;

            return (
              <article
                key={lead.listing_id}
                className={`overflow-hidden rounded-xl border bg-bg-card ${
                  lead.stage === "replied" ? "border-emerald-400/40" : "border-border"
                }`}
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="h-44 bg-bg-secondary sm:h-auto sm:w-52 sm:shrink-0">
                    {/* A missing lead photo is better than an unrelated stock yacht. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/leads/${lead.listing_id}.jpg`}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary">
                          {money(lead.ask)}
                        </p>
                        <h2 className="mt-1 text-base font-medium text-text-primary">
                          <Link href={`/portal/leads/${lead.listing_id}`} className="hover:text-gold">
                            {lead.title}
                          </Link>
                        </h2>
                        <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                          {lead.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {lead.location}
                            </span>
                          )}
                          {lead.seller_name && <span>{lead.seller_name}</span>}
                          <span>{lead.touch_count} touches</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {lead.is_hot && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/15 px-3 py-1 text-xs font-semibold text-orange-300">
                            <Flame className="h-3.5 w-3.5" /> Hot
                          </span>
                        )}
                        <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
                          {dueLabel(lead.next_touch_at)}
                        </span>
                      </div>
                    </div>

                    <p className="mt-4 border-l-2 border-gold pl-3 text-sm text-text-primary">
                      {lead.touch_reason ?? "Follow up with this seller"}
                    </p>

                    {step?.body && (
                      <div className="mt-4 rounded-lg border border-border bg-bg-secondary/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                            Message ready
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(step.body);
                              setCopiedId(lead.listing_id);
                              window.setTimeout(() => setCopiedId(null), 1600);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-gold"
                          >
                            {copiedId === lead.listing_id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiedId === lead.listing_id ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                          {step.body}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      {step?.body && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            finish(lead.listing_id, () =>
                              logSent(lead.listing_id, step.step, step.body),
                            )
                          }
                          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-gold-hover disabled:opacity-50"
                        >
                          {isPending ? "Saving…" : "Mark sent"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => finish(lead.listing_id, () => snooze(lead.listing_id, 7))}
                        className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:border-gold hover:text-gold disabled:opacity-50"
                      >
                        Snooze 7 days
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          finish(lead.listing_id, () =>
                            closeLead(lead.listing_id, "not_interested"),
                          )
                        }
                        className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:border-red-400/60 hover:text-red-300 disabled:opacity-50"
                      >
                        Not interested
                      </button>
                      <a
                        href={lead.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1.5 px-2 py-2 text-sm text-gold hover:text-gold-hover"
                      >
                        Open listing <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <Link
                        href={`/portal/leads/${lead.listing_id}`}
                        className="px-2 py-2 text-sm text-text-secondary hover:text-gold"
                      >
                        View profile
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
