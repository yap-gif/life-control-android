import test from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {mountMigrationDiagnostic} from "../upgrade-v2/diagnostic-view.js";
import {LEGACY_KEY} from "../bundle/v2/workspace.js";
const html='<button id="start">Inspect</button><p id="status"></p><section id="result" hidden><dl id="summary"></dl></section>';
const settle=()=>new Promise(r=>setImmediate(r));
test("diagnostic waits for explicit click, displays only counts, and cannot repeat",async()=>{
  const doc=new JSDOM(html).window.document;let connections=0,reads=0;
  const runtime={app:{id:908,slug:"life-control-anna"},windowUuid:"fixture",capabilities:{host_api_version:"0.1.0"},storage:{
    async get({key}){reads++;return key===LEGACY_KEY?{exists:true,etag:"fixture",generation:17,value:{version:1,tasks:[],money:[],learning:[],journal:[{id:"j",date:"2026-11-20",text:"PRIVATE_FIXTURE"}],goal:{goal:1000,saved:0,monthly:0},lastReview:null,savedPlan:null}}:{exists:false,value:null};},
    async set(){throw Error("FORBIDDEN");}
  }};
  mountMigrationDiagnostic(doc,async()=>{connections++;return runtime;});
  assert.equal(connections,0);assert.equal(reads,0);
  doc.getElementById("start").click();await settle();
  assert.equal(connections,1);assert.equal(reads,4);
  assert.equal(doc.getElementById("result").hidden,false);
  assert.match(doc.getElementById("status").textContent,/Inspection complete/);
  assert.doesNotMatch(doc.body.textContent,/PRIVATE_FIXTURE|fixture/);
  doc.getElementById("start").click();await settle();assert.equal(reads,4);
});
test("diagnostic failure is sanitized and leaves result hidden",async()=>{
  const doc=new JSDOM(html).window.document;
  mountMigrationDiagnostic(doc,async()=>{throw Error("PRIVATE_ERROR");});
  doc.getElementById("start").click();await settle();
  assert.equal(doc.getElementById("result").hidden,true);
  assert.match(doc.getElementById("status").textContent,/Inspection stopped/);
  assert.doesNotMatch(doc.body.textContent,/PRIVATE_ERROR/);
});
