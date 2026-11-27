import {LEGACY_KEY,WORKSPACE_KEY,canonicalJSON,utf8Bytes,migrateLegacy} from "../bundle/v2/workspace.js";
import {validateDomain} from "../bundle/v2/domain.js";
import {normalizeAnnaInspectionRead} from "./anna-migration-inspection.js";
import {normalizeAnnaPresentRead} from "./anna-storage-read.js";

const fail=code=>{throw Object.assign(new Error(code),{code});};
const clone=x=>JSON.parse(canonicalJSON(x));
const equal=(a,b)=>canonicalJSON(a)===canonicalJSON(b);
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
async function digest(value){
  if(typeof globalThis.crypto?.subtle?.digest!=="function")fail("HASH_UNAVAILABLE");
  const bytes=new TextEncoder().encode(canonicalJSON(value));
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),n=>n.toString(16).padStart(2,"0")).join("");
}
// Offline input must be an independently verified, decrypted backup response.
// Only normalized value, ETag and generation contribute to the fingerprint.
export async function fingerprintLegacyBackup(reply){
  const r=normalizeAnnaPresentRead(reply);
  return Object.freeze({generation:r.generation,sha256:await digest(r)});
}
export const OWNER_PILOT_LIMIT=6144;
export const OWNER_PILOT_RISK="NO_SERVER_CREATE_ONLY_OR_EXCLUSIVE_FENCE";
const validId=x=>typeof x==="string"&&/^app908-owner-[a-f0-9]{32}$/.test(x);
const conditionNames=["otherClientsClosed","backupVerifiedLocally","versionUiChecked","noOtherWriterKnown","residualRaceAccepted","noAutomaticRetry"];
function checkConditions(fn){
  const v=fn();
  if(!v||conditionNames.some(k=>v[k]!==true))fail("OWNER_PRECONDITIONS_UNCONFIRMED");
}
function receipt(raw,bytes){
  let r;try{r=clone(raw);}catch{fail("INITIAL_WRITE_UNCONFIRMED");}
  if(!r||Object.keys(r).length!==3||typeof r.etag!=="string"||!r.etag.trim()||
    r.generation!==1||r.size_bytes!==bytes)fail("INITIAL_WRITE_UNCONFIRMED");
  return r;
}
/** Unwired private pilot candidate, never a production capability.
 * The hooks below are local owner-policy assertions, not server attestations.
 * One attempt per instance, not across reloads/processes. External durable
 * attempt control and separately scoped live authorization are prerequisites.
 * No automatic boot, connect, legacy writes, deletion, TTL or AI. */
export function createOwnerMigrationPilot(runtime,{backupProof,migrationId,checkOwnerConditions,authorizeCommit}={}){
  if(!hex(backupProof?.sha256)||!Number.isSafeInteger(backupProof?.generation)||backupProof.generation<1||
    !validId(migrationId)||typeof checkOwnerConditions!=="function"||typeof authorizeCommit!=="function")fail("PILOT_CONFIG_INVALID");
  const proof=Object.freeze({generation:backupProof.generation,sha256:backupProof.sha256});
  const wid=runtime?.windowUuid;
  let state="NEW",source=null,candidate=null,plan=null,reads=0,writeAttempts=0;
  function identity(){
    if(typeof wid!=="string"||!wid.trim()||runtime?.windowUuid!==wid||
      runtime.app?.id!==908||runtime.app?.slug!=="life-control-anna"||
      runtime.capabilities?.host_api_version!=="0.1.0"||
      runtime.appId!==undefined||runtime.versionId!==undefined||
      typeof runtime.storage?.get!=="function"||typeof runtime.storage?.set!=="function")fail("PILOT_IDENTITY_UNVERIFIED");
  }
  identity();
  function guard(){identity();checkConditions(checkOwnerConditions);}
  async function invoke(method,args){
    identity();let timer,r;
    try{r=await Promise.race([runtime.storage[method](args,{timeoutMs:12000}),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("timeout")),12000);})]);}
    catch{fail(method==="set"?"WRITE_OUTCOME_UNCERTAIN":"READ_UNCONFIRMED");}
    finally{clearTimeout(timer);}
    identity();return r;
  }
  async function read(key){
    if(reads>=6||![LEGACY_KEY,WORKSPACE_KEY].includes(key))fail("READ_LIMIT");
    reads++;return normalizeAnnaInspectionRead(await invoke("get",{key}));
  }
  function absent(r){if(r.exists!==false)fail("V2_EXISTS_STOP");}
  async function matchBackup(r){
    if(!r.exists||r.generation!==proof.generation||await digest(r)!==proof.sha256)fail("LEGACY_BACKUP_MISMATCH");
  }
  function releasePrivate(){source=null;candidate=null;plan=null;}
  function status(){return Object.freeze({state,reads,writeAttempts,appId:908,legacyWrites:0,aiCalls:0,deletes:0,
    versionAttestation:"UNVERIFIED",exclusiveFence:false,atomicCreate:false,productionRelease:"BLOCKED"});}
  return Object.freeze({
    status,
    async prepare(){
      if(state!=="NEW")fail("PILOT_NOT_NEW");state="PREPARING";
      try{
        guard();absent(await read(WORKSPACE_KEY));source=await read(LEGACY_KEY);await matchBackup(source);
        candidate=migrateLegacy(source.value,{legacyEtag:source.etag,timezone:"Asia/Kuching",migrationId});
        if(validateDomain(candidate)!==true||candidate.revision!==0||candidate.lastOperationId!==null)fail("INVALID_CANDIDATE");
        const bytes=utf8Bytes(candidate);if(bytes>OWNER_PILOT_LIMIT)fail("PILOT_CAPACITY");
        const counts=Object.freeze(Object.fromEntries(Object.entries(candidate.collections).map(([k,v])=>[k,v.length])));
        plan=Object.freeze({appId:908,key:WORKSPACE_KEY,migrationId,generation:source.generation,bytes,counts,
          candidateSha256:await digest(candidate),backupSha256:proof.sha256,risk:OWNER_PILOT_RISK,
          versionAttestation:"UNVERIFIED",maxReads:6,maxWriteAttempts:1});
        guard();state="PREPARED";return plan;
      }catch(e){state="STOPPED";releasePrivate();throw e;}
    },
    async commit(approval){
      if(state!=="PREPARED")fail("PILOT_NOT_PREPARED");state="RECHECKING";
      try{
        guard();
        if(!approval||approval.candidateSha256!==plan.candidateSha256||approval.backupSha256!==plan.backupSha256||
          approval.migrationId!==plan.migrationId||approval.risk!==OWNER_PILOT_RISK||authorizeCommit(plan)!==true)fail("WRITE_NOT_AUTHORIZED");
        const fresh=await read(LEGACY_KEY);await matchBackup(fresh);
        if(!equal(source,fresh))fail("LEGACY_CHANGED");
        absent(await read(WORKSPACE_KEY));
        guard();if(authorizeCommit(plan)!==true)fail("WRITE_NOT_AUTHORIZED");
        // Residual race: another writer can create after the last absence read.
        // Unconditional upsert is intentional for this owner-only candidate.
        // Never pass it off as atomic create, and never add a retry.
        state="ATTEMPTED";writeAttempts++;
        const ack=receipt(await invoke("set",{key:WORKSPACE_KEY,value:clone(candidate)}),plan.bytes);
        const back=await read(WORKSPACE_KEY);
        if(!back.exists||back.etag!==ack.etag||back.generation!==ack.generation||
          !equal(back.value,candidate))fail("INITIAL_READBACK_MISMATCH");
        const after=await read(LEGACY_KEY);await matchBackup(after);
        if(!equal(source,after))fail("LEGACY_CHANGED_AFTER_WRITE");
        guard();state="CONFIRMED";
        const result=Object.freeze({...status(),generation:ack.generation,bytes:plan.bytes,counts:plan.counts});
        releasePrivate();return result;
      }catch(e){state=writeAttempts?"UNCERTAIN":"STOPPED";releasePrivate();throw e;}
    }
  });
}
