import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lead endpoint for the /sell valuation page.
 *
 * Emails each completed valuation request to Connor. Reply-To is set to the
 * lead's own address, so hitting reply in the inbox goes straight to the owner
 * — speed-to-lead is the single biggest free lever on this funnel and every
 * extra step costs minutes.
 *
 * Sends via Resend. `grayyachts.com` is not yet a verified sending domain
 * there, so the From falls back to Resend's shared domain; verify the domain
 * in Resend and set LEAD_FROM to switch it over without touching this code.
 */

const LEAD_TO = process.env.LEAD_TO || "connorgray@jeffbrownyachts.com";
const LEAD_FROM = process.env.LEAD_FROM || "Gray Yachts <onboarding@resend.dev>";

/** Fields the quiz collects, in the order they are worth reading. */
const ORDER = [
  ["intent", "Where they are"],
  ["timeframe", "Timeframe"],
  ["length", "Length"],
  ["brand", "Brand"],
  ["year_make_model", "Year, make & model"],
  ["engine_hours", "Engine hours"],
  ["condition", "Condition"],
] as const;

const ATTRIBUTION = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "fbclid",
  "ad_id",
  "adset_id",
  "campaign_id",
  "placement",
  "landing_page",
  "referrer",
] as const;

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  // Honeypot: bots fill hidden fields, humans never see them.
  if (body._gotcha || body.hp) {
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  if (!name || !email || !phone) {
    return NextResponse.json(
      { ok: false, error: "missing_required" },
      { status: 400 },
    );
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Fail loudly rather than swallowing a lead we cannot deliver.
    console.error("[valuation] RESEND_API_KEY is not set — lead not delivered");
    return NextResponse.json(
      { ok: false, error: "mailer_unconfigured" },
      { status: 500 },
    );
  }

  const vessel =
    String(body.year_make_model ?? body.brand ?? "vessel").trim() || "vessel";

  /* Photos arrive already downscaled to ~1600px JPEG by the browser, so three
     of them land well inside Resend's 40MB attachment ceiling. Re-check here
     anyway: the client is not a trust boundary, and an oversized payload would
     fail at the provider with a far less obvious error than this one. */
  const MAX_PHOTOS = 3;
  const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
  const rawPhotos = Array.isArray(body.photos) ? body.photos : [];
  const attachments: { filename: string; content: string }[] = [];
  let photoBytes = 0;

  for (const p of rawPhotos.slice(0, MAX_PHOTOS)) {
    if (!p || typeof p !== "object") continue;
    const { filename, content } = p as { filename?: unknown; content?: unknown };
    if (typeof content !== "string" || !content) continue;
    // base64 decodes to roughly 3/4 of its own length.
    photoBytes += Math.floor(content.length * 0.75);
    if (photoBytes > MAX_PHOTO_BYTES) {
      console.error("[valuation] photos exceeded size cap — dropping the rest");
      break;
    }
    attachments.push({
      filename:
        typeof filename === "string" && /^[\w.-]{1,64}$/.test(filename)
          ? filename
          : `yacht-${attachments.length + 1}.jpg`,
      content,
    });
  }

  const answers = ORDER.filter(([k]) => body[k])
    .map(([k, label]) => `<tr><td style="padding:4px 14px 4px 0;color:#8892A5">${label}</td><td style="padding:4px 0;color:#0f172a"><strong>${esc(body[k])}</strong></td></tr>`)
    .join("");

  const attribution = ATTRIBUTION.filter((k) => body[k])
    .map((k) => `<tr><td style="padding:2px 14px 2px 0;color:#8892A5">${k}</td><td style="padding:2px 0;color:#475569">${esc(body[k])}</td></tr>`)
    .join("");

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px">
    <p style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#C9A96E;margin:0 0 6px">
      Gray Yachts &middot; new valuation request
    </p>
    <h2 style="margin:0 0 4px;font-size:22px;color:#0f172a">${esc(name)}</h2>
    <p style="margin:0 0 18px;color:#475569">${esc(vessel)}</p>

    <p style="margin:0 0 18px">
      <a href="mailto:${esc(email)}" style="color:#0f172a">${esc(email)}</a><br>
      <a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}" style="color:#0f172a">${esc(phone)}</a>
    </p>

    <table style="border-collapse:collapse;font-size:14px;margin-bottom:20px">${answers}</table>

    ${
      attachments.length
        ? `<p style="margin:0 0 18px;font-size:14px;color:#0f172a">
             <strong>${attachments.length} photo${attachments.length === 1 ? "" : "s"} attached</strong>
             &mdash; they asked for a full market comp.
           </p>`
        : ""
    }

    ${
      attribution
        ? `<p style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8892A5;margin:0 0 6px">Where they came from</p>
           <table style="border-collapse:collapse;font-size:12px">${attribution}</table>`
        : ""
    }

    <p style="margin-top:24px;font-size:12px;color:#8892A5">
      Reply to this email to answer ${esc(name.split(" ")[0] || "them")} directly.
    </p>
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: LEAD_FROM,
      to: [LEAD_TO],
      reply_to: email,
      subject: `New valuation request — ${name} (${vessel})`,
      html,
      ...(attachments.length ? { attachments } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("[valuation] resend failed", res.status, detail);
    return NextResponse.json(
      { ok: false, error: "send_failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
