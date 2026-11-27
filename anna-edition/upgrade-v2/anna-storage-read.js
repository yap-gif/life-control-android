import {LEGACY_KEY,WORKSPACE_KEY,canonicalJSON} from "../bundle/v2/workspace.js";

export class AnnaReadError extends Error {
  constructor(code){super(code);this.name="AnnaReadError";this.code=code;}
}
const fail=code=>{throw new AnnaReadError(code);};
const own=(o,k)=>Object.hasOwn(o,k);
const plain=o=>o!==null&&typeof o==="object"&&!Array.isArray(o)&&
  (Object.getPrototypeOf(o)===Object.prototype||Object.getPrototypeOf(o)===null)&&
  Reflect.ownKeys(o).every(k=>typeof k==="string"&&Object.hasOwn(Object.getOwnPropertyDescriptor(o,k),"value"));
const validId=x=>typeof x==="string"&&/^[1-9][0-9]*$/.test(x);
function statusOK(o){
  return (!own(o,"ok")||o.ok===true)&&(!own(o,"error")||o.error===null)&&
    (!own(o,"code")||o.code===null)&&
    ["status","statusCode"].every(k=>!own(o,k)||o[k]===null||
      (Number.isInteger(o[k])&&o[k]>=200&&o[k]<300));
}

/** Candidate read bridge. The wire envelope was observed for App 908;
 * the legacy SDK consumes the unwrapped result. No absence/create contract
 * is assumed. No connect(), write, list, retry, logging or UI boot here. */
export function normalizeAnnaPresentRead(reply){
  if(!plain(reply)||!statusOK(reply))fail("RPC_UNCONFIRMED");
  let r=reply;
  if(own(reply,"result")){
    if(typeof reply.id!=="string"||!reply.id.trim()||!own(reply,"error")||
       reply.error!==null||["value","etag","exists","generation"].some(k=>own(reply,k)))
      fail("RPC_UNCONFIRMED");
    r=reply.result;
  }
  if(!plain(r)||!statusOK(r)||own(r,"result"))fail("RPC_UNCONFIRMED");
  if(!own(r,"exists")||r.exists!==true)fail("ABSENCE_UNVERIFIED");
  if(!own(r,"value")||!plain(r.value)||!own(r,"etag")||
     typeof r.etag!=="string"||!r.etag.trim()||!own(r,"generation")||
     !Number.isSafeInteger(r.generation)||r.generation<0)fail("READ_UNCONFIRMED");
  let value;
  try{value=JSON.parse(canonicalJSON(r.value));}catch{fail("READ_UNCONFIRMED");}
  return {exists:true,value,etag:r.etag,generation:r.generation};
}

/** Inject an already connected runtime. Identity checks are conservative
 * candidate guards, not a proof of server-side APS isolation. */
export function createAnnaReadAdapter(runtime,{expectedVersionId="2720"}={}){
  if(!validId(expectedVersionId))fail("IDENTITY_UNVERIFIED");
  function verifyIdentity(){
    if(!runtime||runtime.app?.id!==908||String(runtime.appId)!=="908"||
       String(runtime.versionId)!==expectedVersionId||
       (runtime.app.slug!==undefined&&runtime.app.slug!=="life-control-anna")||
       typeof runtime.storage?.get!=="function")fail("IDENTITY_UNVERIFIED");
  }
  return createReadSurface(runtime,verifyIdentity);
}

/** SDK v0.28.0 has app and windowUuid but no appId/versionId mirrors.
 * Explicit diagnostic-only mode: app identity and session continuity,
 * NOT version attestation or proof of server-side scope. Never used to
 * authorize initialization, migration, writes or a production boot. */
export function createAnnaHostDiagnosticAdapter(runtime){
  const windowUuid=runtime?.windowUuid;
  function verifyIdentity(){
    if(typeof windowUuid!=="string"||!windowUuid.trim()||
       runtime?.windowUuid!==windowUuid||
       runtime.app?.id!==908||runtime.app.slug!=="life-control-anna"||
       runtime.capabilities?.host_api_version!=="0.1.0"||
       runtime.appId!==undefined||runtime.versionId!==undefined||
       typeof runtime.storage?.get!=="function")fail("IDENTITY_UNVERIFIED");
  }
  return createReadSurface(runtime,verifyIdentity);
}

function createReadSurface(runtime,verifyIdentity){
  verifyIdentity();
  let busy=false,locked=false;
  return Object.freeze({
    async get(args){
      if(!plain(args)||Reflect.ownKeys(args).length!==1||!own(args,"key")||
         ![LEGACY_KEY,WORKSPACE_KEY].includes(args.key))fail("KEY_NOT_ALLOWED");
      if(locked)fail("READ_LOCKED");
      if(busy)fail("READ_BUSY");
      busy=true;
      try{
        verifyIdentity();
        let response;
        try{response=await runtime.storage.get({key:args.key});}
        catch{fail("SDK_READ_FAILED");}
        verifyIdentity();
        return normalizeAnnaPresentRead(response);
      }catch(e){locked=true;throw e instanceof AnnaReadError?e:new AnnaReadError("READ_UNCONFIRMED");}
      finally{busy=false;}
    }
  });
}
