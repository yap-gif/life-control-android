import {emptyWorkspace,canonicalJSON,utf8Bytes} from "../bundle/v2/workspace.js";
import {prepareCommand} from "../bundle/v2/domain.js";
import {buildCoachRequest,previewRequest,createConsentController} from "../bundle/v2/ai-coach.js";
import {MAX_REQUEST_BYTES,MAX_RESPONSE_BYTES,MAX_TOKENS} from "../bundle/v2/ai-schema.js";
const fail=code=>{throw Object.assign(Error(code),{code});};
const now="2026-11-28T02:00:00.000Z";
export function syntheticCoachFixture(){
  let w=emptyWorkspace({timezone:"Asia/Kuching",migrationId:"synthetic-coach-qa"});
  for(const [i,minutes] of [25,35].entries()){
    w=prepareCommand(w,{type:"record.add",collection:"learning",id:"synthetic-"+i,data:{date:"2026-11-"+(26+i),topic:"Synthetic practice",minutes,note:null}},{operationId:"synthetic-op-"+i,expectedRevision:w.revision,now}).next;
  }
  return {workspace:w,request:buildCoachRequest(w,{requestId:"app908-synthetic-coach-qa-v1",question:"Using only these fictional learning logs, summarize the recorded minutes and suggest one measurable next step. This is synthetic test data.",focus:"learning",spec:{kind:"7days"},selected:["learning"],asOf:now})};
}
export function toHostRequest(body){
  if(!body||Object.keys(body).length!==2||body.maxTokens!==MAX_TOKENS||!Array.isArray(body.messages)||body.messages.length!==2||body.messages.some((m,i)=>Object.keys(m).length!==2||m.role!==["system","user"][i]||typeof m.content!=="string"))fail("HOST_REQUEST_INVALID");
  const wire={maxTokens:body.maxTokens,messages:body.messages.map(m=>({role:m.role,content:{type:"text",text:m.content}}))};
  if(utf8Bytes(wire)>MAX_REQUEST_BYTES)fail("HOST_REQUEST_TOO_LARGE");return wire;
}
function readReply(reply){
  if(!reply||reply.role!=="assistant"||reply.stopReason!=="endTurn"||reply.content?.type!=="text"||typeof reply.content.text!=="string"||!reply.content.text.trim()||new TextEncoder().encode(reply.content.text).length>MAX_RESPONSE_BYTES)fail("MODEL_REPLY_UNCONFIRMED");
  const u=reply.usage,q=reply._meta?.quotaConsumed;
  if(!u||!["inputTokens","outputTokens","totalTokens"].every(k=>Number.isSafeInteger(u[k])&&u[k]>=0)||!Number.isFinite(q)||q<0)fail("USAGE_UNCONFIRMED");
  return {text:reply.content.text,usage:{inputTokens:u.inputTokens,outputTokens:u.outputTokens,totalTokens:u.totalTokens,quotaConsumed:q}};
}
/** Fixed fictional dataset only; no store, business-key or agent capability.
 * Explicit review of exact typed wire body before the single durable claim.
 * No cost ceiling API is asserted. A timeout does not cancel the provider. */
export function createSyntheticCoach(runtime,{claim,authorize,timeoutMs=45000}={}){
  const wid=runtime?.windowUuid,{workspace,request}=syntheticCoachFixture();
  const wire=canonicalJSON(toHostRequest(JSON.parse(previewRequest(request))));
  let state="NEW",attempts=0,usage=null,preview=null;
  function guard(){
    if(typeof wid!=="string"||!wid.trim()||runtime?.windowUuid!==wid||runtime.app?.id!==908||runtime.app?.slug!=="life-control-anna"||runtime.capabilities?.host_api_version!=="0.1.0"||runtime.appId!==undefined||runtime.versionId!==undefined||typeof runtime.llm?.complete!=="function")fail("IDENTITY_UNVERIFIED");
  }
  const ctrl=createConsentController({timeoutMs,transport:async body=>{
    guard();if(authorize()!==true||canonicalJSON(toHostRequest(body))!==wire)fail("CONSENT_INVALID");
    if(await claim()!==true)fail("PROBE_ALREADY_RESERVED");
    guard();if(authorize()!==true)fail("CONSENT_REVOKED");
    attempts++;const r=readReply(await runtime.llm.complete(JSON.parse(wire)));usage=r.usage;return r.text;
  }});
  const status=()=>({state,modelAttempts:attempts,usage,syntheticOnly:true,businessReadsByCoach:0,businessWritesByCoach:0,automaticRetry:false,productionRelease:"BLOCKED"});
  return Object.freeze({status,
    async preview(){if(state!=="NEW")fail("PROBE_ALREADY_USED");state="PREVIEWING";try{guard();preview=await ctrl.preview(request);state="PREVIEWED";return {wire,bytes:new TextEncoder().encode(wire).length,maxTokens:MAX_TOKENS};}catch{state="STOPPED";fail("PREVIEW_STOPPED");}},
    async run(){if(state!=="PREVIEWED"||authorize()!==true)fail("CONSENT_REQUIRED");state="RUNNING";
      try{ctrl.consent(preview.digest,true);const receipt=await ctrl.run({digest:preview.digest,request,workspace});state="CONFIRMED";return {status:status(),result:receipt.result};}
      catch{state=attempts?"UNCERTAIN":"STOPPED";return {status:status(),result:null};}
    }
  });
}
