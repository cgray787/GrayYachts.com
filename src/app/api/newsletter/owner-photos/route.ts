import {newsletterEnv} from '@/lib/newsletter/db';
import {storeOwnerPhoto,ownerHashes,ownerPhotosUnusedCount} from '@/lib/newsletter/owner-photos';
import type {MediaEnv} from '@/lib/newsletter/media';
// Hermes/ingest-only: the one-time upload path for Connor's own photos (fresh-photo-mix hard
// rule, 2026-11-11). Same automation credential as the other /api/newsletter routes.
const MAX_BYTES=15*1024*1024;
export async function GET(request:Request) {
 const env=await newsletterEnv();
 if(!env.NEWSLETTER_AUTOMATION_SECRET||request.headers.get('authorization')!==`Bearer ${env.NEWSLETTER_AUTOMATION_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 const hashes=await ownerHashes(env);
 return Response.json({hashes,total:hashes.length,unused:await ownerPhotosUnusedCount(env)},{headers:{'cache-control':'no-store'}});
}
export async function POST(request:Request) {
 const env=await newsletterEnv() as MediaEnv;
 if(!env.NEWSLETTER_AUTOMATION_SECRET||request.headers.get('authorization')!==`Bearer ${env.NEWSLETTER_AUTOMATION_SECRET}`)return Response.json({error:'Unauthorized'},{status:401});
 const length=Number(request.headers.get('content-length')||0);
 if(length>MAX_BYTES)return Response.json({error:'Image too large'},{status:413});
 const bytes=await request.arrayBuffer();
 if(bytes.byteLength>MAX_BYTES)return Response.json({error:'Image too large'},{status:413});
 const phash=request.headers.get('x-owner-phash')||'';
 const width=request.headers.get('x-owner-width');
 const height=request.headers.get('x-owner-height');
 const takenOn=request.headers.get('x-owner-taken-on');
 try {
  return Response.json(await storeOwnerPhoto(env,bytes,{phash,width:width?Number(width):null,height:height?Number(height):null,takenOn:takenOn||null}));
 } catch(error) {return Response.json({error:error instanceof Error?error.message:'Photo unavailable'},{status:400});}
}
