import test from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {syntheticCoachFixture,createSyntheticCoach,toHostRequest} from "../upgrade-v2/synthetic-coach.js";
import {createCoachPanel} from "../upgrade-v2/synthetic-coach-panel.js";
import {claimSyntheticCoach} from "../upgrade-v2/synthetic-coach-ledger.js";
import {canonicalJSON} from "../bundle/v2/workspace.js";
function fixture(){
  const {request}=syntheticCoachFixture(),metric=request.metrics.find(x=>x.id==="learning.minutes.current");
  assert.equal(metric.value,60);
  const result={schemaVersion:1,summary:"Synthetic recorded learning: 60 minutes.",findings:[{metricIds:[metric.id],interpretation:"Two fictional sessions.",confidence:"limited",limitation:"Fictional data only."}],actions:[],followUp:{measurement:"Record minutes",limitations:["Synthetic only"]}};
  const calls=[];
  const runtime={app:{id:908,slug:"life-control-anna"},windowUuid:"fixture",capabilities:{host_api_version:"0.1.0"},llm:{async complete(wire){calls.push(wire);return {role:"assistant",stopReason:"endTurn",content:{type:"text",text:JSON.stringify(result)},usage:{inputTokens:10,outputTokens:20,totalTokens:30},_meta:{quotaConsumed:0.01}};}}};
  return {runtime,calls,result};
}
test("fixed synthetic scope and exact typed body, one call after preview and consent",async()=>{
  const f=fixture();let yes=false,claims=0;const c=createSyntheticCoach(f.runtime,{claim:async()=>{claims++;return true;},authorize:()=>yes});
  const p=await c.preview();assert.equal(f.calls.length,0);assert.equal(claims,0);assert.match(p.wire,/Synthetic practice/);
  await assert.rejects(c.run());yes=true;const r=await c.run();assert.equal(r.status.state,"CONFIRMED");assert.equal(r.status.modelAttempts,1);assert.equal(claims,1);assert.equal(canonicalJSON(f.calls[0]),p.wire);assert.deepEqual(r.result,f.result);await assert.rejects(c.run());assert.equal(f.calls.length,1);
});
test("unavailable or already reserved ledger does not call model",async()=>{const f=fixture();const c=createSyntheticCoach(f.runtime,{claim:async()=>{throw Error("reserved");},authorize:()=>true});await c.preview();const r=await c.run();assert.equal(r.status.state,"STOPPED");assert.equal(f.calls.length,0);});
test("truncation, invalid evidence reference and missing usage fail closed; never retry",async()=>{for(const mode of ["truncated","invalid","usage"]){const f=fixture(),complete=f.runtime.llm.complete;f.runtime.llm.complete=async w=>{const r=await complete(w);if(mode==="truncated")r.stopReason="maxTokens";if(mode==="invalid")r.content.text=JSON.stringify({...f.result,findings:[{...f.result.findings[0],metricIds:["invented"]}]});if(mode==="usage")delete r._meta;return r;};const c=createSyntheticCoach(f.runtime,{claim:async()=>true,authorize:()=>true});await c.preview();const r=await c.run();assert.equal(r.status.state,"UNCERTAIN");assert.equal(r.result,null);assert.equal(f.calls.length,1);await assert.rejects(c.run());}});
test("revoked consent after durable claim prevents model call",async()=>{const f=fixture();let yes=true;const c=createSyntheticCoach(f.runtime,{claim:async()=>{yes=false;return true;},authorize:()=>yes});await c.preview();assert.equal((await c.run()).status.state,"STOPPED");assert.equal(f.calls.length,0);});
test("unverified runtime and malformed wire are rejected",async()=>{const f=fixture();f.runtime.app.id=999;await assert.rejects(createSyntheticCoach(f.runtime,{claim:async()=>true,authorize:()=>true}).preview());assert.throws(()=>toHostRequest({messages:[],maxTokens:999}));await assert.rejects(claimSyntheticCoach(null));});
test("real panel preview requires checkbox and unavailable ledger prevents real request",async()=>{const f=fixture(),{window}=new JSDOM("<body></body>");const panel=createCoachPanel(window.document,window,f.runtime,()=>true);window.document.body.append(panel);const [preview,run]=panel.querySelectorAll("button"),tick=panel.querySelector("input");assert.equal(run.disabled,true);preview.click();for(let i=0;i<100&&tick.disabled;i++)await new Promise(r=>setTimeout(r,5));assert.equal(tick.disabled,false);assert.equal(run.disabled,true);tick.checked=true;tick.dispatchEvent(new window.Event("change"));run.click();for(let i=0;i<100&&!panel.textContent.includes('"state": "STOPPED"');i++)await new Promise(r=>setTimeout(r,5));assert.match(panel.textContent,/"state": "STOPPED"/);assert.equal(f.calls.length,0);window.close();});
