import {describe,it,expect,vi,afterEach} from 'vitest';
// @ts-expect-error Node 22+ built-in SQLite; project retains Node 20 type definitions.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {decide,reviewToken,validToken,scheduleSlot,validateArticle,type NewsletterEnv,type Statement} from './core';
import catalog from './image-catalog.json';
import {attachImages,availableImages,validateImages,resolveImages,boatOf,pictureKey,checkFreshMix} from './images';
import articleImages from '../../../content/seo/article-images.json';
import {importMedia,generateMedia,mediaById} from './media';
import {runNewsletter,acceptHermesDraft} from './generate';
import {checkImages,ImageMismatchError,RELEVANCE_MODEL} from './relevance';
import {imageSize} from './resize';
import {storeOwnerPhoto,ownerPhotosById,availableOwnerPhotos,ownerPhotosUnusedCount,ownerHealth,ownerLibraryEmpty,ownerHashes,hamming,OWNER_CREDIT,OWNER_LOW_WATER} from './owner-photos';
import {reserveInsightsImages,ConflictError} from './insights-ledger';

const insightUrls=new Set(Object.values(articleImages).map(p=>p.url));
const insightKeys=new Set(Object.values(articleImages).map(p=>pictureKey((p as {source?:string}).source)).filter(Boolean));
const insightBoats=new Set(Object.values(articleImages).map(p=>boatOf(p.url)).filter(Boolean));
const oneEach=catalog.filter((p,i,all)=>!insightUrls.has(p.url)&&!insightBoats.has(boatOf(p.url))&&!(pictureKey(p.source)&&insightKeys.has(pictureKey(p.source)!))&&all.findIndex(q=>(boatOf(q.url)??q.url)===(boatOf(p.url)??p.url))===i);
function database() {
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync('migrations/newsletter/0001_newsletter.sql','utf8'));
 db.exec(readFileSync('migrations/newsletter/0002_images.sql','utf8'));
 db.exec(readFileSync('migrations/newsletter/0003_section_images.sql','utf8'));
 db.exec(readFileSync('migrations/newsletter/0004_media.sql','utf8'));
 db.exec(readFileSync('migrations/newsletter/0005_published_image_corrections.sql','utf8'));
 db.exec(readFileSync('migrations/newsletter/0006_never_reuse_images.sql','utf8'));
 db.exec(readFileSync('migrations/newsletter/0007_owner_photos_fresh_rule.sql','utf8'));
 const prepare=(sql:string):Statement=>{
  let values: (string|number|null)[]=[];
  return {bind(...args:unknown[]){values=args as typeof values;return this;},async first<T>(){return db.prepare(sql).get(...values) as T||null;},async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};
 };
 // Fresh-photo-mix hard rule (2026-11-11): these fixtures predate the rule and submit only
 // catalog photos, so the "new picture" requirement would reject every one of them. Default the
 // shared test harness to the emergency 'warn' switch; the rule itself is unit-tested directly
 // and integration-tested with compliant fixtures below, with the switch turned back off.
 return {db,env:{NEWSLETTER_DB:{prepare},NEWSLETTER_AUTOMATION_SECRET:'test-signing-secret-with-at-least-32-characters',NEWSLETTER_FRESH_PHOTO_RULE:'warn'} as NewsletterEnv};
}
describe('every-other-day schedule in Pacific time',()=>{
 it('starts at 9am and does not run on the intervening day',()=>{
  expect(scheduleSlot(new Date('2026-07-08T15:59:00Z'),'2026-07-08')).toBeNull();
  expect(scheduleSlot(new Date('2026-07-08T16:00:00Z'),'2026-07-08')).toBe('2026-07-08');
  expect(scheduleSlot(new Date('2026-07-09T01:00:00Z'),'2026-07-08')).toBe('2026-07-08');
  expect(scheduleSlot(new Date('2026-07-09T16:00:00Z'),'2026-07-08')).toBeNull();
  expect(scheduleSlot(new Date('2026-07-10T16:00:00Z'),'2026-07-08')).toBe('2026-07-10');
 });
 it('keeps the interval across month boundaries and daylight saving changes',()=>{
  expect(scheduleSlot(new Date('2026-10-01T16:00:00Z'),'2026-09-29')).toBe('2026-10-01');
  expect(scheduleSlot(new Date('2026-11-01T16:00:00Z'),'2026-10-30')).toBeNull();
  expect(scheduleSlot(new Date('2026-11-01T17:00:00Z'),'2026-10-30')).toBe('2026-11-01');
 });
});

describe('scheduled draft and review delivery',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 function article(){
  const paragraph='Before a viewing, write down how you plan to use the boat and what you need to ask the broker. Bring those questions with you. Service records can help you decide which details need a closer look with a qualified professional. Take notes so you can compare the boats after you leave.';
  return {title:'Preparing for your next yacht viewing',excerpt:'Practical questions to bring to a yacht viewing, with space to compare your priorities and decide what to ask the broker next.',introduction:paragraph,sections:Array.from({length:4},(_,i)=>({heading:`Planning your viewing: step ${i+1}`,paragraphs:[paragraph,paragraph]})),questions:[{question:'What should I bring to a viewing?',answer:paragraph},{question:'How should I compare my notes?',answer:paragraph}]};
 }
 it('edits with Humanizer, retries a failed email without regenerating, and sends once',async()=>{
  const {db,env}=database();Object.assign(env,{NEWSLETTER_START_DATE:'2026-09-08',ANTHROPIC_API_KEY:'test',RESEND_API_KEY:'test',NEWSLETTER_REVIEW_TO:'test@example.com',NEWSLETTER_FROM:'test@example.com'});
  const systems:string[]=[];let modelCalls=0;let emails=0;
  vi.stubGlobal('fetch',vi.fn(async(url:string,init:RequestInit)=>{
   if(url.includes('anthropic')){
    modelCalls++;systems.push(JSON.parse(init.body as string).system);
    const payload=modelCalls===3?{pass:true,issues:[]}:article();
    return Response.json({content:[{type:'text',text:JSON.stringify(payload)}]});
   }
   emails++;return emails===1?new Response('temporary outage',{status:503}):Response.json({id:'email-1'});
  }));
  await expect(runNewsletter(env,new Date('2026-09-08T16:00:00Z'))).rejects.toThrow('Review email failed');
  expect(db.prepare('SELECT status,email_sent_at FROM newsletter_issues').get()).toMatchObject({status:'pending',email_sent_at:null});
  expect(systems[1]).toContain('Humanizer: remove AI writing patterns');
  expect(await runNewsletter(env,new Date('2026-09-08T17:00:00Z'))).toMatchObject({state:'review-sent'});
  expect(await runNewsletter(env,new Date('2026-09-08T18:00:00Z'))).toMatchObject({state:'already-handled-or-locked'});
  expect(modelCalls).toBe(3);expect(emails).toBe(2);
  expect(db.prepare("SELECT COUNT(*) n FROM newsletter_issues WHERE status='published'").get()?.n).toBe(0);db.close();
 });
 it('accepts a Hermes draft once, requires editorial checks, and never calls an AI provider',async()=>{
  const {db,env}=database();Object.assign(env,{NEWSLETTER_AI_PROVIDER:'hermes',NEWSLETTER_START_DATE:'2026-09-08',RESEND_API_KEY:'test',NEWSLETTER_REVIEW_TO:'test@example.com',NEWSLETTER_FROM:'test@example.com'});
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-08T17:00:00Z'));
  try {
   const payload={slot:'2026-09-08',original:article(),article:article(),humanizerVersion:'3.0.0',factCheck:{pass:true},images:oneEach.slice(0,6).map(p=>({id:p.id,alt:'A yacht in the Gray Yachts photo library',caption:'Brokerage photography used as an example',relevance:'Shows the kind of brokerage boat the section discusses'})),sources:[{title:'Gray Yachts',url:'https://grayyachts.com'}]};
   await expect(acceptHermesDraft(env,{...payload,factCheck:{pass:false}})).rejects.toThrow('factual review');
   expect(await acceptHermesDraft(env,payload)).toMatchObject({state:'draft-stored'});
   expect(await acceptHermesDraft(env,{...payload,article:{...article(),title:'This must not replace the saved draft'}})).toMatchObject({state:'draft-already-stored'});
   const requests:string[]=[];vi.stubGlobal('fetch',vi.fn(async(url:string)=>{requests.push(url);return Response.json({id:'hermes-email'});}));
   expect(await runNewsletter(env)).toMatchObject({state:'review-sent'});
   expect(await runNewsletter(env)).toMatchObject({state:'awaiting-hermes'});
   expect(requests).toEqual(['https://api.resend.com/emails']);
   expect(db.prepare('SELECT status,title FROM newsletter_issues').get()).toMatchObject({status:'pending',title:article().title});
  } finally {vi.useRealTimers();db.close();}
 });
 it('leaves a draft private when factual review fails',async()=>{
  const {db,env}=database();Object.assign(env,{NEWSLETTER_START_DATE:'2026-09-08',ANTHROPIC_API_KEY:'test',RESEND_API_KEY:'test',NEWSLETTER_REVIEW_TO:'test@example.com'});
  let calls=0;vi.stubGlobal('fetch',vi.fn(async()=>{calls++;return Response.json({content:[{type:'text',text:JSON.stringify(calls===3?{pass:false,issues:['Invented claim']}:article())}]});}));
  await expect(runNewsletter(env,new Date('2026-09-08T16:00:00Z'))).rejects.toThrow('factual review');
  expect(db.prepare('SELECT status,email_sent_at,lock_until FROM newsletter_issues').get()).toMatchObject({status:'failed',email_sent_at:null,lock_until:null});expect(calls).toBe(3);db.close();
 });
});
describe('private newsletter approval',()=>{
 it('rejects altered tokens and tokens belonging to another issue',async()=>{
  const secret='a'.repeat(40);const token=await reviewToken('one',secret);
  expect(await validToken('one',token,secret)).toBe(true);
  expect(await validToken('two',token,secret)).toBe(false);
  expect(await validToken('one','x'+token.slice(1),secret)).toBe(false);
 });
 it('publishes exactly once, and rejected drafts cannot be published by replay',async()=>{
  const {db,env}=database();
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at) VALUES ('one','2026-09-08','pending','2026-09-08'),('two','2026-09-10','pending','2026-09-10')");
  const one=await reviewToken('one',env.NEWSLETTER_AUTOMATION_SECRET);const two=await reviewToken('two',env.NEWSLETTER_AUTOMATION_SECRET);
  expect((await decide(env,'one','bad','approve','')).status).toBe(403);
  expect(db.prepare("SELECT COUNT(*) n FROM newsletter_issues WHERE status='published'").get()?.n).toBe(0);
  expect((await decide(env,'one',one,'approve','')).status).toBe(200);
  expect((await decide(env,'one',one,'reject','')).status).toBe(409);
  expect((await decide(env,'two',two,'reject','More practical detail')).status).toBe(200);
  expect((await decide(env,'two',two,'approve','')).status).toBe(409);
  expect(db.prepare("SELECT status,review_feedback,published_at FROM newsletter_issues WHERE id='two'").get()).toMatchObject({status:'rejected',review_feedback:'More practical detail',published_at:null});
  expect(db.prepare("SELECT COUNT(*) n FROM newsletter_issues WHERE status='published'").get()?.n).toBe(1);
  db.close();
 });
 it('does not approve unfinished content or invalid actions',async()=>{
  const {db,env}=database();db.exec("INSERT INTO newsletter_issues(id,slot,created_at) VALUES('one','2026-09-08','2026-09-08')");
  const token=await reviewToken('one',env.NEWSLETTER_AUTOMATION_SECRET);
  expect((await decide(env,'one',token,'approve','')).status).toBe(409);
  expect((await decide(env,'one',token,'delete','')).status).toBe(400);db.close();
 });
 it('rejects malformed model output',()=>{
  expect(()=>validateArticle({title:'Title',sections:[]})).toThrow();
  expect(()=>validateArticle({title:'<script>alert(1)</script>'})).toThrow();
 });
 it('enforces the wording rule on published copy only',()=>{
  const paragraph='Before a viewing, write down how you plan to use the boat and what you need to ask the broker. Bring those questions with you so the visit answers them in order.';
  const article=(word:string)=>({title:'Preparing for your next yacht viewing',excerpt:'Practical questions to bring to a yacht viewing, with space to compare your priorities and decide what to ask next.',introduction:paragraph,sections:Array.from({length:5},(_,i)=>({heading:`Planning your viewing, part ${i+1}`,paragraphs:[paragraph,paragraph,paragraph,paragraph]})),questions:[{question:'How many buyer '+word+' does a listing get?',answer:'Most listings receive a handful of '+word+' in the first month, and the serious ones ask for records.'},{question:'What should I bring to a viewing?',answer:'Bring your list of questions, recent survey notes, and the service history requests you want answered.'}]});
  expect(()=>validateArticle(article('inquiries'))).toThrow(/inquries/);
  expect(()=>validateArticle(article('inquries'))).not.toThrow();
  // The pre-edit original is an audit record, not published copy: it is kept even with the wrong spelling.
  expect(()=>validateArticle(article('inquiries'),{wording:false})).not.toThrow();
 });
});

describe('newsletter image policy',()=>{
 const photos=(start=0)=>oneEach.slice(start,start+3).map(p=>({id:p.id,alt:'A boat in the brokerage photo library',caption:'An example of brokerage listing photography',relevance:'Illustrates the listing presentation the section describes'}));
 it('requires unique catalog photos and complete new-edition section coverage',()=>{
  expect(()=>validateImages(photos().slice(0,1))).toThrow();
  expect(()=>validateImages(photos(),4)).toThrow('one photo per section');
  expect(validateImages([...photos(),...photos(3)],4)).toHaveLength(6);
  expect(()=>validateImages(catalog.slice(0,10))).toThrow();
  expect(()=>validateImages([photos()[0],photos()[0]])).toThrow();
  expect(()=>validateImages([{...photos()[0],id:'unknown'},photos()[1]])).toThrow();
 });
 it('reserves images atomically across all editions, including rejected ones',async()=>{
  const {db,env}=database();
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at) VALUES('a','2026-09-08','pending','2026-09-08'),('b','2026-09-10','pending','2026-09-10')");
  await attachImages(env,'a',photos());
  expect((await availableImages(env)).some(i=>i.id===photos()[0].id)).toBe(false);
  db.exec("UPDATE newsletter_issues SET status='rejected' WHERE id='a'");
  await expect(attachImages(env,'b',[photos(3)[0],photos()[0]])).rejects.toThrow();
  expect(db.prepare("SELECT images FROM newsletter_issues WHERE id='b'").get()).toMatchObject({images:'[]'});
  expect(db.prepare('SELECT COUNT(*) n FROM newsletter_image_uses').get()?.n).toBe(3);
  await attachImages(env,'b',photos(3));
  // A pending draft may swap its photos before review, but the old ones stay used for good.
  await attachImages(env,'b',photos(6));
  expect((await availableImages(env)).some(i=>i.id===photos(3)[0].id)).toBe(false);
  expect(db.prepare('SELECT COUNT(*) n FROM newsletter_image_uses').get()?.n).toBe(9);
  // Another edition can never take them, even though 'b' no longer shows them.
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at) VALUES('c','2026-10-30','pending','2026-10-30')");
  expect(()=>db.exec(`UPDATE newsletter_issues SET images='${JSON.stringify([{id:photos(3)[0].id},{id:photos(12)[0].id}])}' WHERE id='c'`)).toThrow('already used in another edition');
  // Re-saving an edition with a photo it already holds is allowed.
  await attachImages(env,'b',[photos(6)[0],photos(9)[0],photos(9)[1]]);
  db.exec("UPDATE newsletter_issues SET status='rejected' WHERE id='b'");
  await expect(attachImages(env,'b',photos(9))).rejects.toThrow();db.close();
 });
 it('corrects a published edition in place without reopening review',async()=>{
  const {db,env}=database();
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at,email_sent_at,review_revision) VALUES('p','2026-10-18','pending','2026-10-18','2026-10-18',0)");
  await attachImages(env,'p',photos());
  db.exec("UPDATE newsletter_issues SET status='published',published_at='2026-10-18' WHERE id='p'");
  expect(await attachImages(env,'p',photos(3))).toMatchObject({state:'published-images-corrected',count:3});
  expect(db.prepare("SELECT status,hero,review_revision,email_sent_at FROM newsletter_issues WHERE id='p'").get()).toMatchObject({status:'published',hero:oneEach[3].url,review_revision:1,email_sent_at:null});
  // The replaced photos are never offered again (2026-10-24 reused a corrected edition's lead).
  expect((await availableImages(env)).some(i=>i.id===photos()[0].id)).toBe(false);
  db.exec("UPDATE newsletter_issues SET status='failed' WHERE id='p'");
  await expect(attachImages(env,'p',photos(6))).rejects.toThrow('pending or published');
  db.close();
 });
 it('treats another shot of the same boat as the same picture (Kingfisher 3225, 2026-10-24 and 2026-10-26)',async()=>{
  const kingfisher=catalog.filter(p=>boatOf(p.url)==='kingfisher-3225').map(p=>({...photos()[0],id:p.id}));
  expect(kingfisher.length).toBeGreaterThan(2);
  expect(()=>validateImages([kingfisher[0],photos()[1],kingfisher[1]])).toThrow('images[2] shows kingfisher-3225 again');
  const {db,env}=database();
  const slots=['2026-10-18','2026-10-20','2026-10-22','2026-10-24','2026-10-26'];
  db.exec(`INSERT INTO newsletter_issues(id,slot,status,created_at) VALUES ${slots.map(s=>`('${s}','${s}','pending','${s}')`).join(',')}`);
  await attachImages(env,'2026-10-18',[kingfisher[0],photos(3)[0]]);
  // Its other shots are hidden from the agent and refused for the next 3 editions on either side.
  expect((await availableImages(env)).some(i=>boatOf(i.url)==='kingfisher-3225')).toBe(false);
  await expect(attachImages(env,'2026-10-24',[kingfisher[1],photos(6)[0]])).rejects.toThrow('images[0] shows kingfisher-3225');
  expect(db.prepare("SELECT images FROM newsletter_issues WHERE id='2026-10-24'").get()).toMatchObject({images:'[]'});
  await attachImages(env,'2026-10-20',[photos(6)[0],photos(9)[0]]);
  await attachImages(env,'2026-10-22',[photos(6)[1],photos(9)[1]]);
  await attachImages(env,'2026-10-24',[photos(6)[2],photos(9)[2]]);
  // Four editions later the boat is allowed again, and an edition never blocks its own boats.
  expect(await attachImages(env,'2026-10-26',[kingfisher[1],photos(3)[1]])).toMatchObject({count:2});
  expect(await attachImages(env,'2026-10-18',[kingfisher[2],photos(3)[2]])).toMatchObject({count:2});
  // Rejected editions were never shown to readers and do not block a boat.
  db.exec("UPDATE newsletter_issues SET status='rejected' WHERE id IN ('2026-10-18','2026-10-26')");
  expect((await availableImages(env)).some(i=>boatOf(i.url)==='kingfisher-3225')).toBe(true);
  db.close();
 });
 it('never uses a photo already shown on an insights article',async()=>{
  const {db,env}=database();
  const used=catalog.find(p=>insightUrls.has(p.url));
  expect(used).toBeDefined();
  expect((await availableImages(env)).some(i=>i.id===used!.id)).toBe(false);
  await expect(resolveImages(env,[{...photos()[0],id:used!.id},photos()[1]],undefined,{slot:'2026-10-28'})).rejects.toThrow('insights article');
  db.close();
 });
 it('identifies a licensed photo by its library page at any size (review 2026-11-01)',async()=>{
  expect(pictureKey('https://commons.m.wikimedia.org/wiki/File:MYS 2022 2.jpg')).toBe(pictureKey('https://commons.wikimedia.org/wiki/File:MYS_2022_2.jpg'));
  expect(pictureKey('https://grayyachts.com/fleet/blue-pearl')).toBeNull();
  const {db,env}=database();
  const media=(n:number)=>({id:String(n).repeat(64).slice(0,64),url:`/newsletter-media/${String(n).repeat(64).slice(0,64)}`});
  const page='https://commons.wikimedia.org/wiki/File:Some_marina_2019.jpg';
  for(const n of [1,2])db.prepare("INSERT INTO newsletter_media(id,url,kind,source,credit,license,license_url,title,prompt,created_at) VALUES(?,?,'licensed',?,'A photographer / Wikimedia Commons','CC BY 4.0','https://creativecommons.org/licenses/by/4.0',NULL,NULL,'2026-11-01')").run(media(n).id,media(n).url,n===1?page:page.replace('commons.','commons.m.'));
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at) VALUES('a','2026-09-08','pending','2026-09-08'),('b','2026-11-01','pending','2026-11-01')");
  const item=(id:string)=>({...photos()[0],id});
  // The same Commons file twice in one edition, at two sizes.
  await expect(attachImages(env,'a',[item(media(1).id),item(media(2).id)])).rejects.toThrow('same licensed photo');
  await attachImages(env,'a',[item(media(1).id),photos()[1]]);
  // Re-imported at another size for a later edition: refused although its file and id are new.
  await expect(attachImages(env,'b',[item(media(2).id),photos(3)[0]])).rejects.toThrow('already used by another edition');
  // Re-saving the edition that holds it is allowed.
  expect(await attachImages(env,'a',[item(media(2).id),photos()[1]])).toMatchObject({count:2});
  db.close();
 });
 it('blocks catalog copies and boats of insights photos',async()=>{
  const {db,env}=database();
  const available=await availableImages(env);
  const copy=catalog.find(p=>pictureKey(p.source)&&insightKeys.has(pictureKey(p.source)!));
  expect(copy).toBeDefined();
  expect(available.some(i=>i.id===copy!.id)).toBe(false);
  await expect(resolveImages(env,[{...photos()[0],id:copy!.id},photos()[1]],undefined,{slot:'2026-11-03'})).rejects.toThrow('insights article');
  const boatShot=catalog.find(p=>boatOf(p.url)&&insightBoats.has(boatOf(p.url))&&!insightUrls.has(p.url));
  expect(boatShot).toBeDefined();
  expect(available.some(i=>i.id===boatShot!.id)).toBe(false);
  await expect(resolveImages(env,[{...photos()[0],id:boatShot!.id},photos()[1]],undefined,{slot:'2026-11-03'})).rejects.toThrow('insights article');
  db.close();
 });
 it('invalidates the older approval link when photos are added',async()=>{
  const {db,env}=database();db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at,email_sent_at) VALUES('a','2026-09-08','pending','2026-09-08','2026-09-08')");
  const old=await reviewToken('a',env.NEWSLETTER_AUTOMATION_SECRET);
  await attachImages(env,'a',photos());
  expect((await decide(env,'a',old,'approve','')).status).toBe(403);
  expect(db.prepare("SELECT review_revision,email_sent_at FROM newsletter_issues WHERE id='a'").get()).toMatchObject({review_revision:1,email_sent_at:null});
  const current=await reviewToken('a',env.NEWSLETTER_AUTOMATION_SECRET,1);
  expect((await decide(env,'a',current,'approve','')).status).toBe(200);db.close();
 });
});

describe('newsletter stall alert',()=>{
 afterEach(()=>{vi.unstubAllGlobals();});
 it('emails the editor once when no draft has arrived for 72 hours, then stays quiet',async()=>{
  const {db,env}=database();
  const kv=new Map<string,string>();
  Object.assign(env,{NEWSLETTER_AI_PROVIDER:'hermes',NEWSLETTER_START_DATE:'2026-09-08',RESEND_API_KEY:'test',NEWSLETTER_REVIEW_TO:'editor@example.com',NEWSLETTER_FROM:'test@example.com',
   RATE_LIMIT:{get:async(k:string)=>kv.get(k)??null,put:async(k:string,v:string)=>{kv.set(k,v);}}});
  db.prepare("INSERT INTO newsletter_issues(id,slot,created_at) VALUES('a','2026-09-30','2026-09-30T16:12:18.290Z')").run();
  const sent:string[]=[];vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{sent.push(String(init.body));return Response.json({id:'alert'});}));
  try {
   expect(await runNewsletter(env,new Date('2026-10-02T16:00:00Z'))).toMatchObject({state:'awaiting-hermes',stall:{state:'ok'}});
   expect(await runNewsletter(env,new Date('2026-10-17T16:00:00Z'))).toMatchObject({stall:{state:'stalled-alert-sent'}});
   expect(await runNewsletter(env,new Date('2026-10-17T17:00:00Z'))).toMatchObject({stall:{state:'stalled-already-alerted'}});
   expect(sent).toHaveLength(1);
   expect(JSON.parse(sent[0])).toMatchObject({to:['editor@example.com'],subject:'Gray Yachts newsletter: no new draft for 16 days'});
  } finally {db.close();}
 });
});

describe('per-edition licensed and generated media',()=>{
 const photos=()=>oneEach.slice(0,3).map(p=>({id:p.id,alt:'A boat in the brokerage photo library',caption:'An example of brokerage listing photography',relevance:'Illustrates the listing presentation the section describes'}));
 const jpeg=()=>new Response(new Uint8Array(40_000).fill(7),{headers:{'content-type':'image/jpeg'}});
 const store=()=>{const files=new Map<string,ArrayBuffer>();return {files,bucket:{get:async(k:string)=>files.has(k)?{arrayBuffer:async()=>files.get(k)!}:null,put:async(k:string,v:ArrayBuffer)=>{files.set(k,v);}}};};
 const ok={downloadUrl:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Show.jpg',sourceUrl:'https://commons.wikimedia.org/wiki/File:Show.jpg',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',credit:'Jane Photographer',title:'Boats at Port Vell during the show'};
 it('imports only approved libraries and licenses, keyed by content',async()=>{
  const {db,env}=database();const s=store();Object.assign(env,{YACHT_PHOTOS:s.bucket});
  const fetcher=(async()=>jpeg()) as unknown as typeof fetch;
  const a=await importMedia(env,ok,fetcher);
  expect(a.url).toBe(`/newsletter-media/${a.id}`);expect(s.files.size).toBe(1);
  await expect(importMedia(env,{...ok,downloadUrl:'https://example.com/x.jpg'},fetcher)).rejects.toThrow('Wikimedia Commons, Pexels or Unsplash');
  // Commons serves resized files from thumb.wikimedia.org (seen live 2026-10-18).
  await expect(importMedia(env,{...ok,downloadUrl:'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Show.jpg/1920px-Show.jpg'},(async()=>new Response(new Uint8Array(41_000).fill(9),{headers:{'content-type':'image/jpeg'}})) as unknown as typeof fetch)).resolves.toMatchObject({alreadyUsed:false});
  await expect(importMedia(env,{...ok,downloadUrl:'https://thumb.wikimedia.org.example.com/x.jpg'},fetcher)).rejects.toThrow('Wikimedia Commons');
  await expect(importMedia(env,{...ok,license:'CC BY-NC 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc/4.0/'},fetcher)).rejects.toThrow('License');
  await expect(importMedia(env,{...ok,credit:''},fetcher)).rejects.toThrow('credit');
  const media=await mediaById(env,[a.id]);
  const imgs=validateImages([{id:a.id,alt:'Boats moored at Port Vell',caption:'Boats at the Barcelona show',relevance:'The article is about this show and this marina'},{...photos()[0]}],undefined,media);
  expect(imgs[0]).toMatchObject({kind:'licensed',license:'CC BY-SA 4.0',credit:'Jane Photographer / Wikimedia Commons'});
  db.close();
 });
 it('labels generated illustrations and requires a relevance note',async()=>{
  const {db,env}=database();const s=store();
  Object.assign(env,{YACHT_PHOTOS:s.bucket,AI:{run:async()=>({image:btoa('x'.repeat(30000))})}});
  const g=await generateMedia(env,{prompt:'A broker and buyer reviewing a boat inquiry form at a marina office desk'});
  const media=await mediaById(env,[g.id]);
  const [img]=validateImages([{id:g.id,alt:'Illustration of an inquiry form on a desk',caption:'An inquiry is not an offer',relevance:'Shows the inquiry-to-offer step the section explains'},photos()[0]],undefined,media);
  expect(img.caption).toBe('An inquiry is not an offer (AI-generated illustration)');
  expect(img.credit).toBe('AI-generated illustration');
  expect(()=>validateImages([{id:g.id,alt:'Illustration of an inquiry form',caption:'An inquiry is not an offer'},photos()[0]],undefined,media)).toThrow('relevance');
  db.close();
 });
});

describe('server-side image relevance check',()=>{
 const paragraph='Before a viewing, write down how you plan to use the boat and what you need to ask the broker. Bring those questions with you. Service records can help you decide which details need a closer look with a qualified professional. Take notes so you can compare the boats after you leave.';
 const article=()=>({title:'Preparing for your next yacht viewing',excerpt:'Practical questions to bring to a yacht viewing, with space to compare your priorities and decide what to ask the broker next.',introduction:paragraph,sections:Array.from({length:4},(_,i)=>({heading:`Planning your viewing: step ${i+1}`,paragraphs:[paragraph,paragraph]})),questions:[{question:'What should I bring to a viewing?',answer:paragraph},{question:'How should I compare my notes?',answer:paragraph}]});
 const photos=()=>oneEach.slice(0,6).map(p=>({id:p.id,alt:'A yacht in the Gray Yachts photo library',caption:'Brokerage photography used as an example',relevance:'Shows the kind of brokerage boat the section discusses'}));
 // Smallest header imageSize reads: SOI, then a SOF0 segment for 1280x960.
 const jpeg=()=>new Uint8Array([0xff,0xd8,0xff,0xc0,0,17,8,0x03,0xc0,0x05,0x00,3,...new Array(40).fill(0)]).buffer;
 function setup() {
  const d=database();const fetched:string[]=[];
  Object.assign(d.env,{NEWSLETTER_AI_PROVIDER:'hermes',NEWSLETTER_START_DATE:'2026-09-08',ASSETS:{fetch:async(r:Request)=>{fetched.push(r.url);return new Response(jpeg(),{headers:{'content-type':'image/jpeg'}});}}});
  return {...d,fetched,payload:{slot:'2026-09-08',original:article(),article:article(),humanizerVersion:'3.0.0',factCheck:{pass:true},images:photos(),sources:[{title:'Gray Yachts',url:'https://grayyachts.com'}]}};
 }
 afterEach(()=>{vi.useRealTimers();});
 it('rejects a draft with a clearly mismatched photo, naming the image and section',async()=>{
  const {db,env,payload}=setup();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-08T17:00:00Z'));
  const sections:string[]=[];
  const roles:(string|undefined)[]=[];
  const judge=vi.fn(async(_i:unknown,section:string,role?:string)=>{sections.push(section);roles.push(role);return section.startsWith('Planning your viewing: step 2')?{fits:false,reason:'The photo shows a cat, not a yacht viewing.'}:{fits:true,reason:'Shows a yacht.'};});
  const error=await acceptHermesDraft(env,payload,judge).catch(e=>e);
  expect(error).toBeInstanceOf(ImageMismatchError);expect(error.status).toBe(409);
  expect(error.message).toContain('images[2] (section "Planning your viewing: step 2"): The photo shows a cat');
  // Lead -> title and introduction; one per section in order; last -> the questions.
  expect(sections[0]).toMatch(/^Preparing for your next yacht viewing\n/);
  expect(sections.slice(1,5).map(s=>s.split('\n')[0])).toEqual([1,2,3,4].map(i=>`Planning your viewing: step ${i}`));
  expect(sections[5]).toMatch(/^Questions worth asking\nWhat should I bring/);
  // The judge is told which slot it checks, so openings and questions are not judged as sections.
  expect(roles).toEqual(['OPENING','SECTION','SECTION','SECTION','SECTION','QUESTIONS']);
  expect(db.prepare('SELECT COUNT(*) n FROM newsletter_issues WHERE content IS NOT NULL').get()?.n).toBe(0);
  expect(db.prepare('SELECT COUNT(*) n FROM newsletter_image_uses').get()?.n).toBe(0);db.close();
 });
 it('accepts matching photos and records the check and pixel size on each image',async()=>{
  const {db,env,payload,fetched}=setup();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-08T17:00:00Z'));
  expect(await acceptHermesDraft(env,payload,async()=>({fits:true,reason:'Shows a yacht at a viewing.'}))).toMatchObject({state:'draft-stored'});
  const images=JSON.parse((db.prepare('SELECT images FROM newsletter_issues').get() as {images:string}).images);
  expect(images).toHaveLength(6);
  expect(images[0]).toMatchObject({check:'passed',checkReason:'Shows a yacht at a viewing.',width:1280,height:960});
  expect(fetched[0]).toBe(`https://grayyachts.com${oneEach[0].url}`);db.close();
 });
 it('fails open when the model errors, recording the skipped check',async()=>{
  const {db,env,payload}=setup();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-08T17:00:00Z'));
  const error=vi.spyOn(console,'error').mockImplementation(()=>{});
  expect(await acceptHermesDraft(env,payload,async()=>{throw new Error('3040: Capacity temporarily exceeded');})).toMatchObject({state:'draft-stored'});
  const images=JSON.parse((db.prepare('SELECT images FROM newsletter_issues').get() as {images:string}).images);
  expect(images.every((i:{check:string;checkReason:string})=>i.check==='skipped'&&i.checkReason.includes('Capacity'))).toBe(true);
  expect(error).toHaveBeenCalled();error.mockRestore();db.close();
 });
 it('checks replaced photos too, and leaves the edition unchanged on a mismatch',async()=>{
  const {db,env}=setup();
  db.prepare("INSERT INTO newsletter_issues(id,slot,status,created_at,content) VALUES('a','2026-09-08','pending','2026-09-08',?)").run(JSON.stringify(article()));
  await expect(attachImages(env,'a',photos(),async(_i,s)=>({fits:!s.startsWith('Questions'),reason:'Unrelated to the questions.'}))).rejects.toThrow('images[5] (questions)');
  expect(db.prepare("SELECT images FROM newsletter_issues WHERE id='a'").get()).toMatchObject({images:'[]'});
  await attachImages(env,'a',photos(),async()=>({fits:true,reason:'Fits.'}));
  expect(JSON.parse((db.prepare("SELECT images FROM newsletter_issues WHERE id='a'").get() as {images:string}).images)[5].check).toBe('passed');db.close();
 });
 it('reads the Workers AI verdict, and treats an unreadable one as a failed check',async()=>{
  const {env}=setup();const error=vi.spyOn(console,'error').mockImplementation(()=>{});
  const images=validateImages(photos(),4);const calls:{model:string;input:{messages:{content:unknown}[]}}[]=[];
  Object.assign(env,{AI:{run:async(model:string,input:{messages:{content:unknown}[]})=>{calls.push({model,input});return {choices:[{message:{content:'```json\n{"fits":false,"reason":"A cat, not a boat."}\n```'}}]};}}});
  await expect(checkImages(env,images,article())).rejects.toThrow('A cat, not a boat.');
  expect(calls[0].model).toBe(RELEVANCE_MODEL);
  expect(JSON.stringify(calls[0].input.messages[1].content)).toContain('data:image/jpeg;base64,');
  Object.assign(env,{AI:{run:async()=>({response:'I think it fits'})}});
  expect((await checkImages(env,images,article())).map(i=>i.check)).toEqual(Array(6).fill('skipped'));
  error.mockRestore();
 });
 it('reads pixel sizes from JPEG, PNG and WebP headers',()=>{
  expect(imageSize(jpeg())).toEqual({width:1280,height:960});
  const png=new Uint8Array(32);png.set([0x89,0x50,0x4e,0x47]);new DataView(png.buffer).setUint32(16,1024);new DataView(png.buffer).setUint32(20,768);
  expect(imageSize(png.buffer)).toEqual({width:1024,height:768});
  const webp=new Uint8Array(32);webp.set([...'RIFF'].map(c=>c.charCodeAt(0)));webp.set([...'WEBPVP8X'].map(c=>c.charCodeAt(0)),8);webp.set([0x7f,0x02,0,0xff,0x01,0],24);
  expect(imageSize(webp.buffer)).toEqual({width:640,height:512});
  expect(imageSize(new Uint8Array(40).buffer)).toBeNull();
 });
});

describe('fresh photo mix hard rule (Connor, 2026-11-11)',()=>{
 const owner=(i=0)=>({kind:'owner' as const});
 const licensed=(i=0)=>({kind:'licensed' as const});
 const generated=(i=0)=>({kind:'generated' as const});
 const catalogKind=()=>({kind:'catalog' as const});
 it('requires at least one new (licensed or generated) picture, regardless of the owner library',()=>{
  expect(()=>checkFreshMix([owner(),catalogKind()],{ownerLibraryEmpty:false})).toThrow('new picture');
  expect(()=>checkFreshMix([owner(),catalogKind()],{ownerLibraryEmpty:true})).toThrow('new picture');
  expect(checkFreshMix([owner(),licensed()],{ownerLibraryEmpty:false})).toEqual([]);
  expect(checkFreshMix([owner(),generated()],{ownerLibraryEmpty:false})).toEqual([]);
 });
 it('never allows an AI-generated lead image',()=>{
  expect(()=>checkFreshMix([generated(),owner(),licensed()],{ownerLibraryEmpty:false})).toThrow('lead image must never be AI-generated');
  expect(checkFreshMix([licensed(),owner(),generated()],{ownerLibraryEmpty:false})).toEqual([]);
 });
 it('downgrades the owner requirement to a warning only while the owner library is empty',()=>{
  expect(()=>checkFreshMix([catalogKind(),licensed()],{ownerLibraryEmpty:false})).toThrow("Connor's own photos");
  expect(checkFreshMix([catalogKind(),licensed()],{ownerLibraryEmpty:true})).toEqual(["Every edition needs at least one of Connor's own photos (kind 'owner')"]);
 });
 it('the emergency NEWSLETTER_FRESH_PHOTO_RULE=warn switch downgrades every violation',()=>{
  // A generated lead already satisfies "has a new picture", so this trips both other rules at once.
  const problems=checkFreshMix([generated(),catalogKind()],{ownerLibraryEmpty:false,mode:'warn'});
  expect(problems).toHaveLength(2);
  const error=checkFreshMix.bind(null,[generated(),catalogKind()],{ownerLibraryEmpty:false});
  expect(error).toThrow("Connor's own photos");
  expect(error).toThrow('AI-generated');
 });
 it('enforces the rule inside resolveImages/attachImages, downgrading only the owner part while the library is empty',async()=>{
  const {db,env}=database();Object.assign(env,{NEWSLETTER_FRESH_PHOTO_RULE:undefined});
  const s=bucketStore();Object.assign(env,{YACHT_PHOTOS:s.bucket});
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at) VALUES('a','2026-09-08','pending','2026-09-08')");
  const media=await importMedia(env,{downloadUrl:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Dock.jpg',sourceUrl:'https://commons.wikimedia.org/wiki/File:Dock.jpg',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',credit:'Jane Photographer',title:'A dock'},async()=>new Response(new Uint8Array(40_000).fill(3),{headers:{'content-type':'image/jpeg'}}));
  const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
  const image=(id:string)=>({id,alt:'A boat in the brokerage photo library',caption:'An example of brokerage listing photography',relevance:'Illustrates the listing presentation the section describes'});
  await expect(attachImages(env,'a',[image(oneEach[0].id),image(oneEach[1].id)])).rejects.toThrow('new picture');
  expect(await attachImages(env,'a',[image(oneEach[0].id),image(media.id)])).toMatchObject({count:2});
  expect(warn).toHaveBeenCalled();warn.mockRestore();db.close();
 });
 it('fully enforces the rule once the owner library is populated',async()=>{
  const {db,env}=database();Object.assign(env,{NEWSLETTER_FRESH_PHOTO_RULE:undefined});
  const s=bucketStore();Object.assign(env,{YACHT_PHOTOS:s.bucket});
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at) VALUES('a','2026-09-08','pending','2026-09-08')");
  const photo=await storeOwnerPhoto(env,jpegBytes(1),{phash:'0000000000000001'});
  const media=await importMedia(env,{downloadUrl:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Dock2.jpg',sourceUrl:'https://commons.wikimedia.org/wiki/File:Dock2.jpg',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',credit:'Jane Photographer',title:'Another dock'},async()=>new Response(new Uint8Array(40_000).fill(4),{headers:{'content-type':'image/jpeg'}}));
  const image=(id:string)=>({id,alt:'A boat in the brokerage photo library',caption:'An example of brokerage listing photography',relevance:'Illustrates the listing presentation the section describes'});
  // No owner photo now rejects outright: the rollout downgrade only applies while the library is empty.
  await expect(attachImages(env,'a',[image(oneEach[0].id),image(media.id)])).rejects.toThrow("Connor's own photos");
  expect(await attachImages(env,'a',[image(photo.id),image(media.id)])).toMatchObject({count:2});
  db.close();
 });
});

// A 25 KB buffer with valid JPEG magic bytes; distinct per call so each has its own sha256 id.
// storeOwnerPhoto trusts the caller's phash (computed on the VPS before upload), so tests pick it directly.
function jpegBytes(tag:number,size=25_000):ArrayBuffer {
 const b=new Uint8Array(size);b[0]=0xff;b[1]=0xd8;b[2]=0xff;b[3]=0xe0;b[10]=tag%256;b[11]=Math.floor(tag/256)%256;
 return b.buffer;
}
function bucketStore() {
 const files=new Map<string,ArrayBuffer>();
 return {files,bucket:{get:async(k:string)=>files.has(k)?{arrayBuffer:async()=>files.get(k)!,httpMetadata:{contentType:'image/jpeg'}}:null,put:async(k:string,v:ArrayBuffer)=>{files.set(k,v);}}};
}

describe("Connor's private photo library (owner photos)",()=>{
 it('validates JPEG magic bytes, size bounds, and the phash format',async()=>{
  const {db,env}=database();const s=bucketStore();Object.assign(env,{YACHT_PHOTOS:s.bucket});
  await expect(storeOwnerPhoto(env,new Uint8Array([1,2,3,4,5]).buffer,{phash:'0000000000000001'})).rejects.toThrow('JPEG');
  await expect(storeOwnerPhoto(env,jpegBytes(1,100),{phash:'0000000000000001'})).rejects.toThrow('20 KB and 15 MB');
  await expect(storeOwnerPhoto(env,jpegBytes(1),{phash:'not-hex'})).rejects.toThrow('phash');
  await expect(storeOwnerPhoto(env,jpegBytes(1),{phash:'0000000000000001',takenOn:'2026/01/01'})).rejects.toThrow('YYYY-MM-DD');
  db.close();
 });
 it('rejects an exact duplicate and a near-duplicate (Hamming <= 6), storing a fresh photo otherwise',async()=>{
  const {db,env}=database();const s=bucketStore();Object.assign(env,{YACHT_PHOTOS:s.bucket});
  const first=await storeOwnerPhoto(env,jpegBytes(1),{phash:'0000000000000000',width:2400,height:1600,takenOn:'2026-07-04'});
  expect(first.url).toBe(`/newsletter-media/${first.id}`);
  expect(s.files.has(`owner-photos/${first.id}.jpg`)).toBe(true);
  await expect(storeOwnerPhoto(env,jpegBytes(1),{phash:'0000000000000000'})).rejects.toThrow('already been uploaded');
  // Hamming distance from 0000000000000000 to 0000000000000007 is 3 (bits 0,1,2 set) <= 6.
  await expect(storeOwnerPhoto(env,jpegBytes(2),{phash:'0000000000000007'})).rejects.toThrow('Too similar');
  const distinct=await storeOwnerPhoto(env,jpegBytes(3),{phash:'ffffffffffffffff'});
  expect(distinct.id).not.toBe(first.id);
  db.close();
 });
 it('fills in a best-effort description from Workers AI, leaving it null on failure',async()=>{
  const {db,env}=database();const s=bucketStore();Object.assign(env,{YACHT_PHOTOS:s.bucket,AI:{run:async()=>({choices:[{message:{content:'A sailboat at a marina dock.'}}]})}});
  const ok=await storeOwnerPhoto(env,jpegBytes(1),{phash:'0000000000000000'});
  expect(ok.description).toBe('A sailboat at a marina dock.');
  Object.assign(env,{AI:{run:async()=>{throw new Error('capacity exceeded');}}});
  const failed=await storeOwnerPhoto(env,jpegBytes(2),{phash:'00000000000000ff'});
  expect(failed.description).toBeNull();
  db.close();
 });
 it('lists only approved, unused, non-near-duplicate photos as available, and tracks the unused count',async()=>{
  const {db,env}=database();const s=bucketStore();Object.assign(env,{YACHT_PHOTOS:s.bucket});
  const a=await storeOwnerPhoto(env,jpegBytes(1),{phash:'0000000000000000'});
  const b=await storeOwnerPhoto(env,jpegBytes(2),{phash:'ffffffffffffffff'});
  expect((await availableOwnerPhotos(env)).map(p=>p.id).sort()).toEqual([a.id,b.id].sort());
  expect(await ownerPhotosUnusedCount(env)).toBe(2);
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at) VALUES('x','2026-09-08','published','2026-09-08')");
  db.exec(`INSERT INTO newsletter_image_uses(image_id,issue_id,used_at) VALUES('${a.id}','x','2026-09-08')`);
  expect(await ownerPhotosUnusedCount(env)).toBe(1);
  expect((await availableOwnerPhotos(env)).map(p=>p.id)).toEqual([b.id]);
  const health=await ownerHealth(env);
  expect(health.unused).toBe(1);expect(health.warning).toContain(`below the ${OWNER_LOW_WATER}-photo low-water mark`);
  db.close();
 });
 it('ownerPhotosById only returns approved rows that match the sha256 id pattern',async()=>{
  const {db,env}=database();const s=bucketStore();Object.assign(env,{YACHT_PHOTOS:s.bucket});
  const a=await storeOwnerPhoto(env,jpegBytes(1),{phash:'0000000000000000'});
  const map=await ownerPhotosById(env,[a.id,'not-a-sha256','0'.repeat(64)]);
  expect(map.has(a.id)).toBe(true);expect(map.size).toBe(1);
  db.close();
 });
 it('ownerHashes lists every uploaded photo for the ingest script, used or not',async()=>{
  const {db,env}=database();const s=bucketStore();Object.assign(env,{YACHT_PHOTOS:s.bucket});
  await storeOwnerPhoto(env,jpegBytes(1),{phash:'0000000000000000'});
  await storeOwnerPhoto(env,jpegBytes(2),{phash:'ffffffffffffffff'});
  expect(await ownerHashes(env)).toHaveLength(2);
  db.close();
 });
 it('computes the Hamming distance between two dHash strings and rejects malformed input',()=>{
  expect(hamming('0000000000000000','0000000000000000')).toBe(0);
  expect(hamming('0000000000000000','ffffffffffffffff')).toBe(64);
  expect(hamming('0000000000000000','0000000000000007')).toBe(3);
  expect(()=>hamming('0000000000000000','not-hex')).toThrow();
 });
 it('defaults every owner photo credit to "Photo: Connor Gray"',async()=>{
  const {db,env}=database();const s=bucketStore();Object.assign(env,{YACHT_PHOTOS:s.bucket});
  const a=await storeOwnerPhoto(env,jpegBytes(1),{phash:'0000000000000000'});
  const [img]=validateImages([{id:a.id,alt:'Connor at the helm',caption:'Connor Gray aboard a brokerage listing',relevance:'Shows Connor, establishing the owner photo library'},...oneEach.slice(0,1).map(p=>({id:p.id,alt:'A boat in the brokerage photo library',caption:'An example of brokerage listing photography',relevance:'Illustrates the listing presentation the section describes'}))],undefined,new Map(),await ownerPhotosById(env,[a.id]));
  expect(img.credit).toBe(OWNER_CREDIT);expect(img.kind).toBe('owner');
  db.close();
 });
});

describe('owner photo near-duplicate rejection across editions and insights (2026-11-11)',()=>{
 const owner=(id:string)=>({id,alt:'Connor at the helm',caption:'Connor Gray aboard a brokerage listing',relevance:'Shows Connor, establishing the owner photo library'});
 const catalogPhoto=(i:number)=>({id:oneEach[i].id,alt:'A boat in the brokerage photo library',caption:'An example of brokerage listing photography',relevance:'Illustrates the listing presentation the section describes'});
 it('rejects a near-duplicate (Hamming <= 6) of an owner photo already used by another edition, but allows re-saving the edition that already holds the original',async()=>{
  const {db,env}=database();
  const idA='1'.repeat(64);const idB='2'.repeat(64);const idC='3'.repeat(64);
  db.prepare('INSERT INTO newsletter_owner_photos(id,r2_key,phash,approved,created_at) VALUES(?,?,?,1,?)').run(idA,`owner-photos/${idA}.jpg`,'0000000000000000','2026-09-08');
  db.prepare('INSERT INTO newsletter_owner_photos(id,r2_key,phash,approved,created_at) VALUES(?,?,?,1,?)').run(idB,`owner-photos/${idB}.jpg`,'0000000000000007','2026-09-08');
  db.prepare('INSERT INTO newsletter_owner_photos(id,r2_key,phash,approved,created_at) VALUES(?,?,?,1,?)').run(idC,`owner-photos/${idC}.jpg`,'ffffffffffffffff','2026-09-08');
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at) VALUES('a','2026-09-08','pending','2026-09-08'),('b','2026-09-10','pending','2026-09-10')");
  await attachImages(env,'a',[owner(idA),catalogPhoto(0)]);
  // idB is within Hamming distance 6 of idA, which edition 'a' already holds.
  await expect(attachImages(env,'b',[owner(idB),catalogPhoto(3)])).rejects.toThrow('near-duplicate');
  expect(db.prepare("SELECT images FROM newsletter_issues WHERE id='b'").get()).toMatchObject({images:'[]'});
  // idC is not a near-duplicate of anything reserved: allowed.
  expect(await attachImages(env,'b',[owner(idC),catalogPhoto(3)])).toMatchObject({count:2});
  // Re-saving 'a' with idB is allowed: idA's reservation belongs to 'a' itself and is excluded.
  expect(await attachImages(env,'a',[owner(idB),catalogPhoto(6)])).toMatchObject({count:2});
  db.close();
 });
 it('rejects a near-duplicate of an owner photo already used on an insights article',async()=>{
  const {db,env}=database();
  const idA='4'.repeat(64);const idB='5'.repeat(64);
  db.prepare('INSERT INTO newsletter_owner_photos(id,r2_key,phash,approved,created_at) VALUES(?,?,?,1,?)').run(idA,`owner-photos/${idA}.jpg`,'0000000000000000','2026-09-08');
  db.prepare('INSERT INTO newsletter_owner_photos(id,r2_key,phash,approved,created_at) VALUES(?,?,?,1,?)').run(idB,`owner-photos/${idB}.jpg`,'0000000000000007','2026-09-08');
  await reserveInsightsImages(env,'some-article',[idA]);
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at) VALUES('a','2026-09-08','pending','2026-09-08')");
  await expect(attachImages(env,'a',[owner(idB),catalogPhoto(0)])).rejects.toThrow('near-duplicate');
  db.close();
 });
});

describe('owner-photo queries tolerate migration 0007 not being applied yet (deploy-order safety)',()=>{
 // Simulates a Worker deployed ahead of its D1 migration (docs/owner-photos.md): migrations
 // 0001-0006 only, so newsletter_owner_photos and insights_image_uses genuinely do not exist, and
 // the reuse trigger is still migration 0006's version, which never references either.
 function databaseWithoutOwnerPhotoTables() {
  const db=new DatabaseSync(':memory:');
  for(const n of ['0001_newsletter','0002_images','0003_section_images','0004_media','0005_published_image_corrections','0006_never_reuse_images'])
   db.exec(readFileSync(`migrations/newsletter/${n}.sql`,'utf8'));
  const prepare=(sql:string):Statement=>{
   let values: (string|number|null)[]=[];
   return {bind(...args:unknown[]){values=args as typeof values;return this;},async first<T>(){return db.prepare(sql).get(...values) as T||null;},async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};
  };
  return {db,env:{NEWSLETTER_DB:{prepare},NEWSLETTER_AUTOMATION_SECRET:'test-signing-secret-with-at-least-32-characters',NEWSLETTER_FRESH_PHOTO_RULE:'warn'} as NewsletterEnv};
 }
 it('treats the owner library as empty everywhere instead of throwing',async()=>{
  const {db,env}=databaseWithoutOwnerPhotoTables();
  await expect(ownerLibraryEmpty(env)).resolves.toBe(true);
  await expect(ownerPhotosUnusedCount(env)).resolves.toBe(0);
  await expect(availableOwnerPhotos(env)).resolves.toEqual([]);
  await expect(ownerHealth(env)).resolves.toMatchObject({available:[],unused:0});
  const id='6'.repeat(64);
  await expect(ownerPhotosById(env,[id])).resolves.toEqual(new Map());
  db.close();
 });
 it('still submits a draft made only of catalog and licensed/generated images (no owner photos required until the library exists)',async()=>{
  const {db,env}=databaseWithoutOwnerPhotoTables();Object.assign(env,{NEWSLETTER_FRESH_PHOTO_RULE:undefined});
  const s=bucketStore();Object.assign(env,{YACHT_PHOTOS:s.bucket});
  const media=await importMedia(env,{downloadUrl:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Dock3.jpg',sourceUrl:'https://commons.wikimedia.org/wiki/File:Dock3.jpg',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',credit:'Jane Photographer',title:'Yet another dock'},async()=>new Response(new Uint8Array(40_000).fill(5),{headers:{'content-type':'image/jpeg'}}));
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at) VALUES('a','2026-09-08','pending','2026-09-08')");
  const image=(id:string)=>({id,alt:'A boat in the brokerage photo library',caption:'An example of brokerage listing photography',relevance:'Illustrates the listing presentation the section describes'});
  expect(await attachImages(env,'a',[image(oneEach[0].id),image(media.id)])).toMatchObject({count:2});
  db.close();
 });
});

describe('insights image ledger',()=>{
 it('reserves images for a slug, atomically rejecting any id already used elsewhere',async()=>{
  const {db,env}=database();
  await expect(reserveInsightsImages(env,'my-article',[oneEach[0].id])).resolves.toMatchObject({slug:'my-article',reserved:[oneEach[0].id]});
  // Re-reserving the same id for the same article is idempotent.
  await expect(reserveInsightsImages(env,'my-article',[oneEach[0].id])).resolves.toMatchObject({slug:'my-article'});
  await expect(reserveInsightsImages(env,'another-article',[oneEach[0].id])).rejects.toBeInstanceOf(ConflictError);
  db.close();
 });
 it('rejects an id a newsletter edition already used',async()=>{
  const {db,env}=database();
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at) VALUES('issue-1','2026-09-08','published','2026-09-08')");
  db.exec(`INSERT INTO newsletter_image_uses(image_id,issue_id,used_at) VALUES('${oneEach[0].id}','issue-1','2026-09-08')`);
  await expect(reserveInsightsImages(env,'my-article',[oneEach[0].id])).rejects.toBeInstanceOf(ConflictError);
  db.close();
 });
 it('validates its input shape',async()=>{
  const {db,env}=database();
  await expect(reserveInsightsImages(env,'',[oneEach[0].id])).rejects.toThrow('slug');
  await expect(reserveInsightsImages(env,'a',[])).rejects.toThrow('imageIds');
  await expect(reserveInsightsImages(env,'a',[oneEach[0].id,oneEach[0].id])).rejects.toThrow('repeat');
  db.close();
 });
});
