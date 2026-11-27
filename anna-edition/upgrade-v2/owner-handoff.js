import {canonicalJSON,WORKSPACE_KEY,COLLECTIONS} from "../bundle/v2/workspace.js";
import {createOwnerMigrationPilot,OWNER_PILOT_RISK,OWNER_PILOT_LIMIT} from "./anna-owner-migration-pilot.js";
const fail=code=>{throw Object.assign(Error(code),{code});};
const copy=x=>JSON.parse(canonicalJSON(x));
const equal=(a,b)=>canonicalJSON(a)===canonicalJSON(b);
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const cipher="7844437876b7c5a424110d5c3c6511700ba5242cae5a502e932bb5e32df3b304";
const countsOK=c=>c&&Object.keys(c).length===COLLECTIONS.length&&COLLECTIONS.every(k=>Number.isSafeInteger(c[k])&&c[k]>=0);
const keysOK=(x,keys)=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export async function planDigest(p){
  const bytes=new TextEncoder().encode(canonicalJSON(p));
  if(!globalThis.crypto?.subtle)fail("HASH_UNAVAILABLE");
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),n=>n.toString(16).padStart(2,"0")).join("");
}
export function validateLocalPlan(input){
  const p=copy(input);
  const keys=["schema","appId","key","migrationId","generation","bytes","counts","candidateSha256","backupSha256","risk","versionAttestation","maxReads","maxWriteAttempts","backupCipherSha256","state","liveWriteAuthorized"];
  if(!keysOK(p,keys)||p.schema!==1||p.appId!==908||p.key!==WORKSPACE_KEY||p.generation!==17||
    !/^app908-owner-[a-f0-9]{32}$/.test(p.migrationId)||!hex(p.candidateSha256)||!hex(p.backupSha256)||
    p.risk!==OWNER_PILOT_RISK||p.versionAttestation!=="UNVERIFIED"||p.maxReads!==6||p.maxWriteAttempts!==1||
    !Number.isSafeInteger(p.bytes)||p.bytes<1||p.bytes>OWNER_PILOT_LIMIT||!countsOK(p.counts)||
    p.backupCipherSha256!==cipher||p.state!=="OFFLINE_PREPARED"||p.liveWriteAuthorized!==false)fail("PLAN_INVALID");
  return p;
}
export async function validateReservation(input,plan){
  const m=copy(input);
  if(!keysOK(m,["schema","appId","key","migrationId","planSha256","state","reservedAt","maxWriteAttempts","automaticRetry"])||
    m.schema!==1||m.appId!==908||m.key!==WORKSPACE_KEY||m.migrationId!==plan.migrationId||
    m.planSha256!==await planDigest(plan)||m.state!=="RESERVED_BEFORE_ATTEMPT"||
    typeof m.reservedAt!=="string"||!Number.isFinite(Date.parse(m.reservedAt))||
    m.maxWriteAttempts!==1||m.automaticRetry!==false)fail("RESERVATION_INVALID");
  return m;
}
/** Browser-origin latch. A successful add is acknowledged only on transaction
 * completion. No delete/reset. Browser data removal, origin changes, other
 * profiles/devices and malicious bypass are outside its guarantee. */
export async function openBrowserAttemptLedger(indexedDB){
  if(!indexedDB||typeof indexedDB.open!=="function")fail("BROWSER_LEDGER_UNAVAILABLE");
  const db=await new Promise((resolve,reject)=>{
    let abandoned=false;
    const req=indexedDB.open("life-control-app908-owner-pilot",1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("attempts"))req.result.createObjectStore("attempts");};
    req.onsuccess=()=>{if(abandoned)req.result.close();else resolve(req.result);};
    req.onerror=req.onblocked=()=>{abandoned=true;reject(Error("BROWSER_LEDGER_UNAVAILABLE"));};
  });
  const key="app908-v2-initialization";
  return Object.freeze({
    async claim(marker){
      return new Promise((resolve,reject)=>{
        let tx;
        try{
          tx=db.transaction("attempts","readwrite",{durability:"strict"});
          // Require strict durability to be acknowledged; no silent fallback.
          if(tx.durability!=="strict"){tx.abort();reject(Error("BROWSER_LEDGER_DURABILITY_UNVERIFIED"));return;}
          tx.oncomplete=()=>resolve(true);
          tx.onabort=tx.onerror=()=>reject(Error("BROWSER_ATTEMPT_BLOCKED"));
          tx.objectStore("attempts").add({planSha256:marker.planSha256,reservedAt:marker.reservedAt,state:"CLAIMED_BEFORE_COMMIT"},key);
        }catch{try{tx?.abort();}catch{}reject(Error("BROWSER_ATTEMPT_BLOCKED"));}
      });
    },
    close(){db.close();}
  });
}
/** Explicit owner-only workflow. Local marker is a policy assertion, not a
 * signed credential or proof of the file's path. No data leave the page except
 * the approved pilot's normal APS operations. Never auto-connect or auto-write. */
export function createOwnerHandoff({connect,openLedger,checkOwnerConditions}){
  let state="NEW",plan=null,pilot=null,allowed=false,ledger=null;
  const status=()=>({state,...(pilot?{pilot:pilot.status()}:{})});
  return Object.freeze({
    status,
    async prepare(input){
      if(state!=="NEW")fail("HANDOFF_NOT_NEW");state="PREPARING";
      try{
        plan=validateLocalPlan(input);
        ledger=await openLedger();
        pilot=createOwnerMigrationPilot(await connect(),{backupProof:{generation:plan.generation,sha256:plan.backupSha256},
          migrationId:plan.migrationId,checkOwnerConditions,authorizeCommit:()=>allowed});
        const p=await pilot.prepare();
        for(const k of ["appId","key","migrationId","generation","bytes","counts","candidateSha256","backupSha256","risk","versionAttestation","maxReads","maxWriteAttempts"])
          if(!equal(p[k],plan[k]))fail("PLAN_LIVE_MISMATCH");
        state="PREPARED";return {state,generation:p.generation,bytes:p.bytes,counts:copy(p.counts),writeAttempts:0};
      }catch(e){state="STOPPED";ledger?.close();throw e;}
    },
    async commit(marker,explicitApproval){
      if(state!=="PREPARED")fail("HANDOFF_NOT_PREPARED");state="RESERVING";
      try{
        if(explicitApproval!==true)fail("WRITE_NOT_AUTHORIZED");
        const m=await validateReservation(marker,plan);
        if(await ledger.claim(m)!==true)fail("BROWSER_ATTEMPT_BLOCKED");
        allowed=true;state="COMMITTING";
        const result=await pilot.commit({candidateSha256:plan.candidateSha256,backupSha256:plan.backupSha256,migrationId:plan.migrationId,risk:plan.risk});
        state="CONFIRMED";return result;
      }catch(e){state=pilot?.status().writeAttempts?"UNCERTAIN":"STOPPED";throw e;}
      finally{allowed=false;ledger?.close();plan=null;}
    }
  });
}
