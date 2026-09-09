import {describe,it,expect,vi,afterEach} from 'vitest';
// @ts-expect-error Node 22+ built-in SQLite; project retains Node 20 type definitions.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {decide,reviewToken,validToken,scheduleSlot,validateArticle,type NewsletterEnv,type Statement} from './core';
import {runNewsletter} from './generate';

function database() {
 const db=new DatabaseSync(':memory:');
 db.exec(readFileSync('migrations/newsletter/0001_newsletter.sql','utf8'));
 const prepare=(sql:string):Statement=>{
  let values: (string|number|null)[]=[];
  return {bind(...args:unknown[]){values=args as typeof values;return this;},async first<T>(){return db.prepare(sql).get(...values) as T||null;},async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};
 };
 return {db,env:{NEWSLETTER_DB:{prepare},NEWSLETTER_AUTOMATION_SECRET:'test-signing-secret-with-at-least-32-characters'} as NewsletterEnv};
}
describe('every-other-day schedule in Pacific time',()=>{
 it('starts at 9am and does not run on the intervening day',()=>{
  expect(scheduleSlot(new Date('2026-09-08T15:59:00Z'),'2026-09-08')).toBeNull();
  expect(scheduleSlot(new Date('2026-09-08T16:00:00Z'),'2026-09-08')).toBe('2026-09-08');
  expect(scheduleSlot(new Date('2026-09-09T01:00:00Z'),'2026-09-08')).toBe('2026-09-08');
  expect(scheduleSlot(new Date('2026-09-09T16:00:00Z'),'2026-09-08')).toBeNull();
  expect(scheduleSlot(new Date('2026-09-10T16:00:00Z'),'2026-09-08')).toBe('2026-09-10');
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
