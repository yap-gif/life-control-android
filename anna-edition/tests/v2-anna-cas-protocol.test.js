import test from "node:test";
import assert from "node:assert/strict";
import {emptyWorkspace,WORKSPACE_KEY,canonicalJSON,utf8Bytes} from "../bundle/v2/workspace.js";
import {prepareAnnaCasCandidate,inspectAnnaCasReceipt,confirmAnnaCasCandidate} from "../upgrade-v2/anna-cas-protocol.js";
const fixture=()=>{
  const previous=emptyWorkspace({timezone:"Asia/Kuching",migrationId:"cas-lab"});
  const next=structuredClone(previous);next.revision++;next.lastOperationId="lab-op";
  return {current:{exists:true,value:previous,etag:"old",generation:17},next,operationId:"lab-op",labMaxBytes:65536};
};
const receipt=()=>({etag:"new",generation:18,size_bytes:1234});
const back=f=>({exists:true,value:f.next,etag:"new",generation:18});
test("CAS protocol targets only existing v2 key and binds exact ETag and payload",()=>{
  const f=fixture(),p=prepareAnnaCasCandidate(f);
  assert.deepEqual(p.request,{key:WORKSPACE_KEY,value:f.next,if_match:"old"});
  p.request.value.lastOperationId="tampered";
  assert.equal(p.evidence.expectedJSON,canonicalJSON(f.next));
  assert.ok(Object.isFrozen(p.evidence));
});
test("CAS preparation rejects absence and ambiguous existing read",()=>{
  for(const current of [{exists:false},{value:null},{...fixture().current,etag:""}])
    assert.throws(()=>prepareAnnaCasCandidate({...fixture(),current}));
});
test("CAS rejects invalid transition and changed migration metadata",()=>{
  for(const change of [{revision:2},{lastOperationId:"different"},{migration:{}}]){
    const f=fixture();Object.assign(f.next,change);
    assert.throws(()=>prepareAnnaCasCandidate(f));
  }
});
test("CAS lab byte ceiling is explicit and rejects oversize without truncation",()=>{
  const f=fixture(),n=utf8Bytes(f.next);
  assert.throws(()=>prepareAnnaCasCandidate({...f,labMaxBytes:n-1}),{code:"LAB_CAPACITY"});
  assert.throws(()=>prepareAnnaCasCandidate({...f,labMaxBytes:undefined}),{code:"LAB_CAPACITY"});
  assert.doesNotThrow(()=>prepareAnnaCasCandidate({...f,labMaxBytes:n}));
});
test("APS receipt requires documented shape and advancing tokens, not generic OK",()=>{
  const p=prepareAnnaCasCandidate(fixture());
  for(const r of [{ok:true},{...receipt(),etag:"old"},{...receipt(),generation:17},
    {...receipt(),size_bytes:0},{...receipt(),generation:"18"},{...receipt(),error:"denied"},null])
    assert.throws(()=>inspectAnnaCasReceipt(r,p.evidence),{code:"WRITE_UNCONFIRMED"});
  assert.deepEqual(inspectAnnaCasReceipt(receipt(),p.evidence),receipt());
});
test("CAS exact readback matches receipt and detached candidate",()=>{
  const f=fixture(),p=prepareAnnaCasCandidate(f),r=confirmAnnaCasCandidate(p.evidence,receipt(),back(f));
  assert.deepEqual(r,{workspace:f.next,etag:"new",generation:18});
  r.workspace.lastOperationId="changed";assert.equal(f.next.lastOperationId,"lab-op");
});
test("CAS false acknowledgment, stale token or generation fails readback",()=>{
  const f=fixture(),p=prepareAnnaCasCandidate(f);
  for(const r of [{...back(f),value:f.current.value},{...back(f),etag:"other"},
    {...back(f),generation:19}])
    assert.throws(()=>confirmAnnaCasCandidate(p.evidence,receipt(),r),{code:"READBACK_MISMATCH"});
});
test("CAS response mismatch and absent readback never become success",()=>{
  const f=fixture(),p=prepareAnnaCasCandidate(f);
  assert.throws(()=>confirmAnnaCasCandidate(p.evidence,{ok:true},back(f)),{code:"WRITE_UNCONFIRMED"});
  assert.throws(()=>confirmAnnaCasCandidate(p.evidence,receipt(),{exists:false}),{code:"ABSENCE_UNVERIFIED"});
});
