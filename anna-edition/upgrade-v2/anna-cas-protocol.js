import {WORKSPACE_KEY,canonicalJSON,utf8Bytes} from "../bundle/v2/workspace.js";
import {validateDomain} from "../bundle/v2/domain.js";
import {normalizeAnnaPresentRead} from "./anna-storage-read.js";

// Pure candidate protocol: no runtime, SDK, network or write function.
// The caller supplies a LAB byte ceiling, never a measured APS capacity.
const fail=code=>{throw Object.assign(new Error(code),{code});};
const clone=x=>JSON.parse(canonicalJSON(x));
const equal=(a,b)=>canonicalJSON(a)===canonicalJSON(b);
const etag=x=>typeof x==="string"&&x.trim().length>0;
const integer=x=>Number.isSafeInteger(x)&&x>=0;
function snapshot(x){
  let w;
  try{w=clone(x);if(validateDomain(w)!==true)fail("DOMAIN_INVALID");}
  catch{fail("DOMAIN_INVALID");}
  return w;
}
export function prepareAnnaCasCandidate({current,next,operationId,labMaxBytes}){
  const read=normalizeAnnaPresentRead(current);
  const previous=snapshot(read.value),value=snapshot(next);
  if(typeof operationId!=="string"||!operationId.trim()||
     previous.lastOperationId===operationId||value.lastOperationId!==operationId||
     value.revision!==previous.revision+1||!equal(value.migration,previous.migration))
    fail("INVALID_TRANSITION");
  if(!Number.isSafeInteger(labMaxBytes)||labMaxBytes<1||utf8Bytes(value)>labMaxBytes)
    fail("LAB_CAPACITY");
  // Immutable serialized evidence prevents a transport from redefining the
  // intended candidate. Never permits create or legacy-key mutation.
  const evidence=Object.freeze({
    previousEtag:read.etag,previousGeneration:read.generation,
    expectedJSON:canonicalJSON(value),operationId
  });
  return {request:{key:WORKSPACE_KEY,value:clone(value),if_match:read.etag},evidence};
}
export function inspectAnnaCasReceipt(reply,evidence){
  let r;
  try{r=clone(reply);}catch{fail("WRITE_UNCONFIRMED");}
  if(!r||typeof r!=="object"||Array.isArray(r)||
     Object.keys(r).some(k=>!["etag","generation","size_bytes"].includes(k))||
     !etag(r.etag)||!integer(r.generation)||!integer(r.size_bytes)||
     r.size_bytes===0||r.etag===evidence.previousEtag||
     r.generation<=evidence.previousGeneration)
    fail("WRITE_UNCONFIRMED");
  // Receipt is not proof of durable success; exact readback is required.
  return Object.freeze({etag:r.etag,generation:r.generation,size_bytes:r.size_bytes});
}
export function confirmAnnaCasCandidate(evidence,receipt,readback){
  const r=inspectAnnaCasReceipt(receipt,evidence);
  const back=normalizeAnnaPresentRead(readback);
  if(back.etag!==r.etag||back.generation!==r.generation||
     canonicalJSON(snapshot(back.value))!==evidence.expectedJSON)
    fail("READBACK_MISMATCH");
  return {workspace:clone(back.value),etag:back.etag,generation:back.generation};
}
