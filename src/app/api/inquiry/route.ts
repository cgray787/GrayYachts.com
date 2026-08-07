import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TO = "connor@grayyachts.com";
const FROM = "Gray Yachts Website <onboarding@resend.dev>";

type Body = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  vessel?: string;
  /** Honeypot — real users never fill this; bots do. */
  company?: string;
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Rate limiting uses Cloudflare's INQUIRY_RATE_LIMIT binding (5 req / 60s per
 * IP), declared in wrangler.jsonc. An in-process Map is NOT sufficient here:
 * Workers spreads requests across isolates, so a per-isolate counter never
 * accumulates — verified against production, 7 rapid posts produced no 429.
 * If the binding is unavailable (local dev), we fail OPEN rather than block
 * genuine enquiries.
 *
 * ⚠️ VERIFIED INVOKED BUT NOT YET OBSERVED ENFORCING. Against production the
 * binding resolves and `.limit()` is called, but 8 rapid posts from one IP all
 * returned success — Cloudflare's rate-limiting binding is still beta and may
 * be plan-gated on this account. There is no live abuse surface yet because
 * RESEND_API_KEY is unset (the route 503s before sending). Re-run the burst
 * test once the key is set; if it still doesn't limit, move to a KV- or
 * Durable-Object-backed counter.
 */
type RateLimiter = { limit: (o: { key: string }) => Promise<{ success: boolean }> };

async function rateLimited(ip: string): Promise<{ limited: boolean; via: string }> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const rl = (ctx.env as unknown as { INQUIRY_RATE_LIMIT?: RateLimiter })
      .INQUIRY_RATE_LIMIT;
    if (!rl) return { limited: false, via: "no-binding" };
    const { success } = await rl.limit({ key: ip });
    return { limited: !success, via: "binding" };
  } catch (e) {
    console.error("[inquiry] rate-limit check failed", e);
    return { limited: false, via: "error" }; // fail open
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const message = (body.message ?? "").trim();
  const vessel = (body.vessel ?? "").trim();

  if (!name || !email) {
    return NextResponse.json(
      { ok: false, error: "Name and email are required." },
      { status: 422 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "That email address doesn't look right." },
      { status: 422 },
    );
  }
  if (name.length > 200 || email.length > 200 || phone.length > 60 || message.length > 5000) {
    return NextResponse.json({ ok: false, error: "Message too long." }, { status: 422 });
  }

  // Honeypot is checked AFTER validation so a bot can't distinguish it: an
  // empty body 422s either way, and a valid-looking body returns the same
  // 200 envelope whether or not the trap was tripped. We just don't send.
  if ((body.company ?? "").trim()) return NextResponse.json({ ok: true });

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const rl = await rateLimited(ip);
  if (rl.limited) {
    return NextResponse.json(
      { ok: false, error: "Too many messages — please try again shortly.", fallbackEmail: TO },
      { status: 429 },
    );
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Not configured yet — tell the client so it can show the direct-contact
    // fallback rather than pretending the enquiry was delivered.
    return NextResponse.json(
      { ok: false, error: "NOT_CONFIGURED", fallbackEmail: TO },
      { status: 503 },
    );
  }

  const subject = vessel
    ? `Website enquiry — ${vessel} — ${name}`
    : `Website enquiry — ${name}`;

  const html = [
    `<p><strong>Name:</strong> ${esc(name)}</p>`,
    `<p><strong>Email:</strong> ${esc(email)}</p>`,
    phone ? `<p><strong>Phone:</strong> ${esc(phone)}</p>` : "",
    vessel ? `<p><strong>Vessel:</strong> ${esc(vessel)}</p>` : "",
    message ? `<p><strong>Message:</strong><br>${esc(message).replace(/\n/g, "<br>")}</p>` : "",
    `<hr><p style="color:#888;font-size:12px">Sent from grayyachts.com</p>`,
  ].join("");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[inquiry] resend failed", res.status, detail.slice(0, 300));
      return NextResponse.json(
        { ok: false, error: "Could not send right now.", fallbackEmail: TO },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[inquiry] error", e);
    return NextResponse.json(
      { ok: false, error: "Could not send right now.", fallbackEmail: TO },
      { status: 502 },
    );
  }
}
