import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { publishBlog, rejectBlog } from "../../actions";

export const dynamic = "force-dynamic";

type Post = {
  id: string;
  title: string | null;
  slug: string | null;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  schema_json: unknown;
  content_type: string | null;
  word_count: number | null;
  qa_status: string | null;
  qa_attempt: number | null;
  qa_last_feedback: string | null;
  author: string | null;
  created_at: string;
  updated_at: string;
};

type Review = {
  id: string;
  pass_num: number | null;
  pass_name: string | null;
  status: string | null;
  issues: unknown;
  reviewed_at: string | null;
};

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  const { id } = await params;
  const db = createAdminClient();

  const [{ data: post }, { data: reviews }] = await Promise.all([
    db.from("blog_posts").select("*").eq("id", id).single(),
    db
      .from("qa_reviews")
      .select("id, pass_num, pass_name, status, issues, reviewed_at")
      .eq("post_id", id)
      .order("pass_num", { ascending: true }),
  ]);

  if (!post) notFound();
  const p = post as Post;
  const qaPasses = (reviews ?? []) as Review[];

  const publish = publishBlog.bind(null, p.id);

  return (
    <div className="p-6 lg:p-10">
      <Link
        href="/portal/content-review/blog"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-gold"
      >
        <ChevronLeft className="h-4 w-4" /> Back to queue
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300">
              {p.qa_status ?? "draft"}
            </span>
            {p.content_type && (
              <span className="text-xs text-text-secondary">
                {p.content_type}
              </span>
            )}
            {p.word_count && (
              <span className="text-xs text-text-secondary">
                · {p.word_count} words
              </span>
            )}
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary lg:text-4xl">
            {p.title ?? "Untitled"}
          </h1>
          {p.slug && (
            <p className="mt-1 font-mono text-xs text-text-secondary">
              /{p.slug}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <form action={publish}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              <CheckCircle2 className="h-4 w-4" /> Publish
            </button>
          </form>
        </div>
      </div>

      {p.qa_last_feedback && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-300">
              Last feedback
            </p>
            <p className="mt-1 text-sm text-amber-100">{p.qa_last_feedback}</p>
          </div>
        </div>
      )}

      {p.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.cover_image_url}
          alt=""
          className="mb-6 w-full rounded-xl border border-border object-cover"
        />
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-border bg-bg-card p-5 lg:grid-cols-2">
        <MetaField label="Meta description" value={p.meta_description} />
        <MetaField label="OG title" value={p.og_title} />
        <MetaField
          label="OG description"
          value={p.og_description}
          className="lg:col-span-2"
        />
        <MetaField label="Author" value={p.author} />
        <MetaField
          label="Schema.org types"
          value={
            Array.isArray(p.schema_json)
              ? (p.schema_json as Array<{ "@type"?: string }>)
                  .map((s) => s["@type"])
                  .filter(Boolean)
                  .join(", ") || null
              : null
          }
        />
      </div>

      {qaPasses.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-text-secondary">
            QA Passes
          </h2>
          <ul className="space-y-2">
            {qaPasses.map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-bg-primary/40 p-3"
              >
                <span
                  className={`mt-0.5 inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium ${
                    r.status === "passed"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : r.status === "failed"
                        ? "bg-red-500/15 text-red-300"
                        : "bg-slate-700/40 text-slate-300"
                  }`}
                >
                  {r.status ?? "—"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-text-primary">
                    Pass {r.pass_num}: {r.pass_name ?? "—"}
                  </p>
                  {Array.isArray(r.issues) && r.issues.length > 0 && (
                    <ul className="mt-1 list-inside list-disc text-xs text-text-secondary">
                      {(r.issues as string[]).slice(0, 5).map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.excerpt && (
        <div className="mb-6 rounded-xl border border-border bg-bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-text-secondary">
            Excerpt
          </p>
          <p className="mt-2 text-sm italic text-text-primary">{p.excerpt}</p>
        </div>
      )}

      <article className="mb-8 rounded-xl border border-border bg-bg-card p-6 lg:p-8">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-text-primary">
          {p.content ?? "(no content)"}
        </pre>
      </article>

      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
        <h2 className="text-sm font-medium text-red-200">
          Reject &amp; send back to Content Writer
        </h2>
        <form action={rejectBlog} className="mt-3">
          <input type="hidden" name="id" value={p.id} />
          <textarea
            name="note"
            required
            placeholder="Feedback for the Content Writer (what to fix before re-submitting)"
            rows={3}
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

function MetaField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p className="mt-1 text-sm text-text-primary">{value ?? "—"}</p>
    </div>
  );
}
