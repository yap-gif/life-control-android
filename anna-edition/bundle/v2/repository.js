import {LEGACY_KEY,WORKSPACE_KEY,canonicalJSON,utf8Bytes,validateWorkspaceEnvelope,migrateLegacy,emptyWorkspace} from "./workspace.js";
export class StorageGateError extends Error{
  constructor(code,message){super(message);this.code=code;}
}
const error=(code,msg)=>new StorageGateError(code,msg);
function deadline(p,ms){
  let timer;return Promise.race([Promise.resolve(p),new Promise((_,reject)=>{timer=setTimeout(()=>reject(error("TIMEOUT","Storage outcome unconfirmed")),ms);})]).finally(()=>clearTimeout(timer));
}
function exact(a,b){return canonicalJSON(a)===canonicalJSON(b);}
function detachedJSON(value){return JSON.parse(canonicalJSON(value));}
function validEtag(e){return typeof e==="string"&&e.trim().length>0;}
const own=(r,k)=>Object.hasOwn(r,k);
const field=(r,k)=>own(r,k)?r[k]:undefined;
const ambiguous=()=>error("AMBIGUOUS_READ","Storage read is missing or contradicts explicit value/absence evidence");
function plainResponse(r){
  return r!==null&&typeof r==="object"&&!Array.isArray(r)&&
    (Object.getPrototypeOf(r)===Object.prototype||Object.getPrototypeOf(r)===null)&&
    Reflect.ownKeys(r).every(k=>typeof k==="string"&&Object.hasOwn(Object.getOwnPropertyDescriptor(r,k),"value"));
}
function compatibleStatus(status,expected){
  return status===undefined||status===null||
    (Number.isInteger(status)&&expected(status));
}
/** Conservative candidate policy, not a verified real APS contract.
 * Null-only legacy responses, generic not_found/404 and contradictions never
 * establish absence. Explicit key errors are accepted only without conflicting
 * HTTP status. Never infer create permission from an empty prefix listing. */
export async function readKey(storage,key,timeoutMs=12000){
  let r;
  try{r=await deadline(storage.get({key}),timeoutMs);}
  catch(e){
    if(e?.code==="KEY_NOT_FOUND"||e?.code==="key_not_found"){
      if(![e.status,e.statusCode,e.response?.status].every(s=>compatibleStatus(s,n=>n===404)))throw ambiguous();
      return {exists:false,etag:null};
    }
    throw e;
  }
  if(!plainResponse(r))throw ambiguous();
  if(own(r,"exists")&&typeof r.exists!=="boolean")throw ambiguous();
  if((own(r,"ok")&&r.ok!==true)||field(r,"error")!=null||field(r,"code")!=null||
    ![field(r,"status"),field(r,"statusCode")].every(s=>compatibleStatus(s,n=>n>=200&&n<300)))throw ambiguous();
  if(field(r,"exists")===false){
    // Unknown generation/tombstone semantics cannot establish safe absence.
    if(["value","etag","generation"].some(k=>own(r,k)&&r[k]!==null))throw ambiguous();
    return {exists:false,etag:null};
  }
  if(!own(r,"value")||r.value==null||!own(r,"etag")||!validEtag(r.etag))throw ambiguous();
  // Capture independent JSON evidence; never retain an adapter-owned object.
  let value;try{value=detachedJSON(r.value);}catch{throw ambiguous();}
  return {exists:true,etag:r.etag,value};
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
  const verified=capability?.verified===true,maxBytes=capability?.maxBytes;
  let locked=false,busy=false;
  function checkReady(){
    if(locked)throw error("LOCKED","Reconcile storage before further writes");
    if(busy)throw error("BUSY","Another mutation is in progress");
    if(!verified||!Number.isSafeInteger(maxBytes)||maxBytes<1||typeof validateDomain!=="function")throw error("CAPABILITY_UNVERIFIED","Real storage capability and complete domain validation required");
  }
  function snapshot(w){
    const value=detachedJSON(w);
    validateWorkspaceEnvelope(value);
    const before=canonicalJSON(value);
    if(validateDomain(value)!==true||canonicalJSON(value)!==before)throw error("DOMAIN_INVALID","Complete synchronous non-mutating domain validation must explicitly pass");
    if(utf8Bytes(value)>maxBytes)throw error("CAPACITY","Workspace exceeds verified capacity; no records removed");
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
    async inspect(options){
      const result=await inspectWorkspace(storage,{...options,timeoutMs});
      if(typeof validateDomain==="function"){
        const before=canonicalJSON(result.workspace);
        if(validateDomain(result.workspace)!==true||canonicalJSON(result.workspace)!==before)throw error("DOMAIN_INVALID","Workspace domain validation failed");
      }
      return result;
    },
    initialize(candidate){
      return mutate(async mark=>{
        if(typeof atomicCreate!=="function")throw error("CREATE_UNVERIFIED","Atomic create-only operation not established");
        const value=snapshot(candidate);
        if(value.revision!==0||value.lastOperationId!==null)throw error("INVALID_INIT","Expected initial workspace");
        const inspected=await inspectWorkspace(storage,{timezone:value.settings.timezone,migrationId:value.migration.id,timeoutMs});
        if(inspected.status!=="candidate-only"||!exact(inspected.workspace,value))throw error("CONFLICT","Migration candidate changed");
        mark();
        await deadline(atomicCreate({key:WORKSPACE_KEY,value:detachedJSON(value)}),timeoutMs);
        return confirm(value);
      });
    },
    commit({previous,etag,next,operationId}){
      return mutate(async mark=>{
        if(!validEtag(etag)||typeof operationId!=="string"||!operationId.trim())throw error("INVALID_WRITE","Expected etag and operation ID");
        const baseline=snapshot(previous);
        const value=snapshot(next);
        if(value.revision!==baseline.revision+1||value.lastOperationId!==operationId||!exact(value.migration,baseline.migration))throw error("INVALID_WRITE","Revision or migration contract mismatch");
        const remote=await readKey(storage,WORKSPACE_KEY,timeoutMs);
        if(!remote.exists||remote.etag!==etag||!exact(remote.value,baseline))throw error("CONFLICT","Workspace changed; reload required");
        checkLegacy(value,await readKey(storage,LEGACY_KEY,timeoutMs));
        if(baseline.lastOperationId===operationId)throw error("DUPLICATE_OPERATION","Do not replay an already confirmed operation");
        mark();
        await deadline(storage.set({key:WORKSPACE_KEY,value:detachedJSON(value),if_match:etag}),timeoutMs);
        return confirm(value);
      });
    }
  };
}
