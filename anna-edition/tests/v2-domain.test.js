import test from "node:test";
import assert from "node:assert/strict";
import {emptyWorkspace,migrateLegacy,canonicalJSON} from "../bundle/v2/workspace.js";
import {validateDomain,prepareCommand,localDay} from "../bundle/v2/domain.js";
import {selectPage} from "../bundle/v2/selectors.js";
import {buildReport} from "../bundle/v2/reporting.js";
import {createWorkspaceRepository} from "../bundle/v2/repository.js";
const opts={timezone:"Asia/Kuching",migrationId:"m1"};
const fresh=()=>emptyWorkspace(opts);
const now="2026-11-23T16:30:00.000Z";
function apply(w,cmd,instant=now){
  return prepareCommand(w,cmd,{expectedRevision:w.revision,operationId:"op"+(w.revision+1),now:instant}).next;
}
const add=(collection,id,data)=>({type:"record.add",collection,id,data});
const del=(collection,id,retainHistoricalCopies=false)=>({type:"record.delete",collection,id,confirm:true,retainHistoricalCopies});
const tx=(category="Food",amountMinor=1234,date="2026-11-24")=>({date,kind:"expense",amountMinor,category,note:null});
const goal={title:"Savings",kind:"savings",unit:"MYR_sen",target:100000,progress:2500,plannedMonthlyMinor:1000,dueDate:null};
const legacy=()=>({version:1,tasks:[{id:"t",title:"Legacy task",date:"2026-11-20",done:true}],money:[{id:"m",date:"2026-11-20",amount:12.34,type:"expense",category:"Food"}],learning:[{id:"l",date:"2026-11-20",topic:"Kotlin",minutes:30}],journal:[{id:"j",date:"2026-11-20",text:"reflection"}],goal:{goal:1000,saved:25.50,monthly:100},lastReview:{generatedAt:"2026-11-20",text:"Report",categories:["money"]},savedPlan:{savedAt:"2026-11-20",text:"Plan",categories:["learning"]}});
const migrated=()=>migrateLegacy(legacy(),{...opts,legacyEtag:"e1"});
test("fresh and migrated workspaces pass exhaustive P03 validation",()=>{
  assert.equal(validateDomain(fresh()),true);assert.equal(validateDomain(migrated()),true);
});
test("reject unknown fields and missing required fields in workspace and records",()=>{
  const w=fresh();w.extra=true;assert.throws(()=>validateDomain(w));
  const a=apply(fresh(),add("transactions","m",tx()));a.collections.transactions[0].extra=1;assert.throws(()=>validateDomain(a));
  delete a.collections.transactions[0].extra;delete a.collections.transactions[0].note;assert.throws(()=>validateDomain(a));
});
test("financial CRUD is immutable, exact and reports recalculate",()=>{
  const w=fresh(),before=canonicalJSON(w);
  let n=apply(w,add("transactions","m",tx()));assert.equal(canonicalJSON(w),before);
  n=apply(n,{type:"record.edit",collection:"transactions",id:"m",data:tx("Food",1001)});
  const r=buildReport(n,{kind:"month"},"2026-11-24",["money"]);
  assert.equal(r.current.money.expenseMinor,1001);
  n=apply(n,del("transactions","m"));assert.equal(n.collections.transactions.length,0);
});
test("invalid money, future activity, duplicates and unsupported fields fail closed",()=>{
  for(const amount of [0,-1,0.1,10000000001,NaN])assert.throws(()=>apply(fresh(),add("transactions","m",tx("Food",amount))));
  assert.throws(()=>apply(fresh(),add("transactions","m",tx("Food",1,"2026-11-25"))),/Future/);
  const w=apply(fresh(),add("transactions","m",tx()));
  assert.throws(()=>apply(w,add("transactions","m",tx())),/Duplicate/);
  assert.throws(()=>apply(w,add("transactions","x",{...tx(),id:"override"})));
});
test("monthly category budgets use normalized keys and report actuals",()=>{
  let w=apply(fresh(),add("transactions","m",tx()));
  w=apply(w,add("budgets","b",{month:"2026-11",category:"Food",limitMinor:1000}));
  assert.throws(()=>apply(w,add("budgets","b2",{month:"2026-11",category:" food ",limitMinor:1000})),/Duplicate/);
  assert.equal(buildReport(w,{kind:"month"},"2026-11-24",["money"]).current.budgets[0].remainingMinor,-234);
});
test("task lifecycle records actual local day and does not infer due-date completion",()=>{
  let w=apply(fresh(),{type:"task.add",id:"t",title:"Study",dueDate:"2026-11-20",priority:"high"});
  w=apply(w,{type:"task.transition",id:"t",eventId:"e",status:"done"});
  assert.equal(w.collections.taskEvents[0].localDate,"2026-11-24");
  assert.equal(w.collections.taskEvents[0].timezone,"Asia/Kuching");
  assert.throws(()=>apply(w,{type:"task.transition",id:"t",eventId:"e2",status:"done"}));
  w=apply(w,{type:"task.transition",id:"t",eventId:"e2",status:"open"});
  assert.equal(w.collections.taskEvents.length,2);
  const r=buildReport(w,{kind:"week"},"2026-11-24",["tasks"]);assert.equal(r.current.tasks.completionEvents,1);assert.equal(r.current.tasks.reopenEvents,1);assert.equal(r.current.tasks.dueCount,0);
  w=apply(w,{type:"task.delete",id:"t",confirm:true,retainHistoricalCopies:false});assert.equal(w.collections.taskEvents.length,0);
});
test("legacy done flag can reopen without inventing historical event",()=>{
  let w=migrated();assert.equal(w.collections.taskEvents.length,0);
  w=apply(w,{type:"task.transition",id:"t",eventId:"e",status:"open"});
  assert.equal(w.collections.taskEvents[0].kind,"reopened");assert.equal(w.collections.tasks[0].createdAt,null);
});
test("task timestamp and event integrity reject orphan, invalid chronology and state",()=>{
  let w=apply(fresh(),{type:"task.add",id:"t",title:"Study",dueDate:null,priority:"normal"});
  assert.throws(()=>apply(w,{type:"task.transition",id:"t",eventId:"e",status:"done"},"2026-11-23T15:00:00.000Z"));
  w=apply(w,{type:"task.transition",id:"t",eventId:"e",status:"done"});
  const bad=structuredClone(w);bad.collections.taskEvents[0].localDate="2026-11-23";assert.throws(()=>validateDomain(bad));
  bad.collections.taskEvents[0].localDate="2026-11-24";bad.collections.tasks=[];assert.throws(()=>validateDomain(bad));
  w.collections.tasks[0].status="open";assert.throws(()=>validateDomain(w));
});
test("learning target and learning CRUD use bounded integer minutes",()=>{
  let w=apply(fresh(),{type:"learning.target",minutes:600});
  w=apply(w,add("learning","l",{date:"2026-11-24",topic:"DBMS",minutes:60,note:null}));
  assert.equal(buildReport(w,{kind:"week"},"2026-11-24",["learning"]).current.learning.weeklyTargetPercent,10);
  assert.throws(()=>apply(w,{type:"learning.target",minutes:10081}));
  assert.throws(()=>apply(w,add("learning","l2",{date:"2026-11-24",topic:"DBMS",minutes:1441,note:null})));
  w=apply(w,del("learning","l"));assert.equal(w.collections.learning.length,0);
});
test("journal daily uniqueness, explicit edits, bounded normalized tags",()=>{
  const data={date:"2026-11-24",reflection:"Test",tags:["Study"]};
  let w=apply(fresh(),add("journal","j",data));
  assert.throws(()=>apply(w,add("journal","j2",data)));
  assert.throws(()=>apply(w,{type:"record.edit",collection:"journal",id:"j",data:{...data,tags:["Study"," study "]}}));
  w=apply(w,{type:"record.edit",collection:"journal",id:"j",data:{...data,reflection:"Changed"}});
  assert.equal(w.collections.journal[0].reflection,"Changed");
});
test("goal milestones and progress preserve separate cashflow semantics",()=>{
  let w=apply(fresh(),add("goals","g",goal));
  w=apply(w,{type:"milestone.add",id:"ms",goalId:"g",title:"First step",targetDate:null});
  w=apply(w,{type:"milestone.transition",id:"ms",done:true});assert.equal(w.collections.milestones[0].completedAt,now);
  w=apply(w,{type:"record.edit",collection:"goals",id:"g",data:{...goal,progress:3000}});
  assert.equal(buildReport(w,{kind:"month"},"2026-11-24",["money","goals"]).current.money.netMinor,0);
  assert.throws(()=>apply(w,{type:"record.edit",collection:"goals",id:"g",data:{...goal,kind:"general",unit:"count",plannedMonthlyMinor:0}}));
  w=apply(w,del("goals","g"));assert.equal(w.collections.milestones.length,0);
});
test("habit schedule, checkin uniqueness, correction and archive semantics",()=>{
  let w=apply(fresh(),{type:"habit.add",id:"h",title:"Read",scheduledWeekdays:[2,4],startDate:"2026-11-24"});
  assert.throws(()=>apply(w,{type:"habit.checkin",habitId:"h",date:"2026-11-25",status:"completed"}));
  w=apply(w,{type:"habit.checkin",habitId:"h",date:"2026-11-24",status:"completed"});
  assert.throws(()=>apply(w,{type:"habit.checkin",habitId:"h",date:"2026-11-24",status:"completed"}));
  assert.throws(()=>apply(w,{type:"habit.archive",id:"h",effectiveDate:"2026-11-24"}));
  w=apply(w,{type:"habit.checkin.edit",habitId:"h",date:"2026-11-24",status:"skipped"});
  assert.equal(buildReport(w,{kind:"week"},"2026-11-24",["habits"]).current.habits[0].completed,0);
  w=apply(w,{type:"habit.archive",id:"h",effectiveDate:"2026-11-25"});
  assert.equal(w.collections.habitCheckins.length,1);
  w=apply(w,{type:"habit.delete",id:"h",confirm:true,retainHistoricalCopies:false});assert.equal(w.collections.habitCheckins.length,0);
});
test("deletion requires confirmation and historical retention acknowledgement",()=>{
  const w=migrated();
  assert.throws(()=>apply(w,del("transactions","m")),/Historical copies/);
  assert.throws(()=>apply(w,{...del("transactions","m",true),confirm:false}),/confirmation/);
  const n=apply(w,del("transactions","m",true));
  assert.equal(n.collections.analyses[0].legacyText,"Report");assert.equal(w.collections.transactions.length,1);
});
test("legacy history cannot be silently reauthorized; structured AI data fail closed",()=>{
  const w=migrated();w.collections.analyses[0].mayResend=true;assert.throws(()=>validateDomain(w));
  const n=fresh();n.collections.planActions.push({id:"a"});assert.throws(()=>validateDomain(n));
});
test("stale revision, duplicate operation and unknown commands rejected",()=>{
  const w=apply(fresh(),add("transactions","m",tx()));
  const cmd=add("transactions","m2",tx());
  assert.throws(()=>prepareCommand(w,cmd,{expectedRevision:0,operationId:"new",now}),/Stale/);
  assert.throws(()=>prepareCommand(w,cmd,{expectedRevision:1,operationId:w.lastOperationId,now}),/Duplicate/);
  assert.throws(()=>apply(w,{type:"unknown"}));
});
test("pagination never truncates 1001 retained records; filters and returned rows isolated",()=>{
  const raw=legacy();raw.money=Array.from({length:1001},(_,i)=>({...raw.money[0],id:String(i),category:i%2?"Food":"Transport"}));
  const w=migrateLegacy(raw,{...opts,legacyEtag:"e1"});
  const seen=new Set();
  for(let page=1;page<=41;page++)for(const row of selectPage(w,"transactions",{page}).rows)seen.add(row.id);
  assert.equal(seen.size,1001);assert.equal(w.collections.transactions.length,1001);
  const p=selectPage(w,"transactions",{category:" food ",filter:"expense",query:"FOOD"});
  assert.equal(p.total,500);p.rows[0].category="changed";assert.notEqual(w.collections.transactions.find(r=>r.id===p.rows[0].id).category,"changed");
  assert.throws(()=>selectPage(w,"transactions",{priority:"high"}));assert.throws(()=>selectPage(w,"transactions",{pageSize:101}));
});
test("timezone conversions respect midnight and extreme offsets",()=>{
  assert.equal(localDay(now,"Asia/Kuching"),"2026-11-24");
  assert.equal(localDay(now,"Pacific/Honolulu"),"2026-11-23");
});
test("repository remains blocked with P03 validator when APS capability unverified",async()=>{
  let writes=0;const storage={get:async()=>({exists:false}),set:async()=>{writes++;}};
  const r=createWorkspaceRepository({storage,validateDomain});
  const p=await r.inspect(opts);await assert.rejects(r.initialize(p.workspace),{code:"CAPABILITY_UNVERIFIED"});assert.equal(writes,0);
});
test("synthetic CAS repository verifies a valid command and rejects malformed next snapshot",async()=>{
  const records=new Map();let writes=0,seq=0;
  const store=(key,value)=>{records.set(key,{etag:"e"+(++seq),value:structuredClone(value)});writes++;};
  const storage={get:async({key})=>records.has(key)?{exists:true,...structuredClone(records.get(key))}:{exists:false},
    set:async({key,value,if_match})=>{assert.equal(records.get(key).etag,if_match);store(key,value);}};
  const r=createWorkspaceRepository({storage,validateDomain,capability:{verified:true,maxBytes:100000},atomicCreate:async({key,value})=>{assert.equal(records.has(key),false);store(key,value);}});
  const candidate=await r.inspect(opts),p=await r.initialize(candidate.workspace);
  const cmd=prepareCommand(p.workspace,add("transactions","m",tx()),{expectedRevision:0,operationId:"op1",now});
  const q=await r.commit({...cmd,etag:p.etag});assert.equal(q.workspace.collections.transactions[0].amountMinor,1234);
  const invalid=prepareCommand(q.workspace,add("transactions","m2",tx()),{expectedRevision:1,operationId:"op2",now});
  invalid.next.collections.transactions[1].amountMinor=-1;
  await assert.rejects(r.commit({...invalid,etag:q.etag}));assert.equal(writes,2);
});
