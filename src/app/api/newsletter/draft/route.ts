import {newsletterEnv} from '@/lib/newsletter/db';
import {acceptHermesDraft,deliverHermesReview} from '@/lib/newsletter/generate';
export async function POST(request:Request) {
 const env=await newsletterEnv();
 if(!env.NEWSLETTER_AUTOMATION_SECRET || request.headers.get('authorization')!==`Bearer ${env.NEWSLETTER_AUTOMATION_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 const text=await request.text();if(text.length>100000)return Response.json({error:'Draft too large'},{status:413});
 let result;
 try {result=await acceptHermesDraft(env,JSON.parse(text));}
 catch(error){return Response.json({error:error instanceof Error?error.message:'Invalid draft'},{status:400});}
 try {return Response.json({...result,email:await deliverHermesReview(env)});}
 catch {return Response.json({...result,email:{state:'delivery-pending',message:'Draft saved; cloud delivery will retry.'}},{status:202});}
}
