import {describe,it,expect,vi,afterEach} from 'vitest';
// @ts-expect-error Node 22+ built-in SQLite; project retains Node 20 type definitions.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {decide,reviewToken,validToken,scheduleSlot,validateArticle,type NewsletterEnv,type Statement} from './core';
import catalog from './image-catalog.json';
import {attachImages,availableImages,validateImages} from './images';
import {importMedia,generateMedia,mediaById} from './media';
import {runNewsletter,acceptHermesDraft} from './generate';
import {checkImages,ImageMismatchError,RELEVANCE_MODEL} from './relevance';
import {imageSize} from './resize';

function database() {
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync('migrations/newsletter/0001_newsletter.sql','utf8'));
 db.exec(readFileSync('migrations/newsletter/0002_images.sql','utf8'));
 db.exec(readFileSync('migrations/newsletter/0003_section_images.sql','utf8'));
 db.exec(readFileSync('migrations/newsletter/0004_media.sql','utf8'));
 db.exec(readFileSync('migrations/newsletter/0005_published_image_corrections.sql','utf8'));
 const prepare=(sql:string):Statement=>{
  let values: (string|number|null)[]=[];
  return {bind(...args:unknown[]){values=args as typeof values;return this;},async first<T>(){return db.prepare(sql).get(...values) as T||null;},async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};
 };
 return {db,env:{NEWSLETTER_DB:{prepare},NEWSLETTER_AUTOMATION_SECRET:'test-signing-secret-with-at-least-32-characters'} as NewsletterEnv};
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
   const payload={slot:'2026-09-08',original:article(),article:article(),humanizerVersion:'3.0.0',factCheck:{pass:true},images:catalog.slice(0,6).map(p=>({id:p.id,alt:'A yacht in the Gray Yachts photo library',caption:'Brokerage photography used as an example',relevance:'Shows the kind of brokerage boat the section discusses'})),sources:[{title:'Gray Yachts',url:'https://grayyachts.com'}]};
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
});

describe('newsletter image policy',()=>{
 const photos=(start=0)=>catalog.slice(start,start+3).map(p=>({id:p.id,alt:'A boat in the brokerage photo library',caption:'An example of brokerage listing photography',relevance:'Illustrates the listing presentation the section describes'}));
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
  // A pending draft may swap its photos before review; the old ones are released.
  await attachImages(env,'b',photos(6));
  expect((await availableImages(env)).some(i=>i.id===photos(3)[0].id)).toBe(true);
  db.exec("UPDATE newsletter_issues SET status='rejected' WHERE id='b'");
  await expect(attachImages(env,'b',photos(9))).rejects.toThrow();db.close();
 });
 it('corrects a published edition in place without reopening review',async()=>{
  const {db,env}=database();
  db.exec("INSERT INTO newsletter_issues(id,slot,status,created_at,email_sent_at,review_revision) VALUES('p','2026-10-18','pending','2026-10-18','2026-10-18',0)");
  await attachImages(env,'p',photos());
  db.exec("UPDATE newsletter_issues SET status='published',published_at='2026-10-18' WHERE id='p'");
  expect(await attachImages(env,'p',photos(3))).toMatchObject({state:'published-images-corrected',count:3});
  expect(db.prepare("SELECT status,hero,review_revision,email_sent_at FROM newsletter_issues WHERE id='p'").get()).toMatchObject({status:'published',hero:catalog[3].url,review_revision:1,email_sent_at:null});
  // The replaced photos are released for future editions.
  expect((await availableImages(env)).some(i=>i.id===photos()[0].id)).toBe(true);
  db.exec("UPDATE newsletter_issues SET status='failed' WHERE id='p'");
  await expect(attachImages(env,'p',photos(6))).rejects.toThrow('pending or published');
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
 const photos=()=>catalog.slice(0,3).map(p=>({id:p.id,alt:'A boat in the brokerage photo library',caption:'An example of brokerage listing photography',relevance:'Illustrates the listing presentation the section describes'}));
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
  const g=await generateMedia(env,{prompt:'A broker and buyer reviewing a boat enquiry form at a marina office desk'});
  const media=await mediaById(env,[g.id]);
  const [img]=validateImages([{id:g.id,alt:'Illustration of an enquiry form on a desk',caption:'An enquiry is not an offer',relevance:'Shows the enquiry-to-offer step the section explains'},photos()[0]],undefined,media);
  expect(img.caption).toBe('An enquiry is not an offer (AI-generated illustration)');
  expect(img.credit).toBe('AI-generated illustration');
  expect(()=>validateImages([{id:g.id,alt:'Illustration of an enquiry form',caption:'An enquiry is not an offer'},photos()[0]],undefined,media)).toThrow('relevance');
  db.close();
 });
});

describe('server-side image relevance check',()=>{
 const paragraph='Before a viewing, write down how you plan to use the boat and what you need to ask the broker. Bring those questions with you. Service records can help you decide which details need a closer look with a qualified professional. Take notes so you can compare the boats after you leave.';
 const article=()=>({title:'Preparing for your next yacht viewing',excerpt:'Practical questions to bring to a yacht viewing, with space to compare your priorities and decide what to ask the broker next.',introduction:paragraph,sections:Array.from({length:4},(_,i)=>({heading:`Planning your viewing: step ${i+1}`,paragraphs:[paragraph,paragraph]})),questions:[{question:'What should I bring to a viewing?',answer:paragraph},{question:'How should I compare my notes?',answer:paragraph}]});
 const photos=()=>catalog.slice(0,6).map(p=>({id:p.id,alt:'A yacht in the Gray Yachts photo library',caption:'Brokerage photography used as an example',relevance:'Shows the kind of brokerage boat the section discusses'}));
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
  const judge=vi.fn(async(_i:unknown,section:string)=>{sections.push(section);return section.startsWith('Planning your viewing: step 2')?{fits:false,reason:'The photo shows a cat, not a yacht viewing.'}:{fits:true,reason:'Shows a yacht.'};});
  const error=await acceptHermesDraft(env,payload,judge).catch(e=>e);
  expect(error).toBeInstanceOf(ImageMismatchError);expect(error.status).toBe(409);
  expect(error.message).toContain('images[2] (section "Planning your viewing: step 2"): The photo shows a cat');
  // Lead -> title and introduction; one per section in order; last -> the questions.
  expect(sections[0]).toMatch(/^Preparing for your next yacht viewing\n/);
  expect(sections.slice(1,5).map(s=>s.split('\n')[0])).toEqual([1,2,3,4].map(i=>`Planning your viewing: step ${i}`));
  expect(sections[5]).toMatch(/^Questions worth asking\nWhat should I bring/);
  expect(db.prepare('SELECT COUNT(*) n FROM newsletter_issues WHERE content IS NOT NULL').get()?.n).toBe(0);
  expect(db.prepare('SELECT COUNT(*) n FROM newsletter_image_uses').get()?.n).toBe(0);db.close();
 });
 it('accepts matching photos and records the check and pixel size on each image',async()=>{
  const {db,env,payload,fetched}=setup();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-08T17:00:00Z'));
  expect(await acceptHermesDraft(env,payload,async()=>({fits:true,reason:'Shows a yacht at a viewing.'}))).toMatchObject({state:'draft-stored'});
  const images=JSON.parse((db.prepare('SELECT images FROM newsletter_issues').get() as {images:string}).images);
  expect(images).toHaveLength(6);
  expect(images[0]).toMatchObject({check:'passed',checkReason:'Shows a yacht at a viewing.',width:1280,height:960});
  expect(fetched[0]).toBe(`https://grayyachts.com${catalog[0].url}`);db.close();
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
