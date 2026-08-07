"use client";

import { useState } from "react";
import { Send, Check, AlertCircle } from "lucide-react";

type State = "idle" | "sending" | "sent" | "error";

/**
 * Replaces the old mailto: CTA. A mailto link silently does nothing when the
 * browser has no mail handler registered, which is why "Contact Connor"
 * appeared dead. This posts to /api/inquiry instead, and degrades to showing
 * the direct address if the mail backend isn't configured.
 */
export function InquiryForm({ vessel }: { vessel?: string }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setState("sending");
    setError(null);
    setFallback(null);

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          message: data.get("message"),
          company: data.get("company"), // honeypot
          vessel: vessel ?? "",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        fallbackEmail?: string;
      };

      if (res.ok && json.ok) {
        setState("sent");
        form.reset();
        return;
      }
      setState("error");
      setFallback(json.fallbackEmail ?? "connor@grayyachts.com");
      setError(
        json.error === "NOT_CONFIGURED"
          ? "The contact form isn't switched on yet."
          : json.error || "Something went wrong.",
      );
    } catch {
      setState("error");
      setFallback("connor@grayyachts.com");
      setError("Network error.");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-xl border border-gold/40 bg-gold/5 p-6 text-center">
        <Check size={22} className="mx-auto text-gold" />
        <p className="mt-3 font-[family-name:var(--font-cormorant)] text-xl font-light text-text-primary">
          Message sent
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Connor will get back to you within 24 hours.
        </p>
      </div>
    );
  }

  const field =
    "mt-2 w-full rounded-lg border border-border bg-bg-primary px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors duration-300 placeholder:text-text-secondary/60 focus:border-gold";
  const label = "text-[10px] tracking-[0.25em] text-text-secondary";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot — visually hidden, not display:none, so bots still fill it. */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label className={label} htmlFor="iq-name">
          NAME <span className="text-gold">*</span>
        </label>
        <input id="iq-name" name="name" required placeholder="Your name" className={field} />
      </div>

      <div>
        <label className={label} htmlFor="iq-email">
          EMAIL <span className="text-gold">*</span>
        </label>
        <input
          id="iq-email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className={field}
        />
      </div>

      <div>
        <label className={label} htmlFor="iq-phone">
          PHONE
        </label>
        <input
          id="iq-phone"
          name="phone"
          type="tel"
          placeholder="(206) 000-0000"
          className={field}
        />
      </div>

      <div>
        <label className={label} htmlFor="iq-message">
          MESSAGE
        </label>
        <textarea
          id="iq-message"
          name="message"
          rows={4}
          placeholder="I&rsquo;d like to schedule a viewing…"
          className={field + " resize-y"}
        />
      </div>

      <button
        type="submit"
        disabled={state === "sending"}
        className="flex w-full items-center justify-center gap-2 bg-gold px-6 py-3 text-[10px] font-semibold tracking-[0.2em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover disabled:opacity-60"
      >
        {state === "sending" ? "SENDING…" : "REQUEST INFO"}
        {state !== "sending" && <Send size={14} />}
      </button>

      {state === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-bg-primary p-3">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-gold" />
          <p className="text-xs leading-relaxed text-text-secondary">
            {error}{" "}
            {fallback && (
              <>
                Email{" "}
                <a href={`mailto:${fallback}`} className="text-gold underline">
                  {fallback}
                </a>{" "}
                or call{" "}
                <a href="tel:4256718474" className="text-gold underline">
                  425-671-8474
                </a>
                .
              </>
            )}
          </p>
        </div>
      )}

      <p className="text-center text-[11px] text-text-secondary">
        Connor will respond within 24 hours
      </p>
    </form>
  );
}
