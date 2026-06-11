import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Draft = {
  id: string;
  title: string | null;
  slug: string | null;
  excerpt: string | null;
  content_type: string | null;
  word_count: number | null;
  qa_status: string | null;
  qa_attempt: number | null;
  qa_last_feedback: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
};

const QA_STYLES: Record<string, string> = {
  pending_qa: "bg-blue-500/15 text-blue-300",
  qa_passed: "bg-emerald-500/15 text-emerald-300",
  qa_failed: "bg-amber-500/15 text-amber-300",
  rejected: "bg-red-500/15 text-red-300",
  approved: "bg-emerald-500/15 text-emerald-300",
};

export default async function BlogQueuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/portal/content-review/blog");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  const db = createAdminClient();
  const { data } = await db
    .from("blog_posts")
    .select(
      "id, title, slug, excerpt, content_type, word_count, qa_status, qa_attempt, qa_last_feedback, cover_image_url, created_at, updated_at"
    )
    .eq("published", false)
    .order("updated_at", { ascending: false });

  const drafts = (data ?? []) as Draft[];

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
          Newsletter &amp; Blog
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          SEO/AEO blog drafts awaiting approval. Publishing pushes the post live
          on grayyachts.media and notifies the SEO Strategist.
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
        <div className="space-y-3">
          {drafts.map((d) => (
            <Link
              key={d.id}
              href={`/portal/content-review/blog/${d.id}`}
              className="flex gap-4 rounded-xl border border-border bg-bg-card p-4 transition-colors hover:border-gold"
            >
              {d.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={d.cover_image_url}
                  alt=""
                  className="h-20 w-28 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-bg-primary/40">
                  <FileText className="h-6 w-6 text-text-secondary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      QA_STYLES[d.qa_status ?? ""] ?? "bg-slate-700/40 text-slate-300"
                    }`}
                  >
                    {d.qa_status ?? "draft"}
                  </span>
                  {d.content_type && (
                    <span className="text-xs text-text-secondary">
                      {d.content_type}
                    </span>
                  )}
                  {d.word_count && (
                    <span className="text-xs text-text-secondary">
                      · {d.word_count} words
                    </span>
                  )}
                  {(d.qa_attempt ?? 0) > 0 && (
                    <span className="text-xs text-text-secondary">
                      · attempt {d.qa_attempt}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 font-medium text-text-primary">
                  {d.title ?? "Untitled"}
                </p>
                {d.excerpt && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-text-secondary">
                    {d.excerpt}
                  </p>
                )}
                {d.qa_last_feedback && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-amber-300">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="line-clamp-1">{d.qa_last_feedback}</span>
                  </p>
                )}
              </div>
              <time className="shrink-0 text-xs text-text-secondary">
                {new Date(d.updated_at).toLocaleDateString()}
              </time>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
