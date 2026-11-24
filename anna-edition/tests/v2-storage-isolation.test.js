import test from "node:test";
import assert from "node:assert/strict";
import {canonicalJSON,emptyWorkspace,LEGACY_KEY,WORKSPACE_KEY,validateWorkspaceEnvelope} from "../bundle/v2/workspace.js";
import {readKey,createWorkspaceRepository} from "../bundle/v2/repository.js";

// L02: test only closed in-memory data and injected adapters.
const opts={timezone:"Asia/Kuching",migrationId:"l02-synthetic"};
const fresh=()=>emptyWorkspace(opts);
const ambiguous={code:"AMBIGUOUS_READ"};
function harness({initial=null,mutate=null}={}){
  const records=new Map(),calls={get:0,create:0,set:0};
  let seq=0;
  function put(key,value){const etag="l02-"+(++seq);records.set(key,{value,etag});return etag;}
  if(initial)put(WORKSPACE_KEY,initial);
  const storage={
    async get({key}){calls.get++;return records.has(key)?{exists:true,...records.get(key)}:{exists:false};},
    async set({key,value,if_match}){
      calls.set++;
      assert.equal(if_match,records.get(key)?.etag);
      if(mutate)mutate(value);
      put(key,value);return {ok:true};
    }
  };
  const repo=createWorkspaceRepository({storage,atomicCreate:async({key,value})=>{
    calls.create++;assert.equal(records.has(key),false);
    if(mutate)mutate(value);
    put(key,value);return {ok:true};
  },capability:{verified:true,maxBytes:1000000},validateDomain:validateWorkspaceEnvelope,timeoutMs:200});
  return {repo,records,calls,put};
}
const change=w=>{const n=structuredClone(w);n.revision++;n.lastOperationId="l02-op";return n;};
const request=p=>({previous:p.workspace,etag:p.etag,next:change(p.workspace),operationId:"l02-op"});
test("L02-01 readKey detaches host-owned nested values",async()=>{
  const source={rows:[{id:"original"}]};
  const read=await readKey({get:async()=>({value:source,etag:"e1"})},WORKSPACE_KEY);
  read.value.rows[0].id="caller edit";
  assert.equal(source.rows[0].id,"original");
  source.rows.push({id:"adapter edit"});
  assert.equal(read.value.rows.length,1);
});
test("L02-02 malformed nested JSON never becomes existing or absent evidence",async()=>{
  const cycle={};cycle.self=cycle;
  const symbol={};symbol[Symbol("extra")]=1;
  const hidden={};Object.defineProperty(hidden,"secret",{value:1});
  for(const value of [NaN,Infinity,1n,()=>{},new Date(),{x:undefined},{x:NaN},symbol,hidden,cycle,[,1]]){
    await assert.rejects(readKey({get:async()=>({value,etag:"e1"})},WORKSPACE_KEY),ambiguous);
  }
});
test("L02-03 array accessors and hidden extra properties rejected without invocation",async()=>{
  let invoked=0;
  const a=[0];Object.defineProperty(a,"0",{get(){invoked++;return 1;},enumerable:true});
  const b=[1];Object.defineProperty(b,"extra",{value:"hidden"});
  const c={};Object.defineProperty(c,"x",{get(){invoked++;return 1;},enumerable:true});
  for(const value of [a,b,c]){
    assert.throws(()=>canonicalJSON(value));
    await assert.rejects(readKey({get:async()=>({value,etag:"e1"})},WORKSPACE_KEY),ambiguous);
  }
  assert.equal(invoked,0);
});
test("L02-04 canonical dense JSON remains stable and independent",async()=>{
  const value={b:[null,0,false,"",{"z":1,"a":"中文"}],a:2};
  const read=await readKey({get:async()=>({value,etag:"e1"})},WORKSPACE_KEY);
  assert.deepEqual(read.value,value);
  assert.notEqual(read.value,value);
  assert.equal(canonicalJSON(read.value),canonicalJSON(value));
});
test("L02-05 inspecting a workspace cannot mutate the stored object through references",async()=>{
  const h=harness({initial:fresh()});
  const p=await h.repo.inspect(opts);
  p.workspace.settings.timezone="UTC";
  assert.equal(h.records.get(WORKSPACE_KEY).value.settings.timezone,"Asia/Kuching");
  assert.equal(h.calls.set+h.calls.create,0);
});
test("L02-06 adapter mutation during atomic create cannot redefine expected readback",async()=>{
  const h=harness({mutate:v=>{v.settings.timezone="UTC";}});
  const p=await h.repo.inspect(opts);
  await assert.rejects(h.repo.initialize(p.workspace),{code:"READBACK_MISMATCH"});
  assert.equal(p.workspace.settings.timezone,"Asia/Kuching");
  assert.equal(h.records.get(WORKSPACE_KEY).value.settings.timezone,"UTC");
  assert.equal(h.repo.locked,true);
  await assert.rejects(h.repo.initialize(p.workspace),{code:"LOCKED"});
  assert.equal(h.calls.create,1);assert.equal(h.calls.set,0);
});
test("L02-07 adapter mutation during CAS cannot redefine expected readback",async()=>{
  const h=harness({initial:fresh(),mutate:v=>{v.settings.timezone="UTC";}});
  const p=await h.repo.inspect(opts),q=request(p);
  await assert.rejects(h.repo.commit(q),{code:"READBACK_MISMATCH"});
  assert.equal(q.next.settings.timezone,"Asia/Kuching");
  assert.equal(h.repo.locked,true);
  await assert.rejects(h.repo.commit(q),{code:"LOCKED"});
  assert.equal(h.calls.set,1);assert.equal(h.calls.create,0);
});
test("L02-08 confirmed initialization and CAS results remain detached from host records",async()=>{
  const h=harness(),candidate=await h.repo.inspect(opts),p=await h.repo.initialize(candidate.workspace);
  p.workspace.settings.timezone="UTC";
  assert.equal(h.records.get(WORKSPACE_KEY).value.settings.timezone,"Asia/Kuching");
  const current=await h.repo.inspect(opts),q=await h.repo.commit(request(current));
  q.workspace.settings.timezone="UTC";
  assert.equal(h.records.get(WORKSPACE_KEY).value.settings.timezone,"Asia/Kuching");
  assert.equal(h.records.get(WORKSPACE_KEY).value.revision,1);
  assert.equal(h.calls.set,1);assert.equal(h.calls.create,1);
});
test("L02-09 invalid readback payload after a write locks the repository",async()=>{
  const h=harness({initial:fresh(),mutate:v=>{v.extra=undefined;}});
  const p=await h.repo.inspect(opts);
  await assert.rejects(h.repo.commit(request(p)),ambiguous);
  assert.equal(h.repo.locked,true);
  assert.equal(h.calls.set,1);
});
test("L02-10 malformed legacy payload prevents initialization, even with explicit current absence",async()=>{
  const h=harness();h.put(LEGACY_KEY,{version:1,extra:undefined});
  await assert.rejects(h.repo.inspect(opts),ambiguous);
  await assert.rejects(h.repo.initialize(fresh()),ambiguous);
  assert.equal(h.calls.create+h.calls.set,0);
});
