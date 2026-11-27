import test from "node:test";
import assert from "node:assert/strict";
import {LEGACY_KEY,WORKSPACE_KEY,migrateLegacy,utf8Bytes} from "../bundle/v2/workspace.js";
import {createAnnaExistingEditor} from "../upgrade-v2/anna-existing-editor.js";
const raw={version:1,tasks:[],money:[],learning:[],journal:[],goal:{goal:1000,saved:0,monthly:0},lastReview:null,savedPlan:null};
const options={expectedVersionId:"99",maxBytes:6144,authorizeWrite:()=>true};
const cmd={type:"task.add",id:"task-1",title:"Synthetic task",dueDate:null,priority:"normal"};
const op={operationId:"op-1",now:"2026-11-27T06:00:00.000Z",expectedRevision:0};
function fixture(){
  const l={exists:true,value:raw,etag:"legacy",generation:17};
  const w={exists:true,value:migrateLegacy(raw,{legacyEtag:"legacy",timezone:"Asia/Kuching",migrationId:"fixture"}),etag:"old",generation:1};
  const map=new Map([[LEGACY_KEY,structuredClone(l)],[WORKSPACE_KEY,w]]),calls=[];
  const runtime={app:{id:908,slug:"life-control-anna"},appId:908,versionId:99,windowUuid:"fixture-window",capabilities:{host_api_version:"0.1.0"},storage:{
    async get({key}){calls.push(["get",key]);return structuredClone(map.get(key)??{exists:false,value:null});},
    async set(args){calls.push(["set",args.key]);assert.equal(args.key,WORKSPACE_KEY);assert.equal(args.if_match,map.get(args.key).etag);
      assert.equal(Object.hasOwn(args,"ttl_seconds"),false);
      const next={exists:true,value:structuredClone(args.value),etag:"new",generation:2};map.set(args.key,next);
      return {etag:next.etag,generation:next.generation,size_bytes:utf8Bytes(next.value)};}
  }};
  return {runtime,map,calls};
}
test("strict version and explicit byte cap required; observed diagnostic shape refused",()=>{
  const f=fixture();delete f.runtime.versionId;
  assert.throws(()=>createAnnaExistingEditor(f.runtime,options),{code:"IDENTITY_UNVERIFIED"});
  assert.throws(()=>createAnnaExistingEditor(f.runtime,{...options,maxBytes:6145}),{code:"CONFIG_UNVERIFIED"});assert.equal(f.calls.length,0);
});
test("existing workspace only; missing v2 cannot initialize",async()=>{
  const f=fixture();f.map.delete(WORKSPACE_KEY);const e=createAnnaExistingEditor(f.runtime,options);
  await assert.rejects(e.load(),{code:"V2_MISSING_NO_CREATE"});assert.equal(e.locked,true);assert.deepEqual(f.calls,[["get",WORKSPACE_KEY]]);
});
test("one domain command with CAS, exact readback and unchanged legacy",async()=>{
  const f=fixture(),e=createAnnaExistingEditor(f.runtime,options);const before=await e.load();
  before.workspace.collections.tasks.push({id:"tamper"});const r=await e.apply(cmd,op);
  assert.equal(r.generation,2);assert.equal(r.workspace.revision,1);assert.equal(r.workspace.collections.tasks[0].id,"task-1");
  assert.equal(r.workspace.collections.tasks.length,1);assert.deepEqual(f.map.get(LEGACY_KEY).value,raw);
  assert.deepEqual(f.calls,[["get",WORKSPACE_KEY],["get",LEGACY_KEY],["get",WORKSPACE_KEY],["get",LEGACY_KEY],["set",WORKSPACE_KEY],["get",WORKSPACE_KEY],["get",LEGACY_KEY]]);
});
test("denied command, consent or byte ceiling never writes",async()=>{
  for(const [o,c] of [[options,{type:"task.delete"}],[{...options,authorizeWrite:()=>false},cmd],[{...options,maxBytes:1},cmd]]){
    const f=fixture(),e=createAnnaExistingEditor(f.runtime,o);await e.load();await assert.rejects(e.apply(c,op));assert.equal(f.calls.length,2);
  }
});
test("changed legacy or workspace stops before write and locks",async()=>{
  for(const key of [LEGACY_KEY,WORKSPACE_KEY]){
    const f=fixture(),e=createAnnaExistingEditor(f.runtime,options);await e.load();f.map.get(key).generation++;
    await assert.rejects(e.apply(cmd,op),{code:"BASELINE_CHANGED"});assert.equal(e.locked,true);assert.equal(f.calls.filter(c=>c[0]==="set").length,0);
  }
});
test("stale CAS or lost response locks without automatic retry",async()=>{
  for(const code of ["precondition_failed","timeout"]){
    const f=fixture();let attempts=0;f.runtime.storage.set=async()=>{attempts++;throw Object.assign(Error("PRIVATE"),{code});};
    const e=createAnnaExistingEditor(f.runtime,options);await e.load();
    await assert.rejects(e.apply(cmd,op),{code:code==="precondition_failed"?"CAS_CONFLICT":"SDK_OUTCOME_UNCONFIRMED"});
    await assert.rejects(e.apply(cmd,op),{code:"EDITOR_LOCKED"});assert.equal(attempts,1);
  }
});
test("false receipt or legacy changes after write never report success",async()=>{
  for(const mode of ["false","legacy"]){
    const f=fixture(),set=f.runtime.storage.set;f.runtime.storage.set=async args=>{
      if(mode==="false")return {etag:"new",generation:2,size_bytes:utf8Bytes(args.value)};
      const r=await set(args);f.map.get(LEGACY_KEY).generation++;return r;};
    const e=createAnnaExistingEditor(f.runtime,options);await e.load();await assert.rejects(e.apply(cmd,op));assert.equal(e.locked,true);
  }
});
