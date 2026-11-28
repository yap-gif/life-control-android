import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
import {buildOwnerLocalPlan} from "../qa/owner-migration-local.mjs";
import {createContinuousStore,EDIT_LIMIT} from "../upgrade-v2/continuous-store.js";
import {openEditLedger,validateEditMarker} from "../upgrade-v2/continuous-edit-ledger.js";
import {mountPersistent,ROUTES} from "../upgrade-v2/continuous-ui.js";
import {LEGACY_KEY,WORKSPACE_KEY,migrateLegacy,utf8Bytes,canonicalJSON} from "../bundle/v2/workspace.js";
const raw={version:1,tasks:[],money:[],learning:[],journal:[],goal:{goal:1000,saved:0,monthly:0},lastReview:null,savedPlan:null};
const cmd=n=>({type:"task.add",id:"task-"+n,title:"Synthetic task "+n,dueDate:null,priority:"normal"});
async function fixture({confirmSave=()=>true}={}){
 const l={exists:true,value:raw,etag:"legacy",generation:17},plan=await buildOwnerLocalPlan(l);
 const map=new Map([[LEGACY_KEY,structuredClone(l)],[WORKSPACE_KEY,{exists:true,etag:"v2-1",generation:1,value:migrateLegacy(raw,{timezone:"Asia/Kuching",legacyEtag:l.etag,migrationId:plan.migrationId})}]]),calls=[];
 let record=null;
 const ledger={async read(){return structuredClone(record);},async claim(expected,pending){if(canonicalJSON(expected)!==canonicalJSON(record)||record?.state==="PENDING")throw Error("conflict");record=structuredClone(pending);return structuredClone(record);},async confirm(pending){assert.deepEqual(record,pending);record={...pending,state:"CONFIRMED"};return structuredClone(record);}};
 const runtime={app:{id:908,slug:"life-control-anna"},windowUuid:"fixture",capabilities:{host_api_version:"0.1.0"},storage:{
   async get({key}){calls.push(["get",key]);return structuredClone(map.get(key)??{exists:false,value:null});},
   async set(a){calls.push(["set",a.key]);assert.equal(record.state,"PENDING");assert.equal(a.key,WORKSPACE_KEY);const old=map.get(a.key);assert.equal(a.if_match,old.etag);const r={exists:true,etag:"v2-"+(old.generation+1),generation:old.generation+1,value:structuredClone(a.value)};map.set(a.key,r);return {etag:r.etag,generation:r.generation,size_bytes:utf8Bytes(r.value)};}
 }};
 const create=()=>createContinuousStore(runtime,{localPlan:plan,ledger,checkOwnerConditions:()=>true,confirmSave,now:()=>"2026-11-28T02:00:00.000Z"});
 return {map,calls,ledger,runtime,create,store:create()};
}
test("three saves in same session, fresh ETag, durable marker and bounded reads; reopen",async()=>{
 const f=await fixture();await f.store.load();for(let n=1;n<=3;n++){const r=await f.store.apply(cmd(n));assert.equal(r.lastSave,"CONFIRMED");assert.equal(r.state,n===3?"SESSION_LIMIT":"READY");assert.equal(r.generation,n+1);assert.equal(r.reads,2+4*n);}
 assert.equal(f.store.status().writeAttempts,3);await assert.rejects(f.store.apply(cmd(4)));const next=f.create();await next.load();assert.equal(next.status().state,"READY");assert.equal(next.workspace.collections.tasks.length,3);assert.deepEqual(f.map.get(LEGACY_KEY).value,raw);
});
test("cancellation after a confirmed save stays READY, no additional calls",async()=>{let yes=true;const f=await fixture({confirmSave:()=>yes});await f.store.load();await f.store.apply(cmd(1));yes=false;await assert.rejects(f.store.apply(cmd(2)),{code:"SAVE_CANCELLED"});assert.equal(f.store.status().state,"READY");assert.equal(f.calls.length,7);});
test("pending marker survives write uncertainty; reopen only observes exact candidate",async()=>{
 const f=await fixture();await f.store.load();const set=f.runtime.storage.set;f.runtime.storage.set=async a=>{await set(a);throw Error("lost receipt");};
 await assert.rejects(f.store.apply(cmd(1)));assert.equal((await f.ledger.read()).state,"PENDING");assert.equal(f.store.status().state,"UNCERTAIN");
 const next=f.create();await next.load();assert.equal(next.status().state,"RECOVERY_MATCHED");assert.equal(next.workspace.collections.tasks.length,1);await assert.rejects(next.apply(cmd(2)));assert.equal((await f.ledger.read()).state,"PENDING");
});
test("pending marker with no write observed stays locked; never infer safe retry",async()=>{const f=await fixture();await f.store.load();f.runtime.storage.set=async()=>{throw Error("timeout");};await assert.rejects(f.store.apply(cmd(1)));const next=f.create();await next.load();assert.equal(next.status().state,"RECOVERY_REQUIRED");assert.equal(next.status().writeAttempts,0);await assert.rejects(next.apply(cmd(1)));});
test("ledger failure blocks writes",async()=>{const f=await fixture();await f.store.load();f.ledger.claim=async()=>{throw Error("unavailable");};await assert.rejects(f.store.apply(cmd(1)));assert.equal(f.store.status().writeAttempts,0);assert.equal(f.calls.filter(x=>x[0]==="set").length,0);});
test("two loaded instances cannot overwrite new baseline",async()=>{const f=await fixture(),second=f.create();await f.store.load();await second.load();await f.store.apply(cmd(1));await assert.rejects(second.apply(cmd(2)),{code:"BASELINE_CHANGED"});assert.equal(second.status().writeAttempts,0);});
test("expanded limit allows >6144 bytes but rejects >32768 before extra reads",async()=>{const f=await fixture();const w=f.map.get(WORKSPACE_KEY);w.value.revision=1;w.value.lastOperationId="prior";w.generation=2;w.value.collections.journal=Array.from({length:4},(_,i)=>({id:"j"+i,date:"2026-11-20",reflection:"x".repeat(1800),tags:[]}));await f.store.load();assert.ok(f.store.bytes>6144);await f.store.apply(cmd(1));assert.equal(f.store.status().maxBytes,EDIT_LIMIT);
 const g=await fixture(),v=g.map.get(WORKSPACE_KEY);v.value.revision=1;v.value.lastOperationId="prior";v.generation=2;v.value.collections.journal=Array.from({length:16},(_,i)=>({id:"j"+i,date:"2026-11-20",reflection:"x".repeat(1900),tags:[]}));await g.store.load();await assert.rejects(g.store.apply({type:"record.add",collection:"journal",id:"overflow",data:{date:"2026-11-22",reflection:"x".repeat(2000),tags:[]}}),{code:"PILOT_CAPACITY"});assert.equal(g.calls.length,2);
});
test("all nine routes render with expanded capacity and no delete/AI",async()=>{const f=await fixture();await f.store.load();const html=readFileSync(new URL("../upgrade-v2/continuous.html",import.meta.url),"utf8");for(const [route,label] of ROUTES){const {window}=new JSDOM(html,{url:"https://example.test/#"+route});const d=window.document;mountPersistent(d,window,f.store,{today:"2026-11-28"});assert.equal(d.getElementById("page-title").textContent,label);assert.doesNotMatch(d.getElementById("page").textContent,/Unable to render/);if(route==="privacy")assert.match(d.getElementById("page").textContent,/32768 B/);window.close();}assert.equal(f.calls.length,2);});
test("marker shape rejects raw data and unavailable browser ledger",async()=>{assert.throws(()=>validateEditMarker({schema:1,raw:"private"}));await assert.rejects(openEditLedger(null),{code:"EDIT_LEDGER_UNAVAILABLE"});});
