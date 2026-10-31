import catalog from './image-catalog.json';
import articleImages from '../../../content/seo/article-images.json';
import type {NewsletterEnv} from './core';
import {mediaById,type Media,type MediaEnv} from './media';
import {checkImages,type Judge} from './relevance';
export type NewsletterImage={id:string;url:string;alt:string;caption:string;credit:string;source:string;license?:string;licenseUrl?:string;kind?:'catalog'|'licensed'|'generated';relevance?:string;width?:number;height?:number;check?:'passed'|'rejected'|'skipped';checkReason?:string};
export const IMAGE_RULE='Every image must fit what its section is about. Prefer a freely licensed photo of the actual subject (the show, place, brand or model) imported with POST /api/newsletter/media/import from Wikimedia Commons, Pexels or Unsplash. Use a catalog photo only when it genuinely matches the section. When no real photo fits, generate an illustration with POST /api/newsletter/media/generate; it is captioned as an AI-generated illustration. Use sections.length + 2 unique images (lead, one per section in order, then questions), each with a relevance note. Never reuse an image across editions or one already used on an insights article. Show each catalog boat once per edition and never one from the 3 editions before or after (another shot of the same boat counts as the same picture). The server shows each image with its section to a vision model and rejects a clear mismatch (HTTP 409 naming images[i]); replace that image and resubmit.';
// Two shots of one boat from one shoot read as the same picture (2026-10-26 led with Kingfisher
// 3225 02.jpg two days after 2026-10-24 led with its 01.jpg), but the reuse ledger only blocks
// exact files. So a catalog boat may appear at most once per edition and not in the editions
// around it. Licensed and generated media have no boat and stay exact-file only.
export const BOAT_GAP=3;
export function boatOf(url:string):string|null { return /^\/(?:listings|newsletter\/brokerage)\/([^/]+)\//.exec(url)?.[1]??null; }
// Insights articles pick their photos by hand (content/seo/article-images.json), outside the ledger.
const INSIGHT_URLS=new Set(Object.values(articleImages as Record<string,{url:string}>).map(p=>p.url));
// Boats shown by the BOAT_GAP pending or published editions on each side of `slot` (or the latest
// ones when there is no slot yet), excluding the edition being written.
async function nearbyBoats(env:NewsletterEnv,slot?:string,excludeId?:string) {
 const rows=async(sql:string,...args:string[])=>(await env.NEWSLETTER_DB.prepare(sql).bind(...args).all<{id:string;images:string}>()).results;
 const base="SELECT id,images FROM newsletter_issues WHERE status IN ('pending','published') AND images<>'[]'";
 const near=slot
  ?[...await rows(`${base} AND slot<? ORDER BY slot DESC LIMIT ${BOAT_GAP}`,slot),...await rows(`${base} AND slot>? ORDER BY slot LIMIT ${BOAT_GAP}`,slot)]
  :await rows(`${base} ORDER BY slot DESC LIMIT ${BOAT_GAP}`);
 const boats=new Set<string>();
 for(const issue of near){
  if(issue.id===excludeId)continue;
  for(const image of JSON.parse(issue.images) as {url?:string}[]){const boat=boatOf(String(image?.url??''));if(boat)boats.add(boat);}
 }
 return boats;
}
export async function availableImages(env:NewsletterEnv) {
 const used=(await env.NEWSLETTER_DB.prepare('SELECT image_id FROM newsletter_image_uses').all<{image_id:string}>()).results;
 const ids=new Set(used.map(i=>i.image_id));
 const boats=await nearbyBoats(env);
 return catalog.filter(i=>!ids.has(i.id)&&!INSIGHT_URLS.has(i.url)&&!boats.has(boatOf(i.url)??''));
}
const fromMedia=(m:Media)=>({id:m.id,url:m.url,credit:m.credit,source:m.source,license:m.license,...(m.license_url?{licenseUrl:m.license_url}:{}),kind:m.kind});
export function validateImages(value:unknown, sectionCount?:number, media:Map<string,Media>=new Map()):NewsletterImage[] {
 if(!Array.isArray(value)||value.length<2||value.length>9)throw new Error('Select 2-9 unused images');
 if(sectionCount!==undefined && value.length!==sectionCount+2)throw new Error('Provide a lead photo, one photo per section, and a questions photo');
 const ids=new Set<string>();const boats=new Set<string>();
 return value.map((item,i)=>{
  const known=catalog.find(p=>p.id===item?.id);
  const photo=known?{...known,kind:'catalog' as const}:media.get(item?.id)?fromMedia(media.get(item.id)!):null;
  if(!photo||ids.has(photo.id))throw new Error('Unknown or repeated newsletter image');
  ids.add(photo.id);
  const boat=boatOf(photo.url);
  if(boat&&boats.has(boat))throw new Error(`images[${i}] shows ${boat} again; use one photo per boat in an edition`);
  if(boat)boats.add(boat);
  for(const key of ['alt','caption'])if(typeof item[key]!=='string'||item[key].trim().length<10||item[key].length>300||/[<>]/.test(item[key]))throw new Error('Each image needs descriptive alt text and a caption');
  if(typeof item.relevance!=='string'||item.relevance.trim().length<20||item.relevance.length>400||/[<>]/.test(item.relevance))throw new Error('Each image needs a relevance note explaining how it fits its section');
  let caption=item.caption.trim();
  if(photo.kind==='generated'&&!/AI-generated/i.test(caption))caption=`${caption} (AI-generated illustration)`;
  return {...photo,alt:item.alt.trim(),caption,relevance:item.relevance.trim()};
 });
}
export async function resolveImages(env:NewsletterEnv,value:unknown,sectionCount?:number,edition:{slot?:string;id?:string}={}){
 const ids=Array.isArray(value)?value.map(v=>String(v?.id??'')).filter(id=>!catalog.some(p=>p.id===id)):[];
 const images=validateImages(value,sectionCount,await mediaById(env,ids));
 const boats=await nearbyBoats(env,edition.slot,edition.id);
 images.forEach((image,i)=>{
  if(INSIGHT_URLS.has(image.url))throw new Error(`images[${i}] is already the photo of an insights article; choose another`);
  const boat=boatOf(image.url);
  if(boat&&boats.has(boat))throw new Error(`images[${i}] shows ${boat}, which appears in one of the ${BOAT_GAP} editions before or after this one; choose a different boat`);
 });
 return images;
}
// Replaces an edition's photos. A pending draft gets a new review email (its review link is
// invalidated). A published edition is corrected in place: publication emails no subscriber
// list, so the web page is the only copy. Replaced photos stay reserved for good (migration 0006).
export async function attachImages(env:MediaEnv,id:string,value:unknown,judge?:Judge) {
 const issue=await env.NEWSLETTER_DB.prepare("SELECT slot,content,status FROM newsletter_issues WHERE id=? AND status IN ('pending','published')").bind(id).first<{slot:string;content:string|null;status:string}>();
 if(!issue)throw new Error('Only pending or published editions can have their photos replaced');
 const article=issue.content?JSON.parse(issue.content):null;
 const images=await checkImages(env,await resolveImages(env,value,article?.sections?.length as number|undefined,{slot:issue.slot,id}),article,judge);
 const result=issue.status==='pending'
  ?await env.NEWSLETTER_DB.prepare("UPDATE newsletter_issues SET images=?,hero=?,review_revision=review_revision+1,email_sent_at=NULL,email_id=NULL,attempts=0,error=NULL WHERE id=? AND status='pending'").bind(JSON.stringify(images),images[0].url,id).run()
  :await env.NEWSLETTER_DB.prepare("UPDATE newsletter_issues SET images=?,hero=? WHERE id=? AND status='published'").bind(JSON.stringify(images),images[0].url,id).run();
 if(!result.meta.changes)throw new Error('The edition changed status; try again');
 return {state:issue.status==='pending'?'images-replaced':'published-images-corrected',count:images.length};
}
