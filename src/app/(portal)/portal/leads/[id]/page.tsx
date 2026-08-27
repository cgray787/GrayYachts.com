import { ExternalLink, Flame, MapPin, MessageCircle, ShieldAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { STAGE_LABEL, nextAction, type FbLead, type FbLeadMessage } from "@/lib/fb-leads";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import LeadHeroPhoto from "./hero-photo";
import ImageControls from "./image-controls";
import ProfileClient from "./profile-client";

export const dynamic = "force-dynamic";

const money = (value: number | null) =>
  value === null ? "Price not listed" : `$${Math.round(value).toLocaleString()}`;

export default async function LeadProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/portal/leads/${encodeURIComponent(id)}`);
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  const db = createAdminClient();
  const [{ data: lead, error }, { data: messages, error: messagesError }, { data: images, error: imagesError }] = await Promise.all([
    db.from("fb_leads").select("*").eq("listing_id", id).maybeSingle(),
    db.from("fb_lead_messages").select("*").eq("listing_id", id).order("sent_at"),
    db.from("fb_lead_images").select("storage_path,sort_order").eq("listing_id", id).order("sort_order"),
  ]);
  if (error || messagesError || imagesError) {
    throw new Error(error?.message ?? messagesError?.message ?? imagesError?.message ?? "Could not load lead");
  }
  if (!lead) notFound();

  const typedLead = lead as FbLead;
  const storedImage = typedLead.image_path
    ? (await db.storage.from("fb-lead-images").createSignedUrl(typedLead.image_path, 3600)).data?.signedUrl ?? null
    : null;
  const gallery = await Promise.all(
    (images ?? []).map(async (image) => ({
      ...image,
      url: (await db.storage.from("fb-lead-images").createSignedUrl(image.storage_path, 3600)).data?.signedUrl ?? null,
    })),
  );
  const timeline = (messages ?? []) as FbLeadMessage[];
  const firstContact = timeline[0]?.sent_at ?? null;
  const lastContact = timeline.at(-1)?.sent_at ?? null;

  return (
    <div className="p-6 lg:p-10">
      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/portal/leads" className="text-gold hover:text-gold-hover">← Today&apos;s queue</Link>
        <Link href="/portal/leads/all" className="text-text-secondary hover:text-text-primary">All leads</Link>
      </nav>

      {typedLead.is_broker_listed && (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border-2 border-yellow-300 bg-yellow-300 px-6 py-5 text-yellow-950 shadow-xl shadow-yellow-500/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-7 w-7 shrink-0" />
            <div>
              <p className="text-lg font-black uppercase tracking-[0.12em]">Already listed with a broker</p>
              <p className="mt-1 text-sm font-medium">Do not pitch this as a private-sale lead.{typedLead.broker_name ? ` Current representation: ${typedLead.broker_name}.` : " Confirm the current broker and agreement expiration."}</p>
            </div>
          </div>
          <span className="rounded-full bg-yellow-950 px-4 py-2 text-xs font-bold uppercase tracking-wider text-yellow-200">Broker flagged</span>
        </div>
      )}

      <header className="relative mt-6 min-h-[420px] overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl shadow-black/30">
        <LeadHeroPhoto
          listingId={typedLead.listing_id}
          storedUrl={storedImage}
          facebookUrl={typedLead.photo}
          title={typedLead.title}
        />
        <ImageControls listingId={typedLead.listing_id} autoCapture={!typedLead.image_path && Boolean(typedLead.photo)} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060a12] via-[#060a12]/35 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl text-white drop-shadow-lg">
              <p className="font-[family-name:var(--font-cormorant)] text-5xl font-semibold sm:text-6xl">
                {money(typedLead.ask)}
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl font-semibold sm:text-4xl">
                {typedLead.title}
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/75">
                {typedLead.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{typedLead.location}</span>}
                {typedLead.seller_name && <span>{typedLead.seller_name}</span>}
                <span>{typedLead.photo_count ?? 0} listing photos</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {typedLead.is_hot && <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/40 bg-orange-500/25 px-3 py-1.5 text-xs font-semibold text-orange-100 backdrop-blur-md"><Flame className="h-3.5 w-3.5" /> Hot lead</span>}
              <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-xs text-white/80 backdrop-blur-md">{STAGE_LABEL[typedLead.stage]}</span>
              <a href={typedLead.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-bg-primary shadow-lg hover:bg-gold-hover">
                Open Facebook listing <ExternalLink className="h-4 w-4" />
              </a>
              {typedLead.messenger_url && <a href={typedLead.messenger_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-black/35 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md hover:bg-black/55"><MessageCircle className="h-4 w-4" /> Open seller chat</a>}
            </div>
          </div>
        </div>
      </header>

      {gallery.length > 1 && (
        <section className="mt-6 rounded-xl border border-border bg-bg-card p-5">
          <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">Facebook listing photos</h2>
          <p className="mt-1 text-xs text-text-secondary">Captured permanently when the lead was added.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {gallery.slice(1).map((image, index) => image.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={image.storage_path} src={image.url} alt={`${typedLead.title} listing photo ${index + 2}`} className="aspect-[4/3] w-full rounded-lg border border-border object-cover" />
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <ProfileClient lead={typedLead} />

        <div className="space-y-5">
          {(typedLead.listing_description || typedLead.seller_profile_url) && (
            <section className="rounded-xl border border-border bg-bg-card p-5">
              <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">Facebook source</h2>
              {typedLead.seller_profile_url && <a href={typedLead.seller_profile_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-gold hover:text-gold-hover"><UserRound className="h-4 w-4" /> Open seller profile</a>}
              {typedLead.listing_description && <p className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{typedLead.listing_description}</p>}
            </section>
          )}
          <section className="rounded-xl border border-border bg-bg-card p-5">
            <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">Next step</h2>
            <p className="mt-3 text-lg font-medium text-gold">{nextAction(typedLead) ?? "No active action"}</p>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-text-secondary">Why</dt><dd className="text-text-primary">{typedLead.touch_reason ?? "—"}</dd>
              <dt className="text-text-secondary">Due</dt><dd className="text-text-primary">{typedLead.next_touch_at ? new Date(typedLead.next_touch_at).toLocaleString() : "Not scheduled"}</dd>
              <dt className="text-text-secondary">Touches</dt><dd className="text-text-primary">{typedLead.touch_count}</dd>
              <dt className="text-text-secondary">First contact</dt><dd className="text-text-primary">{firstContact ? new Date(firstContact).toLocaleDateString() : "—"}</dd>
              <dt className="text-text-secondary">Last contact</dt><dd className="text-text-primary">{lastContact ? new Date(lastContact).toLocaleString() : "—"}</dd>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-bg-card p-5">
            <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">Market position</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs uppercase tracking-wider text-text-secondary">Verdict</dt><dd className="mt-1 text-text-primary">{typedLead.verdict ?? "Not researched"}{typedLead.delta_pct !== null ? ` · ${typedLead.delta_pct}%` : ""}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-text-secondary">Comps</dt><dd className="mt-1 leading-relaxed text-text-primary">{typedLead.comp_note ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-text-secondary">Pitch angle</dt><dd className="mt-1 leading-relaxed text-text-primary">{typedLead.pitch_angle ?? "—"}</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-bg-card p-5">
            <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">Conversation</h2>
            {timeline.length === 0 ? (
              <p className="mt-4 text-sm text-text-secondary">No conversation logged yet.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {timeline.map((message) => (
                  <li key={message.id} className={`rounded-lg border p-3 ${message.direction === "in" ? "border-emerald-400/30 bg-emerald-400/5" : "border-border bg-bg-secondary/60"}`}>
                    <div className="flex justify-between gap-3 text-xs text-text-secondary">
                      <span>{message.direction === "in" ? typedLead.seller_name ?? "Seller" : "You"}{message.step ? ` · ${message.step}` : ""}</span>
                      <time>{new Date(message.sent_at).toLocaleString()}</time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{message.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
