import {newsletterEnv} from '@/lib/newsletter/db';
import {generateMedia,type MediaEnv} from '@/lib/newsletter/media';
// Hermes-only: generate one newsletter image. Same automation credential as the draft endpoint.
export async function POST(request:Request) {
 const env=await newsletterEnv() as MediaEnv;
 if(!env.NEWSLETTER_AUTOMATION_SECRET||request.headers.get('authorization')!==`Bearer ${env.NEWSLETTER_AUTOMATION_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 const text=await request.text();if(text.length>10000)return Response.json({error:'Request too large'},{status:413});
 try {return Response.json(await generateMedia(env,JSON.parse(text)));}
 catch(error){return Response.json({error:error instanceof Error?error.message:'Image unavailable'},{status:400});}
}
