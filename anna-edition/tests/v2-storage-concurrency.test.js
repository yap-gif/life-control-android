import test from "node:test";
import assert from "node:assert/strict";
import {canonicalJSON,emptyWorkspace,LEGACY_KEY,WORKSPACE_KEY,validateWorkspaceEnvelope} from "../bundle/v2/workspace.js";
import {createWorkspaceRepository} from "../bundle/v2/repository.js";

// Closed synthetic host; no SDK, network, credentials or remote calls.
const opts={timezone:"Asia/Kuching",migrationId:"l03-synthetic"};
const fresh=()=>emptyWorkspace(opts);
const clone=x=>structuredClone(x);
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
function barrier(count){
  const gate=deferred();let arrived=0;
  return async()=>{if(++arrived===count)gate.resolve();await gate.promise;};
}
const err=code=>Object.assign(new Error("Synthetic "+code),{code});
function host({seed=true}={}){
  const records=new Map(),calls={get:0,set:0,create:0,committed:0};let seq=0;
  function put(key,value,etag="l03-e"+(++seq)){records.set(key,{value:clone(value),etag});return etag;}
  if(seed)put(WORKSPACE_KEY,fresh());
  const hooks={beforeGet:null,beforeSet:null,beforeCreate:null,afterSet:null,keepEtag:false};
  const storage={
    async get({key}){
      calls.get++;
      if(hooks.beforeGet)await hooks.beforeGet(key);
      const r=records.get(key);
      return r?{exists:true,...clone(r)}:{exists:false};
    },
    async set({key,value,if_match}){
      calls.set++;
      if(hooks.beforeSet)await hooks.beforeSet({key,value,if_match});
      if(records.get(key)?.etag!==if_match)throw err("precondition_failed");
      put(key,value,hooks.keepEtag?if_match:undefined);calls.committed++;
      if(hooks.afterSet)await hooks.afterSet();
      return {ok:true};
    }
  };
  async function atomicCreate({key,value}){
    calls.create++;
    if(hooks.beforeCreate)await hooks.beforeCreate();
    if(records.has(key))throw err("already_exists");
    put(key,value);calls.committed++;return {ok:true};
  }
  const repo=(timeoutMs=1000)=>createWorkspaceRepository({storage,atomicCreate,capability:{verified:true,maxBytes:1000000},validateDomain:validateWorkspaceEnvelope,timeoutMs});
  return {records,calls,hooks,repo,put};
}
function request(p,id){
  const next=clone(p.workspace);next.revision++;next.lastOperationId=id;
  return {previous:p.workspace,etag:p.etag,next,operationId:id};
}
const outcome=async p=>{try{return {ok:true,value:await p};}catch(e){return {ok:false,code:e.code};}};
test("L03-01 two independent repositories racing CAS have exactly one winner",async()=>{
  const h=host(),a=h.repo(),b=h.repo(),p=await a.inspect(opts),q=await b.inspect(opts);
  h.hooks.beforeSet=barrier(2);
  const results=await Promise.all([outcome(a.commit(request(p,"a"))),outcome(b.commit(request(q,"b")))]);
  assert.equal(results.filter(r=>r.ok).length,1);
  assert.equal(results.find(r=>!r.ok).code,"precondition_failed");
  const winner=results.find(r=>r.ok).value;
  assert.equal(h.records.get(WORKSPACE_KEY).value.lastOperationId,winner.workspace.lastOperationId);
  assert.equal(h.records.get(WORKSPACE_KEY).value.revision,1);
  assert.equal(h.calls.set,2);assert.equal(h.calls.committed,1);
  assert.equal(a.locked!==b.locked,true);
});
test("L03-02 two independent create-only contenders never overwrite the winner",async()=>{
  const h=host({seed:false}),a=h.repo(),b=h.repo();
  const p=await a.inspect({...opts,migrationId:"create-a"}),q=await b.inspect({...opts,migrationId:"create-b"});
  h.hooks.beforeCreate=barrier(2);
  const results=await Promise.all([outcome(a.initialize(p.workspace)),outcome(b.initialize(q.workspace))]);
  assert.equal(results.filter(r=>r.ok).length,1);
  assert.equal(results.find(r=>!r.ok).code,"already_exists");
  assert.equal(h.records.get(WORKSPACE_KEY).value.migration.id,results.find(r=>r.ok).value.workspace.migration.id);
  assert.equal(h.calls.create,2);assert.equal(h.calls.committed,1);assert.equal(h.calls.set,0);
});
test("L03-03 same revision with changed ETag blocks a stale request before write",async()=>{
  const h=host(),r=h.repo(),p=await r.inspect(opts);
  h.put(WORKSPACE_KEY,p.workspace);
  await assert.rejects(r.commit(request(p,"stale")),{code:"CONFLICT"});
  assert.equal(h.calls.set,0);assert.equal(r.locked,true);
});
test("L03-04 same ETag with substituted payload cannot authorize CAS",async()=>{
  const h=host(),r=h.repo(),p=await r.inspect(opts),other=clone(p.workspace);
  other.settings.timezone="UTC";h.put(WORKSPACE_KEY,other,p.etag);
  await assert.rejects(r.commit(request(p,"stale-payload")),{code:"CONFLICT"});
  assert.equal(h.calls.set,0);assert.equal(r.locked,true);
});
test("L03-05 changed payload with unchanged readback ETag is not confirmed",async()=>{
  const h=host(),r=h.repo(),p=await r.inspect(opts);
  h.hooks.keepEtag=true;
  await assert.rejects(r.commit(request(p,"bad-etag")),{code:"ETAG_UNCHANGED"});
  assert.equal(h.calls.committed,1);assert.equal(r.locked,true);
  await assert.rejects(r.commit(request(p,"retry")),{code:"LOCKED"});
  assert.equal(h.calls.set,1);
});
test("L03-06 successful CAS advances revision and changes ETag",async()=>{
  const h=host(),r=h.repo(),p=await r.inspect(opts),q=await r.commit(request(p,"normal"));
  assert.equal(q.workspace.revision,1);assert.notEqual(q.etag,p.etag);
  assert.equal(q.workspace.lastOperationId,"normal");assert.equal(r.locked,false);
});
test("L03-07 timed-out CAS may complete late; original repository never retries",async()=>{
  const h=host(),r=h.repo(25),p=await r.inspect(opts),entered=deferred(),release=deferred(),finished=deferred();
  h.hooks.beforeSet=async()=>{entered.resolve();await release.promise;};
  h.hooks.afterSet=()=>finished.resolve();
  const result=outcome(r.commit(request(p,"late")));
  try{
    await entered.promise;
    assert.deepEqual(await result,{ok:false,code:"TIMEOUT"});
    assert.equal(r.locked,true);assert.equal(r.busy,false);
    assert.equal(h.records.get(WORKSPACE_KEY).value.revision,0);
    await assert.rejects(r.commit(request(p,"retry")),{code:"LOCKED"});
    assert.equal(h.calls.set,1);
  }finally{release.resolve();}
  await finished.promise;
  const observed=await r.inspect(opts);
  assert.equal(observed.workspace.lastOperationId,"late");
  assert.equal(r.locked,true);assert.equal(h.calls.set,1);
  await assert.rejects(r.commit(request(observed,"after-read")),{code:"LOCKED"});
});
test("L03-08 a newer CAS winner prevents delayed stale CAS from overwriting",async()=>{
  const h=host(),a=h.repo(25),b=h.repo(),p=await a.inspect(opts),q=await b.inspect(opts);
  const entered=deferred(),release=deferred();
  const original=h.hooks.beforeSet;
  h.hooks.beforeSet=async({value})=>{if(value.lastOperationId==="delayed"){entered.resolve();await release.promise;}else if(original)await original();};
  // Observe eventual host failure separately; repository's timeout is not cancellation.
  const delayedRepo=a;
  const attempt=outcome(delayedRepo.commit(request(p,"delayed")));
  await entered.promise;
  try{
    assert.deepEqual(await attempt,{ok:false,code:"TIMEOUT"});
    const winner=await b.commit(request(q,"winner"));
    assert.equal(winner.workspace.lastOperationId,"winner");
  }finally{
    // The resumed set rechecks if_match atomically at the host.
    release.resolve();
  }
  // A microtask turn lets the released host operation settle.
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(h.records.get(WORKSPACE_KEY).value.lastOperationId,"winner");
  assert.equal(h.calls.set,2);assert.equal(h.calls.committed,1);assert.equal(a.locked,true);
});
test("L03-09 acknowledgement timeout after commit remains uncertain and locked",async()=>{
  const h=host(),r=h.repo(25),p=await r.inspect(opts),release=deferred();
  h.hooks.afterSet=()=>release.promise;
  try{
    await assert.rejects(r.commit(request(p,"ack-lost")),{code:"TIMEOUT"});
    assert.equal(h.records.get(WORKSPACE_KEY).value.lastOperationId,"ack-lost");
    const observed=await r.inspect(opts);
    assert.equal(observed.workspace.revision,1);assert.equal(r.locked,true);
    await assert.rejects(r.commit(request(observed,"retry")),{code:"LOCKED"});
    assert.equal(h.calls.set,1);
  }finally{release.resolve();}
});
test("L03-10 same repository rejects overlapping mutation while first write is pending",async()=>{
  const h=host(),r=h.repo(),p=await r.inspect(opts),entered=deferred(),release=deferred();
  h.hooks.beforeSet=async()=>{entered.resolve();await release.promise;};
  const first=outcome(r.commit(request(p,"first")));
  try{
    await entered.promise;
    await assert.rejects(r.commit(request(p,"overlap")),{code:"BUSY"});
    assert.equal(h.calls.set,1);
  }finally{release.resolve();}
  assert.equal((await first).ok,true);assert.equal(r.busy,false);assert.equal(r.locked,false);
});
