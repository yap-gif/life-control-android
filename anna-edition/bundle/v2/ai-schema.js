import {canonicalJSON,utf8Bytes} from "./workspace.js";
import {dayNumber,shiftDay} from "./calendar.js";

export const CATEGORIES=Object.freeze(["money","learning","tasks","journal","goals","habits"]);
export const FOCUS=Object.freeze(["comprehensive","financial","learning","task","goal/habit","custom"]);
export const MAX_REQUEST_BYTES=24*1024;
export const MAX_RESPONSE_BYTES=16*1024;
export const MAX_TOKENS=2200;
export function requireOK(ok,message){if(!ok)throw new Error(message);}
const ok=requireOK;
export function exact(o,keys,label){ok(o&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k)),"Invalid "+label+" fields");}
export function text(v,label,max=500){ok(typeof v==="string"&&v.trim().length>0&&v.length<=max,"Invalid "+label);}
export function integer(v,label,min=0,max=Number.MAX_SAFE_INTEGER){ok(Number.isSafeInteger(v)&&v>=min&&v<=max,"Invalid "+label);}
export function utc(v){ok(typeof v==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v,"Invalid UTC time");}
export function categories(v){ok(Array.isArray(v)&&v.length>0&&v.length<=CATEGORIES.length&&new Set(v).size===v.length&&v.every(k=>CATEGORIES.includes(k)),"Invalid authorized categories");}
export const equal=(a,b)=>canonicalJSON(a)===canonicalJSON(b);
function range(r){exact(r,["from","through"],"range");dayNumber(r.from);dayNumber(r.through);ok(r.from<=r.through&&dayNumber(r.through)-dayNumber(r.from)<3660,"Invalid range");}
function inRange(r,p){return r.from>=p.from&&r.through<=p.through;}
function stringList(v,label,max,length,min=0){ok(Array.isArray(v)&&v.length>=min&&v.length<=max&&new Set(v).size===v.length,"Invalid "+label);for(const s of v)text(s,label,length);}
const rawKeys={
  money:["kind","amountMinor","category"],
  learning:["topic","minutes"],
  tasks:["kind","taskId","occurredAt"],
  journal:["reflection","tags"],
  goals:["title","kind","unit","target","progress"],
  habits:["habitId","status"]
};
export function validateRequest(r){
  exact(r,["schemaVersion","requestId","snapshotRevision","asOf","today","period","focus","question","authorizedCategories","metrics","evidence","coverage","optionalPreviousPlan"],"request");
  ok(r.schemaVersion===1,"Unsupported request version");text(r.requestId,"request ID",128);integer(r.snapshotRevision,"revision");utc(r.asOf);dayNumber(r.today);
  range(r.period);ok(r.period.through<=r.today,"Future evidence range");ok(FOCUS.includes(r.focus),"Invalid focus");text(r.question,"question",1000);categories(r.authorizedCategories);
  ok(Array.isArray(r.metrics)&&Array.isArray(r.evidence),"Invalid evidence");
  const ids=new Set();
  for(const m of r.metrics){
    exact(m,["id","category","value","unit","range","sampleCount","coverage","definitionVersion"],"metric");
    text(m.id,"metric ID",1024);ok(!ids.has(m.id),"Duplicate metric");ids.add(m.id);
    ok(r.authorizedCategories.includes(m.category)&&m.id.startsWith(m.category+".")&&/\.(current|snapshot)$/.test(m.id),"Metric scope");
    range(m.range);ok(inRange(m.range,r.period),"Metric outside authorized range");text(m.unit,"unit",48);
    ok(m.value===null||(typeof m.value==="number"&&Number.isFinite(m.value)&&(m.unit==="percent"||Number.isSafeInteger(m.value))),"Invalid metric value");
    if(m.sampleCount!==null)integer(m.sampleCount,"sample count");text(m.coverage,"metric coverage",300);ok(m.definitionVersion===1,"Metric version");
  }
  const evIds=new Set(),counts=Object.fromEntries(r.authorizedCategories.map(k=>[k,0]));
  for(const e of r.evidence){
    exact(e,["id","category","date","data"],"evidence");
    text(e.id,"evidence ID",128);ok(!evIds.has(e.id),"Duplicate evidence");evIds.add(e.id);
    ok(r.authorizedCategories.includes(e.category),"Evidence scope");dayNumber(e.date);ok(e.date>=r.period.from&&e.date<=r.period.through,"Evidence outside range");
    exact(e.data,rawKeys[e.category],"evidence data");const d=e.data;counts[e.category]++;
    switch(e.category){
      case "money":ok(["income","expense"].includes(d.kind),"Invalid money evidence");integer(d.amountMinor,"amount",1,10000000000);text(d.category,"category",48);break;
      case "learning":text(d.topic,"topic",120);integer(d.minutes,"minutes",1,1440);break;
      case "tasks":ok(["completed","reopened"].includes(d.kind),"Invalid task evidence");text(d.taskId,"task ID",128);utc(d.occurredAt);ok(d.occurredAt<=r.asOf,"Future event");break;
      case "journal":text(d.reflection,"reflection",2000);stringList(d.tags,"tags",12,48);break;
      case "goals":text(d.title,"goal title",120);ok(["savings","general"].includes(d.kind),"Invalid goal kind");text(d.unit,"unit",48);integer(d.target,"target");integer(d.progress,"progress");ok(e.date===r.today,"Goal snapshot date");break;
      case "habits":text(d.habitId,"habit ID",128);ok(["completed","skipped"].includes(d.status),"Invalid habit evidence");break;
    }
  }
  exact(r.coverage,["note","raw"],"coverage");text(r.coverage.note,"coverage",500);
  exact(r.coverage.raw,r.authorizedCategories,"coverage categories");
  for(const k of r.authorizedCategories){
    const x=r.coverage.raw[k];exact(x,["available","included","omitted"],"coverage counts");integer(x.available,"available");integer(x.included,"included");integer(x.omitted,"omitted");
    ok(x.included===counts[k]&&x.available-x.included===x.omitted,"Inconsistent coverage");
  }
  if(r.optionalPreviousPlan!==null){
    const p=r.optionalPreviousPlan;exact(p,["id","savedAt","sourceCategories","actions"],"prior plan");text(p.id,"plan ID",128);utc(p.savedAt);ok(p.savedAt<r.asOf,"Prior plan time");
    categories(p.sourceCategories);ok(p.sourceCategories.every(k=>r.authorizedCategories.includes(k))&&r.authorizedCategories.includes("tasks"),"Prior plan scope");
    ok(Array.isArray(p.actions)&&p.actions.length>0&&p.actions.length<=5,"Prior plan actions");
    const seen=new Set();
    for(const a of p.actions){
      exact(a,["id","title","taskId","laterEvents"],"prior action");text(a.id,"action ID",128);ok(!seen.has(a.id),"Duplicate prior action");seen.add(a.id);text(a.title,"title",120);text(a.taskId,"task ID",128);
      ok(Array.isArray(a.laterEvents)&&a.laterEvents.length<=20,"Prior action has too many later events; reduce date range");
      for(const e of a.laterEvents){
        exact(e,["kind","occurredAt","localDate"],"later event");ok(["completed","reopened"].includes(e.kind),"Invalid event");utc(e.occurredAt);dayNumber(e.localDate);
        ok(e.occurredAt>p.savedAt&&e.occurredAt<=r.asOf&&e.localDate>=r.period.from&&e.localDate<=r.period.through,"Invalid later evidence");
      }
    }
  }
  ok(utf8Bytes(r)<=MAX_REQUEST_BYTES,"Request exceeds byte ceiling");return true;
}
/** Plain text only. Do not render as HTML or clickable Markdown; narrative remains unverified. */
function narrative(v,label,max){
  text(v,label,max);ok(!/[<>]|https?:\/\/|javascript:|data:|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/i.test(v),"Unsafe narrative");
}
export function validateResult(result,request){
  validateRequest(request);
  exact(result,["schemaVersion","summary","findings","actions","followUp"],"result");
  ok(result.schemaVersion===1,"Unsupported result version");narrative(result.summary,"summary",1600);
  const metricMap=new Map(request.metrics.map(m=>[m.id,m]));
  function refs(a){stringList(a,"metric references",8,1024,1);for(const id of a)ok(metricMap.has(id),"Unknown metric reference");}
  ok(Array.isArray(result.findings)&&result.findings.length>=1&&result.findings.length<=5,"Invalid findings");
  for(const f of result.findings){
    exact(f,["metricIds","interpretation","confidence","limitation"],"finding");refs(f.metricIds);narrative(f.interpretation,"interpretation",800);narrative(f.limitation,"limitation",400);ok(["limited","moderate","high"].includes(f.confidence),"Invalid confidence");
  }
  ok(Array.isArray(result.actions)&&result.actions.length<=5,"Invalid actions");
  const seen=new Set();
  for(const a of result.actions){
    exact(a,["id","title","reasonMetricIds","target","dueDate"],"action");text(a.id,"action ID",60);ok(/^[A-Za-z0-9_-]+$/.test(a.id)&&!seen.has(a.id),"Invalid/duplicate action ID");seen.add(a.id);
    narrative(a.title,"action title",120);refs(a.reasonMetricIds);dayNumber(a.dueDate);ok(a.dueDate>=request.today&&a.dueDate<=shiftDay(request.today,365),"Action date outside allowed range");
    exact(a.target,["metricId","quantity","unit"],"action target");const m=metricMap.get(a.target.metricId);
    ok(m&&a.reasonMetricIds.includes(m.id)&&m.value!==null&&m.unit!=="percent"&&a.target.unit===m.unit,"Invalid target metric/unit");
    integer(a.target.quantity,"target quantity",0,10000000000);
  }
  exact(result.followUp,["measurement","limitations"],"follow-up");narrative(result.followUp.measurement,"measurement",500);
  stringList(result.followUp.limitations,"limitations",5,400,1);for(const v of result.followUp.limitations)narrative(v,"limitation",400);
  ok(utf8Bytes(result)<=MAX_RESPONSE_BYTES,"Response exceeds byte ceiling");return true;
}
export function validateAiCollections(w){
  const c=w.collections,analyses=new Map(),plans=new Map(),actions=new Map();
  for(const a of c.analyses){
    if(a.legacyReadOnly===true)continue;
    exact(a,["id","createdAt","request","result","status"],"analysis");
    text(a.id,"analysis ID",128);utc(a.createdAt);validateResult(a.result,a.request);
    ok(a.id===a.request.requestId&&a.createdAt>=a.request.asOf&&a.request.snapshotRevision<w.revision&&a.status==="validated","Invalid analysis provenance");analyses.set(a.id,a);
  }
  for(const p of c.plans){
    if(p.legacyReadOnly===true)continue;
    exact(p,["id","analysisId","sourceCategories","savedAt","actions"],"plan");text(p.id,"plan ID",128);text(p.analysisId,"analysis ID",128);utc(p.savedAt);const a=analyses.get(p.analysisId);
    ok(a&&p.savedAt>=a.createdAt&&equal(p.sourceCategories,a.request.authorizedCategories),"Invalid plan provenance");
    stringList(p.actions,"plan action IDs",5,128,1);plans.set(p.id,p);
  }
  for(const a of c.planActions){
    exact(a,["id","planId","sourceActionId","title","dueDate","target","status","taskId"],"plan action");
    const p=plans.get(a.planId);ok(p&&p.actions.includes(a.id),"Orphan plan action");text(a.sourceActionId,"source action ID",60);
    const source=analyses.get(p.analysisId).result.actions.find(x=>x.id===a.sourceActionId);
    ok(source&&equal(source.target,a.target),"Invalid action provenance");narrative(a.title,"title",120);dayNumber(a.dueDate);
    ok(["proposed","accepted","completed","dismissed"].includes(a.status),"Invalid action status");
    const linked=c.tasks.filter(t=>t.sourceActionId===a.id);
    if(a.status==="accepted"||a.status==="completed"){
      ok(linked.length===1&&linked[0].id===a.taskId&&linked[0].createdAt!==null&&linked[0].createdAt>=p.savedAt&&linked[0].status===(a.status==="completed"?"done":"open"),"Invalid action/task link");
    }else ok(a.taskId===null&&linked.length===0,"Unexpected task link");
    actions.set(a.id,a);
  }
  const used=new Set();
  for(const p of plans.values())for(const id of p.actions){
    const a=actions.get(id);ok(a&&a.planId===p.id,"Missing plan action");
    const key=JSON.stringify([p.analysisId,a.sourceActionId]);ok(!used.has(key),"Duplicate source action");used.add(key);
  }
  for(const t of c.tasks)if(t.sourceActionId!==null)ok(actions.has(t.sourceActionId),"Orphan linked task");
  return true;
}
