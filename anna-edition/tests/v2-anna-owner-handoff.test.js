import test from "node:test";
import assert from "node:assert/strict";
import {buildOwnerLocalPlan} from "../qa/owner-migration-local.mjs";
import {createOwnerHandoff,validateLocalPlan,validateReservation,planDigest,openBrowserAttemptLedger} from "../upgrade-v2/owner-handoff.js";
import {LEGACY_KEY,WORKSPACE_KEY,utf8Bytes} from "../bundle/v2/workspace.js";
const raw=()=>({exists:true,etag:"fixture",generation:17,value:{version:1,tasks:[],money:[],learning:[],journal:[],goal:{goal:1000,saved:0,monthly:0},lastReview:null,savedPlan:null}});
const conditions=()=>({otherClientsClosed:true,backupVerifiedLocally:true,versionUiChecked:true,noOtherWriterKnown:true,residualRaceAccepted:true,noAutomaticRetry:true});
async function fixture(claim=async()=>true){
  const source=raw(),p=await buildOwnerLocalPlan(source),calls=[],map=new Map([[LEGACY_KEY,source]]);
  const marker={schema:1,appId:908,key:WORKSPACE_KEY,migrationId:p.migrationId,planSha256:await planDigest(p),state:"RESERVED_BEFORE_ATTEMPT",reservedAt:new Date().toISOString(),maxWriteAttempts:1,automaticRetry:false};
  const runtime={app:{id:908,slug:"life-control-anna"},windowUuid:"fixture",capabilities:{host_api_version:"0.1.0"},storage:{
    async get({key}){calls.push("get");return structuredClone(map.get(key)??{exists:false,value:null});},
    async set({key,value}){calls.push("set");assert.equal(key,WORKSPACE_KEY);map.set(key,{exists:true,value,etag:"v2",generation:1});return {etag:"v2",generation:1,size_bytes:utf8Bytes(value)};}
  }};
  const h=createOwnerHandoff({connect:async()=>runtime,openLedger:async()=>({claim,close(){}}),checkOwnerConditions:conditions});
  return {p,marker,h,calls};
}
test("offline plan and reservation strict binding",async()=>{const {p,marker}=await fixture();assert.deepEqual(validateLocalPlan(p),p);assert.deepEqual(await validateReservation(marker,p),marker);assert.throws(()=>validateLocalPlan({...p,extra:true}));await assert.rejects(validateReservation({...marker,planSha256:"0".repeat(64)},p));});
test("prepare matches local plan, no writes; explicit reservation claim precedes set",async()=>{
  let claimed=false;const f=await fixture(async()=>{claimed=true;return true;});
  assert.equal(f.calls.length,0);const p=await f.h.prepare(f.p);assert.equal(p.state,"PREPARED");assert.equal(f.calls.length,2);
  const r=await f.h.commit(f.marker,true);assert.ok(claimed);assert.equal(r.state,"CONFIRMED");assert.equal(r.reads,6);assert.equal(f.calls.filter(x=>x==="set").length,1);
  await assert.rejects(f.h.commit(f.marker,true));
});
test("candidate digest mismatch prevents preparation",async()=>{const f=await fixture();await assert.rejects(f.h.prepare({...f.p,candidateSha256:"0".repeat(64)}),{code:"PLAN_LIVE_MISMATCH"});assert.equal(f.calls.length,2);});
test("missing consent, mismatched marker or unavailable durable claim never writes",async()=>{
  for(const mode of ["consent","marker","claim"]){const f=await fixture(async()=>false);await f.h.prepare(f.p);await assert.rejects(f.h.commit(mode==="marker"?{...f.marker,migrationId:"wrong"}:f.marker,mode!=="consent"));assert.equal(f.calls.length,2);}
});
test("browser ledger refuses unavailable API",async()=>{await assert.rejects(openBrowserAttemptLedger(null),{code:"BROWSER_LEDGER_UNAVAILABLE"});});
test("browser latch uses fixed key, strict transaction, completion before resolution, and no overwrite",async()=>{
  const seen=new Set();let committed=false;
  const idb={open(){const req={};queueMicrotask(()=>{req.result={close(){},transaction(store,mode,opts){assert.equal(store,"attempts");assert.equal(mode,"readwrite");assert.equal(opts.durability,"strict");const tx={durability:"strict",abort(){tx.onabort?.();},objectStore(){return {add(value,key){assert.equal(key,"app908-v2-initialization");queueMicrotask(()=>{if(seen.has(key)){tx.onabort();return;}seen.add(key);committed=true;tx.oncomplete();});}};}};return tx;}};req.onsuccess();});return req;}};
  const a=await openBrowserAttemptLedger(idb),b=await openBrowserAttemptLedger(idb);const f=await fixture();
  const results=await Promise.allSettled([a.claim(f.marker),b.claim(f.marker)]);
  assert.ok(committed);assert.equal(results.filter(x=>x.status==="fulfilled").length,1);a.close();b.close();
});
