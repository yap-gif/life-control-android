import {reserveBudget,settleBudget} from "../upgrade-v2/integrated-coach-ledger.js";
import {encryptWorkspace,inspectWorkspaceBackup,createBackupPanel} from "../upgrade-v2/integrated-backup.js";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
import {validateDomain,prepareCommand} from "../bundle/v2/domain.js";
import {buildOwnerLocalPlan} from "../qa/owner-migration-local.mjs";
import {createIntegratedStore,EDIT_LIMIT} from "../upgrade-v2/integrated-store.js";
import {createPersonalRun,checkBudget,typedWire} from "../upgrade-v2/integrated-coach-transport.js";
import {buildCoachRequest,previewRequest} from "../bundle/v2/ai-coach.js";
import {openEditLedger,validateEditMarker} from "../upgrade-v2/continuous-edit-ledger.js";
import {mountPersistent,ROUTES} from "../upgrade-v2/integrated-ui.js";
import {createIntegratedCoachPanel} from "../upgrade-v2/integrated-coach-panel.js";
import {LEGACY_KEY,WORKSPACE_KEY,migrateLegacy,utf8Bytes,canonicalJSON} from "../bundle/v2/workspace.js";
const raw={version:1,tasks:[],money:[],learning:[],journal:[],goal:{goal:1000,saved:0,monthly:0},lastReview:null,savedPlan:null};
const cmd=n=>({type:"task.add",id:"task-"+n,title:"Synthetic task "+n,dueDate:null,priority:"normal"});
async function fixture({confirmSave=()=>true,minimumRevision=0,legacyRaw=raw}={}){
 const l={exists:true,value:legacyRaw,etag:"legacy",generation:17},plan=await buildOwnerLocalPlan(l);
 const map=new Map([[LEGACY_KEY,structuredClone(l)],[WORKSPACE_KEY,{exists:true,etag:"v2-1",generation:1,value:migrateLegacy(legacyRaw,{timezone:"Asia/Kuching",legacyEtag:l.etag,migrationId:plan.migrationId})}]]),calls=[];
 let record=null;
 const ledger={async read(){return structuredClone(record);},async claim(expected,pending){if(canonicalJSON(expected)!==canonicalJSON(record)||record?.state==="PENDING")throw Error("conflict");record=structuredClone(pending);return structuredClone(record);},async confirm(pending){assert.deepEqual(record,pending);record={...pending,state:"CONFIRMED"};return structuredClone(record);}};
 const runtime={app:{id:908,slug:"life-control-anna"},windowUuid:"fixture",capabilities:{host_api_version:"0.1.0"},storage:{
   async get({key}){calls.push(["get",key]);return structuredClone(map.get(key)??{exists:false,value:null});},
   async set(a){calls.push(["set",a.key]);assert.equal(record.state,"PENDING");assert.equal(a.key,WORKSPACE_KEY);const old=map.get(a.key);assert.equal(a.if_match,old.etag);const r={exists:true,etag:"v2-"+(old.generation+1),generation:old.generation+1,value:structuredClone(a.value)};map.set(a.key,r);return {etag:r.etag,generation:r.generation,size_bytes:utf8Bytes(r.value)};}
 }};
 const create=()=>createIntegratedStore(runtime,{localPlan:plan,ledger,minimumRevision,checkOwnerConditions:()=>true,confirmSave,now:()=>"2026-11-28T02:00:00.000Z"});
 return {map,calls,ledger,runtime,create,plan,store:create()};
}

const now="2026-11-28T02:00:00.000Z";
const cost={balance:975.477,maxCost:1,verified:true};
function preview(w){const request=buildCoachRequest(w,{requestId:"analysis-qa",question:"Summarize recorded learning",focus:"learning",spec:{kind:"7days"},selected:["learning"],asOf:now});const payload=canonicalJSON(typedWire(JSON.parse(previewRequest(request))));return {request,payload};}
function response(p){const m=p.request.metrics.find(x=>x.id==="learning.minutes.current");return {schemaVersion:1,summary:"Recorded learning only.",findings:[{metricIds:[m.id],interpretation:"Review the recorded minutes.",confidence:"limited",limitation:"Recorded activity only."}],actions:[{id:"a1",title:"Study for 30 minutes",reasonMetricIds:[m.id],target:{metricId:m.id,quantity:30,unit:m.unit},dueDate:"2026-11-29"}],followUp:{measurement:"Record minutes",limitations:["Missing activity is unknown."]}};}
function model(f,p){const calls=[];f.runtime.llm={async complete(w){calls.push(w);return {role:"assistant",stopReason:"endTurn",content:{type:"text",text:JSON.stringify(response(p))},usage:{inputTokens:100,outputTokens:100,totalTokens:200},_meta:{quotaConsumed:.1}};}};return calls;}
test("regressed owner baseline is read-only, zero writes",async()=>{const f=await fixture({minimumRevision:4});const r=await f.store.load();assert.equal(r.state,"BASELINE_REGRESSED");assert.equal(f.calls.length,2);await assert.rejects(f.store.apply(cmd(1)),{code:"EDITOR_LOCKED"});});
test("exact personal consent, saved analysis then plan then task, all with CAS",async()=>{const f=await fixture();await f.store.load();const p=preview(f.store.workspace),calls=model(f,p);let claims=0;const r=createPersonalRun(f.runtime,{readWorkspace:()=>f.store.workspace,claim:async()=>{claims++;return true},settle:async()=>true,authorize:()=>true});assert.equal(await r.prepare(p),p.payload);await assert.rejects(r.run({...cost,verified:false}));assert.equal(calls.length,0);const receipt=await r.run(cost);assert.equal(claims,1);assert.equal(canonicalJSON(calls[0]),p.payload);
 await f.store.apply({type:"analysis.save",receipt,confirm:true});assert.equal(f.store.workspace.collections.analyses.at(-1).id,"analysis-qa");
 await f.store.apply({type:"plan.save",id:"plan-qa",analysisId:"analysis-qa",actions:[{id:"act-qa",sourceActionId:"a1",title:"Study",dueDate:"2026-11-29"}],confirm:true});
 const s=await f.store.apply({type:"action.accept",id:"act-qa",taskId:"task-qa",priority:"normal",confirm:true});assert.equal(s.state,"SESSION_LIMIT");assert.equal(s.reads,14);
 const next=f.create();await next.load();await next.apply({type:"task.transition",id:"task-qa",eventId:"event-qa",status:"done"});assert.equal(next.workspace.collections.planActions[0].status,"completed");assert.deepEqual(f.map.get(LEGACY_KEY).value,raw);});
test("stale snapshot and failed durable claim never dispatch",async()=>{const f=await fixture();await f.store.load();const p=preview(f.store.workspace),calls=model(f,p);let w=f.store.workspace;const r=createPersonalRun(f.runtime,{readWorkspace:()=>w,claim:async()=>true,settle:async()=>true,authorize:()=>true});await r.prepare(p);w={...w,revision:w.revision+1};await assert.rejects(r.run(cost));assert.equal(calls.length,0);w=f.store.workspace;const s=createPersonalRun(f.runtime,{readWorkspace:()=>w,claim:async()=>{throw Error("duplicate")},settle:async()=>true,authorize:()=>true});await s.prepare(p);await assert.rejects(s.run(cost));assert.equal(calls.length,0);});
test("budget unknown or beyond remaining credits fails closed",()=>{for(const patch of [{verified:false},{maxCost:NaN},{maxCost:5.01},{balance:970.477},{balance:976}])assert.equal(checkBudget({...cost,...patch}),false);assert.equal(checkBudget(cost),true);});
test("unverified receipt and delete commands cannot save",async()=>{const f=await fixture();await f.store.load();await assert.rejects(f.store.apply({type:"analysis.save",receipt:{},confirm:true}),{code:"INVALID_RECORD"});await assert.rejects(f.store.apply({type:"analysis.delete",id:"x"}),{code:"COMMAND_FORBIDDEN"});assert.equal(f.calls.length,2);});

test("integrated UI all routes render, no model call or save without user action",async()=>{const f=await fixture();await f.store.load();const html=readFileSync(new URL("../upgrade-v2/integrated.html",import.meta.url),"utf8");for(const [route,label] of ROUTES){const {window}=new JSDOM(html,{url:"https://example.test/#"+route});const d=window.document;mountPersistent(d,window,f.store,{today:"2026-11-28",coachPanel:commit=>createIntegratedCoachPanel(d,()=>f.store.workspace,{runtime:f.runtime,win:window,canWrite:()=>!f.store.locked,commit,now:()=>now})});assert.equal(d.getElementById("page-title").textContent,label);assert.doesNotMatch(d.getElementById("page").textContent,/Unable to render/);if(route==="insights"){assert.match(d.getElementById("page").textContent,/Compare saved analyses/);assert.equal([...d.querySelectorAll("button")].find(b=>b.textContent==="Send personal request once").disabled,true);}window.close();}assert.equal(f.calls.length,2);});

test("encrypted backup roundtrip, wrong passphrase and tampering rejected",async()=>{const f=await fixture();await f.store.load();const w=f.store.workspace,p="synthetic backup passphrase";const text=await encryptWorkspace(w,p);assert.doesNotMatch(text,/collections|migration|synthetic backup passphrase/);const a=await inspectWorkspaceBackup(text,p,w);assert.equal(a.sameWorkspace,true);assert.equal(a.restorePerformed,false);await assert.rejects(inspectWorkspaceBackup(text,"wrong backup passphrase",w));const x=JSON.parse(text);x.ciphertext=(x.ciphertext[0]==="A"?"B":"A")+x.ciphertext.slice(1);await assert.rejects(inspectWorkspaceBackup(JSON.stringify(x),p,w));assert.equal(f.calls.length,2);});
test("matched pending recovery uses two reads, no new writes, and requires reopen",async()=>{const f=await fixture();await f.store.load();const set=f.runtime.storage.set;f.runtime.storage.set=async a=>{await set(a);throw Error("lost receipt");};await assert.rejects(f.store.apply(cmd(1)));const next=f.create();await next.load();assert.equal(next.status().state,"RECOVERY_MATCHED");await assert.rejects(next.reconcileMatched(false));const before=f.calls.length;const r=await next.reconcileMatched(true);assert.equal(r.state,"RECOVERY_RESOLVED");assert.equal(f.calls.length,before+2);assert.equal(r.writeAttempts,0);await assert.rejects(next.apply(cmd(2)));const reopened=f.create();await reopened.load();assert.equal(reopened.status().state,"READY");});

test("budget reservation locks uncertain outcomes, rejects duplicate and total ceiling",()=>{let e=reserveBudget([],{requestId:"first",maxCost:2});assert.throws(()=>reserveBudget(e,{requestId:"second",maxCost:1}));e=settleBudget(e,{requestId:"first",quotaConsumed:.2});assert.throws(()=>reserveBudget(e,{requestId:"first",maxCost:1}));assert.throws(()=>reserveBudget(e,{requestId:"second",maxCost:3.000001}));e=reserveBudget(e,{requestId:"second",maxCost:3});assert.throws(()=>settleBudget(e,{requestId:"second",quotaConsumed:3.1}));e=settleBudget(e,{requestId:"second",quotaConsumed:1});assert.throws(()=>reserveBudget(e,{requestId:"third",maxCost:.001}));});
test("late durable model claim after timeout never sends",async()=>{const f=await fixture();await f.store.load();const p=preview(f.store.workspace),calls=model(f,p);let release;const r=createPersonalRun(f.runtime,{readWorkspace:()=>f.store.workspace,claim:()=>new Promise(resolve=>{release=resolve}),settle:async()=>true,authorize:()=>true,timeoutMs:15});await r.prepare(p);await assert.rejects(r.run(cost));release(true);await new Promise(resolve=>setTimeout(resolve,15));assert.equal(calls.length,0);});

test("overview renders nonempty journal on current and historical dates, including locked baseline",async()=>{
 for(const date of ["2026-11-27","2026-11-28"])for(const minimumRevision of [0,4]){
  const f=await fixture({minimumRevision,legacyRaw:{...raw,journal:[{id:"journal-qa",date,text:"Synthetic reflection"}]}});await f.store.load();
  const {window}=new JSDOM(readFileSync(new URL("../upgrade-v2/integrated.html",import.meta.url),"utf8"),{url:"https://example.test/#overview"});
  const d=window.document;mountPersistent(d,window,f.store,{today:"2026-11-28"});
  assert.doesNotMatch(d.getElementById("page").textContent,/Unable to render/);
  const b=[...d.querySelectorAll("button")].find(b=>b.dataset.quickKind==="journal");assert.ok(b);
  assert.equal(b.textContent,date==="2026-11-28"?"Edit today's reflection":"Add reflection");
  assert.equal(b.disabled,minimumRevision===4);assert.equal(f.calls.length,2);window.close();
 }
});
test("baseline comparison reports only metadata without reads or writes, preserves regression lock",async()=>{
 const f=await fixture();await f.store.load();await f.store.apply(cmd(1));const before=f.calls.length;
 const d=await f.store.baselineDiagnostics();assert.equal(d.receiptFingerprintMatches,true);assert.equal(d.receiptGenerationMatches,true);assert.equal(d.receiptOperationMatches,true);assert.equal(f.calls.length,before);
 assert.doesNotMatch(JSON.stringify(d),/candidateSha256|operationId|Synthetic task/);
 const locked=createIntegratedStore(f.runtime,{localPlan:f.plan,ledger:f.ledger,checkOwnerConditions:()=>true,confirmSave:()=>true});
 await locked.load();const n=f.calls.length;const r=await locked.baselineDiagnostics();assert.equal(r.baselineMeetsMinimum,false);assert.equal(r.receiptFingerprintMatches,true);assert.equal(locked.status().state,"BASELINE_REGRESSED");assert.equal(f.calls.length,n);await assert.rejects(locked.apply(cmd(2)),{code:"EDITOR_LOCKED"});
});
test("backup distinguishes malformed envelope, invalid password and failed authentication",async()=>{
 const f=await fixture();await f.store.load();const w=f.store.workspace,p="synthetic backup passphrase";
 await assert.rejects(encryptWorkspace(w,"short"),{code:"PASSPHRASE_INVALID"});
 await assert.rejects(inspectWorkspaceBackup("{}",p,w),{code:"INVALID_ENVELOPE"});
 const text=await encryptWorkspace(w,p);await assert.rejects(inspectWorkspaceBackup(text,"different valid password",w),{code:"AUTHENTICATION_FAILED"});
 assert.equal(f.calls.length,2);
});
test("backup button preserves self-checked ciphertext fallback when download unavailable",async()=>{
 const f=await fixture({minimumRevision:4});await f.store.load();const w=f.store.workspace;
 const {window}=new JSDOM("<main></main>",{url:"https://example.test"});const d=window.document;
 const panel=createBackupPanel(d,window,()=>f.store.workspace);d.querySelector("main").append(panel);
 window.URL.createObjectURL=()=>{throw Error("synthetic unavailable");};
 const buttons=[...panel.querySelectorAll("button")],inputs=panel.querySelectorAll('input[type="password"]'),p="synthetic backup passphrase";
 const wait=async()=>{for(let i=0;i<200&&buttons[0].disabled;i++)await new Promise(r=>setTimeout(r,10));assert.equal(buttons[0].disabled,false);};
 inputs[0].value=p;inputs[1].value="different valid password";buttons[0].click();await wait();assert.match(panel.querySelector("pre").textContent,/PASSPHRASE_MISMATCH/);
 inputs[0].value=inputs[1].value=p;buttons[0].click();await wait();
 assert.match(panel.querySelector("pre").textContent,/DOWNLOAD_UNAVAILABLE/);
 const output=panel.querySelector("textarea");assert.ok(output.value);assert.equal((await inspectWorkspaceBackup(output.value,p,w)).sameWorkspace,true);
 assert.equal(inputs[0].value,"");assert.equal(inputs[1].value,"");assert.doesNotMatch(output.value,/collections|synthetic backup passphrase/);
 buttons.find(b=>b.textContent==="Clear encrypted output").click();assert.equal(output.value,"");assert.equal(f.calls.length,2);window.close();
});
