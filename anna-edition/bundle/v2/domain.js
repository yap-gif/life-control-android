import {validateWorkspaceEnvelope,canonicalJSON} from "./workspace.js";
import {dayNumber,weekday} from "./calendar.js";

const own=(o,k)=>Object.hasOwn(o,k);
const fail=(message)=>{throw new Error(message);};
const check=(ok,message)=>{if(!ok)fail(message);};
function shape(o,keys,label){
  check(o&&typeof o==="object"&&!Array.isArray(o)&&(Object.getPrototypeOf(o)===Object.prototype||Object.getPrototypeOf(o)===null),"Invalid "+label);
  check(Object.keys(o).length===keys.length&&keys.every(k=>own(o,k)),"Unexpected/missing fields: "+label);
}
function string(v,label,max=128){check(typeof v==="string"&&v.trim().length>0&&v.length<=max,"Invalid "+label);}
function nullableString(v,label,max){if(v!==null)string(v,label,max);}
function num(v,label,min=0,max=Number.MAX_SAFE_INTEGER){check(Number.isSafeInteger(v)&&v>=min&&v<=max,"Invalid "+label);}
function one(v,values,label){check(values.includes(v),"Invalid "+label);}
function date(v){dayNumber(v);}
function optionalDate(v){if(v!==null)date(v);}
function timestamp(v){
  check(typeof v==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v,"Invalid UTC timestamp");
  date(v.slice(0,10));
}
function optionalTimestamp(v){if(v!==null)timestamp(v);}
function timezone(v){string(v,"timezone",100);new Intl.DateTimeFormat("en",{timeZone:v});}
export function localDay(instant,zone){
  timestamp(instant);timezone(zone);
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:zone,calendar:"gregory",numberingSystem:"latn",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(instant));
  const get=t=>parts.find(p=>p.type===t).value;
  const day=get("year").padStart(4,"0")+"-"+get("month")+"-"+get("day");date(day);return day;
}
export const labelKey=v=>v.trim().normalize("NFC").toLowerCase();
function uniqueStrings(v,label,maxItems,maxLength){
  check(Array.isArray(v)&&v.length<=maxItems,"Invalid "+label);
  for(const x of v)string(x,label,maxLength);
  check(new Set(v.map(labelKey)).size===v.length,"Duplicate "+label);
}
function uniqueBy(rows,key,label){const s=new Set();for(const r of rows){const k=key(r);check(!s.has(k),"Duplicate "+label);s.add(k);}}
const moneyMax=10000000000;
const baseCats=["tasks","money","learning","journal"];
const ids=(a)=>new Map(a.map(r=>[r.id,r]));
const fields={
  tasks:["id","title","dueDate","priority","status","createdAt","updatedAt","sourceActionId"],
  taskEvents:["id","taskId","kind","occurredAt","localDate","timezone"],
  transactions:["id","date","kind","amountMinor","category","note"],
  budgets:["id","month","category","limitMinor"],
  learning:["id","date","topic","minutes","note"],
  journal:["id","date","reflection","tags"],
  goals:["id","title","kind","unit","target","progress","plannedMonthlyMinor","dueDate"],
  milestones:["id","goalId","title","targetDate","done","completedAt"],
  habits:["id","title","scheduledWeekdays","startDate","archivedAt"],
  habitCheckins:["habitId","date","status"]
};
function legacyHistory(r,type){
  const common=["id","legacyDate","legacyText","legacyCategories","sourceCategories","createdAt","legacyReadOnly","mayResend"];
  shape(r,[...common,...(type==="analysis"?["status","selectedCategories"]:["analysisId","savedAt","actions"])],type);
  check(r.id==="legacy-"+type&&r.legacyReadOnly===true&&r.mayResend===false&&r.createdAt===null,"Invalid legacy history");
  date(r.legacyDate);string(r.legacyText,"legacy text",6000);
  uniqueStrings(r.legacyCategories,"legacy categories",4,20);
  check(r.legacyCategories.length>0&&r.legacyCategories.every(x=>baseCats.includes(x)),"Invalid legacy scope");
  const scope=[...r.legacyCategories];if(scope.includes("money"))scope.push("goals");
  check(canonicalJSON(scope)===canonicalJSON(r.sourceCategories),"Invalid legacy source scope");
  if(type==="analysis")check(r.status==="legacy-read-only"&&canonicalJSON(scope)===canonicalJSON(r.selectedCategories),"Invalid legacy analysis");
  else check(r.analysisId===null&&r.savedAt===null&&Array.isArray(r.actions)&&r.actions.length===0,"Invalid legacy plan");
}
/** Exhaustive for P03: structured AI histories/actions deliberately rejected until P04 defines and validates them. */
export function validateDomain(w){
  validateWorkspaceEnvelope(w);
  shape(w,["schemaVersion","revision","lastOperationId","migration","settings","collections"],"workspace");
  check((w.revision===0)===(w.lastOperationId===null),"Invalid revision/operation pair");
  if(w.lastOperationId!==null)string(w.lastOperationId,"operation ID");
  const m=w.migration;shape(m,["id","legacyEtag","legacyCounts"],"migration");
  if(m.legacyEtag===null)check(m.legacyCounts===null,"Unexpected legacy counts");
  else{
    string(m.legacyEtag,"legacy etag",512);
    shape(m.legacyCounts,["tasks","money","learning","journal","goal","lastReview","savedPlan"],"legacy counts");
    for(const k of ["tasks","money","learning","journal"])num(m.legacyCounts[k],"legacy count");
    check(m.legacyCounts.goal===1,"Invalid legacy goal count");num(m.legacyCounts.lastReview,"review count",0,1);num(m.legacyCounts.savedPlan,"plan count",0,1);
  }
  shape(w.settings,["currency","weekStart","timezone","learningWeeklyTargetMinutes"],"settings");
  if(w.settings.learningWeeklyTargetMinutes!==null)num(w.settings.learningWeeklyTargetMinutes,"weekly target",1,10080);
  const c=w.collections;
  for(const [name,keys] of Object.entries(fields))for(const r of c[name])shape(r,keys,name);
  for(const t of c.tasks){
    string(t.title,"task title",120);optionalDate(t.dueDate);one(t.priority,["low","normal","high"],"priority");one(t.status,["open","done"],"task status");
    optionalTimestamp(t.createdAt);optionalTimestamp(t.updatedAt);
    if(t.createdAt!==null)check(t.updatedAt!==null&&t.updatedAt>=t.createdAt,"Invalid task chronology");
    else check(m.legacyEtag!==null,"Unknown creation time only allowed after migration");
    check(t.sourceActionId===null,"AI task links reserved for P04");
  }
  const tasks=ids(c.tasks),last=new Map();
  // Append order is authoritative for equal timestamps; reject reversed time and impossible transitions.
  for(const e of c.taskEvents){
    string(e.taskId,"task ID");check(tasks.has(e.taskId),"Orphan task event");
    one(e.kind,["completed","reopened"],"task event kind");timestamp(e.occurredAt);date(e.localDate);timezone(e.timezone);
    check(localDay(e.occurredAt,e.timezone)===e.localDate,"Event date/timezone mismatch");
    const t=tasks.get(e.taskId),p=last.get(e.taskId);
    check(t.updatedAt!==null&&e.occurredAt<=t.updatedAt&&(t.createdAt===null||e.occurredAt>=t.createdAt),"Event outside task lifetime");
    if(p)check(e.occurredAt>=p.occurredAt&&e.kind!==p.kind,"Invalid event sequence");
    else if(t.createdAt!==null)check(e.kind==="completed","New task must complete before reopening");
    last.set(e.taskId,e);
  }
  for(const t of c.tasks){
    const e=last.get(t.id);
    if(e)check(t.status===(e.kind==="completed"?"done":"open"),"Task status/event mismatch");
    else if(t.createdAt!==null)check(t.status==="open","New completed task needs event");
  }
  for(const r of c.transactions){date(r.date);one(r.kind,["income","expense"],"transaction kind");num(r.amountMinor,"amount",1,moneyMax);string(r.category,"category",48);nullableString(r.note,"note",500);}
  for(const b of c.budgets){check(typeof b.month==="string"&&/^\d{4}-\d{2}$/.test(b.month),"Invalid budget month");date(b.month+"-01");string(b.category,"budget category",48);num(b.limitMinor,"budget",0,moneyMax);}
  uniqueBy(c.budgets,b=>JSON.stringify([b.month,labelKey(b.category)]),"monthly budget");
  for(const r of c.learning){date(r.date);string(r.topic,"topic",120);num(r.minutes,"minutes",1,1440);nullableString(r.note,"note",500);}
  for(const r of c.journal){date(r.date);string(r.reflection,"reflection",2000);uniqueStrings(r.tags,"tags",12,48);}
  uniqueBy(c.journal,r=>r.date,"journal day");
  for(const g of c.goals){
    string(g.title,"goal title",120);one(g.kind,["savings","general"],"goal kind");string(g.unit,"unit",48);optionalDate(g.dueDate);
    num(g.target,"goal target",0,moneyMax);num(g.progress,"goal progress",0,moneyMax);num(g.plannedMonthlyMinor,"monthly contribution",0,moneyMax);
    if(g.kind==="savings")check(g.unit==="MYR_sen","Invalid savings unit");
    else check(g.unit!=="MYR_sen"&&g.plannedMonthlyMinor===0,"General goal cannot use savings forecast");
  }
  const goals=ids(c.goals);
  for(const r of c.milestones){string(r.goalId,"goal ID");check(goals.has(r.goalId),"Orphan milestone");string(r.title,"milestone title",120);optionalDate(r.targetDate);check(typeof r.done==="boolean","Invalid milestone status");optionalTimestamp(r.completedAt);check(r.done===(r.completedAt!==null),"Milestone status/time mismatch");}
  const habits=ids(c.habits);
  for(const h of c.habits){
    string(h.title,"habit title",120);date(h.startDate);optionalDate(h.archivedAt);
    check(h.archivedAt===null||h.archivedAt>=h.startDate,"Invalid archive date");
    check(Array.isArray(h.scheduledWeekdays)&&h.scheduledWeekdays.length>=1&&h.scheduledWeekdays.length<=7,"Invalid habit schedule");
    for(const n of h.scheduledWeekdays)num(n,"weekday",1,7);
    check(new Set(h.scheduledWeekdays).size===h.scheduledWeekdays.length,"Duplicate weekday");
  }
  for(const r of c.habitCheckins){
    const h=habits.get(r.habitId);check(h,"Orphan habit checkin");date(r.date);one(r.status,["completed","skipped"],"checkin status");
    check(r.date>=h.startDate&&(h.archivedAt===null||r.date<h.archivedAt)&&h.scheduledWeekdays.includes(weekday(r.date)),"Checkin outside active schedule");
  }
  for(const a of c.analyses)legacyHistory(a,"analysis");
  for(const p of c.plans)legacyHistory(p,"plan");
  check(c.planActions.length===0,"Structured AI actions reserved for P04");
  if(c.analyses.length||c.plans.length)check(m.legacyEtag!==null,"Legacy history requires migration");
  return true;
}

const payloadFields={
  transactions:["date","kind","amountMinor","category","note"],
  budgets:["month","category","limitMinor"],
  learning:["date","topic","minutes","note"],
  journal:["date","reflection","tags"],
  goals:["title","kind","unit","target","progress","plannedMonthlyMinor","dueDate"]
};
const find=(c,k,id)=>{string(id,"entity ID");const r=c[k].find(x=>x.id===id);check(r,"Missing "+k+" entity");return r;};
function insert(c,k,r){string(r.id,"entity ID");check(!c[k].some(x=>x.id===r.id),"Duplicate entity ID");c[k].push(r);}
function erase(c,k,id){find(c,k,id);c[k]=c[k].filter(x=>x.id!==id);}
function actual(d,today){date(d);check(d<=today,"Future actual record");}
function copy(v){return JSON.parse(canonicalJSON(v));}
function deletionConsent(w,cmd){
  check(cmd.confirm===true,"Explicit deletion confirmation required");
  // The preserved v1 key and legacy history can contain sensitive copies.
  if(w.migration.legacyEtag!==null||w.collections.analyses.length||w.collections.plans.length)
    check(cmd.retainHistoricalCopies===true,"Historical copies may remain; explicit retention acknowledgement required");
}
/** Pure command preparation. Never a save acknowledgement. Caller supplies the immutable
 * expected revision, operation ID, UTC instant and collision-resistant IDs. No host access. */
export function prepareCommand(previous,command,{expectedRevision,operationId,now}){
  validateDomain(previous);num(expectedRevision,"expected revision");check(expectedRevision===previous.revision,"Stale revision");
  string(operationId,"operation ID");check(operationId!==previous.lastOperationId,"Duplicate operation");
  timestamp(now);const today=localDay(now,previous.settings.timezone),w=copy(previous),c=w.collections;
  check(command&&typeof command.type==="string","Invalid command");
  const cmd=copy(command);
  switch(cmd.type){
    case "record.add":
    case "record.edit":{
      shape(cmd,["type","collection","id","data"],"record command");
      check(own(payloadFields,cmd.collection),"Unsupported record collection");
      const k=cmd.collection;shape(cmd.data,payloadFields[k],k);
      if(["transactions","learning","journal"].includes(k))actual(cmd.data.date,today);
      if(cmd.type==="record.add")insert(c,k,{id:cmd.id,...cmd.data});
      else{
        const r=find(c,k,cmd.id);
        if(k==="goals")check(r.kind===cmd.data.kind&&r.unit===cmd.data.unit,"Goal kind/unit immutable; create a new goal");
        Object.assign(r,cmd.data);
      }
      break;
    }
    case "record.delete":{
      shape(cmd,["type","collection","id","confirm","retainHistoricalCopies"],"delete command");
      check(own(payloadFields,cmd.collection),"Unsupported record collection");deletionConsent(w,cmd);
      if(cmd.collection==="goals")c.milestones=c.milestones.filter(r=>r.goalId!==cmd.id);
      erase(c,cmd.collection,cmd.id);break;
    }
    case "task.add":{
      shape(cmd,["type","id","title","dueDate","priority"],"task add");
      insert(c,"tasks",{id:cmd.id,title:cmd.title,dueDate:cmd.dueDate,priority:cmd.priority,status:"open",createdAt:now,updatedAt:now,sourceActionId:null});break;
    }
    case "task.edit":{
      shape(cmd,["type","id","title","dueDate","priority"],"task edit");
      const t=find(c,"tasks",cmd.id);check(t.updatedAt===null||now>=t.updatedAt,"Task clock moved backwards");
      Object.assign(t,{title:cmd.title,dueDate:cmd.dueDate,priority:cmd.priority,updatedAt:now});break;
    }
    case "task.transition":{
      shape(cmd,["type","id","eventId","status"],"task transition");
      const t=find(c,"tasks",cmd.id);one(cmd.status,["open","done"],"task status");
      check(t.status!==cmd.status,"Task already in requested state");check(t.updatedAt===null||now>=t.updatedAt,"Task clock moved backwards");
      insert(c,"taskEvents",{id:cmd.eventId,taskId:t.id,kind:cmd.status==="done"?"completed":"reopened",occurredAt:now,localDate:today,timezone:w.settings.timezone});
      t.status=cmd.status;t.updatedAt=now;break;
    }
    case "task.delete":{
      shape(cmd,["type","id","confirm","retainHistoricalCopies"],"task delete");deletionConsent(w,cmd);
      erase(c,"tasks",cmd.id);c.taskEvents=c.taskEvents.filter(r=>r.taskId!==cmd.id);break;
    }
    case "learning.target":{
      shape(cmd,["type","minutes"],"learning target");w.settings.learningWeeklyTargetMinutes=cmd.minutes;break;
    }
    case "milestone.add":{
      shape(cmd,["type","id","goalId","title","targetDate"],"milestone add");find(c,"goals",cmd.goalId);
      insert(c,"milestones",{id:cmd.id,goalId:cmd.goalId,title:cmd.title,targetDate:cmd.targetDate,done:false,completedAt:null});break;
    }
    case "milestone.edit":{
      shape(cmd,["type","id","title","targetDate"],"milestone edit");
      Object.assign(find(c,"milestones",cmd.id),{title:cmd.title,targetDate:cmd.targetDate});break;
    }
    case "milestone.transition":{
      shape(cmd,["type","id","done"],"milestone transition");const r=find(c,"milestones",cmd.id);
      check(typeof cmd.done==="boolean"&&r.done!==cmd.done,"Invalid milestone transition");r.done=cmd.done;r.completedAt=cmd.done?now:null;break;
    }
    case "milestone.delete":{
      shape(cmd,["type","id","confirm","retainHistoricalCopies"],"milestone delete");deletionConsent(w,cmd);erase(c,"milestones",cmd.id);break;
    }
    case "habit.add":{
      shape(cmd,["type","id","title","scheduledWeekdays","startDate"],"habit add");date(cmd.startDate);
      check(cmd.startDate>=today,"New habit cannot retroactively define a schedule");
      insert(c,"habits",{id:cmd.id,title:cmd.title,scheduledWeekdays:cmd.scheduledWeekdays,startDate:cmd.startDate,archivedAt:null});break;
    }
    case "habit.rename":{
      shape(cmd,["type","id","title"],"habit rename");find(c,"habits",cmd.id).title=cmd.title;break;
    }
    case "habit.archive":{
      shape(cmd,["type","id","effectiveDate"],"habit archive");const h=find(c,"habits",cmd.id);date(cmd.effectiveDate);
      check(h.archivedAt===null&&cmd.effectiveDate>=today,"Invalid archive request");h.archivedAt=cmd.effectiveDate;break;
    }
    case "habit.checkin":{
      shape(cmd,["type","habitId","date","status"],"habit checkin");find(c,"habits",cmd.habitId);actual(cmd.date,today);
      check(!c.habitCheckins.some(r=>r.habitId===cmd.habitId&&r.date===cmd.date),"Checkin exists; edit explicitly");
      c.habitCheckins.push({habitId:cmd.habitId,date:cmd.date,status:cmd.status});break;
    }
    case "habit.checkin.edit":{
      shape(cmd,["type","habitId","date","status"],"checkin edit");actual(cmd.date,today);
      const r=c.habitCheckins.find(r=>r.habitId===cmd.habitId&&r.date===cmd.date);check(r,"Missing checkin");r.status=cmd.status;break;
    }
    case "habit.checkin.delete":{
      shape(cmd,["type","habitId","date","confirm","retainHistoricalCopies"],"checkin delete");deletionConsent(w,cmd);date(cmd.date);
      const n=c.habitCheckins.length;c.habitCheckins=c.habitCheckins.filter(r=>r.habitId!==cmd.habitId||r.date!==cmd.date);check(c.habitCheckins.length!==n,"Missing checkin");break;
    }
    case "habit.delete":{
      shape(cmd,["type","id","confirm","retainHistoricalCopies"],"habit delete");deletionConsent(w,cmd);erase(c,"habits",cmd.id);c.habitCheckins=c.habitCheckins.filter(r=>r.habitId!==cmd.id);break;
    }
    default:fail("Unsupported command");
  }
  w.revision++;w.lastOperationId=operationId;validateDomain(w);
  return {previous:copy(previous),next:w,operationId};
}
