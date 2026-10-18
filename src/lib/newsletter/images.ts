import catalog from './image-catalog.json';
import type {NewsletterEnv} from './core';
export type NewsletterImage={id:string;url:string;alt:string;caption:string;credit:string;source:string;license?:string;licenseUrl?:string};
export async function availableImages(env:NewsletterEnv) {
 const used=(await env.NEWSLETTER_DB.prepare('SELECT image_id FROM newsletter_image_uses').all<{image_id:string}>()).results;
 const ids=new Set(used.map(i=>i.image_id));
 return catalog.filter(i=>!ids.has(i.id));
}
export function validateImages(value:unknown, sectionCount?:number):NewsletterImage[] {
 if(!Array.isArray(value)||value.length<2||value.length>9)throw new Error('Select 2-9 unused images');
 if(sectionCount!==undefined && value.length!==sectionCount+2)throw new Error('Provide a lead photo, one photo per section, and a questions photo');
 const ids=new Set<string>();
 return value.map(item=>{
  const photo=catalog.find(p=>p.id===item?.id);
  if(!photo||ids.has(photo.id))throw new Error('Unknown or repeated newsletter image');
  ids.add(photo.id);
  for(const key of ['alt','caption'])if(typeof item[key]!=='string'||item[key].trim().length<10||item[key].length>300||/[<>]/.test(item[key]))throw new Error('Each image needs descriptive alt text and a caption');
  return {...photo,alt:item.alt.trim(),caption:item.caption.trim()};
 });
}
export async function attachImages(env:NewsletterEnv,id:string,value:unknown) {
 const images=validateImages(value);
 const result=await env.NEWSLETTER_DB.prepare("UPDATE newsletter_issues SET images=?,hero=?,review_revision=review_revision+1,email_sent_at=NULL,email_id=NULL,attempts=0,error=NULL WHERE id=? AND status='pending' AND json_array_length(images)=0")
 .bind(JSON.stringify(images),images[0].url,id).run();
 if(!result.meta.changes)throw new Error('This draft already has images or has been reviewed');
 return {state:'images-added',count:images.length};
}
