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

  // Silently accept honeypot hits so bots don't learn anything.
  if ((body.company ?? "").trim()) return NextResponse.json({ ok: true });

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
