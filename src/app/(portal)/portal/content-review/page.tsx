import { redirect } from "next/navigation";
import Link from "next/link";
import { Mail, FileText, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function ContentReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/portal/content-review");
  if (!isAdmin(user.email)) redirect("/portal/dashboard");

  const db = createAdminClient();
  const [outreachPending, blogPending] = await Promise.all([
    db
      .from("outreach_sequences")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    db
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("published", false),
  ]);

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-text-primary lg:text-4xl">
          Content Review
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Approve cold email outreach and newsletter drafts before they go out.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <QueueCard
          href="/portal/content-review/outreach"
          icon={<Mail className="h-5 w-5 text-gold" />}
          iconBg="bg-gold-muted"
          title="Cold Email Outreach"
          description="Personalized outreach drafts from the Outreach Agent. Approve to send, reject with feedback to redraft."
          pending={outreachPending.count ?? 0}
        />
        <QueueCard
          href="/portal/content-review/blog"
          icon={<FileText className="h-5 w-5 text-blue-400" />}
          iconBg="bg-blue-400/10"
          title="Newsletter & Blog"
          description="SEO/AEO blog drafts from the Content Writer + SEO Strategist. Publish to push live on grayyachts.media."
          pending={blogPending.count ?? 0}
        />
      </div>
    </div>
  );
}

function QueueCard({
  href,
  icon,
  iconBg,
  title,
  description,
  pending,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  pending: number;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-xl border border-border bg-bg-card p-6 transition-colors hover:border-gold"
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-bg-primary">
            {pending}
          </span>
          <span className="text-xs text-text-secondary">pending</span>
        </div>
      </div>
      <div>
        <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
          {title}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      <div className="mt-auto flex items-center gap-1 text-sm text-gold transition-transform group-hover:translate-x-1">
        Open queue <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
