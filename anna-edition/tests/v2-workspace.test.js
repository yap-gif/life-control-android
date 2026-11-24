import test from "node:test";
import assert from "node:assert/strict";
import {LEGACY_KEY,WORKSPACE_KEY,canonicalJSON,utf8Bytes,myrToMinor,migrateLegacy,emptyWorkspace,validateWorkspaceEnvelope} from "../bundle/v2/workspace.js";
import {readKey,inspectWorkspace,createWorkspaceRepository} from "../bundle/v2/repository.js";
const opts={timezone:"Asia/Kuching",migrationId:"m1"};
const legacy=()=>({version:1,tasks:[{id:"t",title:"Task",date:"2026-11-20",done:true}],money:[{id:"m",date:"2026-11-20",amount:12.34,type:"expense",category:"Food"}],learning:[{id:"l",date:"2026-11-20",topic:"Kotlin",minutes:30}],journal:[{id:"j",date:"2026-11-20",text:"reflection"}],goal:{goal:1000,saved:25.50,monthly:100},lastReview:{generatedAt:"2026-11-20",text:"Report",categories:["money"]},savedPlan:{savedAt:"2026-11-20",text:"Plan",categories:["learning"]}});
function host(raw=legacy()){
  const records=new Map();let seq=0,calls=0;
  const seed=(key,value)=>{const etag="e"+(++seq);records.set(key,{etag,value:structuredClone(value)});return etag;};
  if(raw!==null)seed(LEGACY_KEY,raw);
  const h={records,seed,get writes(){return calls;},async get({key}){const r=records.get(key);return r?{exists:true,etag:r.etag,value:structuredClone(r.value)}:{exists:false};},
    async set({key,value,if_match}){calls++;if(records.get(key)?.etag!==if_match)throw Object.assign(new Error("stale"),{code:"precondition_failed"});seed(key,value);return {ok:true};},
    async create({key,value}){calls++;if(records.has(key))throw new Error("already exists");seed(key,value);return {ok:true};}};
  return h;
}
function repo(h,override={}){
  return createWorkspaceRepository({storage:h,atomicCreate:x=>h.create(x),capability:{verified:true,maxBytes:1000000},validateDomain:validateWorkspaceEnvelope,...override});
}
async function init(h,r=repo(h)){const x=await r.inspect(opts);return r.initialize(x.workspace);}
function next(p,id="op1"){const n=structuredClone(p.workspace);n.revision++;n.lastOperationId=id;n.collections.learning.push({id:"new",date:"2026-11-24",topic:"Test",minutes:30});return n;}
test("decimal conversion uses integer sen and rejects ambiguous precision",()=>{
  for(const [a,b] of [[0,0],["0.01",1],[0.1,10],["100.99",10099],[100000000,10000000000]])assert.equal(myrToMinor(a),b);
  for(const a of [0.001,-1,NaN,Infinity,"1e3","1.005",100000001,null])assert.throws(()=>myrToMinor(a));
});
test("legacy migration preserves all record types and scope, without fictional dates",()=>{
  const raw=legacy(),before=canonicalJSON(raw),w=migrateLegacy(raw,{...opts,legacyEtag:"e1"}),c=w.collections;
  assert.equal(c.tasks[0].status,"done");assert.equal(c.tasks[0].createdAt,null);assert.equal(c.taskEvents.length,0);
  assert.equal(c.transactions[0].amountMinor,1234);assert.equal(c.learning[0].minutes,30);assert.equal(c.journal[0].reflection,"reflection");
  assert.equal(c.goals[0].progress,2550);assert.equal(c.analyses[0].legacyText,"Report");assert.deepEqual(c.analyses[0].legacyCategories,["money"]);assert.deepEqual(c.analyses[0].sourceCategories,["money","goals"]);
  assert.equal(c.plans[0].legacyText,"Plan");assert.equal(c.plans[0].mayResend,false);assert.equal(c.plans[0].actions.length,0);
  assert.equal(c.analyses[0].createdAt,null);assert.equal(c.plans[0].legacyDate,"2026-11-20");
  assert.equal(canonicalJSON(raw),before);
});
test("migration preserves over 1000 retained records, rejects invalid and duplicate rows",()=>{
  const raw=legacy();raw.money=Array.from({length:1001},(_,i)=>({...raw.money[0],id:String(i),amount:.01}));
  const w=migrateLegacy(raw,{...opts,legacyEtag:"e1"});assert.equal(w.collections.transactions.length,1001);
  raw.money[1000].id="0";assert.throws(()=>migrateLegacy(raw,{...opts,legacyEtag:"e1"}),/Duplicate/);
  raw.money[1000].id="1000";raw.money[1000].amount=0.001;assert.throws(()=>migrateLegacy(raw,{...opts,legacyEtag:"e1"}),/precision/);
  raw.money=[];raw.extra="unmapped";assert.throws(()=>migrateLegacy(raw,{...opts,legacyEtag:"e1"}),/Unknown/);
});
test("canonical JSON comparison ignores key order but not array order or Unicode byte length",()=>{
  assert.equal(canonicalJSON({b:2,a:[1,2]}),canonicalJSON({a:[1,2],b:2}));
  assert.notEqual(canonicalJSON([1,2]),canonicalJSON([2,1]));assert.ok(utf8Bytes({a:"中文"})>canonicalJSON({a:"中文"}).length);
  assert.throws(()=>canonicalJSON({a:undefined}));assert.throws(()=>canonicalJSON({a:NaN}));
});
test("readKey distinguishes explicit absence from generic HTTP 404 and permissions",async()=>{
  assert.equal((await readKey({get:async()=>({exists:false})},LEGACY_KEY)).exists,false);
  assert.equal((await readKey({get:async()=>{throw {code:"KEY_NOT_FOUND"};}},LEGACY_KEY)).exists,false);
  for(const e of [{status:404},{status:403},{code:"timeout"}])await assert.rejects(readKey({get:async()=>{throw e;}},LEGACY_KEY));
  await assert.rejects(readKey({get:async()=>({value:{}})},LEGACY_KEY),{code:"AMBIGUOUS_READ"});
  await assert.rejects(readKey({get:async()=>({exists:false,value:{}})},LEGACY_KEY),{code:"AMBIGUOUS_READ"});
});
test("fresh install inspection and unverified capability never write",async()=>{
  const h=host(null),r=createWorkspaceRepository({storage:h});
  const x=await r.inspect(opts);assert.equal(x.status,"candidate-only");assert.equal(x.workspace.migration.legacyEtag,null);
  await assert.rejects(r.initialize(x.workspace),{code:"CAPABILITY_UNVERIFIED"});assert.equal(h.writes,0);
  const r2=repo(h,{atomicCreate:null});await assert.rejects(r2.initialize(x.workspace),{code:"CREATE_UNVERIFIED"});assert.equal(h.writes,0);
});
test("mock atomic migration preserves original key, repeat reopen does not import twice",async()=>{
  const h=host(),raw=canonicalJSON(h.records.get(LEGACY_KEY)),r=repo(h);
  const p=await init(h,r);assert.equal(h.writes,1);assert.equal(canonicalJSON(h.records.get(LEGACY_KEY)),raw);
  const reopened=await r.inspect({...opts,migrationId:"new-id"});assert.equal(reopened.status,"existing");assert.equal(reopened.workspace.collections.transactions.length,1);assert.equal(reopened.etag,p.etag);
  assert.equal(h.writes,1);
});
test("invalid existing v2 never falls back to legacy",async()=>{
  const h=host();h.seed(WORKSPACE_KEY,{schemaVersion:99});
  await assert.rejects(inspectWorkspace(h,opts),/Unsupported/);assert.equal(h.writes,0);
});
test("capacity limit rejects before any writes without eviction",async()=>{
  const h=host(),r=repo(h,{capability:{verified:true,maxBytes:50}}),x=await r.inspect(opts);
  await assert.rejects(r.initialize(x.workspace),{code:"CAPACITY"});assert.equal(h.writes,0);assert.equal(h.records.get(LEGACY_KEY).value.money.length,1);
});
test("legacy changed after migration candidate preparation blocks initialization",async()=>{
  const h=host(),r=repo(h),x=await r.inspect(opts);h.seed(LEGACY_KEY,legacy());
  await assert.rejects(r.initialize(x.workspace),{code:"CONFLICT"});assert.equal(h.writes,0);assert.equal(r.locked,true);
});
test("legacy divergence after migration blocks reopen and mutation",async()=>{
  const h=host(),r=repo(h),p=await init(h,r);h.seed(LEGACY_KEY,legacy());
  await assert.rejects(r.inspect(opts),{code:"LEGACY_DIVERGED"});
  await assert.rejects(r.commit({previous:p.workspace,etag:p.etag,next:next(p),operationId:"op1"}),{code:"LEGACY_DIVERGED"});assert.equal(h.writes,1);
});
test("confirmed CAS update with readback and stale conflict",async()=>{
  const h=host(),r=repo(h),p=await init(h,r);
  const q=await r.commit({previous:p.workspace,etag:p.etag,next:next(p),operationId:"op1"});
  assert.equal(q.workspace.revision,1);assert.equal(q.workspace.collections.learning.length,2);assert.equal(h.writes,2);
  await assert.rejects(r.commit({previous:p.workspace,etag:p.etag,next:next(p),operationId:"op1"}),{code:"CONFLICT"});
  assert.equal(r.locked,true);assert.equal(h.writes,2);
});
test("false ACK fails readback and locks further mutations",async()=>{
  const h=host(),r=repo(h),p=await init(h,r);h.set=async()=>({ok:true});
  const request={previous:p.workspace,etag:p.etag,next:next(p),operationId:"op1"};
  await assert.rejects(r.commit(request),{code:"READBACK_MISMATCH"});assert.equal(r.locked,true);
  await assert.rejects(r.commit(request),{code:"LOCKED"});
});
test("hung write is bounded, concurrent mutation rejected, no blind retry",async()=>{
  const h=host(),p=await init(h);h.set=()=>new Promise(()=>{});
  const r=repo(h,{timeoutMs:25}),request={previous:p.workspace,etag:p.etag,next:next(p),operationId:"op1"};
  const first=r.commit(request);await assert.rejects(r.commit(request),{code:"BUSY"});
  await assert.rejects(first,{code:"TIMEOUT"});assert.equal(r.locked,true);
  await assert.rejects(r.commit(request),{code:"LOCKED"});assert.equal(h.writes,1);
});
test("candidate creation false ACK or competing writer never reported as success",async()=>{
  const h=host(),r=repo(h,{atomicCreate:async()=>({ok:true})}),x=await r.inspect(opts);
  await assert.rejects(r.initialize(x.workspace),{code:"READBACK_MISMATCH"});assert.equal(r.locked,true);
  const h2=host(),r2=repo(h2,{atomicCreate:async({key,value})=>{h2.seed(key,{...value,revision:1});throw new Error("already exists");}});
  await assert.rejects(init(h2,r2),/already exists/);assert.equal(r2.locked,true);
});

test("domain validator must explicitly return true; false or asynchronous results cannot authorize writes",async()=>{
  const h=host();
  for(const validateDomain of [()=>false,()=>undefined,async()=>true]){
    const r=repo(h,{validateDomain}),x=await r.inspect(opts);
    await assert.rejects(r.initialize(x.workspace),{code:"DOMAIN_INVALID"});
    assert.equal(h.writes,0);
  }
});
test("conditional write races after the pre-read never overwrite another writer",async()=>{
  const h=host(),r=repo(h),p=await init(h,r);
  const original=h.set.bind(h);
  h.set=async(args)=>{h.seed(WORKSPACE_KEY,{...p.workspace,revision:1,lastOperationId:"other"});return original(args);};
  await assert.rejects(r.commit({previous:p.workspace,etag:p.etag,next:next(p),operationId:"op1"}),{code:"precondition_failed"});
  assert.equal(h.records.get(WORKSPACE_KEY).value.lastOperationId,"other");assert.equal(r.locked,true);
});
