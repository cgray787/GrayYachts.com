import catalog from './image-catalog.json';
import type {NewsletterEnv} from './core';
import {mediaById,type Media,type MediaEnv} from './media';
import {checkImages,type Judge} from './relevance';
export type NewsletterImage={id:string;url:string;alt:string;caption:string;credit:string;source:string;license?:string;licenseUrl?:string;kind?:'catalog'|'licensed'|'generated';relevance?:string;width?:number;height?:number;check?:'passed'|'rejected'|'skipped';checkReason?:string};
export const IMAGE_RULE='Every image must fit what its section is about. Prefer a freely licensed photo of the actual subject (the show, place, brand or model) imported with POST /api/newsletter/media/import from Wikimedia Commons, Pexels or Unsplash. Use a catalog photo only when it genuinely matches the section. When no real photo fits, generate an illustration with POST /api/newsletter/media/generate; it is captioned as an AI-generated illustration. Use sections.length + 2 unique images (lead, one per section in order, then questions), each with a relevance note. Never reuse an image across editions. The server shows each image with its section to a vision model and rejects a clear mismatch (HTTP 409 naming images[i]); replace that image and resubmit.';
export async function availableImages(env:NewsletterEnv) {
 const used=(await env.NEWSLETTER_DB.prepare('SELECT image_id FROM newsletter_image_uses').all<{image_id:string}>()).results;
 const ids=new Set(used.map(i=>i.image_id));
 return catalog.filter(i=>!ids.has(i.id));
}
const fromMedia=(m:Media)=>({id:m.id,url:m.url,credit:m.credit,source:m.source,license:m.license,...(m.license_url?{licenseUrl:m.license_url}:{}),kind:m.kind});
export function validateImages(value:unknown, sectionCount?:number, media:Map<string,Media>=new Map()):NewsletterImage[] {
 if(!Array.isArray(value)||value.length<2||value.length>9)throw new Error('Select 2-9 unused images');
 if(sectionCount!==undefined && value.length!==sectionCount+2)throw new Error('Provide a lead photo, one photo per section, and a questions photo');
 const ids=new Set<string>();
 return value.map(item=>{
  const known=catalog.find(p=>p.id===item?.id);
  const photo=known?{...known,kind:'catalog' as const}:media.get(item?.id)?fromMedia(media.get(item.id)!):null;
  if(!photo||ids.has(photo.id))throw new Error('Unknown or repeated newsletter image');
  ids.add(photo.id);
  for(const key of ['alt','caption'])if(typeof item[key]!=='string'||item[key].trim().length<10||item[key].length>300||/[<>]/.test(item[key]))throw new Error('Each image needs descriptive alt text and a caption');
  if(typeof item.relevance!=='string'||item.relevance.trim().length<20||item.relevance.length>400||/[<>]/.test(item.relevance))throw new Error('Each image needs a relevance note explaining how it fits its section');
  let caption=item.caption.trim();
  if(photo.kind==='generated'&&!/AI-generated/i.test(caption))caption=`${caption} (AI-generated illustration)`;
  return {...photo,alt:item.alt.trim(),caption,relevance:item.relevance.trim()};
 });
}
export async function resolveImages(env:NewsletterEnv,value:unknown,sectionCount?:number){
 const ids=Array.isArray(value)?value.map(v=>String(v?.id??'')).filter(id=>!catalog.some(p=>p.id===id)):[];
 return validateImages(value,sectionCount,await mediaById(env,ids));
}
// Replaces an edition's photos. A pending draft gets a new review email (its review link is
// invalidated). A published edition is corrected in place: publication emails no subscriber
// list, so the web page is the only copy. Migrations 0004-0005 move the reuse reservations.
export async function attachImages(env:MediaEnv,id:string,value:unknown,judge?:Judge) {
 const issue=await env.NEWSLETTER_DB.prepare("SELECT content,status FROM newsletter_issues WHERE id=? AND status IN ('pending','published')").bind(id).first<{content:string|null;status:string}>();
 if(!issue)throw new Error('Only pending or published editions can have their photos replaced');
 const article=issue.content?JSON.parse(issue.content):null;
 const images=await checkImages(env,await resolveImages(env,value,article?.sections?.length as number|undefined),article,judge);
 const result=issue.status==='pending'
  ?await env.NEWSLETTER_DB.prepare("UPDATE newsletter_issues SET images=?,hero=?,review_revision=review_revision+1,email_sent_at=NULL,email_id=NULL,attempts=0,error=NULL WHERE id=? AND status='pending'").bind(JSON.stringify(images),images[0].url,id).run()
  :await env.NEWSLETTER_DB.prepare("UPDATE newsletter_issues SET images=?,hero=? WHERE id=? AND status='published'").bind(JSON.stringify(images),images[0].url,id).run();
 if(!result.meta.changes)throw new Error('The edition changed status; try again');
 return {state:issue.status==='pending'?'images-replaced':'published-images-corrected',count:images.length};
}
