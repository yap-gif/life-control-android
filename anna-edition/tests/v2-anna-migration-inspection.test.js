import test from "node:test";
import assert from "node:assert/strict";
import {LEGACY_KEY,WORKSPACE_KEY} from "../bundle/v2/workspace.js";
import {createAnnaMigrationInspector,normalizeAnnaInspectionRead} from "../upgrade-v2/anna-migration-inspection.js";
const absent=()=>({exists:false,value:null});
const legacy=()=>({exists:true,etag:"fixture-etag",generation:17,value:{version:1,tasks:[],money:[],learning:[],journal:[],goal:{goal:1000,saved:0,monthly:0},lastReview:null,savedPlan:null}});
const opts={timezone:"Asia/Kuching",migrationId:"inspection-fixture"};
function fixture(responses){
  const calls=[];
  const runtime={windowUuid:"fixture-window",app:{id:908,slug:"life-control-anna"},capabilities:{host_api_version:"0.1.0"},storage:{
    async get(args){calls.push(args.key);const r=responses.shift();if(r instanceof Error)throw r;return structuredClone(r);},
    async set(){throw Error("FORBIDDEN");}
  }};
  return {runtime,calls};
}
test("inspection accepts explicit observed absence only",()=>{
  assert.deepEqual(normalizeAnnaInspectionRead(absent()),{exists:false,value:null,etag:null,generation:null});
  for(const r of [null,{value:null},{exists:false},{...absent(),etag:"x"},{...absent(),generation:0},{...absent(),error:"denied"}])
    assert.throws(()=>normalizeAnnaInspectionRead(r));
});
test("read-only candidate is detached; four observations and no authorization",async()=>{
  const {runtime,calls}=fixture([absent(),legacy(),legacy(),absent()]);
  const inspector=createAnnaMigrationInspector(runtime);
  assert.deepEqual(Object.keys(inspector),["inspect"]);
  const result=await inspector.inspect(opts);
  assert.equal(result.status,"candidate-only");
  assert.equal(result.legacyGeneration,17);
  assert.equal(result.workspace.revision,0);
  assert.equal(result.writeAuthorized,false);
  assert.equal(result.exclusiveFence,false);
  assert.deepEqual(calls,[WORKSPACE_KEY,LEGACY_KEY,LEGACY_KEY,WORKSPACE_KEY]);
  await assert.rejects(inspector.inspect(opts),{code:"INSPECTION_ALREADY_USED"});
});
test("existing v2 or missing legacy stops without creating a workspace",async()=>{
  for(const [responses,code,count] of [[[legacy()],"V2_EXISTS_RECONCILE",1],[[absent(),absent()],"LEGACY_MISSING",2]]){
    const {runtime,calls}=fixture(responses);
    await assert.rejects(createAnnaMigrationInspector(runtime).inspect(opts),{code});
    assert.equal(calls.length,count);
  }
});
test("legacy change or newly existing v2 rejects candidate",async()=>{
  for(const [responses,code,count] of [[[absent(),legacy(),{...legacy(),generation:18}],"LEGACY_CHANGED",3],[[absent(),legacy(),legacy(),legacy()],"V2_CHANGED",4]]){
    const {runtime,calls}=fixture(responses);
    await assert.rejects(createAnnaMigrationInspector(runtime).inspect(opts),{code});
    assert.equal(calls.length,count);
  }
});
test("identity or SDK failure rejects without retry or raw error",async()=>{
  const {runtime,calls}=fixture([Error("private detail")]);
  const inspector=createAnnaMigrationInspector(runtime);
  await assert.rejects(inspector.inspect(opts),{code:"SDK_READ_UNCONFIRMED",message:"SDK_READ_UNCONFIRMED"});
  assert.equal(calls.length,1);
  runtime.app.id=909;
  assert.throws(()=>createAnnaMigrationInspector(runtime),{code:"IDENTITY_UNVERIFIED"});
});
