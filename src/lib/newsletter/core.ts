export type Statement = {
 bind(...values: unknown[]): Statement;
 first<T>(): Promise<T | null>;
 all<T>(): Promise<{ results: T[] }>;
 run(): Promise<{ meta: { changes: number } }>;
};
export type NewsletterEnv = {
 AI?: {run(model:string,input:unknown):Promise<{response?:string}>};
 NEWSLETTER_AI_PROVIDER?: string;
 NEWSLETTER_DB: { prepare(sql: string): Statement };
 ANTHROPIC_API_KEY: string;
 RESEND_API_KEY: string;
 NEWSLETTER_AUTOMATION_SECRET: string;
 NEWSLETTER_REVIEW_TO: string;
 NEWSLETTER_FROM: string;
 NEWSLETTER_START_DATE: string;
};
export type Article = {
 title: string; excerpt: string; introduction: string;
 sections: { heading: string; paragraphs: string[] }[];
 questions: { question: string; answer: string }[];
};
export type Issue = {
 id: string; slot: string; status: 'generating' | 'pending' | 'published' | 'rejected' | 'failed';
 images: string; review_revision: number;
 title: string; slug: string; audience: 'buyer' | 'seller'; excerpt: string;
 content: string; sources: string; hero: string; created_at: string;
 published_at: string | null; email_sent_at: string | null; review_feedback: string | null;
};
export const SITE = 'https://grayyachts.com';
export function scheduleSlot(now: Date, start: string): string | null {
 const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const part = (name:string) => parts.find(p=>p.type===name)!.value;
 const date = `${part('year')}-${part('month')}-${part('day')}`;
 const days = Math.floor((Date.parse(date) - Date.parse(start)) / 86400000);
 return Number.isFinite(days) && days >= 0 && days % 2 === 0 && Number(part('hour')) >= 9 ? date : null;
}
export function validateArticle(value: unknown): Article {
 if (!value || typeof value !== 'object') throw new Error('Invalid article');
 const a = value as Article;
 const text = (s: unknown, min: number, max: number) => typeof s === 'string' && s.trim().length >= min && s.length <= max && !/[<>]/.test(s);
 if (!text(a.title, 12, 100) || !text(a.excerpt, 40, 240) || !text(a.introduction, 80, 2000)) throw new Error('Invalid article summary');
 if (!Array.isArray(a.sections) || a.sections.length < 3 || a.sections.length > 7 || a.sections.some(s => !text(s.heading, 5, 120) || !Array.isArray(s.paragraphs) || s.paragraphs.length < 1 || s.paragraphs.length > 5 || s.paragraphs.some(p => !text(p, 30, 2000)))) throw new Error('Invalid article sections');
 if (!Array.isArray(a.questions) || a.questions.length < 2 || a.questions.length > 5 || a.questions.some(q => !text(q.question, 10, 160) || !text(q.answer, 30, 1200))) throw new Error('Invalid article questions');
 const words = [a.introduction, ...a.sections.flatMap(s => s.paragraphs), ...a.questions.map(q => q.answer)].join(' ').split(/\s+/).length;
 if (words < 450 || words > 1800) throw new Error('Article length outside editorial range');
 return a;
}
export function escapeHtml(text: string): string {
 return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}
export async function reviewToken(id: string, secret: string, revision=0): Promise<string> {
 if (!secret || secret.length < 32) throw new Error('Newsletter signing secret is not configured');
 const encoder = new TextEncoder();
 const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
 const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`newsletter-review:${id}${revision?`:r${revision}`:''}`));
 return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2,'0')).join('');
}
export async function validToken(id: string, token: string, secret: string, revision=0): Promise<boolean> {
 if (!/^[0-9a-f]{64}$/.test(token)) return false;
 const expected = await reviewToken(id, secret, revision);
 let difference = 0;
 for (let i=0;i<64;i++) difference |= token.charCodeAt(i) ^ expected.charCodeAt(i);
 return difference === 0;
}
export async function decide(env: NewsletterEnv, id: string, token: string, decision: string, feedback: string) {
 const issue=await env.NEWSLETTER_DB.prepare('SELECT review_revision FROM newsletter_issues WHERE id=?').bind(id).first<{review_revision:number}>();
 if (!issue || !await validToken(id, token, env.NEWSLETTER_AUTOMATION_SECRET,issue.review_revision)) return { status: 403, message: 'This review link is not valid.' };
 if (!['approve','reject'].includes(decision)) return {status:400,message:'Choose approve or reject.'};
 const now = new Date().toISOString();
 const result = await env.NEWSLETTER_DB.prepare("UPDATE newsletter_issues SET status=?, reviewed_at=?, published_at=?, review_feedback=? WHERE id=? AND status='pending' AND review_revision=?")
  .bind(decision==='approve'?'published':'rejected', now, decision==='approve'?now:null, feedback.slice(0,3000), id,issue.review_revision).run();
 return result.meta.changes === 1 ? {status:200,message:decision==='approve'?'Published on GrayYachts.com.':'Draft rejected. Your feedback is saved for the next issue.'} : {status:409,message:'This draft has already been reviewed or is not ready.'};
}
