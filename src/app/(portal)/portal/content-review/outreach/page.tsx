import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { approveOutreach, rejectOutreach } from "../actions";

export const dynamic = "force-dynamic";

type Draft = {
  id: string;
  lead_type: string | null;
  email_address: string | null;
  status: string;
  draft_content: { subject?: string; body?: string } | null;
  created_at: string;
  prospect_id: string | null;
  prospects: {
    name: string | null;
    email: string | null;
    source: string | null;
    location: string | null;
    yacht_name: string | null;
  } | null;
};

export default async function OutreachQueuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/portal/content-review/outreach");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  const db = createAdminClient();
  const { data } = await db
    .from("outreach_sequences")
    .select(
      "id, lead_type, email_address, status, draft_content, created_at, prospect_id, prospects(name, email, source, location, yacht_name)"
    )
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  const drafts = (data ?? []) as unknown as Draft[];

  return (
    <div className="p-6 lg:p-10">
      <Link
        href="/portal/content-review"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-gold"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Content Review
      </Link>

      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary lg:text-4xl">
          Cold Email Outreach
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Drafts waiting for approval. Approving triggers the Outreach Agent to
          send on its next run.
        </p>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="mt-4 text-sm text-text-secondary">
            No drafts waiting. You&apos;re caught up.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((d) => (
            <DraftCard key={d.id} draft={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DraftCard({ draft }: { draft: Draft }) {
  const subject = draft.draft_content?.subject ?? "(no subject)";
  const body = draft.draft_content?.body ?? "";
  const prospect = draft.prospects;
  const recipient = draft.email_address ?? prospect?.email ?? "(no address)";

  const approve = approveOutreach.bind(null, draft.id);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-text-secondary">
            {draft.lead_type ?? "lead"}
          </p>
          <p className="mt-1 truncate font-medium text-text-primary">
            {prospect?.name ?? recipient}
          </p>
          <p className="mt-0.5 truncate text-sm text-text-secondary">
            {[recipient, prospect?.yacht_name, prospect?.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <time className="text-xs text-text-secondary">
          {new Date(draft.created_at).toLocaleString()}
        </time>
      </div>

      <div className="space-y-3 p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">
            Subject
          </p>
          <p className="mt-1 text-sm font-medium text-text-primary">{subject}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">
            Body
          </p>
          <pre className="mt-1 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-bg-primary/40 p-3 font-sans text-sm text-text-primary">
            {body}
          </pre>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border p-5 md:flex-row md:items-start">
        <form action={approve} className="md:shrink-0">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            <CheckCircle2 className="h-4 w-4" /> Approve &amp; send
          </button>
        </form>
        <form action={rejectOutreach} className="flex-1">
          <input type="hidden" name="id" value={draft.id} />
          <textarea
            name="note"
            required
            placeholder="Feedback for the Outreach Agent to redraft (required to reject)"
            rows={2}
            className="w-full rounded-lg border border-border bg-bg-primary/40 p-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-red-400 focus:outline-none"
          />
          <button
            type="submit"
            className="mt-2 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            Reject with feedback
          </button>
        </form>
      </div>
    </div>
  );
}
