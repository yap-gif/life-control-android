import test from "node:test";
import assert from "node:assert/strict";
import {LEGACY_KEY,WORKSPACE_KEY,utf8Bytes} from "../bundle/v2/workspace.js";
import {createOwnerMigrationPilot,fingerprintLegacyBackup,OWNER_PILOT_RISK} from "../upgrade-v2/anna-owner-migration-pilot.js";
const id="app908-owner-"+"a".repeat(32);
const base=()=>({exists:true,etag:"legacy",generation:17,value:{version:1,tasks:[],money:[],learning:[],journal:[],goal:{goal:1000,saved:0,monthly:0},lastReview:null,savedPlan:null}});
const conditions=()=>({otherClientsClosed:true,backupVerifiedLocally:true,versionUiChecked:true,noOtherWriterKnown:true,residualRaceAccepted:true,noAutomaticRetry:true});
async function fixture(options={}){
  const original=base(),map=new Map([[LEGACY_KEY,structuredClone(original)]]),calls=[];
  const runtime={app:{id:908,slug:"life-control-anna"},windowUuid:"fixture-window",capabilities:{host_api_version:"0.1.0"},storage:{
    async get({key}){calls.push(["get",key]);return structuredClone(map.get(key)??{exists:false,value:null});},
    async set(args){calls.push(["set",args.key]);assert.deepEqual(Object.keys(args).sort(),["key","value"]);
      assert.equal(args.key,WORKSPACE_KEY);const r={exists:true,value:structuredClone(args.value),etag:"new",generation:1};map.set(args.key,r);
      return {etag:r.etag,generation:r.generation,size_bytes:utf8Bytes(r.value)};}
  }};
  const backupProof=await fingerprintLegacyBackup(original);
  const opts={backupProof,migrationId:id,checkOwnerConditions:conditions,authorizeCommit:()=>true,...options};
  const pilot=createOwnerMigrationPilot(runtime,opts);
  return {pilot,runtime,map,calls,opts,original};
}
const approval=p=>({candidateSha256:p.candidateSha256,backupSha256:p.backupSha256,migrationId:p.migrationId,risk:OWNER_PILOT_RISK});
test("backup fingerprint binds normalized entire value, generation and ETag",async()=>{
  const x=base(),a=await fingerprintLegacyBackup(x);
  assert.deepEqual(await fingerprintLegacyBackup({id:"fixture",result:x,error:null}),a);
  for(const changed of [{...x,generation:18},{...x,etag:"other"},{...x,value:{...x.value,goal:{goal:1000,saved:1,monthly:0}}}]){
    assert.notEqual((await fingerprintLegacyBackup(changed)).sha256,a.sha256);
  }
});
test("private pilot prepares with no writes; six reads and one exact confirmed set",async()=>{
  const f=await fixture(),p=await f.pilot.prepare();
  assert.equal(f.pilot.status().writeAttempts,0);assert.equal(f.calls.length,2);
  assert.equal(p.risk,OWNER_PILOT_RISK);assert.equal(p.versionAttestation,"UNVERIFIED");assert.ok(!Object.hasOwn(p,"workspace"));
  const r=await f.pilot.commit(approval(p));
  assert.equal(r.state,"CONFIRMED");assert.equal(r.reads,6);assert.equal(r.writeAttempts,1);assert.equal(r.atomicCreate,false);assert.equal(r.exclusiveFence,false);
  assert.equal(r.generation,1);assert.equal(f.map.get(WORKSPACE_KEY).value.revision,0);assert.deepEqual(f.map.get(LEGACY_KEY),f.original);
  assert.deepEqual(f.calls,[["get",WORKSPACE_KEY],["get",LEGACY_KEY],["get",LEGACY_KEY],["get",WORKSPACE_KEY],["set",WORKSPACE_KEY],["get",WORKSPACE_KEY],["get",LEGACY_KEY]]);
  await assert.rejects(f.pilot.commit(approval(p)),{code:"PILOT_NOT_PREPARED"});
});
test("same-generation changed backup content or ETag stops before any set",async()=>{
  for(const mode of ["value","etag"]){
    const f=await fixture();if(mode==="value")f.map.get(LEGACY_KEY).value.goal.saved=1;else f.map.get(LEGACY_KEY).etag="changed";
    await assert.rejects(f.pilot.prepare(),{code:"LEGACY_BACKUP_MISMATCH"});assert.equal(f.pilot.status().writeAttempts,0);
  }
});
test("existing v2 before prepare or just before commit is never overwritten",async()=>{
  for(const phase of ["prepare","commit"]){
    const f=await fixture();let p;if(phase==="commit")p=await f.pilot.prepare();
    f.map.set(WORKSPACE_KEY,{exists:true,value:{other:"winner"},etag:"winner",generation:1});
    await assert.rejects(phase==="prepare"?f.pilot.prepare():f.pilot.commit(approval(p)),{code:"V2_EXISTS_STOP"});
    assert.equal(f.pilot.status().writeAttempts,0);assert.equal(f.map.get(WORKSPACE_KEY).value.other,"winner");
  }
});
test("approval binding, owner conditions and revocation prevent a write",async()=>{
  for(const mode of ["digest","condition","revoked"]){
    let allowed=true,closed=true;
    const f=await fixture({authorizeCommit:()=>allowed,checkOwnerConditions:()=>({...conditions(),otherClientsClosed:closed})});
    const p=await f.pilot.prepare(),a=approval(p);
    if(mode==="digest")a.candidateSha256="b".repeat(64);
    if(mode==="condition")closed=false;
    if(mode==="revoked"){const get=f.runtime.storage.get;f.runtime.storage.get=async args=>{const r=await get(args);allowed=false;return r;};}
    await assert.rejects(f.pilot.commit(a));assert.equal(f.pilot.status().writeAttempts,0);
  }
});
test("legacy change before set stops; identity change stops",async()=>{
  for(const mode of ["legacy","identity"]){
    const f=await fixture(),p=await f.pilot.prepare();
    if(mode==="legacy")f.map.get(LEGACY_KEY).generation++;else f.runtime.windowUuid="another";
    await assert.rejects(f.pilot.commit(approval(p)));assert.equal(f.pilot.status().writeAttempts,0);
  }
});
test("concurrent commits admit only one attempt",async()=>{
  const f=await fixture(),p=await f.pilot.prepare(),a=approval(p);
  const r=await Promise.allSettled([f.pilot.commit(a),f.pilot.commit(a)]);
  assert.equal(r.filter(x=>x.status==="fulfilled").length,1);assert.equal(f.pilot.status().writeAttempts,1);
});
test("false ack, uncertain write, or post-write legacy divergence never confirm and never retry",async()=>{
  for(const mode of ["false","timeout","legacy","generation"]){
    const f=await fixture(),p=await f.pilot.prepare(),set=f.runtime.storage.set;
    f.runtime.storage.set=async args=>{
      if(mode==="false")return {etag:"new",generation:1,size_bytes:utf8Bytes(args.value)};
      if(mode==="timeout")throw Error("PRIVATE_ERROR");
      const r=await set(args);
      if(mode==="legacy")f.map.get(LEGACY_KEY).generation++;
      if(mode==="generation")r.generation=2;
      return r;
    };
    await assert.rejects(f.pilot.commit(approval(p)));assert.equal(f.pilot.status().state,"UNCERTAIN");assert.equal(f.pilot.status().writeAttempts,1);
    await assert.rejects(f.pilot.commit(approval(p)),{code:"PILOT_NOT_PREPARED"});
  }
});
test("oversize candidate is blocked without truncation or write",async()=>{
  const f=await fixture(),l=f.map.get(LEGACY_KEY);
  l.value.journal=Array.from({length:4},(_,i)=>({id:"j"+i,date:"2026-11-"+(20+i),text:"x".repeat(1900)}));
  const pilot=createOwnerMigrationPilot(f.runtime,{...f.opts,backupProof:await fingerprintLegacyBackup(l)});
  await assert.rejects(pilot.prepare(),{code:"PILOT_CAPACITY"});assert.equal(pilot.status().writeAttempts,0);
});
