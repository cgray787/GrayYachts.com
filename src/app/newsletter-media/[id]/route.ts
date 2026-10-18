import {newsletterEnv} from '@/lib/newsletter/db';
import type {MediaEnv} from '@/lib/newsletter/media';
import {resize,WIDTHS} from '@/lib/newsletter/resize';
// Serves imported and generated newsletter images from R2. Keys are content hashes, so the
// bytes behind a URL never change and can be cached for a year.
// ?w=640|960|1280 serves a WebP that size (&f=jpeg a JPEG, for email clients without WebP). Each
// variant is made once by the Images binding and kept in R2 beside the original; if resizing
// fails the original is served, briefly cached, so a page never loses its photo.
const IMMUTABLE='public, max-age=31536000, immutable';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 if(!/^[a-f0-9]{64}$/.test(id))return new Response(null,{status:404});
 const query=new URL(request.url).searchParams;
 const width=query.has('w')?Number(query.get('w')):null;
 const jpeg=query.get('f')==='jpeg';
 if(width!==null&&!(WIDTHS as readonly number[]).includes(width))return new Response(null,{status:404});
 const env=await newsletterEnv() as MediaEnv;
 const variantKey=width?`newsletter-media/${id}.w${width}.${jpeg?'jpg':'webp'}`:null;
 const type=jpeg?'image/jpeg':'image/webp';
 if(variantKey){
  const variant=await env.YACHT_PHOTOS?.get(variantKey);
  if(variant)return new Response(await variant.arrayBuffer(),{headers:{'Content-Type':variant.httpMetadata?.contentType||type,'Cache-Control':IMMUTABLE}});
 }
 const object=await env.YACHT_PHOTOS?.get(`newsletter-media/${id}`);
 if(!object)return new Response(null,{status:404});
 const original=await object.arrayBuffer();
 const originalType=object.httpMetadata?.contentType||'image/jpeg';
 if(!width)return new Response(original,{headers:{'Content-Type':originalType,'Cache-Control':IMMUTABLE}});
 try {
  const resized=await resize(env.IMAGES,original,width,type,jpeg?80:75);
  // A variant no smaller than its source is stored as the source bytes, so it is not remade.
  const [bytes,contentType]=resized.byteLength<original.byteLength?[resized,type]:[original,originalType];
  await env.YACHT_PHOTOS!.put(variantKey!,bytes,{httpMetadata:{contentType}});
  return new Response(bytes,{headers:{'Content-Type':contentType,'Cache-Control':IMMUTABLE}});
 } catch(error) {
  console.error('newsletter media resize failed',id,width,error instanceof Error?error.message:error);
  return new Response(original,{headers:{'Content-Type':originalType,'Cache-Control':'public, max-age=300'}});
 }
}
