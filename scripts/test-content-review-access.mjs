import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {PGlite} from '@electric-sql/pglite';

// Stubs mirror the live grants/RLS on blog_posts and outreach_sequences as
// of 2026-11-11, before the proposed migration. See
// docs/content-review-access.md for how these were confirmed. This is not
// a replay of the real migration history (outreach_sequences is owned by
// the grayyachts-agents repo and isn't defined under supabase/migrations
// here); it is a fixture of the current database state.
const forwardPath = new URL('../supabase/changes/20261111-content-review-admin-access.sql', import.meta.url);
const rollbackPath = new URL('../supabase/changes/20261111-content-review-admin-access.rollback.sql', import.meta.url);
const forwardSql = readFileSync(forwardPath, 'utf8');
const rollbackSql = readFileSync(rollbackPath, 'utf8');

const ADMIN = '00000000-0000-4000-8000-000000000001';
const CLIENT = '00000000-0000-4000-8000-000000000002';
const PENDING_ID = '00000000-0000-4000-8000-0000000000a1';
const APPROVED_ID = '00000000-0000-4000-8000-0000000000a2';
const DRAFT_ID = '00000000-0000-4000-8000-0000000000b1';
const PUBLISHED_ID = '00000000-0000-4000-8000-0000000000b2';

async function liveDatabase() {
 const db=new PGlite();
 await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
   $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth,public to anon,authenticated,service_role;

  create table public.profiles(
   id uuid primary key references auth.users(id),
   email text,
   role text check (role in ('client','admin'))
  );
  alter table public.profiles enable row level security;
  grant select on table public.profiles to authenticated;
  create policy "Users can read own profile" on public.profiles for select to authenticated using (id=(select auth.uid()));
  create policy "Users can update own profile" on public.profiles for update to authenticated using (id=(select auth.uid()));

  create table public.blog_posts(
   id uuid primary key, title text, slug text, excerpt text, content text, cover_image_url text,
   published boolean not null default false, published_at timestamptz,
   author text, meta_description text, og_title text, og_description text, og_image_url text,
   schema_json jsonb, content_type text, word_count int,
   created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
   qa_status text, qa_attempt int, qa_last_feedback text, approved_at timestamptz,
   rejection_note text, tenant_id text
  );
  alter table public.blog_posts enable row level security;
  grant select on table public.blog_posts to anon,authenticated;
  grant select,insert,update,delete on table public.blog_posts to service_role;
  create policy "Public can read published posts" on public.blog_posts for select using (published=true);

  create table public.outreach_sequences(
   id uuid primary key, prospect_id uuid, lead_type text, status text, email_address text,
   thread_id text, message_ids jsonb, emails_sent int, last_sent_at timestamptz,
   next_followup_at timestamptz, replied_at timestamptz, draft_content jsonb, rejection_note text,
   created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
   tenant_id text, cadence text, lead_role text, brand text, nurture_state text,
   enrolled_on timestamptz, sms_sent boolean, d1_followup_id text
  );
  alter table public.outreach_sequences enable row level security;
  grant select,insert,update,delete on table public.outreach_sequences to service_role;
  create policy "Service role full access on outreach_sequences" on public.outreach_sequences for all to service_role using (true) with check (true);

  insert into auth.users values ('${ADMIN}'),('${CLIENT}');
  insert into public.outreach_sequences(id,status,email_address) values
   ('${PENDING_ID}','pending_approval','prospect-a@example.invalid'),
   ('${APPROVED_ID}','approved','prospect-b@example.invalid');
  insert into public.blog_posts(id,title,published,qa_status) values
   ('${DRAFT_ID}','Draft post',false,'pending_approval'),
   ('${PUBLISHED_ID}','Published post',true,'approved');
 `);
 return db;
}

async function asUser(db,id){
 await db.exec('reset role');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
 await db.exec('set role authenticated');
}
async function asAnon(db){ await db.exec('reset role; set role anon'); }
async function asSuperuser(db){ await db.exec('reset role'); }

async function scalar(db,sql,params){
 return (await db.query(sql,params)).rows[0].val;
}

async function privilegeSnapshot(db){
 return {
  outreachSelect: await scalar(db,"select has_table_privilege('authenticated','public.outreach_sequences','SELECT') as val"),
  outreachStatusUpdate: await scalar(db,"select has_column_privilege('authenticated','public.outreach_sequences','status','UPDATE') as val"),
  outreachEmailUpdate: await scalar(db,"select has_column_privilege('authenticated','public.outreach_sequences','email_address','UPDATE') as val"),
  blogPublishedUpdate: await scalar(db,"select has_column_privilege('authenticated','public.blog_posts','published','UPDATE') as val"),
  outreachPolicyCount: await scalar(db,"select count(*)::int as val from pg_policies where schemaname='public' and tablename='outreach_sequences'"),
  blogPolicyCount: await scalar(db,"select count(*)::int as val from pg_policies where schemaname='public' and tablename='blog_posts'"),
  isPortalAdminExists: await scalar(db,"select count(*)::int as val from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='is_portal_admin'"),
 };
}

test('before migration: authenticated cannot read outreach drafts or update blog_posts', async()=>{
 const db=await liveDatabase();
 try{
  await asUser(db,ADMIN);
  await assert.rejects(db.query('select * from public.outreach_sequences'),/permission denied/);
  await assert.rejects(db.query("update public.blog_posts set published=true"),/permission denied/);
 }finally{await db.close();}
});

test('after forward migration with no admin profile row: grants exist but nobody matches is_portal_admin()', async()=>{
 const db=await liveDatabase();
 try{
  await db.exec(forwardSql);
  await asUser(db,ADMIN);
  assert.equal((await db.query('select * from public.outreach_sequences')).rows.length,0);
  const updated=await db.query("update public.blog_posts set qa_status='approved' where id=$1 returning id",[DRAFT_ID]);
  assert.equal(updated.rows.length,0);
 }finally{await db.close();}
});

test('after forward migration with profiles: admin can review, client cannot, anon unaffected', async()=>{
 const db=await liveDatabase();
 try{
  await db.exec(forwardSql);
  await db.exec(`insert into public.profiles(id,email,role) values
   ('${ADMIN}','admin@example.invalid','admin'),('${CLIENT}','client@example.invalid','client');`);

  await asUser(db,ADMIN);
  const outreachRows=await db.query('select id from public.outreach_sequences order by id');
  assert.deepEqual(outreachRows.rows.map(r=>r.id),[PENDING_ID,APPROVED_ID]);

  const approvePending=await db.query("update public.outreach_sequences set status='approved' where id=$1 returning id",[PENDING_ID]);
  assert.equal(approvePending.rows.length,1);

  const approveNonPending=await db.query("update public.outreach_sequences set status='approved' where id=$1 returning id",[APPROVED_ID]);
  assert.equal(approveNonPending.rows.length,0);

  await assert.rejects(
   db.query("update public.outreach_sequences set email_address='hijacked@example.invalid' where id=$1",[PENDING_ID]),
   /permission denied/,
  );

  const draftBeforePublish=await db.query('select id from public.blog_posts where published=false');
  assert.deepEqual(draftBeforePublish.rows.map(r=>r.id),[DRAFT_ID]);
  const publish=await db.query(
   "update public.blog_posts set published=true, qa_status='approved' where id=$1 returning id",
   [DRAFT_ID],
  );
  assert.equal(publish.rows.length,1);

  await asUser(db,CLIENT);
  assert.equal((await db.query('select * from public.outreach_sequences')).rows.length,0);
  assert.equal((await db.query('select * from public.blog_posts where published=false')).rows.length,0);
  const clientOutreachUpdate=await db.query(
   "update public.outreach_sequences set status='approved' where status='pending_approval' returning id",
  );
  assert.equal(clientOutreachUpdate.rows.length,0);
  const clientBlogUpdate=await db.query(
   "update public.blog_posts set qa_status='approved' returning id",
  );
  assert.equal(clientBlogUpdate.rows.length,0);

  await asAnon(db);
  await assert.rejects(db.query('select * from public.outreach_sequences'),/permission denied/);
  const anonBlogRows=await db.query('select id from public.blog_posts order by id');
  assert.deepEqual(anonBlogRows.rows.map(r=>r.id),[DRAFT_ID,PUBLISHED_ID]);
 }finally{await db.close();}
});

test('rollback restores exact pre-migration privileges and policies', async()=>{
 const db=await liveDatabase();
 try{
  const before=await privilegeSnapshot(db);
  await db.exec(forwardSql);
  const mid=await privilegeSnapshot(db);
  assert.notDeepEqual(mid,before);
  await db.exec(rollbackSql);
  const after=await privilegeSnapshot(db);
  assert.deepEqual(after,before);
 }finally{await db.close();}
});
