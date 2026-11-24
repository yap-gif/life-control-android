import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {inspectReadiness} from "../qa/v2-release-status.mjs";
const ledger=()=>JSON.parse(readFileSync(new URL("../docs/v0.2.0/release-readiness-v2.json",import.meta.url),"utf8"));
const readFrozen=path=>readFileSync(new URL("../"+path,import.meta.url));
const script=fileURLToPath(new URL("../qa/v2-release-status.mjs",import.meta.url));
test("P07 status confirms frozen bytes and retains every blocked production gate",()=>{
  const r=inspectReadiness(ledger(),readFrozen);assert.equal(r.integrity,"PASS");assert.equal(r.release,"BLOCKED");assert.equal(r.blockedGates.length,10);assert.deepEqual(r.errors,[]);
});
test("P07 missing or falsely promoted gates cannot satisfy integrity",()=>{
  for(const modify of [x=>x.hardGates.pop(),x=>x.hardGates[0].status="PASS",x=>x.hardGates[1]=x.hardGates[0],x=>x.productionRelease="PASS",x=>x.browserQA.artifactId=0,x=>x.protectedApp.id=999]){
    const x=ledger();modify(x);const r=inspectReadiness(x,readFrozen);assert.equal(r.integrity,"FAIL");assert.equal(r.release,"BLOCKED");
  }
});
test("P07 changed protected file is detected",()=>{
  const r=inspectReadiness(ledger(),p=>p==="app.json"?Buffer.from("{}"):readFrozen(p));assert.equal(r.integrity,"FAIL");assert.match(r.errors.join(" "),/Protected source changed: app.json/);
});
test("P07 status succeeds but release command exits nonzero; unknown flags rejected",()=>{
  const status=spawnSync(process.execPath,[script,"--status"],{encoding:"utf8"});assert.equal(status.status,0);assert.equal(JSON.parse(status.stdout).release,"BLOCKED");
  const release=spawnSync(process.execPath,[script,"--release"],{encoding:"utf8"});assert.equal(release.status,2);assert.equal(JSON.parse(release.stdout).release,"BLOCKED");
  assert.equal(spawnSync(process.execPath,[script,"--force"],{encoding:"utf8"}).status,1);
});

function crlf(bytes){return Buffer.from(bytes.toString("latin1").replace(/\r?\n/g,"\r\n"),"latin1");}
test("P07 Windows CRLF checkout of all protected text files matches pinned Git blobs",()=>{
  const r=inspectReadiness(ledger(),p=>crlf(readFrozen(p)));
  assert.equal(r.integrity,"PASS");assert.equal(r.release,"BLOCKED");assert.equal(r.blockedGates.length,10);
});
test("P07 CRLF tolerance does not permit content changes, BOM or mixed line endings",()=>{
  const original=crlf(readFrozen("app.json"));
  for(const bytes of [
    Buffer.concat([original,Buffer.from(" ")]),
    Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),original]),
    Buffer.from(original.toString("latin1").replace("\r\n","\n"),"latin1"),
    Buffer.from(original.toString("latin1").replace("Life Control","Changed"),"latin1")
  ]){
    const r=inspectReadiness(ledger(),p=>p==="app.json"?bytes:crlf(readFrozen(p)));
    assert.equal(r.integrity,"FAIL");assert.equal(r.release,"BLOCKED");assert.match(r.errors.join(" "),/Protected source changed: app.json/);
  }
});
