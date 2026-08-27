"use client";

import { ExternalLink, MessageSquareText, Plus, Search, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { addFacebookLead } from "./actions";

export default function AddLeadClient() {
  const router = useRouter();
  const [listingUrl, setListingUrl] = useState("");
  const [messengerUrl, setMessengerUrl] = useState("");
  const [chatTranscript, setChatTranscript] = useState("");
  const [isBrokerListed, setIsBrokerListed] = useState(false);
  const [brokerName, setBrokerName] = useState("");
  const [extensionReady, setExtensionReady] = useState(false);
  const [chatStatus, setChatStatus] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.data?.source !== "gy-ext") return;
      if (event.data.type === "GY_EXT_READY" || (event.data.type === "GY_EXT_PONG" && event.data.ok)) {
        setExtensionReady(true);
      }
      if (event.data.type === "GY_EXT_CHAT") {
        setChatStatus(event.data.ok ? `Imported ${event.data.count ?? 0} visible messages.` : event.data.reason || "Chat import failed.");
        if (event.data.ok && event.data.transcript) setChatTranscript(event.data.transcript);
      }
    };
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "gy-portal", type: "GY_EXT_PING" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function importChat() {
    if (!messengerUrl.trim()) {
      setChatStatus("Paste the Messenger chat URL first.");
      return;
    }
    setChatStatus("Opening the chat and reading visible messages…");
    window.postMessage(
      { source: "gy-portal", type: "GY_EXT_IMPORT_CHAT", url: messengerUrl.trim() },
      window.location.origin,
    );
  }

  function submit() {
    setStatus(null);
    startTransition(async () => {
      try {
        const result = await addFacebookLead({
          listingUrl,
          messengerUrl,
          chatTranscript,
          isBrokerListed,
          brokerName,
        });
        setStatus(`Lead added. Captured ${result.photosCaptured} of ${result.scrapedPhotoCount} listing photos.`);
        router.push(`/portal/leads/${result.listingId}`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not add the lead.");
      }
    });
  }

  const input = "mt-2 w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text-primary outline-none focus:border-gold";

  return (
    <div className="p-6 lg:p-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">FB CRM</p>
        <h1 className="mt-2 font-[family-name:var(--font-cormorant)] text-4xl font-semibold text-text-primary">Add Facebook lead</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Paste the Marketplace listing and optional Messenger thread. The CRM pulls the boat, price, location, seller details, description, and up to 12 photos into permanent storage.
        </p>

        <section className="mt-7 rounded-xl border border-border bg-bg-card p-5">
          <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            Marketplace listing URL
            <input className={input} value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} placeholder="https://www.facebook.com/marketplace/item/…" />
          </label>
          <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
            <Search className="h-3.5 w-3.5 text-gold" /> Public listing data and photos are scraped automatically.
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-border bg-bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">Messenger conversation</h2><p className="mt-1 text-xs text-text-secondary">Optional, but keeps the listing and seller conversation together.</p></div>
            <span className={`rounded-full px-3 py-1 text-xs ${extensionReady ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-text-secondary"}`}>{extensionReady ? "Read-only extension ready" : "Manual paste available"}</span>
          </div>
          <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-text-secondary">
            Messenger chat URL
            <input className={input} value={messengerUrl} onChange={(event) => setMessengerUrl(event.target.value)} placeholder="https://www.facebook.com/messages/t/…" />
          </label>
          <button type="button" onClick={importChat} disabled={!extensionReady} className="mt-3 inline-flex items-center gap-2 rounded-md border border-gold px-3 py-2 text-xs font-semibold text-gold hover:bg-gold-muted disabled:cursor-not-allowed disabled:opacity-40">
            <MessageSquareText className="h-4 w-4" /> Check open chat
          </button>
          {chatStatus && <p className="mt-2 text-xs text-gold">{chatStatus}</p>}
          <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-text-secondary">
            Chat transcript / seller messages
            <textarea className={`${input} min-h-40`} value={chatTranscript} onChange={(event) => setChatTranscript(event.target.value)} placeholder="The extension fills this automatically, or paste the conversation here." />
          </label>
        </section>

        <section className={`mt-5 rounded-xl border p-5 ${isBrokerListed ? "border-yellow-400 bg-yellow-400/10" : "border-border bg-bg-card"}`}>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={isBrokerListed} onChange={(event) => setIsBrokerListed(event.target.checked)} className="mt-1 h-5 w-5 accent-yellow-400" />
            <span><span className="flex items-center gap-2 font-semibold text-text-primary"><ShieldAlert className="h-4 w-4 text-yellow-300" /> Already listed with a broker</span><span className="mt-1 block text-xs text-text-secondary">Flags the lead, closes it from the private-seller queue, and shows a large yellow warning on the profile.</span></span>
          </label>
          {isBrokerListed && <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-yellow-200">Current broker / brokerage<input className={input} value={brokerName} onChange={(event) => setBrokerName(event.target.value)} placeholder="Broker or brokerage name" /></label>}
        </section>

        <button type="button" onClick={submit} disabled={pending || !listingUrl.trim()} className="mt-6 inline-flex items-center gap-2 rounded-md bg-gold px-5 py-3 text-sm font-semibold text-bg-primary hover:bg-gold-hover disabled:opacity-50">
          <Plus className="h-4 w-4" /> {pending ? "Scraping and saving…" : "Add lead"}
        </button>
        <a href={listingUrl || "#"} target="_blank" rel="noopener noreferrer" className="ml-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-gold">Preview listing <ExternalLink className="h-3.5 w-3.5" /></a>
        {status && <p className="mt-4 rounded-lg border border-border bg-bg-card px-4 py-3 text-sm text-gold">{status}</p>}
      </div>
    </div>
  );
}
