import {LEGACY_KEY,WORKSPACE_KEY,canonicalJSON,utf8Bytes} from "../bundle/v2/workspace.js";
import {validateDomain,prepareCommand} from "../bundle/v2/domain.js";
import {normalizeAnnaInspectionRead} from "./anna-migration-inspection.js";
import {prepareAnnaCasCandidate,inspectAnnaCasReceipt,confirmAnnaCasCandidate} from "./anna-cas-protocol.js";
const fail=code=>{throw Object.assign(new Error(code),{code});};
const copy=x=>JSON.parse(canonicalJSON(x));
const equal=(a,b)=>canonicalJSON(a)===canonicalJSON(b);
const allowed=new Set(["record.add","record.edit","task.add","task.edit","task.transition","learning.target","milestone.add","milestone.edit","milestone.transition","habit.add","habit.rename","habit.archive","habit.checkin","habit.checkin.edit"]);

/** Unwired candidate for existing persisted v2 only. A caller must provide
 * independently attested version identity and separate per-operation approval.
 * The observed SDK does NOT expose the required version fields. No fallback.
 * 6144 is an observed synthetic size, NOT a platform maximum or production grant.
 * No create, deletion, legacy mutation, AI, automatic retry or UI boot. */
export function createAnnaExistingEditor(runtime,{expectedVersionId,maxBytes,authorizeWrite}={}){
  if(typeof expectedVersionId!=="string"||! /^[1-9][0-9]*$/.test(expectedVersionId)||
    !Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>6144||typeof authorizeWrite!=="function")fail("CONFIG_UNVERIFIED");
  const wid=runtime?.windowUuid;
  let locked=false,busy=false,current=null,legacy=null;
  function identity(){
    if(typeof wid!=="string"||!wid.trim()||runtime?.windowUuid!==wid||
      runtime.app?.id!==908||runtime.app?.slug!=="life-control-anna"||
      String(runtime.appId)!=="908"||String(runtime.versionId)!==expectedVersionId||
      runtime.capabilities?.host_api_version!=="0.1.0"||
      typeof runtime.storage?.get!=="function"||typeof runtime.storage?.set!=="function")fail("IDENTITY_UNVERIFIED");
  }
  identity();
  async function invoke(method,args){
    identity();let timer,r;
    try{r=await Promise.race([runtime.storage[method](args,{timeoutMs:12000}),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("timeout")),12000);})]);}
    catch(e){fail(e?.code==="precondition_failed"?"CAS_CONFLICT":"SDK_OUTCOME_UNCONFIRMED");}
    finally{clearTimeout(timer);}
    identity();return r;
  }
  async function read(key){
    const r=normalizeAnnaInspectionRead(await invoke("get",{key}));
    if(!r.exists)fail(key===WORKSPACE_KEY?"V2_MISSING_NO_CREATE":"LEGACY_MISSING");
    return r;
  }
  function verifyPair(w,l){
    if(validateDomain(w.value)!==true||w.value.migration.legacyEtag!==l.etag)fail("LEGACY_DIVERGED");
  }
  function ready(){if(locked)fail("EDITOR_LOCKED");if(busy)fail("EDITOR_BUSY");}
  const expose=()=>({workspace:copy(current.value),generation:current.generation,versionAttestation:"REQUIRED",maxBytes});
  return Object.freeze({
    get locked(){return locked;},
    async load(){
      ready();if(current)fail("ALREADY_LOADED");busy=true;
      try{const w=await read(WORKSPACE_KEY),l=await read(LEGACY_KEY);verifyPair(w,l);
        current=w;legacy=l;return expose();}
      catch(e){locked=true;throw e;}finally{busy=false;}
    },
    async apply(command,{operationId,now,expectedRevision}={}){
      ready();if(!current)fail("NOT_LOADED");
      if(!allowed.has(command?.type))fail("COMMAND_FORBIDDEN");
      const change=prepareCommand(current.value,command,{operationId,now,expectedRevision});
      const p=prepareAnnaCasCandidate({current,next:change.next,operationId,labMaxBytes:maxBytes});
      const expectedBytes=utf8Bytes(change.next);
      const consent=Object.freeze({operationId,expectedRevision,nextRevision:change.next.revision,bytes:expectedBytes,key:WORKSPACE_KEY});
      // The callback is an app-level policy hook, not proof of server permission.
      if(authorizeWrite(consent)!==true)fail("WRITE_NOT_AUTHORIZED");
      busy=true;
      try{
        const w=await read(WORKSPACE_KEY),l=await read(LEGACY_KEY);
        if(!equal(w,current)||!equal(l,legacy))fail("BASELINE_CHANGED");
        verifyPair(w,l);
        if(authorizeWrite(consent)!==true)fail("WRITE_NOT_AUTHORIZED");
        const receipt=inspectAnnaCasReceipt(await invoke("set",p.request),p.evidence);
        if(receipt.size_bytes!==expectedBytes)fail("SIZE_UNCONFIRMED");
        const back=await read(WORKSPACE_KEY);
        const confirmed=confirmAnnaCasCandidate(p.evidence,receipt,back);
        const after=await read(LEGACY_KEY);
        if(!equal(after,legacy))fail("LEGACY_CHANGED_AFTER_WRITE");
        current={exists:true,value:confirmed.workspace,etag:confirmed.etag,generation:confirmed.generation};
        return expose();
      }catch(e){locked=true;throw e;}finally{busy=false;}
    }
  });
}
