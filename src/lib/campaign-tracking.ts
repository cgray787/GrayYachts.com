import {newsletterEnv} from '@/lib/newsletter/db';
export const TRACKING_HEADERS={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
export const validToken=(s:string)=>/^[a-f0-9]{48}$/.test(s);
export const LINKS:Record<string,string>={home:'https://grayyachts.com/',sirena:'https://grayyachts.com/yachts/sirena-48',pershing:'https://grayyachts.com/yachts/pershing-6x',sirena_film:'https://grayyachts.com/yachts/sirena-48#yacht-film',pershing_film:'https://grayyachts.com/yachts/pershing-6x#yacht-film',phone:'tel:+14256718474',email:'mailto:grayyachts@gmail.com',irs:'https://www.irs.gov/taxtopics/tc704',privacy:'https://grayyachts.com/campaign-privacy'};
export function destination(token:string,link:string){const base=link.split('--')[0];return base==='talk'?`https://grayyachts.com/discovery-call?t=${token}`:LINKS[base]??null;}
export function automated(req:Request){return /bot|crawler|spider|proofpoint|mimecast|barracuda|safelinks|headless|googleimageproxy/i.test(req.headers.get('user-agent')??'')||/prefetch|preview/i.test(req.headers.get('purpose')??req.headers.get('sec-purpose')??'');}
export async function db(){return (await newsletterEnv()).NEWSLETTER_DB;}
export async function recipient(token:string){if(!validToken(token))return null;return (await db()).prepare('SELECT token,is_test FROM campaign_recipients WHERE token=?').bind(token).first<{token:string;is_test:number}>();}
export async function record(token:string,kind:string,link:string,req:Request){await(await db()).prepare('INSERT INTO campaign_events(id,token,kind,link,suspected_automation) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),token,kind,link,automated(req)?1:0).run();}
export type CallInput={name:string;email:string;phone:string;preferred_time:string;timezone:string;message:string;company?:string};
export function validateCall(v:unknown):CallInput|null{
 if(!v||typeof v!=='object')return null;const b=v as Record<string,unknown>;
 for(const [k,n]of Object.entries({name:200,email:200,phone:60,preferred_time:40,timezone:80,message:1500,company:200}))if(typeof b[k]!=='string'||(b[k] as string).length>n)return null;
 const x=b as CallInput;if(!x.name.trim()||!/^\S+@\S+\.\S+$/.test(x.email)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(x.preferred_time))return null;
 const when=Date.parse(x.preferred_time+'Z');if(!Number.isFinite(when)||when<Date.now()-86400000||when>Date.now()+366*86400000)return null;
 try{new Intl.DateTimeFormat('en',{timeZone:x.timezone});}catch{return null;}return x;
}
