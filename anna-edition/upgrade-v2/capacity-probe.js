import {canonicalJSON,utf8Bytes} from "../bundle/v2/workspace.js";
import {normalizeAnnaInspectionRead} from "./anna-migration-inspection.js";
export const PROBE_BYTES=65536, PROBE_TTL=600;
const fail=code=>{throw Object.assign(Error(code),{code});};
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
export function syntheticPayload(sequence){
  if(![1,2].includes(sequence))fail("INVALID_SEQUENCE");
  const value={kind:"synthetic-capacity-qa",sequence,payload:""};
  const n=PROBE_BYTES-utf8Bytes(value);
  value.payload=hex(globalThis.crypto.getRandomValues(new Uint8Array(Math.ceil(n/2)))).slice(0,n);
  if(utf8Bytes(value)!==PROBE_BYTES)fail("SIZE_MISMATCH");
  return value;
}
/** QA only: random isolated key; no business key reads or writes.
 * No server create-only guarantee. TTL requested, expiry not verified.
 * One run per instance; no automatic retry; no deletes. */
export function createCapacityProbe(runtime,{authorize}={}){
  const wid=runtime?.windowUuid;
  let state="NEW",reads=0,attempts=0,confirmed=0,step="NOT_STARTED";
  function guard(){
    if(typeof wid!=="string"||!wid.trim()||runtime?.windowUuid!==wid||runtime.app?.id!==908||
      runtime.app?.slug!=="life-control-anna"||runtime.capabilities?.host_api_version!=="0.1.0"||
      runtime.appId!==undefined||runtime.versionId!==undefined||typeof runtime.storage?.get!=="function"||
      typeof runtime.storage?.set!=="function")fail("IDENTITY_UNVERIFIED");
    if(typeof authorize!=="function"||authorize()!==true)fail("NOT_AUTHORIZED");
  }
  const status=()=>({state,step,reads,writeAttempts:attempts,confirmedWrites:confirmed,probeBytes:PROBE_BYTES,
    ttlSecondsRequested:PROBE_TTL,ttlExpiryVerified:false,businessKeyReads:0,businessKeyWrites:0,aiCalls:0,deletes:0,
    versionAttestation:"UNVERIFIED",productionRelease:"BLOCKED",automaticRetry:false});
  async function invoke(method,args){
    guard();let timer;
    try{return await Promise.race([runtime.storage[method](args,{timeoutMs:12000}),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("timeout")),12000);})]);}
    catch{fail(method==="set"?"WRITE_OUTCOME_UNCONFIRMED":"READ_UNCONFIRMED");}
    finally{clearTimeout(timer);}
  }
  return Object.freeze({status,async run(){
    if(state!=="NEW")fail("PROBE_ALREADY_USED");state="RUNNING";
    try{
      guard();const key="life-control-anna:qa-capacity-"+globalThis.crypto.randomUUID();
      const first=syntheticPayload(1),second=syntheticPayload(2);
      async function read(){guard();if(reads>=3)fail("READ_LIMIT");reads++;const r=normalizeAnnaInspectionRead(await invoke("get",{key}));guard();return r;}
      async function write(value,prior){guard();if(attempts>=2)fail("WRITE_LIMIT");
        const args={key,value:JSON.parse(canonicalJSON(value)),ttl_seconds:PROBE_TTL,...(prior?{if_match:prior.etag}:{})};
        attempts++;const r=await invoke("set",args);guard();
        if(!r||Object.keys(r).length!==3||typeof r.etag!=="string"||!r.etag.trim()||
          r.generation!==(prior?prior.generation+1:1)||r.size_bytes!==PROBE_BYTES||
          (prior&&r.etag===prior.etag))fail("RECEIPT_UNCONFIRMED");return r;
      }
      function verify(back,receipt,value){if(!back.exists||back.etag!==receipt.etag||back.generation!==receipt.generation||canonicalJSON(back.value)!==canonicalJSON(value))fail("READBACK_MISMATCH");confirmed++;}
      step="ABSENCE";if((await read()).exists)fail("QA_KEY_EXISTS");
      step="CREATE";const a=await write(first,null);
      step="CREATE_READBACK";const back=await read();verify(back,a,first);
      step="CAS_UPDATE";const b=await write(second,back);
      step="UPDATE_READBACK";verify(await read(),b,second);
      step="DONE";state="CONFIRMED";return status();
    }catch{state=attempts>confirmed?"UNCERTAIN":"STOPPED";return status();}
  }});
}
