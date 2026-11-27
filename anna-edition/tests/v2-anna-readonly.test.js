import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";
import {migrateLegacy,canonicalJSON,LEGACY_KEY} from "../bundle/v2/workspace.js";
import {mountReadOnly,ROUTES} from "../upgrade-v2/readonly-ui.js";
import {mountReadOnlyEntry,localDay} from "../upgrade-v2/readonly-entry.js";
const html=readFileSync(new URL("../upgrade-v2/readonly.html",import.meta.url),"utf8");
const raw=()=>({version:1,tasks:[{id:"t",title:"Task fixture",date:"2026-11-27",done:false}],money:[{id:"m",date:"2026-11-27",amount:12,type:"expense",category:"Food"}],learning:[{id:"l",date:"2026-11-27",topic:"Study fixture",minutes:30}],journal:[{id:"j",date:"2026-11-27",text:"<img src=x onerror=alert(1)>"}],goal:{goal:1000,saved:50,monthly:100},lastReview:{generatedAt:"2026-11-20",text:"Analysis fixture",categories:["money"]},savedPlan:{savedAt:"2026-11-20",text:"Plan fixture",categories:["money"]}});
const candidate=()=>migrateLegacy(raw(),{timezone:"Asia/Kuching",migrationId:"fixture",legacyEtag:"e17"});
const dom=(route="overview")=>new JSDOM(html,{url:"https://example.test/#"+route});
test("all nine read-only routes display without mutation or AI controls",()=>{
  const w=candidate(),before=canonicalJSON(w);
  for(const [route,label] of ROUTES){
    const {window}=dom(route),doc=window.document;
    mountReadOnly(doc,window,w,{today:"2026-11-27",legacyGeneration:17});
    assert.equal(doc.getElementById("page-title").textContent,label);
    assert.doesNotMatch(doc.getElementById("page").textContent,/Unable to render this view/);
    for(const b of doc.querySelectorAll("#page button"))assert.match(b.textContent,/^(Apply report filters|Apply filters|Clear filters|Previous|Next)$/);
    assert.equal(doc.querySelector("#page img"),null);
    if(route==="insights"){assert.match(doc.getElementById("page").textContent,/Analysis fixture/);assert.match(doc.getElementById("page").textContent,/Plan fixture/);}
    if(route==="journal")assert.match(doc.getElementById("page").textContent,/<img src=x onerror=alert\(1\)>/);
    if(route==="money")assert.match(doc.getElementById("page").textContent,/Food/);
    window.close();
  }
  assert.equal(canonicalJSON(w),before);
});
test("reports filters remain local and usable",()=>{
  const {window}=dom("reports"),doc=window.document;
  mountReadOnly(doc,window,candidate(),{today:"2026-11-27",legacyGeneration:17});
  const form=doc.querySelector("#page form");
  form.querySelector('[name="kind"]').value="week";
  form.dispatchEvent(new window.Event("submit",{cancelable:true,bubbles:true}));
  assert.match(doc.getElementById("status").textContent,/Report recalculated locally/);
  window.close();
});
test("entry waits for click, reads at most four times, never persists or invokes AI",async()=>{
  const {window}=dom(),doc=window.document;let connections=0,reads=0;
  const rt={app:{id:908,slug:"life-control-anna"},windowUuid:"fixture",capabilities:{host_api_version:"0.1.0"},storage:{async get({key}){reads++;return key===LEGACY_KEY?{exists:true,etag:"e17",generation:17,value:raw()}:{exists:false,value:null};}}};
  mountReadOnlyEntry(doc,window,async()=>{connections++;return rt;});
  assert.equal(connections,0);doc.getElementById("load").click();await new Promise(r=>setImmediate(r));
  assert.equal(connections,1);assert.equal(reads,4);assert.equal(doc.getElementById("load-panel").hidden,true);
  assert.match(doc.getElementById("status").textContent,/Read-only workspace ready/);
  doc.getElementById("load").click();assert.equal(reads,4);window.close();
});
test("entry fails closed without showing private errors",async()=>{
  const {window}=dom(),doc=window.document;mountReadOnlyEntry(doc,window,async()=>{throw Error("PRIVATE_ERROR");});
  doc.getElementById("load").click();await new Promise(r=>setImmediate(r));
  assert.match(doc.getElementById("status").textContent,/stopped/);assert.doesNotMatch(doc.body.textContent,/PRIVATE_ERROR/);assert.equal(doc.querySelectorAll("#nav a").length,0);window.close();
});
test("Kuching date uses civil midnight",()=>assert.equal(localDay(new Date("2026-11-26T16:00:00Z")),"2026-11-27"));
