import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {buildOwnerLocalPlan,inspectOwnerLedger,saveOwnerLocalPlan,reserveOwnerAttempt,PLAN_FILE,ATTEMPT_FILE} from "../qa/owner-migration-local.mjs";
import {createOwnerMigrationPilot} from "../upgrade-v2/anna-owner-migration-pilot.js";
const fixture=()=>({exists:true,etag:"fixture",generation:17,value:{version:1,tasks:[],money:[],learning:[],journal:[{id:"j",date:"2026-11-20",text:"PRIVATE_FIXTURE"}],goal:{goal:1000,saved:0,monthly:0},lastReview:null,savedPlan:null}});
const id="app908-owner-"+"b".repeat(32);
const plan=()=>buildOwnerLocalPlan(fixture(),{migrationId:id});
const approval=p=>({liveWriteAuthorized:true,candidateSha256:p.candidateSha256,backupSha256:p.backupSha256,migrationId:p.migrationId,risk:p.risk});
function root(t){const dir=mkdtempSync(join(tmpdir(),"lc-owner-ledger-"));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
test("local plan exactly matches independently prepared pilot and omits source content",async()=>{
  const p=await plan(),raw=fixture();
  const runtime={app:{id:908,slug:"life-control-anna"},windowUuid:"fixture-window",capabilities:{host_api_version:"0.1.0"},storage:{async get({key}){return key.endsWith(":v1")?raw:{exists:false,value:null};},async set(){throw Error("FORBIDDEN");}}};
  const pilot=createOwnerMigrationPilot(runtime,{backupProof:{sha256:p.backupSha256,generation:p.generation},migrationId:id,
    checkOwnerConditions:()=>({otherClientsClosed:true,backupVerifiedLocally:true,versionUiChecked:true,noOtherWriterKnown:true,residualRaceAccepted:true,noAutomaticRetry:true}),authorizeCommit:()=>false});
  const live=await pilot.prepare();
  for(const k of ["candidateSha256","backupSha256","migrationId","generation","bytes","counts","risk"])assert.deepEqual(live[k],p[k]);
  assert.doesNotMatch(JSON.stringify(p),/PRIVATE_FIXTURE|"etag"|"value"/);assert.equal(p.liveWriteAuthorized,false);
});
test("offline plan is exclusive, and never reserves a write",async t=>{
  const dir=root(t),p=await plan();
  assert.deepEqual(inspectOwnerLedger(dir),{planExists:false,attemptExists:false,automaticRetry:false});
  assert.equal(saveOwnerLocalPlan(dir,p).attemptExists,false);
  assert.throws(()=>saveOwnerLocalPlan(dir,p),{code:"EEXIST"});assert.deepEqual(JSON.parse(readFileSync(join(dir,PLAN_FILE),"utf8")),p);
});
test("reservation requires matching local plan and separately authorized binding",async t=>{
  const dir=root(t),p=await plan();saveOwnerLocalPlan(dir,p);
  assert.throws(()=>reserveOwnerAttempt(dir,p,{...approval(p),liveWriteAuthorized:false}),{code:"RESERVATION_NOT_AUTHORIZED"});
  assert.throws(()=>reserveOwnerAttempt(dir,{...p,bytes:p.bytes+1},approval(p)),{code:"PLAN_CHANGED"});
  assert.equal(inspectOwnerLedger(dir).attemptExists,false);
});
test("fixed attempt latch is persistent across helper instances and cannot be overwritten",async t=>{
  const dir=root(t),p=await plan();saveOwnerLocalPlan(dir,p);
  assert.equal(reserveOwnerAttempt(dir,p,approval(p)).state,"RESERVED_BEFORE_ATTEMPT");
  const prior=readFileSync(join(dir,ATTEMPT_FILE),"utf8");
  assert.throws(()=>reserveOwnerAttempt(dir,p,approval(p)),{code:"ATTEMPT_ALREADY_RESERVED"});
  assert.throws(()=>saveOwnerLocalPlan(dir,p),{code:"ATTEMPT_ALREADY_RESERVED"});
  assert.equal(readFileSync(join(dir,ATTEMPT_FILE),"utf8"),prior);
});
test("even a partial marker blocks reservation, no automatic recovery",async t=>{
  const dir=root(t),p=await plan();saveOwnerLocalPlan(dir,p);writeFileSync(join(dir,ATTEMPT_FILE),"{");
  assert.equal(inspectOwnerLedger(dir).attemptExists,true);
  assert.throws(()=>reserveOwnerAttempt(dir,p,approval(p)),{code:"ATTEMPT_ALREADY_RESERVED"});
});
test("wrong backup generation, invalid migration ID and capacity fail closed",async()=>{
  await assert.rejects(buildOwnerLocalPlan({...fixture(),generation:18}),{code:"BACKUP_GENERATION_CHANGED"});
  await assert.rejects(buildOwnerLocalPlan(fixture(),{migrationId:"bad"}),{code:"INVALID_MIGRATION_ID"});
  const raw=fixture();raw.value.journal=Array.from({length:4},(_,i)=>({id:"j"+i,date:"2026-11-"+(20+i),text:"x".repeat(1900)}));
  await assert.rejects(buildOwnerLocalPlan(raw),{code:"PILOT_CAPACITY"});
});
