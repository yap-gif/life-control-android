import {dayNumber} from "./calendar.js";
export const LEGACY_KEY="life-control-anna:v1",WORKSPACE_KEY="life-control-anna:v2";
export const COLLECTIONS=Object.freeze(["tasks","taskEvents","transactions","budgets","learning","journal","goals","milestones","habits","habitCheckins","analyses","plans","planActions"]);
const CATS=["tasks","money","learning","journal"];
function assert(ok,msg){if(!ok)throw new Error(msg);}
function object(v,label){assert(v&&typeof v==="object"&&!Array.isArray(v),"Invalid "+label);return v;}
function fields(v,allowed,label){object(v,label);assert(Object.keys(v).every(k=>allowed.includes(k)),"Unknown fields in "+label);}
function str(v,label,max){assert(typeof v==="string"&&v.trim()&&v.length<=max,"Invalid "+label);return v;}
function date(v){dayNumber(v);return v;}
function count(v,label,min=0,max=Number.MAX_SAFE_INTEGER){assert(Number.isSafeInteger(v)&&v>=min&&v<=max,"Invalid "+label);return v;}
export function canonicalJSON(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert(Number.isFinite(v),"Non-finite JSON number");return JSON.stringify(v);}
  if(Array.isArray(v)){assert(Object.keys(v).length===v.length,"Sparse or extended array");return "["+v.map(canonicalJSON).join(",")+"]";}
  object(v,"JSON object");
  assert(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null,"Non-JSON object");
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonicalJSON(v[k])).join(",")+"}";
}
export function utf8Bytes(v){return new TextEncoder().encode(canonicalJSON(v)).length;}
export function myrToMinor(v){
  assert(typeof v==="number"||typeof v==="string","Invalid legacy MYR amount");
  const s=String(v);
  assert(/^\d+(?:\.\d{1,2})?$/.test(s),"Legacy amount has ambiguous precision or sign");
  const [whole,fraction=""]=s.split(".");
  const n=BigInt(whole)*100n+BigInt(fraction.padEnd(2,"0"));
  assert(n<=10000000000n,"Legacy amount exceeds supported limit");
  return Number(n);
}
export function emptyWorkspace({timezone,legacyEtag=null,migrationId}){
  str(timezone,"timezone",100);new Intl.DateTimeFormat("en",{timeZone:timezone});
  str(migrationId,"migration ID",128);
  return {schemaVersion:2,revision:0,lastOperationId:null,
    migration:{id:migrationId,legacyEtag,legacyCounts:null},
    settings:{currency:"MYR",weekStart:"Monday",timezone,learningWeeklyTargetMinutes:null},
    collections:Object.fromEntries(COLLECTIONS.map(k=>[k,[]]))};
}
function mapRecords(raw,k,allowed,map){
  assert(Array.isArray(raw[k]),"Missing legacy collection "+k);
  const ids=new Set();
  return raw[k].map(v=>{
    fields(v,allowed,k);const id=str(v.id,"legacy ID",60);
    assert(!ids.has(id),"Duplicate legacy ID in "+k);ids.add(id);
    return map(v,id);
  });
}
function legacyReport(v,type){
  if(v==null)return null;
  const key=type==="analysis"?"generatedAt":"savedAt";
  fields(v,[key,"text","categories"],"legacy "+type);
  const d=date(v[key]);const text=str(v.text,"legacy report text",6000);
  assert(Array.isArray(v.categories)&&v.categories.length>0&&v.categories.every(x=>CATS.includes(x))&&new Set(v.categories).size===v.categories.length,"Invalid legacy categories");
  // Old Money prompts included the savings forecast, now a distinct category.
  const scope=[...v.categories];if(scope.includes("money"))scope.push("goals");
  return {id:"legacy-"+type,legacyDate:d,legacyText:text,legacyCategories:[...v.categories],sourceCategories:scope,
    createdAt:null,legacyReadOnly:true,mayResend:false};
}
export function migrateLegacy(raw,{legacyEtag,timezone,migrationId}){
  str(legacyEtag,"legacy etag",512);
  fields(raw,["version","tasks","money","learning","journal","goal","savedPlan","lastReview"],"legacy workspace");
  assert(raw.version===1,"Unsupported legacy version");
  const w=emptyWorkspace({timezone,legacyEtag,migrationId}),c=w.collections;
  c.tasks=mapRecords(raw,"tasks",["id","title","date","done"],(v,id)=>{
    assert(typeof v.done==="boolean","Invalid legacy task state");
    return {id,title:str(v.title,"title",120),dueDate:date(v.date),priority:"normal",status:v.done?"done":"open",createdAt:null,updatedAt:null,sourceActionId:null};
  });
  c.transactions=mapRecords(raw,"money",["id","date","amount","type","category"],(v,id)=>{
    assert(["income","expense"].includes(v.type),"Invalid transaction type");
    return {id,date:date(v.date),kind:v.type,amountMinor:count(myrToMinor(v.amount),"amount",1),category:str(v.category,"category",48),note:null};
  });
  c.learning=mapRecords(raw,"learning",["id","date","topic","minutes"],(v,id)=>({id,date:date(v.date),topic:str(v.topic,"topic",120),minutes:count(v.minutes,"minutes",1,1440),note:null}));
  c.journal=mapRecords(raw,"journal",["id","date","text"],(v,id)=>({id,date:date(v.date),reflection:str(v.text,"reflection",2000),tags:[]}));
  // A malformed or duplicate day must not be silently merged.
  assert(new Set(c.journal.map(x=>x.date)).size===c.journal.length,"Duplicate journal day requires reconciliation");
  fields(raw.goal,["goal","saved","monthly"],"legacy savings");
  c.goals=[{id:"legacy-savings",title:"Savings",kind:"savings",unit:"MYR_sen",target:myrToMinor(raw.goal.goal),progress:myrToMinor(raw.goal.saved),plannedMonthlyMinor:myrToMinor(raw.goal.monthly),dueDate:null}];
  const a=legacyReport(raw.lastReview,"analysis"),p=legacyReport(raw.savedPlan,"plan");
  if(a)c.analyses.push({...a,status:"legacy-read-only",selectedCategories:a.sourceCategories});
  if(p)c.plans.push({...p,analysisId:null,savedAt:null,actions:[]});
  w.migration.legacyCounts={tasks:c.tasks.length,money:c.transactions.length,learning:c.learning.length,journal:c.journal.length,goal:1,lastReview:a?1:0,savedPlan:p?1:0};
  validateWorkspaceEnvelope(w);
  return w;
}
/** Phase 02 envelope validation. P03 must add exhaustive per-entity schemas before
 * accepting arbitrary domain edits. Not a license to write a live workspace. */
export function validateWorkspaceEnvelope(w){
  object(w,"workspace");assert(w.schemaVersion===2,"Unsupported workspace schema");count(w.revision,"revision");
  assert(w.lastOperationId===null||typeof w.lastOperationId==="string"&&w.lastOperationId.trim(),"Invalid operation ID");
  object(w.migration,"migration");str(w.migration.id,"migration ID",128);
  assert(w.migration.legacyEtag===null||typeof w.migration.legacyEtag==="string"&&w.migration.legacyEtag.trim(),"Invalid legacy etag");
  object(w.settings,"settings");assert(w.settings.currency==="MYR"&&w.settings.weekStart==="Monday","Invalid settings");
  str(w.settings.timezone,"timezone",100);new Intl.DateTimeFormat("en",{timeZone:w.settings.timezone});
  fields(w.collections,COLLECTIONS,"collections");
  for(const k of COLLECTIONS){assert(Array.isArray(w.collections[k]),"Missing collection "+k);const seen=new Set();
    for(const row of w.collections[k]){object(row,k);
      const id=k==="habitCheckins"?JSON.stringify([str(row.habitId,"habit ID",128),date(row.date)]):str(row.id,"entity ID",128);
      assert(!seen.has(id),"Duplicate entity in "+k);seen.add(id);
    }}
  canonicalJSON(w);return true;
}
