import test from "node:test";
import assert from "node:assert/strict";
import {createCapacityProbe,syntheticPayload,PROBE_BYTES} from "../upgrade-v2/capacity-probe.js";
import {utf8Bytes} from "../bundle/v2/workspace.js";
import {JSDOM} from "jsdom";
import {readFileSync} from "node:fs";
import {mountCapacityProbe} from "../upgrade-v2/capacity-probe-entry.js";
function fixture(){
  const calls=[],map=new Map();
  const runtime={app:{id:908,slug:"life-control-anna"},windowUuid:"fixture",capabilities:{host_api_version:"0.1.0"},storage:{
    async get(args){calls.push(["get",args]);return structuredClone(map.get(args.key)??{exists:false,value:null});},
    async set(args){calls.push(["set",args]);const prev=map.get(args.key);assert.equal(args.ttl_seconds,600);assert.equal(args.if_match,prev?.etag);const r={exists:true,value:structuredClone(args.value),etag:"fixture-"+(prev?2:1),generation:prev?2:1};map.set(args.key,r);return {etag:r.etag,generation:r.generation,size_bytes:utf8Bytes(r.value)};}
  }};return {runtime,calls,map};
}
test("synthetic values exactly 65536 UTF8 bytes",()=>{const a=syntheticPayload(1),b=syntheticPayload(2);assert.equal(utf8Bytes(a),PROBE_BYTES);assert.equal(utf8Bytes(b),PROBE_BYTES);assert.notEqual(a.payload,b.payload);});
test("one random QA key, create and CAS update verified, no business access or retry",async()=>{const f=fixture(),p=createCapacityProbe(f.runtime,{authorize:()=>true});assert.equal(f.calls.length,0);const r=await p.run();assert.equal(r.state,"CONFIRMED");assert.equal(r.reads,3);assert.equal(r.writeAttempts,2);assert.equal(r.confirmedWrites,2);assert.equal(new Set(f.calls.map(x=>x[1].key)).size,1);assert.match(f.calls[0][1].key,/^life-control-anna:qa-capacity-[a-f0-9-]{36}$/);await assert.rejects(p.run());assert.equal(f.calls.length,5);});
test("absence conflict and no consent stop without writes",async()=>{for(const consent of [false,true]){const f=fixture();f.runtime.storage.get=async()=>({exists:true,value:{},etag:"collision",generation:1});const r=await createCapacityProbe(f.runtime,{authorize:()=>consent}).run();assert.equal(r.state,"STOPPED");assert.equal(r.writeAttempts,0);}});
test("wrong receipt or readback prevents subsequent CAS",async()=>{for(const mode of ["receipt","readback"]){const f=fixture(),set=f.runtime.storage.set;f.runtime.storage.set=async a=>{const r=await set(a);if(mode==="receipt")r.size_bytes--;else f.map.get(a.key).value.payload="changed";return r;};const r=await createCapacityProbe(f.runtime,{authorize:()=>true}).run();assert.equal(r.state,"UNCERTAIN");assert.equal(r.writeAttempts,1);assert.equal(r.confirmedWrites,0);}});
test("actual entry waits for explicit consent and issues one bounded QA run",async()=>{const f=fixture(),{window}=new JSDOM(readFileSync(new URL("../upgrade-v2/capacity-probe.html",import.meta.url),"utf8"));const d=window.document;let connects=0;mountCapacityProbe(d,async()=>{connects++;return f.runtime;});d.getElementById("run").click();assert.equal(connects,0);const tick=d.getElementById("consent");tick.checked=true;tick.dispatchEvent(new window.Event("change"));d.getElementById("run").click();d.getElementById("run").click();for(let i=0;i<100&&!d.getElementById("result").textContent.includes("CONFIRMED");i++)await new Promise(r=>setTimeout(r,5));assert.match(d.getElementById("result").textContent,/CONFIRMED/);assert.equal(connects,1);assert.equal(f.calls.length,5);window.close();});
