import {createHash,randomBytes} from "node:crypto";
import {readFileSync,realpathSync,lstatSync,openSync,writeFileSync,fsyncSync,closeSync} from "node:fs";
import {join} from "node:path";
import {canonicalJSON,utf8Bytes,migrateLegacy,WORKSPACE_KEY} from "../bundle/v2/workspace.js";
import {validateDomain} from "../bundle/v2/domain.js";
import {normalizeAnnaPresentRead} from "../upgrade-v2/anna-storage-read.js";
import {fingerprintLegacyBackup,OWNER_PILOT_LIMIT,OWNER_PILOT_RISK} from "../upgrade-v2/anna-owner-migration-pilot.js";

export const PLAN_FILE="APP908-OWNER-MIGRATION-PLAN.json";
export const ATTEMPT_FILE="APP908-OWNER-MIGRATION-ATTEMPT.json";
export const BACKUP_CIPHER_SHA="7844437876b7c5a424110d5c3c6511700ba5242cae5a502e932bb5e32df3b304";
const fail=code=>{throw Object.assign(Error(code),{code});};
const hex=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const sha=x=>createHash("sha256").update(x).digest("hex");
function paths(root){const dir=realpathSync(root);return {plan:join(dir,PLAN_FILE),attempt:join(dir,ATTEMPT_FILE)};}
function present(p){try{lstatSync(p);return true;}catch(e){if(e.code==="ENOENT")return false;throw e;}}
function writeExclusive(path,value){
  // An interrupted or partial marker still blocks future attempts.
  const fd=openSync(path,"wx",0o600);
  try{writeFileSync(fd,JSON.stringify(value,null,2)+"\n","utf8");fsyncSync(fd);}finally{closeSync(fd);}
}
export async function buildOwnerLocalPlan(reply,{migrationId="app908-owner-"+randomBytes(16).toString("hex")}={}){
  if(!/^app908-owner-[a-f0-9]{32}$/.test(migrationId))fail("INVALID_MIGRATION_ID");
  const legacy=normalizeAnnaPresentRead(reply);
  if(legacy.generation!==17)fail("BACKUP_GENERATION_CHANGED");
  const proof=await fingerprintLegacyBackup(legacy);
  const candidate=migrateLegacy(legacy.value,{legacyEtag:legacy.etag,timezone:"Asia/Kuching",migrationId});
  if(validateDomain(candidate)!==true||candidate.revision!==0||candidate.lastOperationId!==null)fail("INVALID_CANDIDATE");
  const bytes=utf8Bytes(candidate);
  if(bytes>OWNER_PILOT_LIMIT)fail("PILOT_CAPACITY");
  return {schema:1,appId:908,key:WORKSPACE_KEY,migrationId,generation:legacy.generation,bytes,
    counts:Object.fromEntries(Object.entries(candidate.collections).map(([k,v])=>[k,v.length])),
    candidateSha256:sha(canonicalJSON(candidate)),backupSha256:proof.sha256,risk:OWNER_PILOT_RISK,
    versionAttestation:"UNVERIFIED",maxReads:6,maxWriteAttempts:1,backupCipherSha256:BACKUP_CIPHER_SHA,
    state:"OFFLINE_PREPARED",liveWriteAuthorized:false};
}
export function inspectOwnerLedger(root){
  const p=paths(root);return {planExists:present(p.plan),attemptExists:present(p.attempt),automaticRetry:false};
}
function validatePlan(p){
  if(!p||p.schema!==1||p.appId!==908||p.key!==WORKSPACE_KEY||p.generation!==17||
    !/^app908-owner-[a-f0-9]{32}$/.test(p.migrationId)||!hex(p.candidateSha256)||!hex(p.backupSha256)||
    p.risk!==OWNER_PILOT_RISK||p.maxReads!==6||p.maxWriteAttempts!==1||
    !Number.isSafeInteger(p.bytes)||p.bytes<1||p.bytes>OWNER_PILOT_LIMIT||
    p.backupCipherSha256!==BACKUP_CIPHER_SHA||p.state!=="OFFLINE_PREPARED"||p.liveWriteAuthorized!==false)fail("PLAN_INVALID");
}
export function saveOwnerLocalPlan(root,plan){
  validatePlan(plan);
  const p=paths(root);if(present(p.attempt))fail("ATTEMPT_ALREADY_RESERVED");
  writeExclusive(p.plan,plan);return inspectOwnerLedger(root);
}
/** Local operator latch, NOT an APS transaction or platform permission.
 * Intentionally not exposed by the offline preparation CLI.
 * Future execution integration must reserve before granting a browser attempt.
 * Any existing marker, including malformed or partial, blocks a new reservation.
 * Never delete/reset the marker after an uncertain result. */
export function reserveOwnerAttempt(root,expectedPlan,approval){
  const p=paths(root);if(present(p.attempt))fail("ATTEMPT_ALREADY_RESERVED");
  const saved=JSON.parse(readFileSync(p.plan,"utf8"));validatePlan(saved);
  if(canonicalJSON(saved)!==canonicalJSON(expectedPlan))fail("PLAN_CHANGED");
  if(!approval||approval.liveWriteAuthorized!==true||
    approval.candidateSha256!==saved.candidateSha256||approval.backupSha256!==saved.backupSha256||
    approval.migrationId!==saved.migrationId||approval.risk!==saved.risk)fail("RESERVATION_NOT_AUTHORIZED");
  // Create the fixed marker before external write execution. No reset API.
  const marker={schema:1,appId:908,key:WORKSPACE_KEY,migrationId:saved.migrationId,
    planSha256:sha(canonicalJSON(saved)),state:"RESERVED_BEFORE_ATTEMPT",reservedAt:new Date().toISOString(),
    maxWriteAttempts:1,automaticRetry:false};
  writeExclusive(p.attempt,marker);return {state:marker.state,attemptExists:true};
}
