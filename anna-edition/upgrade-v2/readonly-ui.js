import {buildReport,buildTrend,REPORT_CATEGORIES} from "../bundle/v2/reporting.js";
import {selectPage} from "../bundle/v2/selectors.js";
import {canonicalJSON,utf8Bytes} from "../bundle/v2/workspace.js";
import {validateDomain} from "../bundle/v2/domain.js";
import {dayNumber} from "../bundle/v2/calendar.js";

// Read-only derivative of the frozen v2 UI. No mutation or model transport.
export const ROUTES=Object.freeze([["overview","Overview"],["reports","Reports"],["insights","AI Insights"],["tasks","Tasks"],["money","Money"],["learning","Learning"],["journal","Journal"],["goals","Goals"],["privacy","Privacy"]]);
const fmt=n=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(n/100);
const val=m=>m.value===null?"Not available":m.unit==="MYR_sen"?fmt(m.value):m.unit==="percent"?m.value.toFixed(1)+"%":String(m.value)+" "+m.unit;
const pretty=s=>s.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[_:]/g," ");
const specFor=(kind,from,through)=>kind==="custom"?{kind,from,through}:{kind};
const dates=(r)=>r.from+" – "+r.through;
const f=(name,label,type="text",value="",opts={})=>({name,label,type,value,...opts});
const choices=(...v)=>v.map(x=>[x,pretty(x)]);
const categoryNames={money:"Money",learning:"Learning",tasks:"Tasks",journal:"Journal",goals:"Goals",habits:"Habits"};
export function mountReadOnly(doc,win,workspace,{today,legacyGeneration}){
  dayNumber(today);const snapshot=JSON.parse(canonicalJSON(workspace));validateDomain(snapshot);
  if(!Number.isSafeInteger(legacyGeneration)||legacyGeneration<0)throw Error("INVALID_GENERATION");
  const page=doc.getElementById("page"),nav=doc.getElementById("nav"),status=doc.getElementById("status"),heading=doc.getElementById("page-title");
  const el=(tag,cls="",text=null)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==null)n.textContent=String(text);return n;};
  const append=(p,...children)=>{for(const n of children.flat())if(n)p.append(n);return p;};
  const section=(title,...children)=>append(el("section","panel"),el("h2","",title),...children);
  const stack=(...children)=>append(el("div","stack"),...children);
  const small=t=>el("p","muted",t);
  const empty=t=>el("p","empty",t);
  const link=(route,label)=>{const a=el("a","",label);a.href="#"+route;return a;};
  let route="";
  const filterState=new Map(),reportState={kind:"month",from:today.slice(0,7)+"-01",through:today,selected:[...REPORT_CATEGORIES],trend:"week"};
  const ws=()=>snapshot,c=()=>snapshot.collections;
  const notify=(message,error=false)=>{status.textContent=message;status.classList.toggle("error",error);};
  const safeError=()=>"View or filter unavailable. No data changed.";
  const button=(label,fn,cls="",disabled=false)=>{const b=el("button",cls,label);b.type="button";b.disabled=disabled;b.addEventListener("click",()=>{try{fn();}catch{notify(safeError(),true);}});return b;};
  function field(def,form){
    const label=el("label",def.wide?"wide":"");label.append(el("span","",def.label));
    const n=el(def.type==="select"?"select":def.type==="textarea"?"textarea":"input");
    if(n.tagName==="INPUT")n.type=def.type;
    n.name=def.name;
    if(def.type==="select")for(const [v,t] of def.choices){const o=el("option","",t);o.value=v;n.append(o);}
    if(def.type==="checkbox")n.checked=Boolean(def.value);else n.value=String(def.value??"");
    if(def.required)n.required=true;if(def.maxLength)n.maxLength=def.maxLength;
    for(const k of ["min","max","step"])if(def[k]!==undefined)n.setAttribute(k,def[k]);
    if(def.disabled)n.disabled=true;
    if(def.type==="checkbox"){label.classList.add("tick");label.prepend(n);}else label.append(n);form.append(label);return n;
  }
  // Preserve the custom values while hiding irrelevant controls. The request
  // still passes through the original date/spec validation.
  function customDates(kind,from,through){
    const update=()=>{for(const n of [from,through])n.closest("label").hidden=kind.value!=="custom";};
    kind.addEventListener("input",update);kind.addEventListener("change",update);update();
  }
  function progress(label,percent,description){
    const root=el("div","progress-block");
    root.append(append(el("div","row"),el("strong","",label),small(description)));
    if(Number.isFinite(percent)){
      const bar=el("progress","progress-meter");bar.max=100;bar.value=Math.max(0,Math.min(100,percent));
      bar.setAttribute("aria-label",label);bar.setAttribute("aria-valuetext",description);
      root.append(bar);
    }
    return root;
  }
  function actionPanel(title,description,...buttons){
    return append(el("section","panel action-panel"),append(el("div","action-copy"),el("h2","",title),description?small(description):null),append(el("div","actions"),buttons));
  }
  function values(form){return Object.fromEntries([...form.querySelectorAll("[name]")].map(n=>[n.name,n.type==="checkbox"?n.checked:n.value]));}
  function metrics(items){return append(el("div","metrics"),items.map(([label,value,tone=""])=>append(el("div","metric"+(tone?" metric-"+tone:"")),el("span","",label),el("strong","",value))));}
  function table(headers,rows){
    const t=el("table"),head=el("thead"),body=el("tbody"),tr=el("tr");
    for(const h of headers){const th=el("th","",h);th.scope="col";tr.append(th);}head.append(tr);
    for(const row of rows)body.append(append(el("tr"),row.map(v=>el("td","",v))));
    t.append(head,body);const wrap=el("div","table-wrap");wrap.tabIndex=0;wrap.setAttribute("aria-label","Scrollable data table");wrap.append(t);return wrap;
  }
  function chart(rows,formatter=String){
    const max=Math.max(1,...rows.map(r=>Math.abs(r[1]))),root=el("div","chart");root.setAttribute("aria-hidden","true");
    for(const [label,n,tone] of rows){const fill=el("div","fill"+(n<0?" negative":tone?" "+tone:""));fill.style.width=Math.max(0,Math.abs(n)/max*100)+"%";
      root.append(append(el("div","bar-line"),el("span","",label),append(el("div","track"),fill),el("span","",formatter(n))));}
    return root;
  }
  const netTone=n=>n<0?"negative":n>0?"positive":"";
  function cashflow(m){
    const netLabel=m.netMinor<0?"Deficit":m.netMinor>0?"Surplus":"Balanced";
    return append(el("div","cashflow-summary"),
      append(el("div","cashflow-net"),small("Recorded net cashflow"),el("strong",netTone(m.netMinor),fmt(m.netMinor)),el("span","tag",netLabel)),
      chart([["Income",m.incomeMinor,"income"],["Expenses",m.expenseMinor,"expense"]],fmt),
      table(["Recorded metric","Value"],[["Income",fmt(m.incomeMinor)],["Expenses",fmt(m.expenseMinor)],["Net",fmt(m.netMinor)],["Net / income",m.netIncomeRatio===null?"N/A":m.netIncomeRatio.toFixed(1)+"%"]]),
      small("Recorded income minus expenses; not an account balance. Net / income is unavailable when income is zero."));
  }
  function expenseBreakdown(m){
    return m.expenseCategories.length?append(el("div","expense-breakdown"),
      ...m.expenseCategories.map(g=>{
        const bar=el("progress","progress-meter expense-meter");bar.max=100;bar.value=Math.max(0,Math.min(100,g.sharePercent));
        const description=fmt(g.total)+" · "+g.sharePercent.toFixed(1)+"% of recorded expenses";
        bar.setAttribute("aria-label",g.label+" expense share");bar.setAttribute("aria-valuetext",description);
        return append(el("div","progress-block"),append(el("div","row"),el("strong","",g.label),small(description)),bar);
      })):empty("No recorded expenses.");
  }
  function budgetSummary(budgets){
    if(!budgets.length)return empty("No monthly budgets in this evidence range.");
    return append(el("div","budget-summary"),budgets.map(b=>{
      const state=b.remainingMinor<0?"Over budget":b.remainingMinor===0?"Limit reached":"Within budget";
      const ratio=b.limitMinor>0?b.spentMinor/b.limitMinor*100:null;
      const item=append(el("div","budget-item"),append(el("div","row"),el("strong","",b.category+" · "+b.month),el("span","tag "+(b.remainingMinor<0?"negative":""),state)),
        progress("Budget used",ratio,fmt(b.spentMinor)+" / "+fmt(b.limitMinor)+(ratio===null?" · Zero limit": " · "+ratio.toFixed(1)+"%")),
        el("p",b.remainingMinor<0?"negative":"muted",b.remainingMinor<0?fmt(-b.remainingMinor)+" over limit":fmt(b.remainingMinor)+" remaining"),
        small("Evidence: "+dates(b)+(b.partial?" · Partial month":"")));
      if(b.remainingMinor<0)item.classList.add("over-budget");
      return item;
    }));
  }
  function financialTrend(data){
    const rows=data.map(p=>({label:p.range.from+(p.range.partial?" *":""),m:p.values.money,range:p.range}));
    const max=Math.max(1,...rows.flatMap(({m})=>[m.incomeMinor,m.expenseMinor]));
    const visual=el("div","flow-trend");visual.setAttribute("aria-hidden","true");
    for(const {label,m} of rows){
      const bars=el("div","flow-bars");
      for(const [name,value,tone] of [["Income",m.incomeMinor,"income"],["Expense",m.expenseMinor,"expense"]]){
        const fill=el("div","fill "+tone);fill.style.width=value/max*100+"%";
        bars.append(append(el("div","flow-bar"),el("span","",name),append(el("div","track"),fill),el("span","",fmt(value))));
      }
      visual.append(append(el("div","trend-period"),el("strong","",label),bars,el("span","trend-net "+netTone(m.netMinor),"Net "+fmt(m.netMinor))));
    }
    return append(el("div","stack"),small("Six calendar periods ending at the inspection date; independent of custom report filters. * Partial period. Zero means no recorded activity, not verified financial inactivity."),visual,
      table(["Period","Income","Expenses","Net"],rows.map(({label,m})=>[label,fmt(m.incomeMinor),fmt(m.expenseMinor),fmt(m.netMinor)])));
  }
  function listEntry(title,meta,buttons=[],extra=null){
    return append(el("div","entry"),append(el("div"),el("strong","",title),el("p","meta",meta),extra),append(el("div","actions"),buttons));
  }
  function defaultFilters(){return {page:1,query:"",filter:"",category:"",priority:"",from:"",through:""};}
  function filterList(kind,title,describe,{statusChoices=null,category=false,priority=false,parentId=null,query=true}={}){
    const key=kind+":"+String(parentId??""),s=filterState.get(key)??defaultFilters();filterState.set(key,s);
    const opts={page:s.page,pageSize:10,query:s.query,from:s.from||null,through:s.through||null,filter:s.filter||null,category:s.category||null,priority:s.priority||null,parentId};
    let result=selectPage(ws(),kind,opts);if(s.page>Math.max(1,result.pageCount)){s.page=Math.max(1,result.pageCount);result=selectPage(ws(),kind,{...opts,page:s.page});}
    const form=el("form","toolbar");form.dataset.filterKey=key;
    if(query)field(f("query","Search","search",s.query,{maxLength:200}),form);
    if(statusChoices)field(f("filter","Status / type","select",s.filter,{choices:[["","All"],...choices(...statusChoices)]}),form);
    if(category)field(f("category","Category / topic","text",s.category),form);
    if(priority)field(f("priority","Priority","select",s.priority,{choices:[["","All"],...choices("low","normal","high")]}),form);
    field(f("from","From","date",s.from),form);field(f("through","Through","date",s.through),form);
    const submit=el("button","","Apply filters");submit.type="submit";
    const restoreFilterFocus=selector=>[...page.querySelectorAll("form[data-filter-key]")].find(n=>n.dataset.filterKey===key)?.querySelector(selector)?.focus();
    const clear=button("Clear filters",()=>{
      
      Object.assign(s,defaultFilters());render();restoreFilterFocus('[data-clear-filters]');
    });clear.dataset.clearFilters="";
    form.append(append(el("div","filter-actions"),submit,clear));
    form.addEventListener("submit",e=>{e.preventDefault();try{
      const v=values(form),next={...s,...v,page:1};
      selectPage(ws(),kind,{...opts,page:1,query:next.query,from:next.from||null,through:next.through||null,filter:next.filter||null,category:next.category||null,priority:next.priority||null});
      Object.assign(s,next);render();restoreFilterFocus('button[type="submit"]');
    }catch(err){notify(safeError(err),true);}});
    const applied=[["Search",s.query],["Status / type",s.filter],["Category / topic",s.category],["Priority",s.priority],["From",s.from],["Through",s.through]].filter(([,v])=>v!=="");
    const total=applied.length?selectPage(ws(),kind,{page:1,pageSize:1,parentId}).total:result.total;
    const scope=append(el("div","filter-summary"),el("strong","",result.total+" of "+total+" records"),small(applied.length?"Applied filters":"All records in this list"));
    if(applied.length)scope.append(append(el("div","filter-tags"),applied.map(([label,value])=>el("span","tag",label+": "+value))));
    const list=el("div");for(const row of result.rows)list.append(describe(row));
    const pager=append(el("div","row"),small(result.total+" records · page "+s.page+" / "+Math.max(1,result.pageCount)),append(el("div","actions"),
      button("Previous",()=>{s.page--;render();},"",s.page<=1),button("Next",()=>{s.page++;render();},"",s.page>=result.pageCount)));
    return section(title,scope,form,result.rows.length?list:empty(applied.length?"No matching records. Clear filters to see all records in this list.":"No matching records."),pager);
  }
  function overview(){
    const w=ws(),week=buildReport(w,{kind:"week"},today,REPORT_CATEGORIES),month=buildReport(w,{kind:"month"},today,["money"]),tasks=w.collections.tasks.filter(t=>t.status==="open"),due=tasks.filter(t=>t.dueDate&&t.dueDate<=today);
    return stack(metrics([["Open tasks",tasks.length],["Due today / overdue",due.length],["This week · learning",week.current.learning.minutes+" min"],["This month · net",fmt(month.current.money.netMinor),netTone(month.current.money.netMinor)]]),
      section("Read-only workspace",small("Records are displayed from the validated migration candidate. Editing and AI are disabled.")),
      append(el("div","grid overview-grid"),section("Today's priorities",due.length?append(el("div"),due.map(t=>listEntry(t.title,t.priority+" · "+t.dueDate))):empty("No recorded tasks due."),link("tasks","View tasks →"),progress("Weekly learning",week.current.learning.weeklyTargetPercent,week.current.learning.minutes+" / "+(week.current.learning.weeklyTargetMinutes??"No target")+" min"),link("learning","View learning →")),
      section("Monthly cashflow",cashflow(month.current.money),link("reports","Open reports →"))),
      section("Quick navigation",append(el("div","quick-nav"),[["tasks","View tasks"],["money","View money"],["learning","View learning"],["journal","View journal"]].map(([id,label])=>link(id,label+" →"))),small("Inspect recorded activity, local reports and historical analyses."),link("insights","Open AI Insights →")));
  }
  function reports(){
    const form=el("form","stack compact-config"),controls=el("div","fields");
    const kind=field(f("kind","Period","select",reportState.kind,{choices:choices("week","month","custom")}),controls);
    field(f("trend","Trend periods","select",reportState.trend,{choices:choices("week","month")}),controls);
    const from=field(f("from","Custom start","date",reportState.from),controls),through=field(f("through","Custom end","date",reportState.through),controls);
    customDates(kind,from,through);form.append(controls);
    const fs=el("fieldset","category-grid");fs.append(el("legend","","Report categories"));for(const k of REPORT_CATEGORIES)field(f(k,categoryNames[k],"checkbox",reportState.selected.includes(k)),fs);form.append(fs);
    const submit=el("button","primary","Apply report filters");submit.type="submit";form.append(submit);
    form.addEventListener("submit",e=>{e.preventDefault();const v=values(form),s={kind:v.kind,from:v.from,through:v.through,trend:v.trend,selected:REPORT_CATEGORIES.filter(k=>v[k])};try{buildReport(ws(),specFor(s.kind,s.from,s.through),today,s.selected);Object.assign(reportState,s);render();notify("Report recalculated locally.");}catch(err){notify(safeError(err),true);}});
    const r=buildReport(ws(),specFor(reportState.kind,reportState.from,reportState.through),today,reportState.selected),out=[];
    const coverage=section("Evidence coverage",small(dates(r.periods.current)+(r.periods.current.partial?" · Partial period":"")),small("Comparison: "+dates(r.periods.previous)+" · "+r.periods.comparison),small(r.coverageNote));
    coverage.classList.add("report-coverage");
    coverage.append(small("Applied categories: "+reportState.selected.map(k=>categoryNames[k]).join(", ")));
    const summary=[coverage];
    if(r.current.money){const m=r.current.money;summary.push(metrics([["Income",fmt(m.incomeMinor),"positive"],["Expense",fmt(m.expenseMinor),"expense"],["Net cashflow",fmt(m.netMinor),netTone(m.netMinor)],["Net / income",m.netIncomeRatio===null?"N/A":m.netIncomeRatio.toFixed(1)+"%"]]));
      out.push(append(el("div","grid finance-grid"),section("Cashflow",cashflow(m)),section("Expense breakdown",expenseBreakdown(m),table(["Category","Amount","Share"],m.expenseCategories.map(x=>[x.label,fmt(x.total),x.sharePercent.toFixed(1)+"%"])))),section("Monthly budgets",small("Budget actuals may cover earlier days in the same month; see each evidence range."),budgetSummary(r.current.budgets),table(["Category","Coverage","Limit","Spent","Remaining"],r.current.budgets.map(b=>[b.category,dates(b),fmt(b.limitMinor),fmt(b.spentMinor),fmt(b.remainingMinor)]))));}
    if(r.current.learning)out.push(section("Learning topics",chart(r.current.learning.topics.map(x=>[x.label,x.total]),n=>n+" min"),table(["Topic","Minutes","Sessions"],r.current.learning.topics.map(x=>[x.label,x.total,x.count]))));
    const summaryRows=[];
    if(r.current.learning)summaryRows.push(["Learning",r.current.learning.minutes+" minutes · "+r.current.learning.sessions+" sessions"]);
    if(r.current.tasks){const t=r.current.tasks;summaryRows.push(["Tasks due in range",t.dueCount+" · "+t.dueOpenNow+" currently open"],["Recorded task events",t.completionEvents+" completed · "+t.reopenEvents+" reopened"]);}
    if(r.current.journal)summaryRows.push(["Journal",r.current.journal.days+" recorded days"]);
    if(r.current.habits)summaryRows.push(["Habits",r.current.habits.reduce((n,h)=>n+h.completed,0)+" / "+r.current.habits.reduce((n,h)=>n+h.eligible,0)+" eligible days completed"]);
    if(r.currentGoalSnapshot)summaryRows.push(["Goals · current snapshot",r.currentGoalSnapshot.length+" recorded goals"]);
    if(summaryRows.length)summary.push(section("Activity at a glance",small("Task due status and goal progress are current snapshots, not reconstructed history."),table(["Category","Recorded activity"],summaryRows)));
    const disclosure=(title,...children)=>{const d=el("details","panel report-disclosure");d.append(el("summary","",title),...children);return d;};
    const trends=reportState.selected.filter(k=>k!=="goals");
    if(trends.length){
      const data=buildTrend(ws(),{kind:reportState.trend,count:6,today:today,selected:trends});
      for(const k of trends){const metricKey={money:"money.net.current",learning:"learning.minutes.current",tasks:"tasks.completionEvents.current",journal:"journal.days.current"}[k];if(!metricKey)continue;
        const rows=data.map(p=>[p.range.from+(p.range.partial?" *":""),p.metrics.find(m=>m.id===metricKey)?.value??0]);
        out.push(k==="money"?disclosure("Money trend · "+reportState.trend,financialTrend(data)):disclosure(categoryNames[k]+" trend · "+reportState.trend,chart(rows),table(["Period start (*partial)","Recorded value"],rows)));}
      if(trends.includes("habits"))out.push(disclosure("Habit trend",table(["Period","Completed scheduled days","Eligible days"],data.map(p=>[p.range.from+(p.range.partial?" *":""),p.values.habits.reduce((n,h)=>n+h.completed,0),p.values.habits.reduce((n,h)=>n+h.eligible,0)]))));
    }
    const map=new Map(r.metrics.map(m=>[m.id,m]));out.push(disclosure("Canonical evidence",small("Expand for the complete selected metrics and comparison data. Wide tables scroll inside their own container."),table(["Metric","Value","Evidence range","Samples"],r.metrics.map(m=>[m.id,val(m),dates(m.range),m.sampleCount??"—"])),el("h3","","Period changes"),table(["Metric","Recorded change","Percent"],r.changes.map(x=>[x.metricId,val({...map.get(x.metricId),value:x.delta}),x.percentChange===null?"N/A":x.percentChange.toFixed(1)+"%"]))));
    return stack(summary,section("Report controls",form),out);
  }
  function tasks(){return stack(section("Task management",small("Recorded tasks and due dates.")),
    filterList("tasks","Tasks",t=>listEntry(t.title,[t.priority,t.status,t.dueDate??"No due date",t.sourceActionId?"AI-linked":""].filter(Boolean).join(" · "),[]),{statusChoices:["open","done"],priority:true}));}
  function money(){const r=buildReport(ws(),{kind:"month"},today,["money"]).current;return stack(metrics([["Monthly income",fmt(r.money.incomeMinor),"positive"],["Monthly expense",fmt(r.money.expenseMinor),"expense"],["Net cashflow",fmt(r.money.netMinor),netTone(r.money.netMinor)],["Transactions",r.money.entryCount]]),
    section("Money management",small("Recorded income, expenses and category budgets.")),
    section("Budget overview",budgetSummary(r.budgets)),
    filterList("transactions","Transactions",t=>listEntry(t.category+" · "+(t.kind==="income"?"+":"−")+fmt(t.amountMinor),t.kind+" · "+t.date,[],t.note?el("p","",t.note):null),{statusChoices:["income","expense"],category:true}),
    append(el("div","grid finance-grid"),section("Monthly cashflow",cashflow(r.money)),section("Expense allocation",expenseBreakdown(r.money),small("Share of recorded expenses in the current month."))),
    filterList("budgets","Budgets",b=>{const x=r.budgets.find(x=>x.month===b.month&&x.categoryKey===b.category.trim().normalize("NFC").toLowerCase());return listEntry(b.category+" · "+fmt(b.limitMinor),b.month+(x?" · Remaining "+fmt(x.remainingMinor):""),[]);},{category:true}));}
  function learning(){const r=buildReport(ws(),{kind:"week"},today,["learning"]).current.learning;return stack(metrics([["Weekly minutes",r.minutes],["Sessions",r.sessions],["Weekly target",r.weeklyTargetMinutes??"Not set"],["Target progress",r.weeklyTargetPercent===null?"N/A":r.weeklyTargetPercent.toFixed(1)+"%"]]),section("Learning records",small("Recorded learning sessions.")),section("Weekly progress",progress("Learning target",r.weeklyTargetPercent,r.minutes+" / "+(r.weeklyTargetMinutes??"No target")+" min")),filterList("learning","Sessions",l=>listEntry(l.topic+" · "+l.minutes+" min",l.date,[],l.note?el("p","",l.note):null),{category:true}));}
  function journal(){return stack(section("Daily journal",small("Historical reflections. No AI requests are available.")),filterList("journal","Reflections",j=>listEntry(j.date,j.tags.join(" · ")||"No tags",[],el("p","",j.reflection))));}
  function goals(){const r=buildReport(ws(),{kind:"month"},today,["goals","habits"]),out=[section("Goals & habits",small("Recorded progress; not inferred from cashflow."))];
    out.push(filterList("goals","Goals",g=>{const x=r.currentGoalSnapshot.find(a=>a.id===g.id),format=g.kind==="savings"?fmt:n=>n+" "+g.unit;
      const details=append(el("div","stack"),progress("Goal progress",x.percent,format(g.progress)+" / "+format(g.target)+" · "+(x.percent===null?"N/A":x.percent.toFixed(1)+"%")),g.kind==="savings"?small("Planned monthly "+fmt(g.plannedMonthlyMinor)+" · Estimated months "+(x.months??"Unknown")):null);
      details.append(filterList("milestones","Milestones",m=>listEntry(m.title,(m.done?"Completed":"Open")+" · "+(m.targetDate??"No target date"),[]),{parentId:g.id}));
      return listEntry(g.title,g.kind,[],details);},{statusChoices:["savings","general"]}));
    out.push(filterList("habits","Habits",h=>{const x=r.current.habits.find(a=>a.id===h.id),details=append(el("div","stack"),small("Scheduled weekdays: "+h.scheduledWeekdays.join(", ")+" · Start "+h.startDate),small(x.completed+" / "+x.eligible+" eligible days · Streak "+x.streakWithinPeriod));
      details.append(filterList("habitCheckins","Check-ins",a=>listEntry(a.date,a.status,[]),{parentId:h.id,query:false}));
      return listEntry(h.title,h.archivedAt?"Archived from "+h.archivedAt:"Active",[],details);}));
    return stack(out);
  }
  function insights(){
    const hist=section("Analysis history",small("Previously saved analysis only. New AI requests, reuse and deletion are disabled."));
    for(const a of c().analyses){const d=el("details");d.append(el("summary","",a.legacyReadOnly?"Legacy analysis · "+a.legacyDate:"Saved analysis"),el("p","",a.legacyReadOnly?a.legacyText:a.result.summary));hist.append(d);}
    if(!c().analyses.length)hist.append(empty("No saved analysis."));
    const plans=section("Saved plans");
    for(const p of c().plans){const d=el("details");d.append(el("summary","",p.legacyReadOnly?"Legacy plan · "+p.legacyDate:"Saved plan"),small("Source categories: "+p.sourceCategories.join(", ")));if(p.legacyReadOnly)d.append(el("p","",p.legacyText));else for(const a of c().planActions.filter(x=>x.planId===p.id))d.append(listEntry(a.title,a.status+" · "+a.dueDate));plans.append(d);}
    if(!c().plans.length)plans.append(empty("No saved plan."));
    return stack(section("AI Personal Coach",small("New model calls are disabled in this read-only draft.")),hist,plans);
  }
  function privacy(){
    return stack(section("Privacy & data",small("This is a temporary in-memory migration candidate from existing Anna v1 records. No persistent v2 workspace has been created. No write, deletion, AI transport or automatic reload is available."),link("insights","View saved analysis →")),section("Storage status",metrics([["App ID",908],["Legacy generation",legacyGeneration],["Candidate size",utf8Bytes(ws())+" B"],["Persistent writes","Disabled"]]),small("Version attestation and exclusive migration remain unverified. Closing the window discards the candidate; original records remain in Anna.")));
  }
  const views={overview,reports,insights,tasks,money,learning,journal,goals,privacy};
  function render(){
    heading.textContent=ROUTES.find(x=>x[0]===route)?.[1]??"Overview";
    nav.querySelectorAll("a").forEach(a=>{if(a.dataset.route===route)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
    try{page.replaceChildren(views[route]());page.setAttribute("aria-busy","false");return true;}
    catch{page.replaceChildren(empty("Unable to render this view."));page.setAttribute("aria-busy","false");notify(safeError(),true);return false;}
  }
  function resolve(){const raw=win.location.hash.slice(1);return raw==="savings"?"goals":ROUTES.some(x=>x[0]===raw)?raw:"overview";}
  function navigate(){const next=resolve();if(next===route)return;route=next;if(render())notify("Read-only workspace · no persistent v2 write");heading.tabIndex=-1;heading.focus();}
  nav.replaceChildren(...ROUTES.map(([key,label],i)=>{const a=link(key,"");a.dataset.route=key;append(a,el("span","nav-num",String(i+1).padStart(2,"0")),el("span","",label));return a;}));
  doc.getElementById("demo-date").textContent="As of · "+today;
  route=resolve();if(render())notify("Read-only workspace ready · no persistent v2 write");
  doc.querySelector(".skip")?.addEventListener("click",e=>{e.preventDefault();doc.getElementById("main").focus();});
  win.addEventListener("hashchange",navigate);
  return Object.freeze({get route(){return route;}});
}
