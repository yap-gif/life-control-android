import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
import {buildOwnerLocalPlan} from "../qa/owner-migration-local.mjs";
import {createOwnerPersistentStore} from "../upgrade-v2/owner-persistent-store.js";
import {mountPersistent,ROUTES} from "../upgrade-v2/persistent-ui.js";
import {LEGACY_KEY,WORKSPACE_KEY,migrateLegacy,utf8Bytes} from "../bundle/v2/workspace.js";
const raw={version:1,tasks:[],money:[],learning:[],journal:[],goal:{goal:1000,saved:0,monthly:0},lastReview:{generatedAt:"2026-11-20",text:"Legacy analysis",categories:["money"]},savedPlan:null};
const cmd={type:"task.add",id:"test-task",title:"Synthetic task",dueDate:null,priority:"normal"};
async function fixture({confirmSave=()=>true,checkOwnerConditions=()=>true}={}){
  const legacy={exists:true,value:raw,etag:"legacy",generation:17},plan=await buildOwnerLocalPlan(legacy);
  const map=new Map([[LEGACY_KEY,structuredClone(legacy)],[WORKSPACE_KEY,{exists:true,etag:"v2-1",generation:1,value:migrateLegacy(raw,{timezone:"Asia/Kuching",legacyEtag:legacy.etag,migrationId:plan.migrationId})}]]),calls=[];
  const runtime={app:{id:908,slug:"life-control-anna"},windowUuid:"fixture",capabilities:{host_api_version:"0.1.0"},storage:{
    async get({key}){calls.push(["get",key]);return structuredClone(map.get(key)??{exists:false,value:null});},
    async set(args){calls.push(["set",args.key]);assert.equal(args.key,WORKSPACE_KEY);assert.equal(args.if_match,map.get(args.key).etag);const r={exists:true,etag:"v2-2",generation:2,value:structuredClone(args.value)};map.set(args.key,r);return {etag:r.etag,generation:r.generation,size_bytes:utf8Bytes(r.value)};}
  }};
  const create=()=>createOwnerPersistentStore(runtime,{localPlan:plan,checkOwnerConditions,confirmSave,now:()=>"2026-11-28T01:00:00.000Z"});
  return {runtime,map,calls,store:create(),create,plan};
}
test("persisted load then exactly one CAS save, readback, legacy unchanged and reopen",async()=>{
  const f=await fixture();assert.equal(f.calls.length,0);await f.store.load();assert.equal(f.store.status().revision,0);
  const r=await f.store.apply(cmd);assert.equal(r.state,"CONFIRMED");assert.equal(r.generation,2);assert.equal(r.revision,1);assert.equal(r.reads,6);assert.equal(r.writeAttempts,1);
  assert.equal(f.store.workspace.collections.tasks[0].id,"test-task");assert.deepEqual(f.map.get(LEGACY_KEY).value,raw);await assert.rejects(f.store.apply(cmd),{code:"EDITOR_LOCKED"});
  const next=f.create();await next.load();assert.equal(next.workspace.collections.tasks[0].id,"test-task");assert.equal(next.status().generation,2);
});
test("missing v2, wrong initial candidate and legacy mismatch stop with no writes",async()=>{
  for(const mode of ["missing","candidate","legacy"]){const f=await fixture();if(mode==="missing")f.map.delete(WORKSPACE_KEY);if(mode==="candidate")f.map.get(WORKSPACE_KEY).value.collections.goals[0].progress=1;if(mode==="legacy")f.map.get(LEGACY_KEY).value.goal.saved=1;await assert.rejects(f.store.load());assert.equal(f.store.status().writeAttempts,0);}
});
test("cancelled, oversize, invalid and forbidden commands never issue write or extra reads",async()=>{
  const f=await fixture({confirmSave:()=>false});await f.store.load();await assert.rejects(f.store.apply(cmd),{code:"SAVE_CANCELLED"});
  await assert.rejects(f.store.apply({type:"record.delete"}),{code:"COMMAND_FORBIDDEN"});await assert.rejects(f.store.apply({...cmd,title:""}),{code:"INVALID_RECORD"});
  assert.equal(f.calls.length,2);assert.equal(f.store.locked,false);
});
test("capacity rejects a valid large command without truncation",async()=>{
  const f=await fixture();const w=f.map.get(WORKSPACE_KEY);w.value.revision=1;w.value.lastOperationId="prior";w.generation=2;
  w.value.collections.journal=[{id:"j",date:"2026-11-20",reflection:"x".repeat(2000),tags:[]},{id:"j2",date:"2026-11-21",reflection:"x".repeat(2000),tags:[]}];
  await f.store.load();await assert.rejects(f.store.apply({type:"record.add",collection:"journal",id:"j3",data:{date:"2026-11-22",reflection:"x".repeat(2000),tags:[]}}),{code:"PILOT_CAPACITY"});assert.equal(f.calls.length,2);
});
test("changed baseline and stale CAS lock, no automatic retry",async()=>{
  for(const mode of ["changed","conflict"]){const f=await fixture();await f.store.load();if(mode==="changed")f.map.get(WORKSPACE_KEY).etag="changed";else f.runtime.storage.set=async()=>{throw Object.assign(Error("private"),{code:"precondition_failed"});};await assert.rejects(f.store.apply(cmd));assert.equal(f.store.locked,true);assert.equal(f.store.status().writeAttempts,mode==="changed"?0:1);await assert.rejects(f.store.apply(cmd));}
});
test("write receipt or postwrite legacy mismatch is uncertain",async()=>{
  for(const mode of ["receipt","legacy"]){const f=await fixture();await f.store.load();const set=f.runtime.storage.set;f.runtime.storage.set=async args=>{const r=await set(args);if(mode==="receipt")r.size_bytes++;else f.map.get(LEGACY_KEY).generation++;return r;};await assert.rejects(f.store.apply(cmd));assert.equal(f.store.status().state,"UNCERTAIN");assert.equal(f.store.status().writeAttempts,1);}
});
test("reentrant confirmation cannot start a second write",async()=>{
  let store,nested;const f=await fixture({confirmSave:()=>{nested=store.apply(cmd).catch(e=>e.code);return true;}});store=f.store;await store.load();await store.apply(cmd);assert.equal(await nested,"EDITOR_LOCKED");assert.equal(store.status().writeAttempts,1);
});
test("all nine persistent routes render; no delete or new AI buttons; no write on navigation",async()=>{
  const f=await fixture();await f.store.load();const html=readFileSync(new URL("../upgrade-v2/persistent.html",import.meta.url),"utf8");
  for(const [route,label] of ROUTES){const {window}=new JSDOM(html,{url:"https://example.test/#"+route});const doc=window.document;
    mountPersistent(doc,window,f.store,{today:"2026-11-28"});assert.equal(doc.getElementById("page-title").textContent,label);assert.doesNotMatch(doc.getElementById("page").textContent,/Unable to render/);
    for(const b of doc.querySelectorAll("#page button"))assert.doesNotMatch(b.textContent,/Delete|Run simulated|Reconcile simulated/i);
    if(route==="insights")assert.match(doc.getElementById("page").textContent,/Legacy analysis/);window.close();}
  assert.equal(f.calls.length,2);
});
test("task form explicitly persists and locks further changes",async()=>{
  const f=await fixture();await f.store.load();const {window}=new JSDOM(readFileSync(new URL("../upgrade-v2/persistent.html",import.meta.url),"utf8"),{url:"https://example.test/#tasks"});const doc=window.document;
  mountPersistent(doc,window,f.store,{today:"2026-11-28"});
  [...doc.querySelectorAll("#page button")].find(b=>b.textContent==="Add task").click();
  const form=doc.querySelector("form[data-form]");form.querySelector('[name="title"]').value="From UI";form.dispatchEvent(new window.Event("submit",{bubbles:true,cancelable:true}));
  for(let i=0;i<100&&f.store.status().state!=="CONFIRMED";i++)await new Promise(r=>setTimeout(r,5));
  assert.equal(f.store.status().state,"CONFIRMED");assert.equal(f.store.workspace.collections.tasks[0].title,"From UI");await new Promise(r=>setImmediate(r));assert.match(doc.getElementById("status").textContent,/Persisted and verified/);window.close();
});

test("async consent awaits exact candidate; cancellation consumes zero calls; reentry blocked",async()=>{
  let resolve,seen;const f=await fixture({confirmSave:c=>{seen=c;return new Promise(r=>{resolve=r;});}});await f.store.load();
  const task={...cmd};const pending=f.store.apply(task);task.title="Changed after request";
  assert.equal(seen.command.title,"Synthetic task");assert.equal(f.calls.length,2);await assert.rejects(f.store.apply(cmd),{code:"EDITOR_LOCKED"});
  resolve(false);await assert.rejects(pending,{code:"SAVE_CANCELLED"});assert.equal(f.calls.length,2);assert.equal(f.store.status().writeAttempts,0);
});
test("actual entry uses in-page consent, not native confirm; checkbox, cancel, then single approval",async()=>{
  const {mountPersistentEntry}=await import("../upgrade-v2/persistent-entry.js");
  const f=await fixture();const {window}=new JSDOM(readFileSync(new URL("../upgrade-v2/persistent.html",import.meta.url),"utf8"),{url:"https://example.test/#tasks"});const d=window.document;
  window.confirm=()=>{throw Error("NATIVE_DIALOG_FORBIDDEN");};
  for(const k of ["versionChecked","otherClientsClosed","pilotAccepted"])d.getElementById(k).checked=true;
  const plan=d.getElementById("plan");Object.defineProperty(plan,"files",{value:[{name:"APP908-OWNER-MIGRATION-PLAN.json",size:1000,text:async()=>JSON.stringify(f.plan)}]});
  plan.dispatchEvent(new window.Event("change"));d.getElementById("load").click();
  const wait=async fn=>{for(let i=0;i<100&&!fn();i++)await new Promise(r=>setTimeout(r,5));assert.ok(fn());};
  await wait(()=>d.getElementById("load-panel").hidden);
  [...d.querySelectorAll("#page button")].find(b=>b.textContent==="Add task").click();
  const form=d.querySelector("form[data-form]");form.querySelector('[name="title"]').value="Host compatible task";
  const submit=()=>form.dispatchEvent(new window.Event("submit",{cancelable:true,bubbles:true}));
  submit();await wait(()=>!d.getElementById("save-confirmation").hidden);
  const approve=d.getElementById("confirm-persistent-save"),tick=d.getElementById("save-consent");
  assert.equal(approve.disabled,true);approve.click();assert.equal(f.calls.length,2);
  d.getElementById("cancel-persistent-save").click();await wait(()=>d.getElementById("status").textContent.includes("Save cancelled"));
  assert.equal(f.calls.length,2);assert.equal(form.querySelector('[name="title"]').value,"Host compatible task");
  submit();await wait(()=>!d.getElementById("save-confirmation").hidden);
  assert.match(d.getElementById("save-confirmation").textContent,/Host compatible task/);tick.checked=true;tick.dispatchEvent(new window.Event("change"));approve.click();approve.click();
  await wait(()=>d.getElementById("status").textContent.includes("Persisted and verified"));assert.equal(f.calls.filter(x=>x[0]==="get").length,6);assert.equal(f.calls.filter(x=>x[0]==="set").length,1);
  assert.equal(f.map.get(WORKSPACE_KEY).value.collections.tasks[0].title,"Host compatible task");assert.equal(d.getElementById("save-confirmation").hidden,true);window.close();
});
test("conditions revoked during async consent stop before any additional read or write",async()=>{
  let allowed=true,resolve;const f=await fixture({checkOwnerConditions:()=>allowed,confirmSave:()=>new Promise(r=>{resolve=r;})});await f.store.load();const pending=f.store.apply(cmd);allowed=false;resolve(true);await assert.rejects(pending,{code:"OWNER_CONDITIONS_UNCONFIRMED"});assert.equal(f.calls.length,2);assert.equal(f.store.status().writeAttempts,0);
});
