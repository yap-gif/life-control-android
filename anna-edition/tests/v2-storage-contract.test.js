import test from "node:test";
import assert from "node:assert/strict";
import {LEGACY_KEY,WORKSPACE_KEY,emptyWorkspace,validateWorkspaceEnvelope} from "../bundle/v2/workspace.js";
import {readKey,createWorkspaceRepository} from "../bundle/v2/repository.js";

// P07-B-L01: closed synthetic fixtures only. No Anna SDK, network or credentials.
const opts={timezone:"Asia/Kuching",migrationId:"l01-synthetic"};
const absent=()=>({exists:false});
const observedLegacyNull=()=>({value:null});
const makeWorkspace=()=>emptyWorkspace(opts);
const existing=(value=makeWorkspace(),etag="synthetic-e1")=>({exists:true,value,etag});
const fail=(code,extra={})=>Object.assign(new Error("Synthetic read error"),{code,...extra});
const ambiguous={code:"AMBIGUOUS_READ"};
function fixture(get){
  const calls={get:[],set:0,create:0,list:0};
  const storage={
    async get({key}){calls.get.push(key);return get(key,calls);},
    async set(){calls.set++;return {ok:true};},
    async list(){calls.list++;return {items:[],next_cursor:null};}
  };
  const repo=createWorkspaceRepository({storage,atomicCreate:async()=>{calls.create++;return {ok:true};},
    capability:{verified:true,maxBytes:1000000},validateDomain:validateWorkspaceEnvelope,timeoutMs:100});
  return {repo,calls};
}
function noMutation(calls){
  assert.equal(calls.set,0);assert.equal(calls.create,0);assert.equal(calls.list,0);
}
function edit(previous){
  return {...structuredClone(previous),revision:previous.revision+1,lastOperationId:"l01-op"};
}
function commit(repo,previous=makeWorkspace()){
  return repo.commit({previous,etag:"synthetic-e1",next:edit(previous),operationId:"l01-op"});
}
test("L01-01 observed legacy null response remains ambiguous and is never a missing key",async()=>{
  await assert.rejects(readKey({get:async()=>observedLegacyNull()},WORKSPACE_KEY),ambiguous);
});
test("L01-02 explicit absence and existing etag shapes preserve conservative compatibility",async()=>{
  for(const response of [absent(),{exists:false,value:null,etag:null,generation:null}]){
    assert.deepEqual(await readKey({get:async()=>response},WORKSPACE_KEY),{exists:false,etag:null});
  }
  for(const value of [{},[],0,false,""]){
    for(const response of [{value,etag:"e1"}, {exists:true,value,etag:"e1",generation:2}]){
      assert.deepEqual(await readKey({get:async()=>response},WORKSPACE_KEY),{exists:true,value,etag:"e1"});
    }
  }
});
test("L01-03 malformed or contradictory success envelopes fail closed",async()=>{
  const value=makeWorkspace(),cases=[
    null,undefined,[],0,"absent",{}, {value:null,etag:"e1"},
    {value},{value,etag:" "},{value,etag:123},{exists:true,etag:"e1"},
    {exists:"false",value,etag:"e1"},{exists:0,value,etag:"e1"},{exists:null,value,etag:"e1"},
    {exists:undefined,value,etag:"e1"}, {exists:false,value}, {exists:false,etag:"e1"},
    {exists:false,generation:0},{exists:false,value:undefined},
    {exists:false,ok:false},{exists:false,error:{code:"forbidden"}},
    {exists:false,code:"permission_denied"},{exists:false,status:403},
    {exists:true,value,etag:"e1",statusCode:500},{value,etag:"e1",ok:false},
    Object.create({exists:false}),Object.assign([], {exists:false}),
    Object.defineProperty({}, "exists", {get(){throw new Error("must not invoke accessor");},enumerable:true})
  ];
  for(const [i,response] of cases.entries()){
    await assert.rejects(readKey({get:async()=>response},WORKSPACE_KEY),ambiguous,"case "+i);
  }
});
test("L01-04 error classification: generic not_found/404/denied never means absent",async()=>{
  for(const error of [fail("not_found",{status:404}),{status:404},fail("permission_denied",{status:403}),fail("timeout"),fail("internal_error",{status:500})]){
    await assert.rejects(readKey({get:async()=>{throw error;}},WORKSPACE_KEY),e=>e===error);
  }
  for(const code of ["KEY_NOT_FOUND","key_not_found"]){
    assert.deepEqual(await readKey({get:async()=>{throw fail(code,{status:404});}},WORKSPACE_KEY),{exists:false,etag:null});
    for(const extra of [{status:403},{statusCode:500},{response:{status:401}}]){
      await assert.rejects(readKey({get:async()=>{throw fail(code,extra);}},WORKSPACE_KEY),ambiguous);
    }
  }
});
test("L01-05 bounded read timeout does not become absent",async()=>{
  await assert.rejects(readKey({get:()=>new Promise(()=>{})},WORKSPACE_KEY,15),{code:"TIMEOUT"});
});
test("L01-06 inspection stops on ambiguous current and does not consult legacy or list",async()=>{
  const {repo,calls}=fixture(()=>observedLegacyNull());
  await assert.rejects(repo.inspect(opts),ambiguous);
  assert.deepEqual(calls.get,[WORKSPACE_KEY]);noMutation(calls);
});
test("L01-07 inspection stops on ambiguous legacy even with explicit current absence",async()=>{
  const {repo,calls}=fixture(key=>key===WORKSPACE_KEY?absent():observedLegacyNull());
  await assert.rejects(repo.inspect(opts),ambiguous);
  assert.deepEqual(calls.get,[WORKSPACE_KEY,LEGACY_KEY]);noMutation(calls);
});
test("L01-08 initialize rechecks both keys and never calls atomic create on ambiguity",async()=>{
  for(const bad of [WORKSPACE_KEY,LEGACY_KEY]){
    const {repo,calls}=fixture(key=>key===bad?observedLegacyNull():absent());
    await assert.rejects(repo.initialize(makeWorkspace()),ambiguous);
    noMutation(calls);
  }
});
test("L01-09 commit blocks ambiguous or denied pre-read with zero mutation attempts",async()=>{
  for(const bad of [WORKSPACE_KEY,LEGACY_KEY]){
    for(const denied of [false,true]){
      const {repo,calls}=fixture(key=>{
        if(key===bad){if(denied)throw fail("permission_denied");return observedLegacyNull();}
        return key===WORKSPACE_KEY?existing():absent();
      });
      await assert.rejects(commit(repo),{code:denied?"permission_denied":"AMBIGUOUS_READ"});
      noMutation(calls);
    }
  }
});
test("L01-10 ambiguous readback after synthetic create locks repository without retry",async()=>{
  const {repo,calls}=fixture((key,c)=>key===WORKSPACE_KEY&&c.create?observedLegacyNull():absent());
  await assert.rejects(repo.initialize(makeWorkspace()),ambiguous);
  assert.equal(repo.locked,true);
  await assert.rejects(repo.initialize(makeWorkspace()),{code:"LOCKED"});
  assert.equal(calls.create,1);assert.equal(calls.set,0);assert.equal(calls.list,0);
});
test("L01-11 ambiguous readback after synthetic CAS locks repository without retry",async()=>{
  for(const bad of [WORKSPACE_KEY,LEGACY_KEY]){
    const {repo,calls}=fixture((key,c)=>{
      if(c.set&&key===bad)return observedLegacyNull();
      return key===WORKSPACE_KEY?(c.set?existing(edit(makeWorkspace()),"synthetic-e2"):existing()):absent();
    });
    await assert.rejects(commit(repo),ambiguous);
    assert.equal(repo.locked,true);
    await assert.rejects(commit(repo),{code:"LOCKED"});
    assert.equal(calls.set,1);assert.equal(calls.create,0);assert.equal(calls.list,0);
  }
});
