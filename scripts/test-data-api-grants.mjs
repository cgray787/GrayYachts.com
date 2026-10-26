import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import test from 'node:test';
import {PGlite} from '@electric-sql/pglite';

const directory=new URL('../supabase/migrations/',import.meta.url);
const files=readdirSync(directory).filter(name=>name.endsWith('.sql')).sort();
const source=name=>readFileSync(new URL(name,directory),'utf8');
const clean=sql=>sql.replace(/--[^\n]*/g,'').replace(/\/\*[\s\S]*?\*\//g,'');
const publicRead=new Set(['service_providers','seo_keywords','seo_performance']);
const readOnly=new Set(['seo_keywords','seo_performance']);

// Replay actual table DDL and grants, with no automatic table grants. External
// shared blog_posts is a foreign-key stub, not a claim to replay all migrations.
async function database(includeGrants=true){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as
 $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to anon,authenticated,service_role;
 create table public.blog_posts(id uuid primary key);`);
 for(const file of files){
  const sql=clean(source(file));
  for(const statement of sql.match(/\bcreate\s+table(?:\s+if\s+not\s+exists)?\s+[\w.]+\s*\([\s\S]*?\n\);/gi)||[])await db.exec(statement);
  if(includeGrants)for(const statement of sql.match(/\bgrant\s+(?:select|insert|update|delete)[^;]*\bon\s+table\s+[^;]+;/gi)||[])await db.exec(statement);
 }
 return db;
}

test('fresh tables grant exactly the intended role/operation matrix',async()=>{
 const db=await database();
 try{
  const {rows}=await db.query(`select relname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind='r' and relname <> 'blog_posts' order by relname`);
  assert.equal(rows.length,11);
  for(const {name} of rows){
   for(const role of ['anon','authenticated','service_role'])for(const operation of ['SELECT','INSERT','UPDATE','DELETE']){
    const expected=role==='service_role'||(role==='anon'?publicRead.has(name)&&operation==='SELECT':name!=='seo_strategy_log'&&(!readOnly.has(name)||operation==='SELECT'));
    const result=await db.query('select has_table_privilege($1,$2,$3) as allowed',[role,`public.${name}`,operation]);
    assert.equal(result.rows[0].allowed,expected,`${role} ${operation} ${name}`);
   }
  }
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select * from public.seo_strategy_log'),/permission denied/);
  await db.exec('reset role; set role anon');
  await assert.rejects(db.query('select * from public.prospects'),/permission denied/);
  assert.equal((await db.query('select * from public.service_providers')).rows.length,0);
 }finally{await db.close();}
});

test('real yacht owner policy still hides another owners records after grants',async()=>{
 const db=await database();
 try{
  const own='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
  await db.exec(`insert into auth.users values ('${own}'),('${other}');
  insert into profiles(id,email) values ('${own}','one@example.invalid'),('${other}','two@example.invalid');
  insert into yachts(user_id,name) values ('${own}','mine'),('${other}','theirs');
  alter table yachts enable row level security;`);
  await db.exec(source('001_initial_schema.sql').match(/create policy "Users can view own yachts"[^;]+;/i)[0]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[own]);
  await db.exec('set role authenticated');
  assert.deepEqual((await db.query('select name from yachts')).rows,[{name:'mine'}]);
 }finally{await db.close();}
});

test('negative control: omitting grants denies authenticated table access',async()=>{
 const db=await database(false);
 try{
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select * from yachts'),/permission denied/);
 }finally{await db.close();}
});
