// L05 closed simulator. No injected host, SDK, network, filesystem or credentials.
// Map state models durable host records across simulated client restarts only.
// Atomic receipt admission, root CAS and legacy exclusion are assumptions, not APS guarantees.
import {canonicalJSON,utf8Bytes,migrateLegacy} from "../../bundle/v2/workspace.js";
import {planShards,assembleShards} from "./shard-plan.mjs";
const copy=v=>JSON.parse(canonicalJSON(v));
const exact=(a,b)=>canonicalJSON(a)===canonicalJSON(b);
function check(ok,code){if(!ok)throw Object.assign(new Error(code),{code});}
const manifestKey=d=>"index/"+d;
export function createRecoveryLab({legacy,legacyEtag,maxValueBytes}){
  check(typeof legacyEtag==="string"&&legacyEtag.trim(),"INVALID_LEGACY_TOKEN");
  check(Number.isSafeInteger(maxValueBytes)&&maxValueBytes>0,"INVALID_BUDGET");
  const originalSource={value:copy(legacy),etag:legacyEtag};
  let source=copy(originalSource),root=null,receipt=null,sequence=0,exclusive=true,beginning=false;
  const objects=new Map(),used=new Set();
  const metrics={objectCreates:0,rootAttempts:0,rootCommits:0,deletes:0};
  const limits={maxValueBytes};
  function requireSource(r){
    check(exclusive&&source.etag===r.source.etag&&exact(source.value,r.source.value),"LEGACY_DIVERGED");
  }
  function immutablePut(key,value){
    check(utf8Bytes(value)<=maxValueBytes,"CAPACITY");
    if(objects.has(key)){check(exact(objects.get(key),value),"IMMUTABLE_CONFLICT");return;}
    objects.set(key,copy(value));metrics.objectCreates++;
  }
  async function load(pointer){
    check(pointer!==null,"NO_ROOT");
    const manifest=objects.get(manifestKey(pointer.manifestSha256));
    check(manifest,"MISSING_INDEX");
    const shards=manifest.refs.map(r=>{check(objects.has(r.key),"MISSING_SHARD");return {key:r.key,value:objects.get(r.key)};});
    const w=await assembleShards({manifest,manifestSha256:pointer.manifestSha256,shards},{...limits,expectedManifestSha256:pointer.manifestSha256});
    check(w.revision===pointer.revision,"ROOT_REVISION_MISMATCH");
    return w;
  }
  function pending(operationId,stage){
    check(receipt&&receipt.operationId===operationId&&receipt.stage===stage,"RECEIPT_STATE");
    return receipt;
  }
  async function begin({operationId,workspace=null,expectedRoot=null,timezone,migrationId}){
    check(typeof operationId==="string"&&/^[a-zA-Z0-9-]{1,64}$/.test(operationId),"INVALID_OPERATION");
    check(!beginning&&(!receipt||receipt.stage==="CONFIRMED"||receipt.stage==="ABORTED"),"PENDING_OPERATION");
    check(!used.has(operationId),"DUPLICATE_OPERATION");
    check(exclusive,"EXCLUSIVITY_UNVERIFIED");
    check(exact(source,originalSource),"LEGACY_DIVERGED");
    beginning=true;
    try{
      const base=copy(root),src=copy(source),candidate=workspace===null?null:copy(workspace);
      check(exact(expectedRoot,base),"ROOT_CONFLICT");
      let next;
      if(base===null){
        check(candidate===null,"MIGRATION_ONLY");
        next=migrateLegacy(src.value,{timezone,migrationId,legacyEtag:src.etag});
      }else{
        const previous=await load(base);
        check(candidate!==null&&candidate.revision===previous.revision+1&&candidate.lastOperationId===operationId&&exact(candidate.migration,previous.migration),"INVALID_UPDATE");
        check(previous.migration.legacyEtag===src.etag,"LEGACY_DIVERGED");
        next=candidate;
      }
      const plan=await planShards(next,limits);
      check(exclusive&&exact(source,src)&&exact(root,base),"BASELINE_CHANGED");
      const target={revision:next.revision,manifestSha256:plan.manifestSha256,operationId,generation:sequence+1};
      check(utf8Bytes(target)<=maxValueBytes,"CAPACITY");
      // Receipt is modeled as a separate trusted journal, not a KV value.
      receipt={operationId,stage:"STAGING",base,target,source:src,plan};
      used.add(operationId);
      return copy({operationId,target,stage:receipt.stage});
    }finally{beginning=false;}
  }
  async function stage(operationId,{limit=Number.MAX_SAFE_INTEGER}={}){
    const r=pending(operationId,"STAGING");
    check(Number.isSafeInteger(limit)&&limit>=0,"INVALID_LIMIT");
    requireSource(r);
    const entries=[...r.plan.shards,{key:manifestKey(r.target.manifestSha256),value:r.plan.manifest}];
    for(const entry of entries.slice(0,limit))immutablePut(entry.key,entry.value);
    if(limit<entries.length)return {stage:"STAGING",complete:false};
    const w=await load(r.target);
    check(exact(root,r.base)&&receipt===r&&r.stage==="STAGING","ROOT_CONFLICT");requireSource(r);
    check(exact(w,await assembleShards(r.plan,{...limits,expectedManifestSha256:r.target.manifestSha256})),"READBACK_MISMATCH");
    check(receipt===r&&r.stage==="STAGING"&&exact(root,r.base),"ROOT_CONFLICT");requireSource(r);
    r.stage="READY";return {stage:r.stage,complete:true};
  }
  function arm(operationId){
    const r=pending(operationId,"READY");requireSource(r);check(exact(root,r.base),"ROOT_CONFLICT");
    r.stage="ARMED"; // persist intent before a root attempt can occur
  }
  async function publish(operationId,{loseAck=false}={}){
    const r=pending(operationId,"ARMED");
    // Mark once before asynchronous verification; no second attempt from a new client.
    r.stage="ATTEMPTED";metrics.rootAttempts++;
    await load(r.target);
    requireSource(r);
    check(exact(root,r.base),"ROOT_CONFLICT");
    // Atomic in this simulator only, including the source fence above.
    root=copy(r.target);sequence=root.generation;metrics.rootCommits++;
    if(loseAck)throw Object.assign(new Error("ACK_LOST"),{code:"ACK_LOST"});
    return recover();
  }
  async function read(){
    const observed=copy(root);
    if(observed===null)return {status:"NO_ROOT",root:null};
    const w=await load(observed);
    check(exact(root,observed),"ROOT_CHANGED");
    check(exclusive&&exact(source,originalSource)&&source.etag===w.migration.legacyEtag,"LEGACY_DIVERGED");
    return {status:"COMPLETE",root:observed,workspace:w};
  }
  async function recover(){
    // Read-only classification. Never publishes, retries, deletes or clears a receipt.
    const r=receipt,observed=copy(root);
    if(!r)return {status:"NO_RECEIPT"};
    if(!exclusive||!exact(source,r.source))return {status:"LEGACY_DIVERGED"};
    if(r.stage==="ABORTED")return {status:"ABORTED"};
    if(exact(observed,r.target)){
      try{await load(observed);}catch{return {status:"CORRUPT_TARGET"};}
      if(receipt!==r||!exact(root,observed)||!exclusive||!exact(source,r.source))return {status:"OBSERVATION_CHANGED"};
      return {status:"COMMITTED",operationId:r.operationId,root:observed};
    }
    if(!exact(observed,r.base))return {status:"ROOT_CONFLICT"};
    if(r.stage==="STAGING"||r.stage==="READY")return {status:"NOT_PUBLISHED",operationId:r.operationId};
    return {status:"UNCERTAIN",operationId:r.operationId};
  }
  async function confirm(operationId){
    const r=receipt;check(r&&r.operationId===operationId&&r.stage==="ATTEMPTED","RECEIPT_STATE");
    const evidence=await recover();
    check(evidence.status==="COMMITTED"&&receipt===r&&r.stage==="ATTEMPTED"&&exact(root,r.target),"RECOVERY_BLOCKED");
    requireSource(r);r.stage="CONFIRMED";return copy(evidence);
  }
  function abortBeforeArm(operationId){
    const r=receipt;
    check(r&&r.operationId===operationId&&["STAGING","READY"].includes(r.stage),"RECOVERY_BLOCKED");
    check(exact(root,r.base),"ROOT_CONFLICT");r.stage="ABORTED";
    // Retain staged immutable objects; no garbage collection or legacy deletion.
  }
  function connect(){return {begin,stage,arm,publish,read,recover,confirm,abortBeforeArm};}
  // Fault injection only; not available from simulated client.
  return {connect,inspect:()=>copy({root,receipt:receipt?{operationId:receipt.operationId,stage:receipt.stage,target:receipt.target}:null,metrics,legacy:source,keys:[...objects.keys()]}),
    fault:{legacy(value,etag){source={value:copy(value),etag};},exclude(){exclusive=false;},remove(key){objects.delete(key);},replace(key,value){objects.set(key,copy(value));}}};
}
