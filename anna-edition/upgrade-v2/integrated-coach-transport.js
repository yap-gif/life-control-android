import {canonicalJSON,utf8Bytes} from "../bundle/v2/workspace.js";
import {createConsentController} from "../bundle/v2/ai-coach.js";
import {MAX_REQUEST_BYTES,MAX_RESPONSE_BYTES,MAX_TOKENS} from "../bundle/v2/ai-schema.js";
const fail=code=>{throw Error(code);};
export function typedWire(body){
 if(!body||Object.keys(body).length!==2||body.maxTokens!==MAX_TOKENS||!Array.isArray(body.messages)||body.messages.length!==2||body.messages.some((m,i)=>Object.keys(m).length!==2||m.role!==["system","user"][i]||typeof m.content!=="string"))fail("INVALID_BODY");
 const wire={maxTokens:body.maxTokens,messages:body.messages.map(m=>({role:m.role,content:{type:"text",text:m.content}}))};
 if(utf8Bytes(wire)>MAX_REQUEST_BYTES)fail("WIRE_TOO_LARGE");return wire;
}
export function checkBudget({balance,maxCost,verified}={}){
 return verified===true&&typeof balance==="number"&&Number.isFinite(balance)&&balance>970.477&&balance<=975.477&&typeof maxCost==="number"&&Number.isFinite(maxCost)&&maxCost>0&&Math.ceil(maxCost*1000000)<=Math.floor((balance-970.477)*1000000+0.000001);
}
export function parseHostReply(reply){
 if(!reply||reply.role!=="assistant"||reply.stopReason!=="endTurn"||reply.content?.type!=="text"||typeof reply.content.text!=="string"||!reply.content.text.trim()||new TextEncoder().encode(reply.content.text).length>MAX_RESPONSE_BYTES)fail("MODEL_REPLY_UNCONFIRMED");
 const u=reply.usage,q=reply._meta?.quotaConsumed;
 if(!u||!["inputTokens","outputTokens","totalTokens"].every(k=>Number.isSafeInteger(u[k])&&u[k]>=0)||!Number.isFinite(q)||q<0)fail("USAGE_UNCONFIRMED");
 return {text:reply.content.text,usage:{inputTokens:u.inputTokens,outputTokens:u.outputTokens,totalTokens:u.totalTokens,quotaConsumed:q}};
}
/** One user-consented request. No agent or tools. An externally verified
 * conservative cost bound is required; this is not a provider-enforced cap. */
export function createPersonalRun(runtime,{readWorkspace,claim,settle,authorize,timeoutMs=45000}){
 const wid=runtime?.windowUuid;
 let state="NEW",attempts=0,usage=null,preview=null,snapshot=null,budget=null;
 const guard=()=>{if(typeof wid!=="string"||!wid.trim()||runtime.windowUuid!==wid||runtime.app?.id!==908||runtime.app?.slug!=="life-control-anna"||runtime.capabilities?.host_api_version!=="0.1.0"||runtime.appId!==undefined||runtime.versionId!==undefined||typeof runtime.llm?.complete!=="function")fail("IDENTITY_UNVERIFIED");};
 const still=()=>state==="RUNNING"&&authorize()===true&&canonicalJSON(readWorkspace())===snapshot;
 const ctrl=createConsentController({timeoutMs,transport:async body=>{
   guard();if(!still()||canonicalJSON(typedWire(body))!==preview.wire)fail("CONSENT_INVALID");
   if(await claim({requestId:preview.request.requestId,maxCost:budget.maxCost})!==true)fail("MODEL_ATTEMPT_RESERVED");
   guard();if(!still())fail("CONSENT_REVOKED");
   attempts++;const result=parseHostReply(await runtime.llm.complete(JSON.parse(preview.wire)));
   if(!still())fail("LATE_OR_STALE_REPLY");usage=result.usage;
   if(usage.quotaConsumed>budget.maxCost)fail("COST_BOUND_EXCEEDED");return result.text;
 }});
 return Object.freeze({
  status:()=>({state,attempts,usage,automaticRetry:false}),
  async prepare(p){
    if(state!=="NEW")fail("ALREADY_USED");state="PREPARING";guard();
    snapshot=canonicalJSON(readWorkspace());const request=JSON.parse(canonicalJSON(p.request));const r=await ctrl.preview(request);
    const wire=canonicalJSON(typedWire(JSON.parse(r.payload)));if(wire!==p.payload)fail("PREVIEW_MISMATCH");
    preview={digest:r.digest,wire,request};state="PREVIEWED";return wire;
  },
  async run(cost){
    if(state!=="PREVIEWED"||!checkBudget(cost)||authorize()!==true||canonicalJSON(readWorkspace())!==snapshot)fail("AUTHORIZATION_REQUIRED");
    budget={...cost};state="RUNNING";
    try{ctrl.consent(preview.digest,true);const receipt=await ctrl.run({digest:preview.digest,request:preview.request,workspace:readWorkspace()});
      if(!still())fail("STALE_RESULT");
      if(await settle({requestId:preview.request.requestId,quotaConsumed:usage.quotaConsumed})!==true)fail("COST_SETTLEMENT_UNCONFIRMED");
      if(!still())fail("STALE_RESULT");state="CONFIRMED";return receipt;
    }catch{state=attempts?"UNCERTAIN":"STOPPED";throw Error("MODEL_NOT_CONFIRMED");}
  }
 });
}
