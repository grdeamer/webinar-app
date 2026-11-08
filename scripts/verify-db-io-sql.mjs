// Optional, isolated PostgreSQL verification. Install pinned PGlite 0.5.15 in
// .local/db-io-audit/vendor/package (SHA512 recorded in vendor/source.json).
// No application env, Supabase client, network or hosted connection is used.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'.local/db-io-audit')
const manifest=JSON.parse(readFileSync(resolve(out,'vendor/package/package.json'),'utf8'));assert.equal(manifest.version,'0.5.15')
const {PGlite}=await import(pathToFileURL(resolve(out,'vendor/package/dist/index.js')).href)
const db=new PGlite(),report={engine:'PGlite '+manifest.version,syntheticOnly:true,policyChecks:[],plans:{},timings:{}}
const uid1='00000000-0000-4000-8000-000000000001',uid2='00000000-0000-4000-8000-000000000002'
try {
 await db.exec(`create role authenticated; create role anon; create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.email() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.email',true),'')$$;
 grant usage on schema auth to public;
 create table public.profiles(id uuid primary key); create table public.users(id uuid primary key,email text);
 create table public.user_webinars(user_id uuid,webinar_id int);
 insert into profiles values('${uid1}'),('${uid2}'); insert into users values('${uid1}','one@example.test'),('${uid2}','two@example.test');
 insert into user_webinars values('${uid1}',1),('${uid2}',2);
 alter table profiles enable row level security; alter table user_webinars enable row level security;
 create policy "Users can read own profile" on profiles for select using(auth.uid()=id);
 create policy "user can select their webinars" on user_webinars for select using(auth.email()=(select users.email from users where users.id=user_webinars.user_id));
 grant select on profiles,users,user_webinars to anon,authenticated;`)
 async function rows(role,uid,email){
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub','${uid}',false),set_config('request.jwt.claim.email','${email}',false);`)
  const profiles=(await db.query('select id from profiles order by id')).rows,webinars=(await db.query('select webinar_id from user_webinars order by webinar_id')).rows
  await db.exec('reset role');return {profiles,webinars}
 }
 const cases=[['anon','',''],['authenticated',uid1,'one@example.test'],['authenticated',uid2,'two@example.test'],['authenticated',uid1,'nobody@example.test']]
 const before=[];for(const c of cases)before.push(await rows(...c))
 const sql=readFileSync(resolve(root,'supabase/migrations/20261108172028_optimize_profile_and_webinar_rls_initplans.sql'),'utf8')
 await db.exec(sql)
 for(let i=0;i<cases.length;i++){assert.deepEqual(await rows(...cases[i]),before[i]);report.policyChecks.push({role:cases[i][0],uid:cases[i][1],equivalent:true})}
 assert.equal(before[0].profiles.length,0);assert.equal(before[0].webinars.length,0);assert.deepEqual(before[1].profiles,[{id:uid1}]);assert.deepEqual(before[2].profiles,[{id:uid2}]);assert.equal(before[3].webinars.length,0)
 await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${uid1}',false);`)
 report.plans.profileRls=(await db.query('explain (format json) select * from profiles')).rows
 await db.exec('reset role')
 assert.match(JSON.stringify(report.plans.profileRls),/InitPlan/)
 // Drift protection must reject a changed policy without replacing its condition.
 await db.exec('alter policy "Users can read own profile" on profiles using(false)')
 await assert.rejects(db.exec(sql),/policy drifted/);await db.exec('rollback')
 assert.equal((await db.query("select qual from pg_policies where tablename='profiles'")).rows[0].qual,'false')
 report.policyChecks.push({driftAborted:true})
 await db.exec('create table general_session_presence(room_key text,last_seen_at timestamptz); create index general_session_presence_room_last_seen_idx on general_session_presence(room_key,last_seen_at desc); create index idx_gsp_room_last_seen on general_session_presence(room_key,last_seen_at desc);')
 const duplicateSql=readFileSync(resolve(root,'supabase/migrations/20261108174007_remove_duplicate_general_session_presence_index.sql'),'utf8')
 await db.exec(duplicateSql)
 assert.equal((await db.query("select count(*)::int as n from pg_indexes where tablename='general_session_presence'")).rows[0].n,1)
 await db.exec('create index idx_gsp_room_last_seen on general_session_presence(room_key)')
 await assert.rejects(db.exec(duplicateSql),/not interchangeable/);await db.exec('rollback')
 assert.equal((await db.query("select count(*)::int as n from pg_indexes where tablename='general_session_presence'")).rows[0].n,2)
 report.policyChecks.push({duplicateIndexRemovedAndCanonicalPreserved:true,mismatchedIndexRejected:true})
 await db.exec(`create table assignments(id bigint primary key,event_id int,registrant_id int,session_id int);
 insert into assignments select i,(i%100)%20+1,i,i%100+1 from generate_series(1,6000) i;
 create unique index assignment_unique on assignments(registrant_id,session_id);
 create index assignment_event on assignments(event_id); create index assignment_person on assignments(registrant_id);create index assignment_session on assignments(session_id); analyze assignments;`)
 const queries={person:'select session_id from assignments where event_id=4 and registrant_id=23',session:'select registrant_id from assignments where event_id=4 and session_id=24'}
 async function bench(label){
  const values={};for(const [name,query] of Object.entries(queries)){
   const plans=await db.query('explain (analyze,buffers,format json) '+query);report.plans[label+'_'+name]=plans.rows
   for(let i=0;i<5;i++)await db.query(query)
   const timings=[];for(let i=0;i<50;i++){const result=await db.query('explain (analyze,format json) '+query);timings.push(result.rows[0]['QUERY PLAN'][0]['Execution Time'])}
   values[name]={medianExecutionMs:timings.toSorted((a,b)=>a-b)[25],runs:50}
  }report.timings[label]=values
 }
 await bench('existing_single_column_indexes')
 await db.exec('create index candidate_person on assignments(event_id,registrant_id); create index candidate_session on assignments(event_id,session_id); analyze assignments;')
 await bench('candidate_composite_indexes')
 report.note='Synthetic query-shape comparison only. Current hosted tables already have each referencing UUID indexed; no hosted performance or Disk IO credit reduction is inferred.'
 report.outcome='passed'
} finally {await db.close();mkdirSync(out,{recursive:true});writeFileSync(resolve(out,'sql-verification.json'),JSON.stringify(report,null,2))}
console.log(JSON.stringify({outcome:report.outcome,policyChecks:report.policyChecks,timings:report.timings}))
