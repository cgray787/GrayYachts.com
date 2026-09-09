import {newsletterEnv} from '@/lib/newsletter/db';
import {runNewsletter} from '@/lib/newsletter/generate';
export async function POST(request:Request) {
 const env=await newsletterEnv();
 if(!env.NEWSLETTER_AUTOMATION_SECRET || request.headers.get('authorization')!==`Bearer ${env.NEWSLETTER_AUTOMATION_SECRET}`) return Response.json({error:'Unauthorized'},{status:401});
 try {return Response.json(await runNewsletter(env));}
 catch {return Response.json({error:'Newsletter run failed. Check the issue record and Worker logs.'},{status:502});}
}
