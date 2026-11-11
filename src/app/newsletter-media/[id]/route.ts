import {newsletterEnv} from '@/lib/newsletter/db';
import type {MediaEnv} from '@/lib/newsletter/media';
import {resize,WIDTHS} from '@/lib/newsletter/resize';
import {isMissingTableError} from '@/lib/newsletter/owner-photos';
// Serves imported, generated and (once reserved) owner newsletter images from R2. Keys are
// content hashes, so the bytes behind a URL never change and can be cached for a year.
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
 const mediaKey=`newsletter-media/${id}`;
 const media=await env.YACHT_PHOTOS?.get(mediaKey);
 let baseKey=mediaKey;let original:ArrayBuffer;let originalType:string;
 if(media){
  original=await media.arrayBuffer();originalType=media.httpMetadata?.contentType||'image/jpeg';
 } else {
  // Not an imported/generated photo: it may be one of Connor's own, which stay private (404)
  // until reserved by an edition or an insights article (fresh-photo-mix rule, 2026-11-11).
  // Migration 0007 may not be applied yet (docs/owner-photos.md); a missing table means no owner
  // photo could possibly be reserved, so it is treated the same as "not found".
  let owner:unknown=null;let reserved:unknown=null;
  try {
   owner=await env.NEWSLETTER_DB.prepare('SELECT 1 FROM newsletter_owner_photos WHERE id=?').bind(id).first();
   if(owner)reserved=await env.NEWSLETTER_DB.prepare('SELECT 1 FROM newsletter_image_uses WHERE image_id=? UNION SELECT 1 FROM insights_image_uses WHERE image_id=?').bind(id,id).first();
  } catch(error) {
   if(!isMissingTableError(error))throw error;
  }
  if(!owner||!reserved)return new Response(null,{status:404});
  baseKey=`owner-photos/${id}.jpg`;
  const object=await env.YACHT_PHOTOS?.get(baseKey);
  if(!object)return new Response(null,{status:404});
  original=await object.arrayBuffer();originalType=object.httpMetadata?.contentType||'image/jpeg';
 }
 const variantKey=width?`${baseKey}.w${width}.${jpeg?'jpg':'webp'}`:null;
 const type=jpeg?'image/jpeg':'image/webp';
 if(variantKey){
  const variant=await env.YACHT_PHOTOS?.get(variantKey);
  if(variant)return new Response(await variant.arrayBuffer(),{headers:{'Content-Type':variant.httpMetadata?.contentType||type,'Cache-Control':IMMUTABLE}});
 }
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
