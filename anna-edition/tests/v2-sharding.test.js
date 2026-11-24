import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {canonicalJSON,utf8Bytes,emptyWorkspace,migrateLegacy} from "../bundle/v2/workspace.js";
import {validateDomain} from "../bundle/v2/domain.js";
import {fictionalLegacy} from "../preview-v2/demo-store.js";
import {planShards,assembleShards} from "../qa/sharding/shard-plan.mjs";
const opts={timezone:"Asia/Kuching",migrationId:"l04-synthetic"};
const limits={maxValueBytes:16*1024};
const copy=structuredClone;
const fresh=()=>emptyWorkspace(opts);
function mixed(){
  const raw=fictionalLegacy();
  raw.money=Array.from({length:1500},(_,i)=>({id:"m"+i,date:"2026-11-24",amount:1.23,type:"expense",category:"Category "+i%12}));
  raw.learning=Array.from({length:250},(_,i)=>({id:"l"+i,date:"2026-11-24",topic:"Topic "+i%8,minutes:15}));
  return migrateLegacy(raw,{...opts,legacyEtag:"synthetic"});
}
async function assemble(p,o=limits){return assembleShards(p,{...o,expectedManifestSha256:p.manifestSha256});}
const sha=v=>createHash("sha256").update(canonicalJSON(v),"utf8").digest("hex");
function resign(p){p.manifestSha256=sha(p.manifest);return p;}
test("L04-01 empty workspace roundtrips without data shards",async()=>{
  const w=fresh(),p=await planShards(w,limits);
  assert.equal(p.shards.length,0);assert.deepEqual(await assemble(p),w);
});
test("L04-02 mixed 1750 records preserved exactly under a hypothetical 16 KiB value cap",async()=>{
  const w=mixed(),p=await planShards(w,limits),back=await assemble(p);
  assert.equal(canonicalJSON(back),canonicalJSON(w));assert.equal(validateDomain(back),true);
  assert.equal(back.collections.transactions.length,1500);assert.equal(back.collections.learning.length,250);
  assert.equal(back.collections.transactions.reduce((n,x)=>n+x.amountMinor,0),184500);
  assert.equal(back.collections.learning.reduce((n,x)=>n+x.minutes,0),3750);
  assert.ok(p.shards.length>1);
  const maxShard=Math.max(...p.shards.map(s=>utf8Bytes(s.value)));
  assert.ok(maxShard<=limits.maxValueBytes);assert.ok(utf8Bytes(p.manifest)<=limits.maxValueBytes);
  console.log("L04_PERF "+JSON.stringify({transactions:1500,learning:250,workspaceBytes:utf8Bytes(w),shards:p.shards.length,maxShardBytes:maxShard,indexBytes:utf8Bytes(p.manifest),capBytes:limits.maxValueBytes}));
});
test("L04-03 deterministic keys, index and complete record order",async()=>{
  const w=mixed(),p=await planShards(w,limits),q=await planShards(w,limits);
  assert.deepEqual(p,q);assert.deepEqual(await assemble({...p,shards:[...p.shards].reverse()}),w);
});
test("L04-04 UTF-8 bytes include multibyte records and actual envelope",async()=>{
  const raw=fictionalLegacy();raw.journal[0].text="汉字🙂".repeat(200);
  const w=migrateLegacy(raw,{...opts,legacyEtag:"synthetic"}),p=await planShards(w,limits);
  const shard=p.shards.find(s=>s.value.collection==="journal"),ref=p.manifest.refs.find(r=>r.key===shard.key);
  assert.equal(ref.bytes,Buffer.byteLength(canonicalJSON(shard.value),"utf8"));
  assert.ok(ref.bytes>canonicalJSON(shard.value).length);
  assert.deepEqual(await assemble(p),w);
});
test("L04-05 record too large and index too large fail before any storage exists",async()=>{
  const raw=fictionalLegacy();raw.journal[0].text="汉".repeat(1800);
  const w=migrateLegacy(raw,{...opts,legacyEtag:"synthetic"});
  await assert.rejects(planShards(w,{maxValueBytes:4096}),{code:"RECORD_TOO_LARGE"});
  await assert.rejects(planShards(mixed(),{maxValueBytes:1024}),{code:"INDEX_TOO_LARGE"});
});
test("L04-06 explicit positive integer budget required",async()=>{
  for(const maxValueBytes of [undefined,0,-1,NaN,Infinity,1.5,"16384"]){
    await assert.rejects(planShards(fresh(),{maxValueBytes}),{code:"INVALID_BUDGET"});
  }
});
test("L04-07 missing, duplicate or extra shard never yields partial workspace",async()=>{
  const p=await planShards(mixed(),limits);
  await assert.rejects(assemble({...p,shards:p.shards.slice(1)}),{code:"MISSING_SHARD"});
  await assert.rejects(assemble({...p,shards:[...p.shards,p.shards[0]]}),{code:"DUPLICATE_SHARD"});
  await assert.rejects(assemble({...p,shards:[...p.shards,{key:"unreferenced",value:{}}]}),{code:"UNREFERENCED_SHARD"});
});
test("L04-08 same-size corruption detected by shard digest",async()=>{
  const p=await planShards(mixed(),limits),q=copy(p);
  const s=q.shards.find(s=>s.value.collection==="transactions");s.value.rows[0].amountMinor=124;
  await assert.rejects(assemble(q),{code:"SHARD_DIGEST_MISMATCH"});
});
test("L04-09 trusted index digest rejects modified or untrusted index",async()=>{
  const p=await planShards(mixed(),limits),q=copy(p);q.manifest.header.settings.timezone="UTC";resign(q);
  await assert.rejects(assembleShards(q,{...limits,expectedManifestSha256:p.manifestSha256}),{code:"INDEX_DIGEST_MISMATCH"});
  await assert.rejects(assembleShards(p,limits),{code:"UNTRUSTED_INDEX"});
});
test("L04-10 inconsistent index counts and reference order are rejected even if rehashed",async()=>{
  const p=await planShards(mixed(),limits),q=copy(p);q.manifest.counts.transactions++;resign(q);
  await assert.rejects(assemble(q),{code:"COLLECTION_COUNT_MISMATCH"});
  const r=copy(p);r.manifest.refs.reverse();resign(r);
  await assert.rejects(assemble(r),{code:"INVALID_SHARD_PLAN"});
});
test("L04-11 workspace digest prevents valid-looking substituted metadata",async()=>{
  const p=await planShards(fresh(),limits),q=copy(p);
  q.manifest.header.settings.timezone="UTC";resign(q);
  await assert.rejects(assemble(q),{code:"WORKSPACE_DIGEST_MISMATCH"});
});
test("L04-12 invalid domain rejected and planner detaches input before async work",async()=>{
  const invalid=fresh();invalid.collections.tasks=[{id:"broken"}];
  await assert.rejects(planShards(invalid,limits));
  const w=mixed(),before=canonicalJSON(w),pending=planShards(w,limits);
  w.collections.transactions[0].amountMinor=999;
  assert.equal(canonicalJSON(await assemble(await pending)),before);
});
