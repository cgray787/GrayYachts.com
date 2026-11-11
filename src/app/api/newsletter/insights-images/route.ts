import {newsletterEnv} from '@/lib/newsletter/db';
import {reserveInsightsImages,ConflictError} from '@/lib/newsletter/insights-ledger';
// Insights-authoring-only: reserves photo ids an insights article is about to use, so no
// newsletter edition can later claim them (fresh-photo-mix hard rule, 2026-11-11). Same
// automation credential as the other /api/newsletter routes.
export async function POST(request:Request) {
 const env=await newsletterEnv();
 if(!env.NEWSLETTER_AUTOMATION_SECRET||request.headers.get('authorization')!==`Bearer ${env.NEWSLETTER_AUTOMATION_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 const text=await request.text();if(text.length>10000)return Response.json({error:'Request too large'},{status:413});
 try {
  const {slug,imageIds}=JSON.parse(text);
  return Response.json(await reserveInsightsImages(env,slug,imageIds));
 } catch(error) {return Response.json({error:error instanceof Error?error.message:'Reservation unavailable'},{status:error instanceof ConflictError?409:400});}
}
