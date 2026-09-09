import {newsletterEnv} from '@/lib/newsletter/db';
import {runNewsletter} from '@/lib/newsletter/generate';
export async function GET(request:Request) {
 const env=await newsletterEnv();
 if(!env.NEWSLETTER_AUTOMATION_SECRET || request.headers.get('authorization')!==`Bearer ${env.NEWSLETTER_AUTOMATION_SECRET}`) return Response.json({error:'Unauthorized'},{status:401});
 const issues=(await env.NEWSLETTER_DB.prepare('SELECT id,slot,status,title,slug,attempts,email_sent_at,email_id,error,review_feedback,review_revision,images FROM newsletter_issues ORDER BY created_at DESC LIMIT 30').all<{id:string;email_id:string|null}>()).results;
 let delivery:unknown=null;
 if(issues[0]?.email_id) {
  const response=await fetch(`https://api.resend.com/emails/${issues[0].email_id}`,{headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`}});
  if(response.ok){const result=await response.json() as {last_event?:string;to?:string[]};delivery={last_event:result.last_event,to:result.to};}
  else delivery={status:response.status,message:'Provider delivery lookup unavailable with this API key'};
 }
 return Response.json({reviewTo:env.NEWSLETTER_REVIEW_TO,issues,delivery},{headers:{'cache-control':'no-store'}});
}
export async function POST(request:Request) {
 const env=await newsletterEnv();
 if(!env.NEWSLETTER_AUTOMATION_SECRET || request.headers.get('authorization')!==`Bearer ${env.NEWSLETTER_AUTOMATION_SECRET}`) return Response.json({error:'Unauthorized'},{status:401});
 try {return Response.json(await runNewsletter(env));}
 catch {return Response.json({error:'Newsletter run failed. Check the issue record and Worker logs.'},{status:502});}
}
