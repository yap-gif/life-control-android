import {canonicalJSON} from "./workspace.js";
import {shiftDay,dayNumber} from "./calendar.js";
import {validateDomain,localDay} from "./domain.js";
import {buildCoachRequest,isValidatedReceipt,previewRequest} from "./ai-coach.js";
import {exact,text,integer,utc,requireOK as ok} from "./ai-schema.js";
const copy=v=>JSON.parse(canonicalJSON(v));
const get=(c,k,id)=>{text(id,"ID",128);const r=c[k].find(x=>x.id===id);ok(r,"Missing "+k+" entity");return r;};
function insert(c,k,r){text(r.id,"ID",128);ok(!c[k].some(x=>x.id===r.id),"Duplicate entity ID");c[k].push(r);}
function remove(c,k,id){get(c,k,id);c[k]=c[k].filter(x=>x.id!==id);}
function futureDate(d,today){dayNumber(d);ok(d>=today&&d<=shiftDay(today,365),"Action date outside allowed range");}
function confirm(cmd){ok(cmd.confirm===true,"Explicit confirmation required");}
function retention(cmd){confirm(cmd);ok(cmd.retainHistoricalCopies===true,"Acknowledge retained copies; this is not full erasure");}
/** Pure commands: candidates only. No API calls, storage writes or implicit task creation.
 * Saving a report requires an actual in-session validation receipt from the consent controller. */
export function prepareAiCommand(previous,command,{expectedRevision,operationId,now}){
  validateDomain(previous);integer(expectedRevision,"revision");ok(expectedRevision===previous.revision,"Stale revision");
  text(operationId,"operation ID",128);ok(operationId!==previous.lastOperationId,"Duplicate operation");utc(now);
  const today=localDay(now,previous.settings.timezone),w=copy(previous),c=w.collections;
  ok(command&&typeof command.type==="string","Invalid AI command");
  // Receipt identity must survive: never clone it before checking the private WeakSet.
  const cmd=command;
  switch(cmd.type){
    case "analysis.save":{
      exact(cmd,["type","receipt","confirm"],"analysis save");confirm(cmd);ok(isValidatedReceipt(cmd.receipt),"Unverified analysis receipt");
      const {request,result}=cmd.receipt;
      ok(request.snapshotRevision===previous.revision&&now>=request.asOf,"Analysis snapshot stale");
      const rebuilt=buildCoachRequest(previous,{requestId:request.requestId,question:request.question,focus:request.focus,spec:{kind:"custom",...request.period},selected:request.authorizedCategories,asOf:request.asOf,previousPlanId:request.optionalPreviousPlan?.id??null});
      ok(previewRequest(rebuilt)===previewRequest(request),"Analysis evidence changed");
      insert(c,"analyses",{id:request.requestId,createdAt:now,request:copy(request),result:copy(result),status:"validated"});break;
    }
    case "plan.save":{
      exact(cmd,["type","id","analysisId","actions","confirm"],"plan save");confirm(cmd);
      const a=get(c,"analyses",cmd.analysisId);ok(a.legacyReadOnly!==true&&now>=a.createdAt,"Analysis unavailable");
      ok(Array.isArray(cmd.actions)&&cmd.actions.length>=1&&cmd.actions.length<=5,"Select actions explicitly");
      const actionIds=[];
      for(const x of cmd.actions){
        exact(x,["id","sourceActionId","title","dueDate"],"selected action");
        const source=a.result.actions.find(y=>y.id===x.sourceActionId);ok(source,"Unknown source action");futureDate(x.dueDate,today);
        // Same analysis action can be included in at most one current plan.
        ok(!c.planActions.some(y=>y.sourceActionId===x.sourceActionId&&c.plans.some(p=>p.id===y.planId&&p.analysisId===a.id)),"Source action already saved");
        insert(c,"planActions",{id:x.id,planId:cmd.id,sourceActionId:x.sourceActionId,title:x.title,dueDate:x.dueDate,target:copy(source.target),status:"proposed",taskId:null});actionIds.push(x.id);
      }
      insert(c,"plans",{id:cmd.id,analysisId:a.id,sourceCategories:copy(a.request.authorizedCategories),savedAt:now,actions:actionIds});break;
    }
    case "action.accept":{
      exact(cmd,["type","id","taskId","priority","confirm"],"accept action");confirm(cmd);
      const a=get(c,"planActions",cmd.id),p=get(c,"plans",a.planId);
      ok(a.status==="proposed"&&a.taskId===null&&now>=p.savedAt,"Action already resolved");futureDate(a.dueDate,today);
      insert(c,"tasks",{id:cmd.taskId,title:a.title,dueDate:a.dueDate,priority:cmd.priority,status:"open",createdAt:now,updatedAt:now,sourceActionId:a.id});
      a.taskId=cmd.taskId;a.status="accepted";break;
    }
    case "action.edit":{
      exact(cmd,["type","id","title","dueDate"],"edit action");const a=get(c,"planActions",cmd.id);ok(a.status==="proposed","Only proposed actions editable");futureDate(cmd.dueDate,today);a.title=cmd.title;a.dueDate=cmd.dueDate;break;
    }
    case "action.dismiss":{
      exact(cmd,["type","id","confirm"],"dismiss action");confirm(cmd);const a=get(c,"planActions",cmd.id);ok(a.status==="proposed","Only proposed actions dismissible");a.status="dismissed";break;
    }
    case "analysis.delete":{
      exact(cmd,["type","id","confirm","retainHistoricalCopies"],"delete analysis");retention(cmd);
      ok(!c.plans.some(p=>p.analysisId===cmd.id),"Delete linked plans first");remove(c,"analyses",cmd.id);break;
    }
    case "plan.delete":{
      exact(cmd,["type","id","confirm","retainHistoricalCopies","deleteLinkedTasks"],"delete plan");retention(cmd);
      get(c,"plans",cmd.id);const linked=c.planActions.filter(a=>a.planId===cmd.id&&a.taskId!==null).map(a=>a.taskId);
      ok(linked.length===0||cmd.deleteLinkedTasks===true,"Linked tasks require explicit cascade choice");
      c.tasks=c.tasks.filter(t=>!linked.includes(t.id));c.taskEvents=c.taskEvents.filter(e=>!linked.includes(e.taskId));
      c.planActions=c.planActions.filter(a=>a.planId!==cmd.id);remove(c,"plans",cmd.id);break;
    }
    default:throw new Error("Unsupported AI command");
  }
  w.revision++;w.lastOperationId=operationId;validateDomain(w);
  return {previous:copy(previous),next:w,operationId};
}
export function historyState(workspace,id){
  validateDomain(workspace);const a=get(workspace.collections,"analyses",id);
  return a.legacyReadOnly===true?{legacy:true,stale:null}:{legacy:false,stale:workspace.revision>a.request.snapshotRevision+1};
}
