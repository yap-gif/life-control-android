import {dayNumber,shiftDay,weekday,weekStart,monthStart,monthEnd,shiftMonth,reportPeriods} from "./calendar.js";

export const REPORT_CATEGORIES=Object.freeze(["money","learning","tasks","journal","goals","habits"]);
const COVERAGE="Recorded activity only; missing records do not establish inactivity.";
export function integer(n,label="quantity",min=0){
  if(!Number.isSafeInteger(n)||n<min)throw new Error("Invalid "+label);
  return n;
}
export function add(a,b){
  const n=a+b;if(!Number.isSafeInteger(n))throw new Error("Unsafe aggregate");return n;
}
export function textKey(s){if(typeof s!=="string"||!s.trim())throw new Error("Invalid label");return s.trim().normalize("NFC").toLowerCase();}
function rows(c,k){if(!Array.isArray(c[k]))throw new Error("Missing collection: "+k);return c[k];}
function dated(a,r,key="date"){return a.filter(v=>{if(!v||typeof v!=="object")throw new Error("Invalid record");dayNumber(v[key]);return v[key]>=r.from&&v[key]<=r.through;});}
const sum=(a,f)=>a.reduce((n,v)=>add(n,f(v)),0);
const ratio=(n,d)=>d>0?n/d*100:null;
const sortGroups=m=>Array.from(m.values()).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
function group(a,label,quantity){
  const m=new Map();
  for(const v of a){const name=label(v),key=textKey(name);const g=m.get(key)||{key,label:name,count:0,total:0};
    g.count=add(g.count,1);g.total=add(g.total,quantity(v));m.set(key,g);}
  return sortGroups(m);
}
function money(c,r){
  const all=dated(rows(c,"transactions"),r);
  for(const v of all){integer(v.amountMinor,"amount",1);if(!["income","expense"].includes(v.kind))throw new Error("Invalid transaction kind");textKey(v.category);}
  const income=all.filter(v=>v.kind==="income"),expense=all.filter(v=>v.kind==="expense");
  const i=sum(income,v=>v.amountMinor),e=sum(expense,v=>v.amountMinor);
  return {currency:"MYR",incomeMinor:i,expenseMinor:e,netMinor:add(i,-e),netIncomeRatio:ratio(i-e,i),
    entryCount:all.length,incomeCount:income.length,expenseCount:expense.length,
    expenseCategories:group(expense,v=>v.category,v=>v.amountMinor).map(g=>({...g,sharePercent:ratio(g.total,e)}))};
}
function budgets(c,r,today){
  const result=[],seen=new Set();
  for(const b of rows(c,"budgets")){
    if(typeof b.month!=="string"||!(/^\d{4}-\d{2}$/.test(b.month)))throw new Error("Invalid budget month");
    const from=b.month+"-01";dayNumber(from);const end=monthEnd(from);
    const key=textKey(b.category);const identity=b.month+"/"+key;if(seen.has(identity))throw new Error("Duplicate monthly budget");seen.add(identity);
    integer(b.limitMinor,"budget");
    if(from>r.through||end<r.from||from>today)continue;
    // Budget is monthly as of report cutoff, not a prorated custom-period limit.
    const through=end<r.through?end:r.through;
    const m=money(c,{from,through});
    const spent=m.expenseCategories.find(g=>g.key===key)?.total??0;
    result.push({month:b.month,category:b.category,categoryKey:key,from,through,limitMinor:b.limitMinor,spentMinor:spent,remainingMinor:add(b.limitMinor,-spent),partial:through!==end});
  }
  return result.sort((a,b)=>a.month.localeCompare(b.month)||a.categoryKey.localeCompare(b.categoryKey));
}
function learning(c,r,settings){
  const all=dated(rows(c,"learning"),r);
  const qty=v=>{const n=integer(v.minutes,"minutes",1);if(n>1440)throw new Error("Invalid minutes");return n;};
  const minutes=sum(all,qty);
  const result={minutes,sessions:all.length,topics:group(all,v=>v.topic,qty)};
  if(r.from===weekStart(r.from)&&r.through<=shiftDay(r.from,6)){
    const target=settings?.learningWeeklyTargetMinutes??null;
    if(target!==null)integer(target,"weekly target",1);
    result.weeklyTargetMinutes=target;result.weeklyTargetPercent=target===null?null:ratio(minutes,target);
  }
  return result;
}
function tasks(c,r){
  const all=rows(c,"tasks");
  const due=dated(all.filter(v=>{if(!v||!["open","done"].includes(v.status))throw new Error("Invalid task");return v.dueDate!==null;}),r,"dueDate");
  const events=dated(rows(c,"taskEvents"),r,"localDate");
  for(const e of events)if(!["completed","reopened"].includes(e.kind))throw new Error("Invalid task event");
  return {dueCount:due.length,dueOpenNow:due.filter(t=>t.status==="open").length,dueDoneNow:due.filter(t=>t.status==="done").length,
    completionEvents:events.filter(e=>e.kind==="completed").length,reopenEvents:events.filter(e=>e.kind==="reopened").length,
    note:"Due-cohort status is current, not historical completion; events count recorded actions, not distinct tasks."};
}
function journal(c,r){
  const a=dated(rows(c,"journal"),r);
  return {entries:a.length,days:new Set(a.map(v=>v.date)).size};
}
function goals(c,today){
  return rows(c,"goals").map(g=>{
    if(!g||!["savings","general"].includes(g.kind))throw new Error("Invalid goal");
    const target=integer(g.target,"goal target"),progress=integer(g.progress,"goal progress");
    const remaining=Math.max(0,target-progress);
    const out={id:g.id,title:g.title,kind:g.kind,unit:g.unit,target,progress,remaining,percent:ratio(progress,target),asOf:today,
      coverage:"Current manually recorded progress; not reconstructed historical progress."};
    if(g.kind==="savings"){
      const monthly=integer(g.plannedMonthlyMinor,"monthly contribution");
      out.plannedMonthlyMinor=monthly;out.months=target===0?null:remaining===0?0:monthly>0?Math.ceil(remaining/monthly):null;
    }
    return out;
  });
}
function habits(c,r){
  const checkins=rows(c,"habitCheckins");
  const map=new Map();
  for(const x of checkins){dayNumber(x.date);if(!["completed","skipped"].includes(x.status))throw new Error("Invalid habit checkin");
    const k=JSON.stringify([x.habitId,x.date]);if(map.has(k))throw new Error("Duplicate habit checkin");map.set(k,x.status);}
  return rows(c,"habits").map(h=>{
    dayNumber(h.startDate);
    if(h.archivedAt!==null)dayNumber(h.archivedAt);
    if(!Array.isArray(h.scheduledWeekdays)||!h.scheduledWeekdays.length||h.scheduledWeekdays.some(n=>!Number.isInteger(n)||n<1||n>7))throw new Error("Invalid schedule");
    const from=h.startDate>r.from?h.startDate:r.from;
    // archivedAt is the first inactive local day.
    const through=h.archivedAt&&h.archivedAt<=r.through?shiftDay(h.archivedAt,-1):r.through;
    let eligible=0,completed=0,streak=0,longest=0;
    for(let n=dayNumber(from);n<=dayNumber(through);n++){
      const d=shiftDay(from,n-dayNumber(from));
      if(!h.scheduledWeekdays.includes(weekday(d)))continue;
      eligible++;if(map.get(JSON.stringify([h.id,d]))==="completed"){completed++;streak++;longest=Math.max(streak,longest);}else streak=0;
    }
    return {id:h.id,title:h.title,eligible,completed,completionPercent:ratio(completed,eligible),streakWithinPeriod:streak,longestStreakWithinPeriod:longest};
  });
}
export function buildReport(workspace,spec,today,selected){
  if(!workspace||workspace.schemaVersion!==2||!workspace.collections)throw new Error("Validated v2 workspace required");
  if(!Array.isArray(selected)||!selected.length||selected.some(x=>!REPORT_CATEGORIES.includes(x)))throw new Error("Select supported categories");
  const categories=REPORT_CATEGORIES.filter(k=>selected.includes(k)),periods=reportPeriods(spec,today),c=workspace.collections;
  const result={definitionVersion:1,periods,categories,coverageNote:COVERAGE,current:{},previous:{},metrics:[],changes:[]};
  function metric(category,key,value,unit,range,sampleCount,side,coverage=COVERAGE){
    result.metrics.push({id:category+"."+key+"."+side,category,value,unit,range:{from:range.from,through:range.through},sampleCount,coverage,definitionVersion:1});
  }
  for(const side of ["current","previous"]){
    const r=periods[side],o=result[side];
    if(categories.includes("money")){
      const m=o.money=money(c,r);o.budgets=budgets(c,r,today);
      for(const [k,v,n] of [["income",m.incomeMinor,m.incomeCount],["expense",m.expenseMinor,m.expenseCount],["net",m.netMinor,m.entryCount]])metric("money",k,v,"MYR_sen",r,n,side);
      metric("money","netIncomeRatio",m.netIncomeRatio,"percent",r,m.entryCount,side);
      for(const g of m.expenseCategories)metric("money","expenseCategory:"+encodeURIComponent(g.key),g.total,"MYR_sen",r,g.count,side);
      for(const b of o.budgets){const k="budget:"+b.month+":"+encodeURIComponent(b.categoryKey);for(const [name,value] of [["limit",b.limitMinor],["spent",b.spentMinor],["remaining",b.remainingMinor]])metric("money",k+":"+name,value,"MYR_sen",b,null,side,"Monthly budget as of report cutoff; actuals are recorded expenses.");}
    }
    if(categories.includes("learning")){
      const l=o.learning=learning(c,r,workspace.settings);
      metric("learning","minutes",l.minutes,"minutes",r,l.sessions,side);metric("learning","sessions",l.sessions,"count",r,l.sessions,side);
      for(const g of l.topics)metric("learning","topic:"+encodeURIComponent(g.key),g.total,"minutes",r,g.count,side);
      if(l.weeklyTargetMinutes!=null)metric("learning","weeklyTarget",l.weeklyTargetMinutes,"minutes",r,null,side,"Current configured weekly target, not historical target.");
    }
    if(categories.includes("tasks")){
      const t=o.tasks=tasks(c,r);
      for(const k of ["dueCount","dueOpenNow","dueDoneNow","completionEvents","reopenEvents"])metric("tasks",k,t[k],"count",r,k.endsWith("Events")?t.completionEvents+t.reopenEvents:t.dueCount,side,t.note);
    }
    if(categories.includes("journal")){
      const j=o.journal=journal(c,r);metric("journal","days",j.days,"count",r,j.entries,side);
    }
    if(categories.includes("habits")){o.habits=habits(c,r);for(const h of o.habits){const k="habit:"+encodeURIComponent(h.id);metric("habits",k+":completed",h.completed,"count",r,h.eligible,side);metric("habits",k+":eligible",h.eligible,"count",r,h.eligible,side);}}
  }
  if(categories.includes("goals")){result.currentGoalSnapshot=goals(c,today);for(const g of result.currentGoalSnapshot){const k="goal:"+encodeURIComponent(g.id);for(const name of ["target","progress","remaining"])metric("goals",k+":"+name,g[name],g.unit,{from:today,through:today},null,"snapshot",g.coverage);}}
  // Union of topic/category keys: absence is zero recorded activity, never fabricated actual activity.
  for(const m of [...result.metrics]){
    if(!/^(money\.expenseCategory:|learning\.topic:)/.test(m.id))continue;
    const side=m.id.endsWith(".current")?"previous":"current";
    const id=m.id.replace(/\.(current|previous)$/,"."+side);
    if(!result.metrics.some(x=>x.id===id))metric(m.category,m.id.slice(m.category.length+1,m.id.lastIndexOf(".")),0,m.unit,periods[side],0,side);
  }
  for(const m of result.metrics.filter(m=>m.id.endsWith(".current")&&m.unit!=="percent"&&!m.id.includes(".budget:")&&!m.id.includes(".weeklyTarget."))){
    const p=result.metrics.find(v=>v.id===m.id.replace(/\.current$/,".previous"));
    if(!p)continue;
    const delta=add(m.value,-p.value);
    result.changes.push({metricId:m.id,previousMetricId:p.id,delta,percentChange:p.value>0?delta/p.value*100:null,
      comparison:periods.comparison,coverage:"Change in recorded totals; not proof of a change in underlying behavior."});
  }
  return result;
}

/** Chart-ready series of calendar periods, oldest first. Each point is derived
 * from the same scoped reporting definitions; current partial period is labelled.
 * Snapshot-only goals and monthly budget evidence remain outside the series. */
export function buildTrend(workspace,{kind,count,today,selected}){
  if(!["week","month"].includes(kind)||!Number.isSafeInteger(count)||count<1||count>24)throw new Error("Invalid trend range");
  if(!Array.isArray(selected)||!selected.length||selected.some(k=>!REPORT_CATEGORIES.includes(k)||k==="goals"))throw new Error("Select period-based trend categories");
  const start=kind==="week"?weekStart(today):monthStart(today);
  return Array.from({length:count},(_,i)=>{
    const offset=i-count+1,anchor=kind==="week"?shiftDay(start,offset*7):shiftMonth(start,offset);
    const r=buildReport(workspace,{kind,anchor},today,selected);
    const {budgets,...current}=r.current;
    return {range:r.periods.current,coverageNote:r.coverageNote,values:current,
      metrics:r.metrics.filter(m=>m.id.endsWith(".current")&&!m.id.includes(".budget:"))};
  });
}
