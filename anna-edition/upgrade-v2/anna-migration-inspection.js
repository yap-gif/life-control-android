import {LEGACY_KEY,WORKSPACE_KEY,canonicalJSON,utf8Bytes,migrateLegacy} from "../bundle/v2/workspace.js";
import {validateDomain} from "../bundle/v2/domain.js";
import {normalizeAnnaPresentRead} from "./anna-storage-read.js";

const fail=code=>{throw Object.assign(new Error(code),{code});};
const own=(o,k)=>Object.hasOwn(o,k);
const plain=o=>o!==null&&typeof o==="object"&&!Array.isArray(o)&&
  (Object.getPrototypeOf(o)===Object.prototype||Object.getPrototypeOf(o)===null)&&
  Reflect.ownKeys(o).every(k=>typeof k==="string"&&Object.hasOwn(Object.getOwnPropertyDescriptor(o,k),"value"));
const copy=x=>JSON.parse(canonicalJSON(x));
const equal=(a,b)=>canonicalJSON(a)===canonicalJSON(b);
const statusOK=r=>(!own(r,"ok")||r.ok===true)&&(!own(r,"error")||r.error===null)&&
  (!own(r,"code")||r.code===null)&&["status","statusCode"].every(k=>
  !own(r,k)||r[k]===null||(Number.isInteger(r[k])&&r[k]>=200&&r[k]<300));

// The observed SDK read result is unwrapped. Explicit absence was observed
// for v2 and a QA key; it is not evidence of create-only permission.
export function normalizeAnnaInspectionRead(r){
  if(!plain(r)||!statusOK(r)||own(r,"result"))fail("READ_UNCONFIRMED");
  if(own(r,"exists")&&r.exists===false){
    if(!own(r,"value")||r.value!==null||
      ["etag","generation"].some(k=>own(r,k)&&r[k]!==null))fail("ABSENCE_UNCONFIRMED");
    return {exists:false,value:null,etag:null,generation:null};
  }
  return normalizeAnnaPresentRead(r);
}

/** Single-use, read-only migration inspection for an already connected SDK.
 * No activation at app boot; no persistence, AI, create, or permission grant.
 * A second observation detects observed changes, not an exclusive fence.
 */
export function createAnnaMigrationInspector(runtime){
  const wid=runtime?.windowUuid;
  let used=false;
  function identity(){
    if(typeof wid!=="string"||!wid.trim()||runtime?.windowUuid!==wid||
      runtime.app?.id!==908||runtime.app.slug!=="life-control-anna"||
      runtime.capabilities?.host_api_version!=="0.1.0"||
      typeof runtime.storage?.get!=="function")fail("IDENTITY_UNVERIFIED");
  }
  identity();
  async function read(key){
    identity();
    let timer,r;
    try{
      r=await Promise.race([runtime.storage.get({key},{timeoutMs:12000}),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("timeout")),12000);})]);
    }catch{fail("SDK_READ_UNCONFIRMED");}finally{clearTimeout(timer);}
    identity();
    return normalizeAnnaInspectionRead(r);
  }
  return Object.freeze({
    async inspect({timezone,migrationId}){
      if(used)fail("INSPECTION_ALREADY_USED");
      used=true;
      const v2=await read(WORKSPACE_KEY);
      if(v2.exists)fail("V2_EXISTS_RECONCILE");
      const v1=await read(LEGACY_KEY);
      if(!v1.exists)fail("LEGACY_MISSING");
      let candidate;
      try{
        candidate=migrateLegacy(v1.value,{timezone,migrationId,legacyEtag:v1.etag});
        if(validateDomain(candidate)!==true)fail("DOMAIN_INVALID");
      }catch{fail("MIGRATION_INVALID");}
      const again=await read(LEGACY_KEY);
      if(!equal(v1,again))fail("LEGACY_CHANGED");
      const current=await read(WORKSPACE_KEY);
      if(!equal(v2,current))fail("V2_CHANGED");
      return {status:"candidate-only",workspace:copy(candidate),
        candidateBytes:utf8Bytes(candidate),legacyGeneration:v1.generation,
        observedSyntheticBytes:6144,withinObservedSyntheticSize:utf8Bytes(candidate)<=6144,
        versionAttestation:"UNVERIFIED",exclusiveFence:false,writeAuthorized:false};
    }
  });
}
