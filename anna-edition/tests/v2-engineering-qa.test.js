import test from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {canonicalJSON,emptyWorkspace,WORKSPACE_KEY,LEGACY_KEY,utf8Bytes,migrateLegacy} from "../bundle/v2/workspace.js";
import {validateDomain,prepareCommand} from "../bundle/v2/domain.js";
import {createWorkspaceRepository} from "../bundle/v2/repository.js";
import {buildReport,buildTrend} from "../bundle/v2/reporting.js";
import {selectPage} from "../bundle/v2/selectors.js";
import {buildCoachRequest,createConsentController} from "../bundle/v2/ai-coach.js";
import {fictionalLegacy,demoTransport} from "../preview-v2/demo-store.js";
const opts={timezone:"Asia/Kuching",migrationId:"qa"};
const now="2026-11-24T04:00:00.000Z",today="2026-11-24";
const empty=()=>emptyWorkspace(opts);
const clone=x=>JSON.parse(canonicalJSON(x));
const request=w=>buildCoachRequest(w,{requestId:"qa-request",question:"Review selected data",focus:"financial",spec:{kind:"month"},selected:["money"],asOf:now});
function mock(initial){
  let value=initial?clone(initial):null,seq=1,legacy=null,writes=0,mode="normal";
  const host={
    get writes(){return writes;},get value(){return value?clone(value):null;},setMode(m){mode=m;},
    async get({key}){
      if(key===LEGACY_KEY)return legacy===null?{exists:false}:{value:clone(legacy),etag:"legacy"};
      if(key!==WORKSPACE_KEY)throw new Error("Unexpected key");
      if(mode==="readError")throw new Error("Synthetic permission failure");
      return value===null?{exists:false}:{value:clone(value),etag:"e"+seq};
    },
    async set({key,value:next,if_match}){
      writes++;assert.equal(key,WORKSPACE_KEY);assert.equal(if_match,"e"+seq);
      if(mode==="falseAck")return {};
      if(mode==="timeout")return new Promise(()=>{});
      if(mode==="race"){seq++;throw new Error("precondition_failed");}
      value=clone(next);seq++;
      if(mode==="ackThenLegacy")legacy=fictionalLegacy();
      return {};
    },
    async create({value:next}){writes++;if(value!==null)throw Error("Exists");value=clone(next);seq++;}
  };return host;
}
const repo=(storage,extra={})=>createWorkspaceRepository({storage,validateDomain,atomicCreate:x=>storage.create(x),capability:{verified:true,maxBytes:1024*1024},timeoutMs:35,...extra});
function command(w){return prepareCommand(w,{type:"task.add",id:"qa-task",title:"Synthetic task",dueDate:null,priority:"normal"},{expectedRevision:w.revision,operationId:"qa-op",now});}
test("canonical serialization rejects sparse arrays disguised with extra keys and hidden properties",()=>{
  const a=new Array(1);a.extra=1;assert.throws(()=>canonicalJSON(a),/Sparse/);
  const b={a:1};Object.defineProperty(b,"hidden",{value:2});assert.throws(()=>canonicalJSON(b),/Non-JSON/);
  const c={get x(){return 1;}};assert.throws(()=>canonicalJSON(c),/Non-JSON/);
  const d={a:1};d[Symbol("hidden")]=1;assert.throws(()=>canonicalJSON(d),/Non-JSON/);
});
test("corrupted existing records fail full domain inspection and do not mutate",async()=>{
  const w=empty();w.collections.tasks.push({id:"broken"});const host=mock(w);
  await assert.rejects(repo(host).inspect(opts));assert.equal(host.writes,0);
});
test("capability objects cannot be mutated after construction to enable writes",async()=>{
  const host=mock(null),capability={verified:false,maxBytes:1024};
  const r=repo(host,{capability});capability.verified=true;capability.maxBytes=100000;
  await assert.rejects(r.initialize(empty()),{code:"CAPABILITY_UNVERIFIED"});assert.equal(host.writes,0);
});
test("domain validators must not mutate candidate snapshot",async()=>{
  const host=mock(null),r=repo(host,{validateDomain:w=>{w.settings.learningWeeklyTargetMinutes=50;return true;}});
  await assert.rejects(r.initialize(empty()),{code:"DOMAIN_INVALID"});assert.equal(host.writes,0);
});
test("injected read failure refuses initialization without writing",async()=>{
  const host=mock(null);host.setMode("readError");
  await assert.rejects(repo(host).inspect(opts),/permission/);assert.equal(host.writes,0);
});
for(const [fault,code] of [["falseAck","READBACK_MISMATCH"],["timeout","TIMEOUT"],["race",null],["ackThenLegacy","LEGACY_DIVERGED"]]){
  test("fault injection: "+fault+" locks after uncertain mutation and rejects retry",async()=>{
    const w=empty(),host=mock(w),r=repo(host);host.setMode(fault);
    const args={...command(w),etag:"e1"};
    if(code)await assert.rejects(r.commit(args),{code});else await assert.rejects(r.commit(args),/precondition/);
    assert.equal(r.locked,true);assert.equal(host.writes,1);
    await assert.rejects(r.commit(args),{code:"LOCKED"});assert.equal(host.writes,1);
  });
}
test("consent revoked before queued transport prevents call",async()=>{
  const w=empty(),r=request(w);let calls=0;
  const ctrl=createConsentController({transport:async p=>{calls++;return demoTransport(p);}});
  const p=await ctrl.preview(r);ctrl.consent(p.digest,true);
  const pending=ctrl.run({digest:p.digest,request:r,workspace:w});
  ctrl.invalidate();await assert.rejects(pending);assert.equal(calls,0);
});
test("revocation after transport starts discards late valid response",async()=>{
  const w=empty(),r=request(w);let finish,calls=0;
  const ctrl=createConsentController({transport:p=>{calls++;return new Promise(resolve=>{finish=async()=>resolve(await demoTransport(p));});}});
  const p=await ctrl.preview(r);ctrl.consent(p.digest,true);
  const pending=ctrl.run({digest:p.digest,request:r,workspace:w});await Promise.resolve();
  assert.equal(calls,1);ctrl.invalidate();await finish();await assert.rejects(pending);assert.equal(calls,1);
});
test("mixed 1500 transaction + 250 learning record benchmark with exact pagination and totals",()=>{
  const raw=fictionalLegacy();
  raw.money=Array.from({length:1500},(_,i)=>({id:"m"+i,date:today,amount:1.23,type:"expense",category:"Category "+i%12}));
  raw.learning=Array.from({length:250},(_,i)=>({id:"l"+i,date:today,topic:"Topic "+i%8,minutes:15}));
  const w=migrateLegacy(raw,{...opts,legacyEtag:"synthetic"});
  const start=performance.now();validateDomain(w);
  const r=buildReport(w,{kind:"month"},today,["money","learning"]);
  assert.equal(r.current.money.expenseMinor,184500);assert.equal(r.current.learning.minutes,3750);
  assert.equal(buildTrend(w,{kind:"week",count:24,today,selected:["money","learning"]}).length,24);
  const first=selectPage(w,"transactions",{pageSize:100}),last=selectPage(w,"transactions",{page:15,pageSize:100});
  assert.equal(first.total,1500);assert.equal(last.rows.length,100);assert.equal(new Set([...first.rows,...last.rows].map(x=>x.id)).size,200);
  const ms=performance.now()-start;console.log("QA_PERF "+JSON.stringify({transactions:1500,learning:250,bytes:utf8Bytes(w),elapsedMs:Math.round(ms)}));
  assert.ok(ms<10000,"Pure data benchmark exceeded conservative 10 s CI budget");
});
