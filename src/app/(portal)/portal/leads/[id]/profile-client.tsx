"use client";

import { CalendarClock, Flame, MessageSquarePlus, Save, ShieldAlert } from "lucide-react";
import { useState, useTransition } from "react";

import type { FbLead } from "@/lib/fb-leads";
import { logProfileMessage, saveLeadProfile, scheduleFollowUp } from "./profile-actions";

const localDateTime = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function ProfileClient({ lead }: { lead: FbLead }) {
  const [isHot, setIsHot] = useState(lead.is_hot);
  const [phone, setPhone] = useState(lead.seller_phone ?? "");
  const [timeframe, setTimeframe] = useState(lead.wants_timeframe ?? "");
  const [flexibility, setFlexibility] = useState(lead.wants_flexibility ?? "");
  const [motivation, setMotivation] = useState(lead.wants_motivation ?? "");
  const [notes, setNotes] = useState(lead.wants_notes ?? "");
  const [isBrokerListed, setIsBrokerListed] = useState(lead.is_broker_listed);
  const [brokerName, setBrokerName] = useState(lead.broker_name ?? "");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [message, setMessage] = useState("");
  const [followUpAt, setFollowUpAt] = useState(localDateTime(lead.next_touch_at));
  const [followUpNote, setFollowUpNote] = useState(lead.touch_reason ?? "Follow up with this seller");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setStatus(null);
    startTransition(async () => {
      try {
        await saveLeadProfile(lead.listing_id, {
          is_hot: isHot,
          seller_phone: phone,
          wants_timeframe: timeframe,
          wants_flexibility: flexibility,
          wants_motivation: motivation,
          wants_notes: notes,
          is_broker_listed: isBrokerListed,
          broker_name: brokerName,
        });
        setStatus("Profile saved.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not save profile.");
      }
    });
  }

  function logMessage() {
    setStatus(null);
    startTransition(async () => {
      try {
        await logProfileMessage(lead.listing_id, direction, message);
        setMessage("");
        setStatus("Conversation updated.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not log message.");
      }
    });
  }

  function schedule() {
    setStatus(null);
    startTransition(async () => {
      try {
        await scheduleFollowUp(lead.listing_id, new Date(followUpAt).toISOString(), followUpNote);
        setStatus("Follow-up scheduled. An email reminder will arrive at that time.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not schedule follow-up.");
      }
    });
  }

  const input =
    "w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-gold";

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
              Seller and opportunity
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              Keep the facts that determine what you say and when you follow up.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsHot((value) => !value)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
              isHot
                ? "border-orange-400/50 bg-orange-400/15 text-orange-300"
                : "border-border text-text-secondary hover:border-orange-400/50 hover:text-orange-300"
            }`}
          >
            <Flame className="h-4 w-4" /> {isHot ? "Hot lead" : "Mark hot"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            Seller phone
            <input className={`${input} mt-2`} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            Wants it sold by
            <input type="date" className={`${input} mt-2`} value={timeframe} onChange={(e) => setTimeframe(e.target.value)} />
          </label>
          <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            Price flexibility
            <select className={`${input} mt-2`} value={flexibility} onChange={(e) => setFlexibility(e.target.value)}>
              <option value="">Unknown</option>
              <option value="firm">Firm</option>
              <option value="open">Open</option>
              <option value="motivated">Motivated</option>
            </select>
          </label>
          <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            Motivation
            <select className={`${input} mt-2`} value={motivation} onChange={(e) => setMotivation(e.target.value)}>
              <option value="">Unknown</option>
              <option value="upgrading">Upgrading</option>
              <option value="downsizing">Downsizing</option>
              <option value="relocating">Relocating</option>
              <option value="estate">Estate</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-text-secondary">
          What they want / important context
          <textarea className={`${input} mt-2 min-h-28`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-gold-hover disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {pending ? "Saving…" : "Save profile"}
        </button>

        <div className={`mt-5 rounded-lg border p-4 ${isBrokerListed ? "border-yellow-400 bg-yellow-400/10" : "border-border bg-bg-secondary/50"}`}>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={isBrokerListed} onChange={(event) => setIsBrokerListed(event.target.checked)} className="mt-1 h-5 w-5 accent-yellow-400" />
            <span>
              <span className="flex items-center gap-2 font-semibold text-text-primary"><ShieldAlert className="h-4 w-4 text-yellow-300" /> Already listed with a broker</span>
              <span className="mt-1 block text-xs text-text-secondary">Removes this lead from the private-seller queue and displays a prominent warning.</span>
            </span>
          </label>
          {isBrokerListed && (
            <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-yellow-200">
              Current broker / brokerage
              <input className={input} value={brokerName} onChange={(event) => setBrokerName(event.target.value)} placeholder="Broker or brokerage name" />
            </label>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gold/30 bg-[linear-gradient(135deg,rgba(201,169,110,0.10),rgba(17,24,39,1)_55%)] p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-gold-muted p-2 text-gold"><CalendarClock className="h-5 w-5" /></span>
          <div>
            <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">Schedule follow-up</h2>
            <p className="text-xs text-text-secondary">Adds it to your queue and schedules an email reminder.</p>
          </div>
        </div>
        <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-text-secondary">
          Follow up date and time
          <input type="datetime-local" className={`${input} mt-2`} value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
        </label>
        <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-text-secondary">
          What to do
          <textarea className={`${input} mt-2 min-h-20`} value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} />
        </label>
        <button type="button" onClick={schedule} disabled={pending || !followUpAt} className="mt-4 inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-gold-hover disabled:opacity-50">
          <CalendarClock className="h-4 w-4" /> {pending ? "Scheduling…" : "Schedule and email me"}
        </button>
        {lead.reminder_scheduled_at && <p className="mt-3 text-xs text-text-secondary">Current email reminder: {new Date(lead.reminder_scheduled_at).toLocaleString()}</p>}
      </section>

      <section className="rounded-xl border border-border bg-bg-card p-5">
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
          Log conversation
        </h2>
        <div className="mt-4 flex gap-2">
          {(["in", "out"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDirection(value)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                direction === value ? "border-gold bg-gold-muted text-gold" : "border-border text-text-secondary"
              }`}
            >
              {value === "in" ? "Seller said" : "I sent"}
            </button>
          ))}
        </div>
        <textarea
          className={`${input} mt-3 min-h-24`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Record the seller's exact words or the message you sent."
        />
        <button
          type="button"
          onClick={logMessage}
          disabled={pending || !message.trim()}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-gold px-4 py-2 text-sm font-semibold text-gold hover:bg-gold-muted disabled:opacity-50"
        >
          <MessageSquarePlus className="h-4 w-4" /> Add to timeline
        </button>
        {status && <p className="mt-3 text-sm text-gold">{status}</p>}
      </section>
    </div>
  );
}
