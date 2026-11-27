import test from "node:test";
import assert from "node:assert/strict";
import {createAnnaReadAdapter,normalizeAnnaPresentRead} from "../upgrade-v2/anna-storage-read.js";
import {LEGACY_KEY,WORKSPACE_KEY} from "../bundle/v2/workspace.js";
import {readKey} from "../bundle/v2/repository.js";

const present=()=>({exists:true,value:{version:1,tasks:[]},etag:"synthetic",generation:17});
const envelope=()=>({id:"synthetic-request",result:present(),error:null});
function fixture(reply=present()){
  const calls=[];
  const runtime={app:{id:908,slug:"life-control-anna"},appId:"908",versionId:"2720",storage:{
    async get(args){calls.push(args);return reply;},
    async set(){throw Error("FORBIDDEN");},async delete(){throw Error("FORBIDDEN");}
  }};
  return {runtime,calls};
}
test("observed wire envelope and SDK result are accepted and detached",()=>{
  for(const response of [present(),envelope()]){
    const r=normalizeAnnaPresentRead(response);
    assert.deepEqual(r,present());
    r.value.tasks.push("changed");
    assert.deepEqual((response.result??response).value.tasks,[]);
  }
});
test("ambiguous or contradictory replies fail closed",()=>{
  for(const response of [
    null,{value:null},{exists:false},{exists:false,value:null,etag:null,generation:null},
    {...present(),exists:false},{...present(),exists:"true"},{...present(),generation:"17"},
    {...present(),etag:""},{...present(),value:null},{...present(),ok:false},
    {...present(),status:403},{...present(),error:"failed"},
    {...envelope(),error:{code:"denied"}},{...envelope(),value:{}},
    {result:present(),error:null},{id:"x",result:present()},
    {...present(),value:{get bad(){throw Error("not invoked");}}}
  ]) assert.throws(()=>normalizeAnnaPresentRead(response));
});
test("wrong app, version or slug cannot call storage",()=>{
  for(const change of [
    {appId:"909"},{versionId:"0.0.0-draft"},{app:null},
    {app:{id:909}},{app:{id:908,slug:"other"}}
  ]){
    const {runtime,calls}=fixture();Object.assign(runtime,change);
    assert.throws(()=>createAnnaReadAdapter(runtime),{code:"IDENTITY_UNVERIFIED"});
    assert.equal(calls.length,0);
  }
});
test("only explicit v1 and v2 keys are available; no write surface",async()=>{
  const {runtime,calls}=fixture(envelope()),a=createAnnaReadAdapter(runtime);
  assert.deepEqual(Object.keys(a),["get"]);
  await assert.rejects(a.get({key:"other"}),{code:"KEY_NOT_ALLOWED"});
  await assert.rejects(a.get({key:LEGACY_KEY,scope:"other"}),{code:"KEY_NOT_ALLOWED"});
  assert.equal(calls.length,0);
  assert.deepEqual(await a.get({key:LEGACY_KEY}),present());
  await a.get({key:WORKSPACE_KEY});
  assert.deepEqual(calls,[{key:LEGACY_KEY},{key:WORKSPACE_KEY}]);
});
test("existing repository readKey consumes normalized present result",async()=>{
  const {runtime}=fixture(envelope());
  assert.deepEqual(await readKey(createAnnaReadAdapter(runtime),LEGACY_KEY),
    {exists:true,etag:"synthetic",value:{version:1,tasks:[]}});
});
test("SDK errors sanitized, no absence inference or retry",async()=>{
  const {runtime,calls}=fixture();
  runtime.storage.get=async args=>{calls.push(args);throw Object.assign(Error("private payload"),{code:"KEY_NOT_FOUND"});};
  const a=createAnnaReadAdapter(runtime);
  await assert.rejects(a.get({key:LEGACY_KEY}),{code:"SDK_READ_FAILED",message:"SDK_READ_FAILED"});
  await assert.rejects(a.get({key:LEGACY_KEY}),{code:"READ_LOCKED"});
  assert.equal(calls.length,1);
});
test("uncertain absence locks adapter without another read",async()=>{
  const {runtime,calls}=fixture({exists:false});
  const a=createAnnaReadAdapter(runtime);
  await assert.rejects(a.get({key:WORKSPACE_KEY}),{code:"ABSENCE_UNVERIFIED"});
  await assert.rejects(a.get({key:WORKSPACE_KEY}),{code:"READ_LOCKED"});
  assert.equal(calls.length,1);
});
test("concurrent reads rejected; identity rechecked after response",async()=>{
  const {runtime,calls}=fixture();
  let resolve;
  runtime.storage.get=args=>{calls.push(args);return new Promise(r=>{resolve=r;});};
  const a=createAnnaReadAdapter(runtime);
  const p=a.get({key:LEGACY_KEY});
  await assert.rejects(a.get({key:LEGACY_KEY}),{code:"READ_BUSY"});
  runtime.versionId="9999";resolve(present());
  await assert.rejects(p,{code:"IDENTITY_UNVERIFIED"});
  await assert.rejects(a.get({key:LEGACY_KEY}),{code:"READ_LOCKED"});
  assert.equal(calls.length,1);
});
