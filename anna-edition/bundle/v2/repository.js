import {LEGACY_KEY,WORKSPACE_KEY,canonicalJSON,utf8Bytes,validateWorkspaceEnvelope,migrateLegacy,emptyWorkspace} from "./workspace.js";
export class StorageGateError extends Error{
  constructor(code,message){super(message);this.code=code;}
}
const error=(code,msg)=>new StorageGateError(code,msg);
function deadline(p,ms){
  let timer;return Promise.race([Promise.resolve(p),new Promise((_,reject)=>{timer=setTimeout(()=>reject(error("TIMEOUT","Storage outcome unconfirmed")),ms);})]).finally(()=>clearTimeout(timer));
}
function exact(a,b){return canonicalJSON(a)===canonicalJSON(b);}
function validEtag(e){return typeof e==="string"&&e.trim().length>0;}
/** Only explicit exists=false or a precise storage key-not-found code is absent.
 * HTTP 404 without a precise key error is deliberately ambiguous. */
export async function readKey(storage,key,timeoutMs=12000){
  let r;
  try{r=await deadline(storage.get({key}),timeoutMs);}
  catch(e){if(e?.code==="KEY_NOT_FOUND"||e?.code==="key_not_found")return {exists:false,etag:null};throw e;}
  if(r?.exists===false){if(r.value!=null||r.etag!=null)throw error("AMBIGUOUS_READ","Conflicting absence response");return {exists:false,etag:null};}
  if(!r||r.exists===false||r.value==null||!validEtag(r.etag))throw error("AMBIGUOUS_READ","Storage read lacks value/etag");
  return {exists:true,etag:r.etag,value:r.value};
}
function checkLegacy(w,legacy){
  if((legacy.exists?legacy.etag:null)!==w.migration.legacyEtag)throw error("LEGACY_DIVERGED","Legacy workspace changed; reconciliation required");
}
export async function inspectWorkspace(storage,{timezone,migrationId,timeoutMs=12000}){
  const current=await readKey(storage,WORKSPACE_KEY,timeoutMs),legacy=await readKey(storage,LEGACY_KEY,timeoutMs);
  if(current.exists){validateWorkspaceEnvelope(current.value);checkLegacy(current.value,legacy);return {status:"existing",workspace:current.value,etag:current.etag};}
  const workspace=legacy.exists?migrateLegacy(legacy.value,{legacyEtag:legacy.etag,timezone,migrationId}):emptyWorkspace({timezone,migrationId});
  return {status:"candidate-only",workspace,etag:null};
}
/** Phase 02 adapter: explicit dependency injection. No concrete Anna create-only
 * API is assumed. A verified atomic create adapter and measured byte limit must
 * come from later real-platform evidence. Never instantiate from app boot yet. */
export function createWorkspaceRepository({storage,atomicCreate=null,capability=null,timeoutMs=12000,validateDomain=null}){
  if(!storage||typeof storage.get!=="function"||typeof storage.set!=="function")throw error("CONFIG","Storage adapter required");
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1)throw error("CONFIG","Invalid timeout");
  let locked=false,busy=false;
  function checkReady(){
    if(locked)throw error("LOCKED","Reconcile storage before further writes");
    if(busy)throw error("BUSY","Another mutation is in progress");
    if(capability?.verified!==true||!Number.isSafeInteger(capability.maxBytes)||capability.maxBytes<1||typeof validateDomain!=="function")throw error("CAPABILITY_UNVERIFIED","Real storage capability and complete domain validation required");
  }
  function snapshot(w){
    validateWorkspaceEnvelope(w);
    if(validateDomain(w)!==true)throw error("DOMAIN_INVALID","Complete synchronous domain validation must explicitly pass");
    const value=JSON.parse(canonicalJSON(w));
    if(utf8Bytes(value)>capability.maxBytes)throw error("CAPACITY","Workspace exceeds verified capacity; no records removed");
    return value;
  }
  async function confirm(value){
    const back=await readKey(storage,WORKSPACE_KEY,timeoutMs);
    if(!back.exists||!exact(back.value,value))throw error("READBACK_MISMATCH","Workspace write not confirmed");
    checkLegacy(value,await readKey(storage,LEGACY_KEY,timeoutMs));
    return {workspace:back.value,etag:back.etag};
  }
  async function mutate(fn){
    checkReady();busy=true;
    let started=false;
    try{return await fn(()=>{started=true;});}
    catch(e){if(started||e?.code==="LEGACY_DIVERGED"||e?.code==="CONFLICT")locked=true;throw e;}
    finally{busy=false;}
  }
  return {
    get locked(){return locked;},
    get busy(){return busy;},
    inspect:options=>inspectWorkspace(storage,{...options,timeoutMs}),
    initialize(candidate){
      return mutate(async mark=>{
        if(typeof atomicCreate!=="function")throw error("CREATE_UNVERIFIED","Atomic create-only operation not established");
        const value=snapshot(candidate);
        if(value.revision!==0||value.lastOperationId!==null)throw error("INVALID_INIT","Expected initial workspace");
        const inspected=await inspectWorkspace(storage,{timezone:value.settings.timezone,migrationId:value.migration.id,timeoutMs});
        if(inspected.status!=="candidate-only"||!exact(inspected.workspace,value))throw error("CONFLICT","Migration candidate changed");
        mark();
        await deadline(atomicCreate({key:WORKSPACE_KEY,value}),timeoutMs);
        return confirm(value);
      });
    },
    commit({previous,etag,next,operationId}){
      return mutate(async mark=>{
        if(!validEtag(etag)||typeof operationId!=="string"||!operationId.trim())throw error("INVALID_WRITE","Expected etag and operation ID");
        validateWorkspaceEnvelope(previous);
        const baseline=JSON.parse(canonicalJSON(previous));
        const value=snapshot(next);
        if(value.revision!==baseline.revision+1||value.lastOperationId!==operationId||!exact(value.migration,baseline.migration))throw error("INVALID_WRITE","Revision or migration contract mismatch");
        const remote=await readKey(storage,WORKSPACE_KEY,timeoutMs);
        if(!remote.exists||remote.etag!==etag||!exact(remote.value,baseline))throw error("CONFLICT","Workspace changed; reload required");
        checkLegacy(value,await readKey(storage,LEGACY_KEY,timeoutMs));
        if(baseline.lastOperationId===operationId)throw error("DUPLICATE_OPERATION","Do not replay an already confirmed operation");
        mark();
        await deadline(storage.set({key:WORKSPACE_KEY,value,if_match:etag}),timeoutMs);
        return confirm(value);
      });
    }
  };
}
