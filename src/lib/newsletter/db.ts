import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { NewsletterEnv, Issue } from './core';
export async function newsletterEnv(): Promise<NewsletterEnv> {
 const {env} = await getCloudflareContext({async:true});
 const result = env as unknown as NewsletterEnv;
 if (!result.NEWSLETTER_DB) throw new Error('Newsletter database is not configured');
 return result;
}
export async function publishedIssues(): Promise<Issue[]> {
 const env = await newsletterEnv();
 return (await env.NEWSLETTER_DB.prepare("SELECT id,slot,status,title,slug,audience,excerpt,hero,created_at,published_at FROM newsletter_issues WHERE status='published' ORDER BY published_at DESC").all<Issue>()).results;
}
export async function publishedIssue(slug: string): Promise<Issue | null> {
 const env = await newsletterEnv();
 return env.NEWSLETTER_DB.prepare("SELECT * FROM newsletter_issues WHERE slug=? AND status='published'").bind(slug).first<Issue>();
}
