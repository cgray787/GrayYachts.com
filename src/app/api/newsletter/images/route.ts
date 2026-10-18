import {newsletterEnv} from '@/lib/newsletter/db';
import {availableImages,attachImages,IMAGE_RULE} from '@/lib/newsletter/images';
import {deliverHermesReview} from '@/lib/newsletter/generate';
export async function GET(request:Request) {
 const env=await newsletterEnv();
 if(!env.NEWSLETTER_AUTOMATION_SECRET||request.headers.get('authorization')!==`Bearer ${env.NEWSLETTER_AUTOMATION_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 return Response.json({rule:IMAGE_RULE,available:await availableImages(env)},{headers:{'cache-control':'no-store'}});
}
export async function POST(request:Request) {
 const env=await newsletterEnv();
 if(!env.NEWSLETTER_AUTOMATION_SECRET||request.headers.get('authorization')!==`Bearer ${env.NEWSLETTER_AUTOMATION_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 try {
  const {id,images}=await request.json();
  const result=await attachImages(env,id,images);
  if(result.state==='published-images-corrected')return Response.json(result);
  try{return Response.json({...result,email:await deliverHermesReview(env)});}
  catch{return Response.json({...result,email:{state:'delivery-pending'}},{status:202});}
 } catch(error) {return Response.json({error:error instanceof Error?error.message:'Images unavailable'},{status:409});}
}
