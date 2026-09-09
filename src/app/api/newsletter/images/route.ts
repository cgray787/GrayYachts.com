import {newsletterEnv} from '@/lib/newsletter/db';
import {availableImages,attachImages} from '@/lib/newsletter/images';
import {deliverHermesReview} from '@/lib/newsletter/generate';
export async function GET(request:Request) {
 const env=await newsletterEnv();
 if(!env.NEWSLETTER_AUTOMATION_SECRET||request.headers.get('authorization')!==`Bearer ${env.NEWSLETTER_AUTOMATION_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 return Response.json({rule:'Use 2-3 unique images. Never reuse a photo within an edition or across editions. Renaming, cropping or editing a used photo does not make it new.',available:await availableImages(env)},{headers:{'cache-control':'no-store'}});
}
export async function POST(request:Request) {
 const env=await newsletterEnv();
 if(!env.NEWSLETTER_AUTOMATION_SECRET||request.headers.get('authorization')!==`Bearer ${env.NEWSLETTER_AUTOMATION_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 try {
  const {id,images}=await request.json();
  const result=await attachImages(env,id,images);
  try{return Response.json({...result,email:await deliverHermesReview(env)});}
  catch{return Response.json({...result,email:{state:'delivery-pending'}},{status:202});}
 } catch {return Response.json({error:'Images unavailable, already used, invalid, or draft already reviewed.'},{status:409});}
}
