import {newsletterEnv} from '@/lib/newsletter/db';
import type {MediaEnv} from '@/lib/newsletter/media';
// Serves imported and generated newsletter images from R2. Keys are content hashes, so the
// bytes behind a URL never change and can be cached for a year.
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 if(!/^[a-f0-9]{64}$/.test(id))return new Response(null,{status:404});
 const env=await newsletterEnv() as MediaEnv;
 const object=await env.YACHT_PHOTOS?.get(`newsletter-media/${id}`);
 if(!object)return new Response(null,{status:404});
 return new Response(await object.arrayBuffer(),{headers:{'Content-Type':object.httpMetadata?.contentType||'image/jpeg','Cache-Control':'public, max-age=31536000, immutable'}});
}
