import { NextResponse } from "next/server";
import { clientIp, rateLimited, INQUIRY_LIMIT } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const TO = "connorgray@jeffbrownyachts.com";
const FROM = "Gray Yachts Website <onboarding@resend.dev>";
/** Shown to the visitor when we can't send — the public-facing address. */
const PUBLIC_CONTACT = "connor@grayyachts.com";

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

  // Per-IP limit shared across isolates (KV); see src/lib/rate-limit.ts.
  const rl = await rateLimited(clientIp(req), INQUIRY_LIMIT);
  if (rl.limited) {
    return NextResponse.json(
      { ok: false, error: "Too many messages — please try again shortly.", fallbackEmail: PUBLIC_CONTACT },
      { status: 429 },
    );
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Not configured yet — tell the client so it can show the direct-contact
    // fallback rather than pretending the inquiry was delivered.
    return NextResponse.json(
      { ok: false, error: "NOT_CONFIGURED", fallbackEmail: PUBLIC_CONTACT },
      { status: 503 },
    );
  }

  const subject = vessel
    ? `Website inquiry — ${vessel} — ${name}`
    : `Website inquiry — ${name}`;

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
        { ok: false, error: "Could not send right now.", fallbackEmail: PUBLIC_CONTACT },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[inquiry] error", e);
    return NextResponse.json(
      { ok: false, error: "Could not send right now.", fallbackEmail: PUBLIC_CONTACT },
      { status: 502 },
    );
  }
}
