import test from "node:test";
import assert from "node:assert/strict";
import {fictionalLegacy} from "../preview-v2/demo-store.js";
import {canonicalJSON,migrateLegacy} from "../bundle/v2/workspace.js";
import {createRecoveryLab} from "../qa/sharding/recovery-lab.mjs";
const opts={timezone:"Asia/Kuching",migrationId:"l05-synthetic"};
const make=()=>createRecoveryLab({legacy:fictionalLegacy(),legacyEtag:"legacy-1",maxValueBytes:16384});
const start=(c,id="migration")=>c.begin({operationId:id,...opts});
async function complete(c,id="migration"){await c.stage(id);c.arm(id);await c.publish(id);await c.confirm(id);return c.read();}
async function seeded(){const lab=make(),c=lab.connect();await start(c);const initial=await complete(c);return {lab,c,initial};}
function update(initial,id="update"){const workspace=structuredClone(initial.workspace);workspace.revision++;workspace.lastOperationId=id;workspace.settings.timezone="UTC";return {operationId:id,workspace,expectedRoot:initial.root};}
test("L05-01 migration publishes complete exact workspace and preserves legacy",async()=>{
  const lab=make(),c=lab.connect(),before=lab.inspect().legacy;
  await start(c);const r=await complete(c);
  assert.equal(canonicalJSON(r.workspace),canonicalJSON(migrateLegacy(before.value,{...opts,legacyEtag:before.etag})));
  assert.deepEqual(lab.inspect().legacy,before);assert.equal(lab.inspect().metrics.rootCommits,1);assert.equal(lab.inspect().metrics.deletes,0);
});
test("L05-02 partial staging is invisible and restart can explicitly continue same receipt",async()=>{
  const lab=make(),a=lab.connect();await start(a);
  assert.equal((await a.stage("migration",{limit:1})).complete,false);
  const b=lab.connect();assert.equal((await b.read()).status,"NO_ROOT");
  assert.equal((await b.recover()).status,"NOT_PUBLISHED");
  assert.equal(lab.inspect().metrics.rootAttempts,0);
  assert.equal((await complete(b)).status,"COMPLETE");
});
test("L05-03 old complete snapshot remains visible during update staging",async()=>{
  const {lab,c,initial}=await seeded();await c.begin(update(initial));
  await c.stage("update",{limit:1});const b=lab.connect();
  assert.deepEqual(await b.read(),initial);assert.equal((await b.recover()).status,"NOT_PUBLISHED");
  await complete(b,"update");assert.equal((await b.read()).workspace.revision,1);
});
test("L05-04 explicit pre-arm abort preserves old root and staged objects",async()=>{
  const {lab,c,initial}=await seeded();await c.begin(update(initial));await c.stage("update");
  const before=lab.inspect();c.abortBeforeArm("update");const b=lab.connect();
  assert.equal((await b.recover()).status,"ABORTED");assert.deepEqual(await b.read(),initial);
  assert.deepEqual(lab.inspect().keys,before.keys);assert.equal(lab.inspect().metrics.rootCommits,1);
  await assert.rejects(b.begin(update(initial)),{code:"DUPLICATE_OPERATION"});
});
test("L05-05 armed receipt with old root is uncertain and cannot auto-abort or admit another operation",async()=>{
  const {lab,c,initial}=await seeded();await c.begin(update(initial));await c.stage("update");c.arm("update");
  const b=lab.connect();assert.equal((await b.recover()).status,"UNCERTAIN");
  assert.throws(()=>b.abortBeforeArm("update"),{code:"RECOVERY_BLOCKED"});
  await assert.rejects(b.begin(update(initial,"second")),{code:"PENDING_OPERATION"});
  assert.equal(lab.inspect().metrics.rootAttempts,1);
});
test("L05-06 lost acknowledgement recovers exact committed target without another root attempt",async()=>{
  const {lab,c,initial}=await seeded();await c.begin(update(initial));await c.stage("update");c.arm("update");
  await assert.rejects(c.publish("update",{loseAck:true}),{code:"ACK_LOST"});
  const b=lab.connect();assert.equal((await b.recover()).status,"COMMITTED");
  await assert.rejects(b.publish("update"),{code:"RECEIPT_STATE"});
  await b.confirm("update");assert.equal((await b.read()).workspace.revision,1);
  assert.equal(lab.inspect().metrics.rootAttempts,2);assert.equal(lab.inspect().metrics.rootCommits,2);
});
test("L05-07 missing staged shard prevents root publication and leaves receipt uncertain",async()=>{
  const lab=make(),c=lab.connect();await start(c);await c.stage("migration");c.arm("migration");
  lab.fault.remove(lab.inspect().keys.find(k=>k.startsWith("lc-v2-shard/")));
  await assert.rejects(c.publish("migration"),{code:"MISSING_SHARD"});
  assert.equal((await lab.connect().recover()).status,"UNCERTAIN");assert.equal(lab.inspect().root,null);
  await assert.rejects(c.publish("migration"),{code:"RECEIPT_STATE"});
});
test("L05-08 committed root with missing index never recovers as success or falls back",async()=>{
  const lab=make(),c=lab.connect();await start(c);await c.stage("migration");c.arm("migration");
  await assert.rejects(c.publish("migration",{loseAck:true}),{code:"ACK_LOST"});
  lab.fault.remove("index/"+lab.inspect().root.manifestSha256);
  const b=lab.connect();assert.equal((await b.recover()).status,"CORRUPT_TARGET");
  await assert.rejects(b.confirm("migration"),{code:"RECOVERY_BLOCKED"});
  await assert.rejects(b.read(),{code:"MISSING_INDEX"});
});
test("L05-09 legacy mutation even with reused token blocks publication",async()=>{
  const lab=make(),c=lab.connect();await start(c);await c.stage("migration");c.arm("migration");
  const legacy=lab.inspect().legacy;legacy.value.money[0].amount=777;lab.fault.legacy(legacy.value,legacy.etag);
  await assert.rejects(c.publish("migration"),{code:"LEGACY_DIVERGED"});
  assert.equal((await c.recover()).status,"LEGACY_DIVERGED");assert.equal(lab.inspect().metrics.rootCommits,0);
});
test("L05-10 missing exclusive fence blocks admission and later publication",async()=>{
  const a=make();a.fault.exclude();await assert.rejects(start(a.connect()),{code:"EXCLUSIVITY_UNVERIFIED"});
  const b=make(),c=b.connect();await start(c);await c.stage("migration");c.arm("migration");b.fault.exclude();
  await assert.rejects(c.publish("migration"),{code:"LEGACY_DIVERGED"});assert.equal(b.inspect().root,null);
});
test("L05-11 two simultaneous admissions cannot create two pending receipts",async()=>{
  const lab=make(),a=lab.connect(),b=lab.connect();
  const results=await Promise.allSettled([start(a,"one"),start(b,"two")]);
  assert.equal(results.filter(x=>x.status==="fulfilled").length,1);
  assert.equal(results.find(x=>x.status==="rejected").reason.code,"PENDING_OPERATION");
  assert.equal(lab.inspect().metrics.rootAttempts,0);
});
test("L05-12 stale root and duplicate operation are rejected before staging",async()=>{
  const {lab,c,initial}=await seeded();await c.begin(update(initial));await complete(c,"update");
  await assert.rejects(c.begin(update(initial,"another")),{code:"ROOT_CONFLICT"});
  await assert.rejects(c.begin(update(initial)),{code:"DUPLICATE_OPERATION"});
  assert.equal(lab.inspect().metrics.rootCommits,2);
});
test("L05-13 immutable staged collision refuses overwrite",async()=>{
  const lab=make(),c=lab.connect();await start(c);await c.stage("migration",{limit:1});
  const key=lab.inspect().keys[0];lab.fault.replace(key,{damaged:true});
  await assert.rejects(c.stage("migration"),{code:"IMMUTABLE_CONFLICT"});assert.equal(lab.inspect().root,null);
});
test("L05-14 concurrent publish attempts are admitted only once",async()=>{
  const lab=make(),c=lab.connect();await start(c);await c.stage("migration");c.arm("migration");
  const results=await Promise.allSettled([c.publish("migration"),lab.connect().publish("migration")]);
  assert.equal(results.filter(x=>x.status==="fulfilled").length,1);
  assert.equal(results.find(x=>x.status==="rejected").reason.code,"RECEIPT_STATE");
  assert.equal(lab.inspect().metrics.rootAttempts,1);assert.equal(lab.inspect().metrics.rootCommits,1);
});
