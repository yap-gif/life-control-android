import test from "node:test";
import assert from "node:assert/strict";
import {dayNumber,weekday,weekStart,monthEnd,reportPeriods} from "../bundle/v2/calendar.js";
import {buildReport,buildTrend} from "../bundle/v2/reporting.js";
import {emptyWorkspace} from "../bundle/v2/workspace.js";
const today="2026-11-24";
const tx=(id,date,kind,amountMinor,category)=>({id,date,kind,amountMinor,category,note:null});
function fixture(){
  const w=emptyWorkspace({timezone:"Asia/Kuching",migrationId:"test"});
  Object.assign(w.collections,{
    transactions:[tx("a","2026-11-03","income",60000,"Work"),tx("b","2026-11-10","income",40000,"Work"),tx("c","2026-11-04","expense",10000,"Food"),tx("d","2026-11-11","expense",5000,"Transport"),tx("e","2026-11-20","expense",12500," food "),tx("f","2026-11-25","expense",999999,"Future")],
    budgets:[{id:"budget",month:"2026-11",category:"FOOD",limitMinor:20000}],
    learning:[{id:"l1",date:"2026-11-02",topic:"Kotlin",minutes:120},{id:"l2",date:"2026-11-09",topic:"kotlin",minutes:60},{id:"l3",date:"2026-11-24",topic:"DBMS",minutes:40}],
    tasks:[{id:"t1",dueDate:"2026-11-05",status:"done"},{id:"t2",dueDate:"2026-11-24",status:"open"},{id:"t3",dueDate:null,status:"open"}],
    taskEvents:[{id:"e1",taskId:"t2",kind:"completed",localDate:"2026-11-23"},{id:"e2",taskId:"t2",kind:"reopened",localDate:"2026-11-24"}],
    journal:[{id:"j1",date:"2026-11-24",reflection:"PRIVATE_CANARY"}],
    goals:[{id:"g1",title:"GOAL_CANARY",kind:"savings",target:100000,progress:25000,unit:"MYR_sen",plannedMonthlyMinor:20000}],
    habits:[{id:"h1",title:"Practice",startDate:"2026-11-16",scheduledWeekdays:[1,3,5],archivedAt:null}],
    habitCheckins:[{habitId:"h1",date:"2026-11-16",status:"completed"},{habitId:"h1",date:"2026-11-18",status:"skipped"},{habitId:"h1",date:"2026-11-20",status:"completed"},{habitId:"h1",date:"2026-11-23",status:"completed"}]
  });
  w.settings.learningWeeklyTargetMinutes=100;return w;
}
const month={kind:"month"};
const report=(w=fixture(),spec=month,selected=["money"])=>buildReport(w,spec,today,selected);
test("civil date validation: leap days, invalid dates and Monday across year",()=>{
  assert.doesNotThrow(()=>dayNumber("2024-02-29"));
  for(const d of ["2026-02-29","2026-04-31","2026-1-01","0000-01-01"])assert.throws(()=>dayNumber(d));
  assert.equal(weekday("2026-11-23"),1);assert.equal(weekStart("2027-01-01"),"2026-12-28");assert.equal(monthEnd("2024-02-01"),"2024-02-29");
});
test("partial month, shorter prior month and equal-day custom ranges",()=>{
  const a=reportPeriods(month,today);
  assert.deepEqual(a.current,{from:"2026-11-01",through:today,scheduledThrough:"2026-11-30",partial:true,days:24});
  assert.equal(a.previous.through,"2026-10-24");
  const b=reportPeriods(month,"2026-03-30");assert.equal(b.comparison,"clipped-unequal-days");assert.equal(b.previous.days,28);
  const c=reportPeriods({kind:"custom",from:"2026-11-21",through:"2026-11-30"},today);
  assert.equal(c.previous.from,"2026-11-17");assert.equal(c.previous.through,"2026-11-20");
  const d=reportPeriods({kind:"month",anchor:"2026-10-01"},today);assert.equal(d.previous.through,"2026-09-30");assert.equal(d.comparison,"complete-calendar-periods");
  assert.throws(()=>reportPeriods({kind:"custom",from:"2026-12-01",through:"2026-12-02"},today));
  assert.throws(()=>reportPeriods({kind:"custom",from:"2026-11-10",through:"2026-11-01"},today));
});
test("review fixture: exact monthly MYR totals, category split, budget",()=>{
  const x=report(),m=x.current.money;
  assert.deepEqual([m.incomeMinor,m.expenseMinor,m.netMinor],[100000,27500,72500]);
  assert.equal(m.netIncomeRatio,72.5);assert.equal(m.expenseCategories.length,2);
  assert.equal(m.expenseCategories[0].total,22500);assert.equal(m.expenseCategories[0].sharePercent.toFixed(1),"81.8");
  assert.equal(x.current.budgets[0].remainingMinor,-2500);assert.equal(x.current.budgets[0].through,today);
  assert.equal(x.metrics.find(m=>m.id==="money.income.current").value,100000);
  assert.equal(x.changes.find(m=>m.metricId==="money.income.current").percentChange,null);
});
test("all reference weeks match expected totals; empty week has coverage, null ratio",()=>{
  for(const [anchor,expected] of [["2026-11-02",[60000,10000,50000]],["2026-11-09",[40000,5000,35000]],["2026-11-16",[0,12500,-12500]],["2026-11-23",[0,0,0]]]){
    const r=report(fixture(),{kind:"week",anchor}),m=r.current.money;
    assert.deepEqual([m.incomeMinor,m.expenseMinor,m.netMinor],expected);
    if(!m.incomeMinor)assert.equal(m.netIncomeRatio,null);
    if(anchor==="2026-11-23"){assert.equal(m.entryCount,0);assert.equal(r.periods.current.partial,true);assert.match(r.coverageNote,/missing records/);}
  }
});
test("custom dates are inclusive and budgets remain monthly as of cutoff",()=>{
  const r=report(fixture(),{kind:"custom",from:"2026-11-20",through:"2026-11-20"});
  assert.equal(r.current.money.expenseMinor,12500);assert.equal(r.current.budgets[0].spentMinor,22500);
  assert.equal(r.current.budgets[0].from,"2026-11-01");assert.equal(r.current.budgets[0].through,"2026-11-20");
});
test("learning normalizes topics and weekly target; task status is not fabricated event",()=>{
  const w=fixture(),r=report(w,month,["learning","tasks","journal"]);
  assert.equal(r.current.learning.minutes,220);assert.equal(r.current.learning.topics.find(x=>x.key==="kotlin").total,180);
  assert.equal(r.current.tasks.dueDoneNow,1);assert.equal(r.current.tasks.completionEvents,1);assert.equal(r.current.tasks.reopenEvents,1);
  assert.equal(r.current.journal.days,1);assert.ok(!JSON.stringify(r).includes("PRIVATE_CANARY"));
  assert.equal(report(w,{kind:"week"},["learning"]).current.learning.weeklyTargetPercent,40);
});
test("goal snapshot and habit schedule do not infer financial or historical progress",()=>{
  const r=report(fixture(),month,["goals","habits"]);
  assert.equal(r.currentGoalSnapshot[0].months,4);assert.equal(r.currentGoalSnapshot[0].percent,25);
  assert.equal(r.current.habits[0].eligible,4);assert.equal(r.current.habits[0].completed,3);
  assert.equal(r.current.habits[0].streakWithinPeriod,2);assert.equal(r.current.habits[0].completionPercent,75);
  assert.equal(r.previous.habits[0].completionPercent,null);assert.ok(!("money" in r.current));
});
test("scope selection excludes goals, journal, tasks and raw notes from money-only report",()=>{
  const w=fixture();w.collections.transactions[0].note="NOTE_CANARY";w.collections.learning=null;
  const r=report(w),encoded=JSON.stringify(r);
  for(const x of ["GOAL_CANARY","PRIVATE_CANARY","NOTE_CANARY","Kotlin","learning","journal","goals","tasks","habits"])assert.ok(!encoded.includes(x),x);
  assert.throws(()=>report(w,month,[]));assert.throws(()=>report(w,month,["unknown"]));
});
test("more than 1000 records; one-cent totals never rounded or truncated",()=>{
  const w=fixture();w.collections.transactions=Array.from({length:1001},(_,i)=>tx(String(i),today,"income",1,"Work"));
  const m=report(w).current.money;assert.equal(m.incomeMinor,1001);assert.equal(m.entryCount,1001);
});
test("reject unsafe aggregate, negative amount, malformed date and duplicate budgets",()=>{
  const w=fixture();w.collections.transactions=[tx("a",today,"income",Number.MAX_SAFE_INTEGER,"Work"),tx("b",today,"income",1,"Work")];assert.throws(()=>report(w),/Unsafe/);
  w.collections.transactions=[tx("a",today,"income",-1,"Work")];assert.throws(()=>report(w));
  w.collections.transactions=[tx("a","2026-11-31","income",1,"Work")];assert.throws(()=>report(w));
  w.collections.transactions=[];w.collections.budgets.push({...w.collections.budgets[0],id:"other"});assert.throws(()=>report(w),/Duplicate/);
});
test("category disappearance is represented by recorded zero and absolute change",()=>{
  const w=fixture();w.collections.transactions=[tx("x","2026-10-10","expense",500,"OldCategory")];
  const r=report(w);assert.equal(r.metrics.find(x=>x.id==="money.expenseCategory:oldcategory.current").value,0);
  assert.equal(r.changes.find(x=>x.metricId==="money.expenseCategory:oldcategory.current").delta,-500);
});

test("chart-ready trend uses the same totals, chronological ranges and partial coverage",()=>{
  const w=fixture(),t=buildTrend(w,{kind:"week",count:4,today,selected:["money"]});
  assert.deepEqual(t.map(p=>p.range.from),["2026-11-02","2026-11-09","2026-11-16","2026-11-23"]);
  assert.deepEqual(t.map(p=>p.values.money.netMinor),[50000,35000,-12500,0]);
  assert.deepEqual(t.map(p=>p.range.partial),[false,false,false,true]);
  assert.ok(t.every(p=>!p.metrics.some(m=>m.id.includes(".budget:"))));
  assert.ok(t.every(p=>!("budgets" in p.values)));
  assert.equal(buildTrend(w,{kind:"month",count:2,today,selected:["money"]})[1].values.money.netMinor,72500);
  assert.throws(()=>buildTrend(w,{kind:"week",count:25,today,selected:["money"]}));
  assert.throws(()=>buildTrend(w,{kind:"week",count:2,today,selected:["goals"]}));
});
