import {buildReport,buildTrend,REPORT_CATEGORIES} from "../bundle/v2/reporting.js";
import {selectPage} from "../bundle/v2/selectors.js";
import {myrToMinor} from "../bundle/v2/workspace.js";
import {buildCoachRequest,createConsentController} from "../bundle/v2/ai-coach.js";
import {historyState} from "../bundle/v2/ai-actions.js";
import {shiftDay} from "../bundle/v2/calendar.js";
import {DEMO_DAY,DEMO_LIMIT,demoTransport} from "./demo-store.js";

export const ROUTES=Object.freeze([["overview","Overview"],["reports","Reports"],["insights","AI Insights"],["tasks","Tasks"],["money","Money"],["learning","Learning"],["journal","Journal"],["goals","Goals"],["privacy","Privacy"]]);
const fmt=n=>new Intl.NumberFormat("en-MY",{style:"currency",currency:"MYR"}).format(n/100);
const val=m=>m.value===null?"Not available":m.unit==="MYR_sen"?fmt(m.value):m.unit==="percent"?m.value.toFixed(1)+"%":String(m.value)+" "+m.unit;
const pretty=s=>s.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[_:]/g," ");
const specFor=(kind,from,through)=>kind==="custom"?{kind,from,through}:{kind};
const dates=(r)=>r.from+" – "+r.through;
const f=(name,label,type="text",value="",opts={})=>({name,label,type,value,...opts});
const choices=(...v)=>v.map(x=>[x,pretty(x)]);
const categoryNames={money:"Money",learning:"Learning",tasks:"Tasks",journal:"Journal",goals:"Goals",habits:"Habits"};
export async function mountPreview(doc,win,store){
  const page=doc.getElementById("page"),nav=doc.getElementById("nav"),status=doc.getElementById("status"),heading=doc.getElementById("page-title");
  const el=(tag,cls="",text=null)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==null)n.textContent=String(text);return n;};
  const append=(p,...children)=>{for(const n of children.flat())if(n)p.append(n);return p;};
  const section=(title,...children)=>append(el("section","panel"),el("h2","",title),...children);
  const stack=(...children)=>append(el("div","stack"),...children);
  const small=t=>el("p","muted",t);
  const empty=t=>el("p","empty",t);
  const link=(route,label)=>{const a=el("a","",label);a.href="#"+route;return a;};
  let route="",dirty=false,dirtyForm=null,busy=false,editor=null,request=null,preview=null,receipt=null;
  const filterState=new Map(),reportState={kind:"month",from:"2026-11-01",through:DEMO_DAY,selected:[...REPORT_CATEGORIES],trend:"week"};
  const coachState={question:"",focus:"custom",kind:"month",from:"2026-11-01",through:DEMO_DAY,selected:[],prior:""};
  const controller=createConsentController({transport:demoTransport});
  const ws=()=>store.workspace;
  const c=()=>ws().collections;
  const notify=(message,error=false)=>{status.textContent=message;status.classList.toggle("error",error);};
  const safeError=(e)=>{if(store.locked)return "Write not confirmed. Further changes locked. Reconcile in Privacy; no automatic retry.";return "Operation rejected: "+String(e?.message??"Invalid operation").slice(0,180);};
  const confirm=t=>win.confirm(t)===true;
  const abandon=()=>!dirty||confirm("Discard unsaved edits?");
  function invalidate(){controller.invalidate();request=null;preview=null;receipt=null;}
  function clearEditor(){editor=null;dirty=false;dirtyForm=null;}
  function markDirty(form){dirty=true;dirtyForm=form;}
  function guardOtherDraft(form){return !dirty||dirtyForm===form||abandon();}
  const button=(label,fn,cls="",disabled=false)=>{const b=el("button",cls,label);b.type="button";b.disabled=disabled;b.addEventListener("click",async()=>{if(busy)return;try{await fn();}catch(e){notify(safeError(e),true);}});return b;};
  function setBusy(value){busy=value;page.setAttribute("aria-busy",String(value));page.querySelectorAll("button,input,select,textarea").forEach(n=>{if(value){if(n.dataset.wasDisabled===undefined)n.dataset.wasDisabled=String(n.disabled);n.disabled=true;}else if(n.dataset.wasDisabled!==undefined){n.disabled=n.dataset.wasDisabled==="true";delete n.dataset.wasDisabled;}});}
  async function commit(command,ai=false){
    if(busy||store.locked)throw new Error("Workspace locked or busy");
    const quickKind=route==="overview"?editor?.kind:null;let confirmed=false;
    setBusy(true);notify("Confirming simulated write…");
    try{await store.apply(command,ai);invalidate();clearEditor();notify("Confirmed in isolated memory · revision "+ws().revision);render();confirmed=true;}
    catch(e){notify(safeError(e),true);if(store.locked)render();}
    finally{setBusy(false);if(confirmed&&quickKind)focusQuick(quickKind);}
  }
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
  // still passes through the original date/spec and explicit-consent validation.
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
  function formBox(title,defs,onSubmit,{track=false,submit="Save",cancel=null}={}){
    const form=el("form","stack"),fields=el("div","fields");form.dataset.form=title;form.append(fields);
    for(const def of defs)field(def,fields);
    if(track)form.addEventListener("input",()=>{markDirty(form);});
    const b=el("button","primary",submit);b.type="submit";b.disabled=store.locked;
    const actions=append(el("div","actions"),b);
    if(cancel)actions.append(button("Cancel",cancel));form.append(actions);
    form.addEventListener("submit",async e=>{e.preventDefault();if(busy||store.locked||!guardOtherDraft(form))return;try{await onSubmit(values(form));}catch(err){notify(safeError(err),true);}});
    return section(title,form);
  }
  function openEditor(kind,row=null,parent=null){if(!abandon())return;clearEditor();editor={kind,row,parent};render();page.querySelector("form[data-form] input,form[data-form] select")?.focus();}
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
    return append(el("div","stack"),small("Six calendar periods ending at the demo date; independent of custom report filters. * Partial period. Zero means no recorded activity, not verified financial inactivity."),visual,
      table(["Period","Income","Expenses","Net"],rows.map(({label,m})=>[label,fmt(m.incomeMinor),fmt(m.expenseMinor),fmt(m.netMinor)])));
  }
  function listEntry(title,meta,buttons=[],extra=null){
    return append(el("div","entry"),append(el("div"),el("strong","",title),el("p","meta",meta),extra),append(el("div","actions"),buttons));
  }
  function filterList(kind,title,describe,{statusChoices=null,category=false,priority=false,parentId=null,query=true}={}){
    const key=kind+":"+String(parentId??""),s=filterState.get(key)??{page:1,query:"",filter:"",category:"",priority:"",from:"",through:""};filterState.set(key,s);
    const opts={page:s.page,pageSize:10,query:s.query,from:s.from||null,through:s.through||null,filter:s.filter||null,category:s.category||null,priority:s.priority||null,parentId};
    let result=selectPage(ws(),kind,opts);if(s.page>Math.max(1,result.pageCount)){s.page=Math.max(1,result.pageCount);result=selectPage(ws(),kind,{...opts,page:s.page});}
    const form=el("form","toolbar");if(query)field(f("query","Search","search",s.query,{maxLength:200}),form);
    if(statusChoices)field(f("filter","Status / type","select",s.filter,{choices:[["","All"],...choices(...statusChoices)]}),form);
    if(category)field(f("category","Category / topic","text",s.category),form);
    if(priority)field(f("priority","Priority","select",s.priority,{choices:[["","All"],...choices("low","normal","high")]}),form);
    field(f("from","From","date",s.from),form);field(f("through","Through","date",s.through),form);
    const submit=el("button","","Apply filters");submit.type="submit";form.append(submit);
    form.addEventListener("submit",e=>{e.preventDefault();if(busy||!abandon())return;try{const v=values(form),next={...s,...v,page:1};selectPage(ws(),kind,{...opts,page:1,query:next.query,from:next.from||null,through:next.through||null,filter:next.filter||null,category:next.category||null,priority:next.priority||null});Object.assign(s,next);clearEditor();render();}catch(err){notify(safeError(err),true);}});
    const list=el("div");for(const row of result.rows)list.append(describe(row));
    const pager=append(el("div","row"),small(result.total+" records · page "+s.page+" / "+Math.max(1,result.pageCount)),append(el("div","actions"),
      button("Previous",()=>{if(abandon()){clearEditor();s.page--;render();}},"",s.page<=1),button("Next",()=>{if(abandon()){clearEditor();s.page++;render();}},"",s.page>=result.pageCount)));
    return section(title,form,result.rows.length?list:empty("No matching records."),pager);
  }
  const editButton=(kind,row,parent=null)=>button("Edit",()=>openEditor(kind,row,parent),"",store.locked);
  const delButton=(kind,row)=>button("Delete",async()=>{
    if(!abandon()||!confirm("Delete this record and any documented dependent records? Historical reports and the synthetic legacy copy may retain data. This is not full erasure."))return;
    const flags={confirm:true,retainHistoricalCopies:true};
    const cmd=kind==="tasks"?{type:"task.delete",id:row.id,...flags}:kind==="milestones"?{type:"milestone.delete",id:row.id,...flags}:kind==="habits"?{type:"habit.delete",id:row.id,...flags}:kind==="habitCheckins"?{type:"habit.checkin.delete",habitId:row.habitId,date:row.date,...flags}:{type:"record.delete",collection:kind,id:row.id,...flags};
    await commit(cmd);
  },"danger",store.locked);
  const commandButton=(label,cmd,confirmation=null)=>button(label,async()=>{if(abandon()&&(!confirmation||confirm(confirmation)))await commit(cmd);},"",store.locked);
  const addButton=(kind,label,parent=null)=>button(label,()=>openEditor(kind,null,parent),"primary",store.locked);
  function editorView(){
    if(!editor)return null;const {kind,row,parent}=editor,old=row??{},isEdit=!!row;
    let defs=[],make;
    const r=(n,l,t="text",d="",o={})=>f(n,l,t,old[n]??d,o);
    const req={required:true};
    if(kind==="tasks"){
      defs=[r("title","Task title","text","",{...req,maxLength:120}),r("dueDate","Due date (optional)","date"),r("priority","Priority","select","normal",{choices:choices("low","normal","high")})];
      make=v=>({type:isEdit?"task.edit":"task.add",id:old.id??store.id("task"),title:v.title,dueDate:v.dueDate||null,priority:v.priority});
    }else if(kind==="transactions"){
      defs=[r("kind","Transaction type","select","expense",{choices:choices("income","expense")}),f("amount","Amount (MYR)","number",isEdit?(old.amountMinor/100).toFixed(2):"",{...req,min:.01,max:100000000,step:.01}),r("category","Category","text","",{...req,maxLength:48}),r("date","Date","date",DEMO_DAY,{...req,max:DEMO_DAY}),r("note","Note (optional)","textarea","",{maxLength:500,wide:true})];
      make=v=>({date:v.date,kind:v.kind,amountMinor:myrToMinor(v.amount),category:v.category,note:v.note||null});
    }else if(kind==="budgets"){
      defs=[r("month","Month","month",DEMO_DAY.slice(0,7),req),r("category","Category","text","",{...req,maxLength:48}),f("limit","Budget (MYR)","number",isEdit?(old.limitMinor/100).toFixed(2):"",{...req,min:0,max:100000000,step:.01})];
      make=v=>({month:v.month,category:v.category,limitMinor:myrToMinor(v.limit)});
    }else if(kind==="learning"){
      defs=[r("topic","Topic","text","",{...req,maxLength:120}),r("minutes","Minutes","number","",{...req,min:1,max:1440,step:1}),r("date","Date","date",DEMO_DAY,{...req,max:DEMO_DAY}),r("note","Note (optional)","textarea","",{maxLength:500,wide:true})];
      make=v=>({date:v.date,topic:v.topic,minutes:Number(v.minutes),note:v.note||null});
    }else if(kind==="journal"){
      defs=[r("date","Date","date",DEMO_DAY,{...req,max:DEMO_DAY}),r("reflection","Reflection","textarea","",{...req,maxLength:2000,wide:true}),f("tags","Tags (comma separated)","text",(old.tags??[]).join(", "),{maxLength:600,wide:true})];
      make=v=>({date:v.date,reflection:v.reflection,tags:v.tags.split(",").map(x=>x.trim()).filter(Boolean)});
    }else if(kind==="goals"){
      const savings=old.kind==="savings";
      defs=[r("title","Goal title","text","",{...req,maxLength:120}),r("kind","Goal type","select","savings",{choices:choices("savings","general"),disabled:isEdit}),f("unit","General goal unit (ignored for savings)","text",savings?"count":old.unit??"count",{maxLength:48,disabled:isEdit}),f("target","Target (MYR for savings; integer for general)","number",isEdit?(savings?old.target/100:old.target):"",{...req,min:0,step:"any"}),f("progress","Progress (MYR for savings; integer for general)","number",isEdit?(savings?old.progress/100:old.progress):"0",{...req,min:0,step:"any"}),f("monthly","Monthly saving (MYR; ignored for general)","number",savings?old.plannedMonthlyMinor/100:0,{min:0,step:.01,required:true}),r("dueDate","Due date (optional)","date")];
      make=v=>({title:v.title,kind:v.kind,unit:v.kind==="savings"?"MYR_sen":v.unit,target:v.kind==="savings"?myrToMinor(v.target):Number(v.target),progress:v.kind==="savings"?myrToMinor(v.progress):Number(v.progress),plannedMonthlyMinor:v.kind==="savings"?myrToMinor(v.monthly):0,dueDate:v.dueDate||null});
    }else if(kind==="milestones"){
      defs=[r("title","Milestone title","text","",{...req,maxLength:120}),r("targetDate","Target date (optional)","date")];
      make=v=>isEdit?{type:"milestone.edit",id:old.id,title:v.title,targetDate:v.targetDate||null}:{type:"milestone.add",id:store.id("milestone"),goalId:parent,title:v.title,targetDate:v.targetDate||null};
    }else if(kind==="habits"){
      defs=[r("title","Habit title","text","",{...req,maxLength:120})];
      if(!isEdit){defs.push(f("startDate","Start date","date",DEMO_DAY,{...req,min:DEMO_DAY}));["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].forEach((d,i)=>defs.push(f("day"+(i+1),d,"checkbox",i<5)));}
      make=v=>isEdit?{type:"habit.rename",id:old.id,title:v.title}:{type:"habit.add",id:store.id("habit"),title:v.title,startDate:v.startDate,scheduledWeekdays:[1,2,3,4,5,6,7].filter(x=>v["day"+x])};
    }else if(kind==="habitCheckins"){
      defs=[f("date","Check-in date","date",old.date??DEMO_DAY,{...req,max:DEMO_DAY,disabled:isEdit}),r("status","Check-in status","select","completed",{choices:choices("completed","skipped")})];
      make=v=>({type:isEdit?"habit.checkin.edit":"habit.checkin",habitId:parent,date:v.date,status:v.status});
    }else return null;
    return formBox((isEdit?"Edit ":"Add ")+pretty(kind),defs,async v=>{
      const value=make(v),cmd=["transactions","budgets","learning","journal","goals"].includes(kind)?{type:isEdit?"record.edit":"record.add",collection:kind,id:old.id??store.id(kind),data:value}:value;await commit(cmd);
    },{track:true,cancel:()=>{if(abandon()){clearEditor();render();if(route==="overview")focusQuick(kind);}}});
  }
  function focusQuick(kind){[...page.querySelectorAll("[data-quick-kind]")].find(b=>b.dataset.quickKind===kind)?.focus();}
  function quickRecords(){
    const today=c().journal.find(j=>j.date===DEMO_DAY);
    const actions=[["tasks","Add task",null],["transactions","Add transaction",null],["learning","Log session",null],["journal",today?"Edit today's reflection":"Add reflection",today??null]];
    return append(el("section","panel quick-records"),el("h2","","Quick record"),small("Record directly here. Changes are confirmed only in isolated memory."),
      append(el("div","quick-record-grid"),actions.map(([kind,label,row])=>{
        const b=button(label,()=>openEditor(kind,row),"primary",store.locked);b.dataset.quickKind=kind;return b;
      })));
  }
  function overview(){
    const w=ws(),week=buildReport(w,{kind:"week"},DEMO_DAY,REPORT_CATEGORIES),month=buildReport(w,{kind:"month"},DEMO_DAY,["money"]),tasks=w.collections.tasks.filter(t=>t.status==="open"),due=tasks.filter(t=>t.dueDate&&t.dueDate<=DEMO_DAY);
    return stack(metrics([["Open tasks",tasks.length],["Due today / overdue",due.length],["This week · learning",week.current.learning.minutes+" min"],["This month · net",fmt(month.current.money.netMinor),netTone(month.current.money.netMinor)]]),
      quickRecords(),editorView(),
      append(el("div","grid overview-grid"),section("Today's priorities",due.length?append(el("div"),due.map(t=>listEntry(t.title,t.priority+" · "+t.dueDate))):empty("No recorded tasks due."),link("tasks","Manage tasks →"),progress("Weekly learning",week.current.learning.weeklyTargetPercent,week.current.learning.minutes+" / "+(week.current.learning.weeklyTargetMinutes??"No target")+" min"),link("learning","View learning →")),
      section("Monthly cashflow",cashflow(month.current.money),link("reports","Open reports →"))),
      section("Quick navigation",append(el("div","quick-nav"),[["tasks","Manage tasks"],["money","Record money"],["learning","Log learning"],["journal","Write reflection"]].map(([id,label])=>link(id,label+" →"))),small("Record activity, inspect deterministic reports, then explicitly authorize a simulated analysis."),link("insights","Open AI Insights →")));
  }
  function reports(){
    const form=el("form","stack compact-config"),controls=el("div","fields");
    const kind=field(f("kind","Period","select",reportState.kind,{choices:choices("week","month","custom")}),controls);
    field(f("trend","Trend periods","select",reportState.trend,{choices:choices("week","month")}),controls);
    const from=field(f("from","Custom start","date",reportState.from),controls),through=field(f("through","Custom end","date",reportState.through),controls);
    customDates(kind,from,through);form.append(controls);
    const fs=el("fieldset","category-grid");fs.append(el("legend","","Report categories"));for(const k of REPORT_CATEGORIES)field(f(k,categoryNames[k],"checkbox",reportState.selected.includes(k)),fs);form.append(fs);
    const submit=el("button","primary","Apply report filters");submit.type="submit";form.append(submit);
    form.addEventListener("submit",e=>{e.preventDefault();const v=values(form),s={kind:v.kind,from:v.from,through:v.through,trend:v.trend,selected:REPORT_CATEGORIES.filter(k=>v[k])};try{buildReport(ws(),specFor(s.kind,s.from,s.through),DEMO_DAY,s.selected);Object.assign(reportState,s);render();notify("Report recalculated locally.");}catch(err){notify(safeError(err),true);}});
    const r=buildReport(ws(),specFor(reportState.kind,reportState.from,reportState.through),DEMO_DAY,reportState.selected),out=[section("Report controls",form),section("Evidence coverage",small(dates(r.periods.current)+(r.periods.current.partial?" · Partial period":"")),small("Comparison: "+dates(r.periods.previous)+" · "+r.periods.comparison),small(r.coverageNote))];
    if(r.current.money){const m=r.current.money;out.push(metrics([["Income",fmt(m.incomeMinor),"positive"],["Expense",fmt(m.expenseMinor),"expense"],["Net cashflow",fmt(m.netMinor),netTone(m.netMinor)],["Net / income",m.netIncomeRatio===null?"N/A":m.netIncomeRatio.toFixed(1)+"%"]]));
      out.push(append(el("div","grid finance-grid"),section("Cashflow",cashflow(m)),section("Expense breakdown",expenseBreakdown(m),table(["Category","Amount","Share"],m.expenseCategories.map(x=>[x.label,fmt(x.total),x.sharePercent.toFixed(1)+"%"])))),section("Monthly budgets",small("Budget actuals may cover earlier days in the same month; see each evidence range."),budgetSummary(r.current.budgets),table(["Category","Coverage","Limit","Spent","Remaining"],r.current.budgets.map(b=>[b.category,dates(b),fmt(b.limitMinor),fmt(b.spentMinor),fmt(b.remainingMinor)]))));}
    if(r.current.learning)out.push(section("Learning topics",chart(r.current.learning.topics.map(x=>[x.label,x.total]),n=>n+" min"),table(["Topic","Minutes","Sessions"],r.current.learning.topics.map(x=>[x.label,x.total,x.count]))));
    const summaryRows=[];
    if(r.current.learning)summaryRows.push(["Learning",r.current.learning.minutes+" minutes · "+r.current.learning.sessions+" sessions"]);
    if(r.current.tasks){const t=r.current.tasks;summaryRows.push(["Tasks due in range",t.dueCount+" · "+t.dueOpenNow+" currently open"],["Recorded task events",t.completionEvents+" completed · "+t.reopenEvents+" reopened"]);}
    if(r.current.journal)summaryRows.push(["Journal",r.current.journal.days+" recorded days"]);
    if(r.current.habits)summaryRows.push(["Habits",r.current.habits.reduce((n,h)=>n+h.completed,0)+" / "+r.current.habits.reduce((n,h)=>n+h.eligible,0)+" eligible days completed"]);
    if(r.currentGoalSnapshot)summaryRows.push(["Goals · current snapshot",r.currentGoalSnapshot.length+" recorded goals"]);
    if(summaryRows.length)out.push(section("Activity at a glance",small("Task due status and goal progress are current snapshots, not reconstructed history."),table(["Category","Recorded activity"],summaryRows)));
    const disclosure=(title,...children)=>{const d=el("details","panel report-disclosure");d.append(el("summary","",title),...children);return d;};
    const trends=reportState.selected.filter(k=>k!=="goals");
    if(trends.length){
      const data=buildTrend(ws(),{kind:reportState.trend,count:6,today:DEMO_DAY,selected:trends});
      for(const k of trends){const metricKey={money:"money.net.current",learning:"learning.minutes.current",tasks:"tasks.completionEvents.current",journal:"journal.days.current"}[k];if(!metricKey)continue;
        const rows=data.map(p=>[p.range.from+(p.range.partial?" *":""),p.metrics.find(m=>m.id===metricKey)?.value??0]);
        out.push(k==="money"?disclosure("Money trend · "+reportState.trend,financialTrend(data)):disclosure(categoryNames[k]+" trend · "+reportState.trend,chart(rows),table(["Period start (*partial)","Recorded value"],rows)));}
      if(trends.includes("habits"))out.push(disclosure("Habit trend",table(["Period","Completed scheduled days","Eligible days"],data.map(p=>[p.range.from+(p.range.partial?" *":""),p.values.habits.reduce((n,h)=>n+h.completed,0),p.values.habits.reduce((n,h)=>n+h.eligible,0)]))));
    }
    const map=new Map(r.metrics.map(m=>[m.id,m]));out.push(disclosure("Canonical evidence",small("Expand for the complete selected metrics and comparison data. Wide tables scroll inside their own container."),table(["Metric","Value","Evidence range","Samples"],r.metrics.map(m=>[m.id,val(m),dates(m.range),m.sampleCount??"—"])),el("h3","","Period changes"),table(["Metric","Recorded change","Percent"],r.changes.map(x=>[x.metricId,val({...map.get(x.metricId),value:x.delta}),x.percentChange===null?"N/A":x.percentChange.toFixed(1)+"%"]))));
    return stack(out);
  }
  function tasks(){return stack(actionPanel("Task management","Actual completion and reopen events are recorded separately from due dates.",addButton("tasks","Add task")),editorView(),
    filterList("tasks","Tasks",t=>listEntry(t.title,[t.priority,t.status,t.dueDate??"No due date",t.sourceActionId?"AI-linked":""].filter(Boolean).join(" · "),[editButton("tasks",t),commandButton(t.status==="open"?"Complete":"Reopen",{type:"task.transition",id:t.id,eventId:store.id("event"),status:t.status==="open"?"done":"open"}),delButton("tasks",t)]),{statusChoices:["open","done"],priority:true}));}
  function money(){const r=buildReport(ws(),{kind:"month"},DEMO_DAY,["money"]).current;return stack(metrics([["Monthly income",fmt(r.money.incomeMinor),"positive"],["Monthly expense",fmt(r.money.expenseMinor),"expense"],["Net cashflow",fmt(r.money.netMinor),netTone(r.money.netMinor)],["Transactions",r.money.entryCount]]),
    actionPanel("Money management","Record income, expenses and category budgets.",addButton("transactions","Add transaction"),addButton("budgets","Add budget")),editorView(),
    section("Budget overview",budgetSummary(r.budgets)),
    filterList("transactions","Transactions",t=>listEntry(t.category+" · "+(t.kind==="income"?"+":"−")+fmt(t.amountMinor),t.kind+" · "+t.date,[editButton("transactions",t),delButton("transactions",t)],t.note?el("p","",t.note):null),{statusChoices:["income","expense"],category:true}),
    append(el("div","grid finance-grid"),section("Monthly cashflow",cashflow(r.money)),section("Expense allocation",expenseBreakdown(r.money),small("Share of recorded expenses in the demo month."))),
    filterList("budgets","Budgets",b=>{const x=r.budgets.find(x=>x.month===b.month&&x.categoryKey===b.category.trim().normalize("NFC").toLowerCase());return listEntry(b.category+" · "+fmt(b.limitMinor),b.month+(x?" · Remaining "+fmt(x.remainingMinor):""),[editButton("budgets",b),delButton("budgets",b)]);},{category:true}));}
  function learning(){const r=buildReport(ws(),{kind:"week"},DEMO_DAY,["learning"]).current.learning;return stack(metrics([["Weekly minutes",r.minutes],["Sessions",r.sessions],["Weekly target",r.weeklyTargetMinutes??"Not set"],["Target progress",r.weeklyTargetPercent===null?"N/A":r.weeklyTargetPercent.toFixed(1)+"%"]]),actionPanel("Learning records","Track actual time spent learning.",addButton("learning","Log session")),editorView(),section("Weekly progress",progress("Learning target",r.weeklyTargetPercent,r.minutes+" / "+(r.weeklyTargetMinutes??"No target")+" min")),formBox("Weekly target",[f("minutes","Target minutes (blank clears)","number",ws().settings.learningWeeklyTargetMinutes??"",{min:1,max:10080,step:1})],v=>commit({type:"learning.target",minutes:v.minutes===""?null:Number(v.minutes)}),{track:true}),filterList("learning","Sessions",l=>listEntry(l.topic+" · "+l.minutes+" min",l.date,[editButton("learning",l),delButton("learning",l)],l.note?el("p","",l.note):null),{category:true}));}
  function journal(){return stack(actionPanel("Daily journal","Private by default. Journal content is included in a simulated AI request only when explicitly selected.",addButton("journal","Add reflection")),editorView(),filterList("journal","Reflections",j=>listEntry(j.date,j.tags.join(" · ")||"No tags",[editButton("journal",j),delButton("journal",j)],el("p","",j.reflection))));}
  function goals(){const r=buildReport(ws(),{kind:"month"},DEMO_DAY,["goals","habits"]),out=[actionPanel("Goals & habits","Progress is manually recorded; it is not inferred from cashflow.",addButton("goals","Add goal"),addButton("habits","Add habit")),editorView()];
    out.push(filterList("goals","Goals",g=>{const x=r.currentGoalSnapshot.find(a=>a.id===g.id),format=g.kind==="savings"?fmt:n=>n+" "+g.unit;
      const details=append(el("div","stack"),progress("Goal progress",x.percent,format(g.progress)+" / "+format(g.target)+" · "+(x.percent===null?"N/A":x.percent.toFixed(1)+"%")),g.kind==="savings"?small("Planned monthly "+fmt(g.plannedMonthlyMinor)+" · Estimated months "+(x.months??"Unknown")):null,append(el("div","actions"),addButton("milestones","Add milestone",g.id)));
      details.append(filterList("milestones","Milestones",m=>listEntry(m.title,(m.done?"Completed":"Open")+" · "+(m.targetDate??"No target date"),[editButton("milestones",m,g.id),commandButton(m.done?"Reopen":"Complete",{type:"milestone.transition",id:m.id,done:!m.done}),delButton("milestones",m)]),{parentId:g.id}));
      return listEntry(g.title,g.kind,[editButton("goals",g),delButton("goals",g)],details);},{statusChoices:["savings","general"]}));
    out.push(filterList("habits","Habits",h=>{const x=r.current.habits.find(a=>a.id===h.id),details=append(el("div","stack"),small("Scheduled weekdays: "+h.scheduledWeekdays.join(", ")+" · Start "+h.startDate),small(x.completed+" / "+x.eligible+" eligible days · Streak "+x.streakWithinPeriod),append(el("div","actions"),addButton("habitCheckins","Record check-in",h.id)));
      details.append(filterList("habitCheckins","Check-ins",a=>listEntry(a.date,a.status,[editButton("habitCheckins",a,h.id),delButton("habitCheckins",a)]),{parentId:h.id,query:false}));
      return listEntry(h.title,h.archivedAt?"Archived from "+h.archivedAt:"Active",[editButton("habits",h),commandButton("Archive tomorrow",{type:"habit.archive",id:h.id,effectiveDate:shiftDay(DEMO_DAY,1)},"Archive from tomorrow? Past check-ins stay intact."),delButton("habits",h)],details);}));
    return stack(out);
  }
  function analysisView(a,unsaved=false){
    const r=a.result,m=new Map(a.request.metrics.map(x=>[x.id,x])),out=[small("Simulated model interpretation · not verified advice."),el("p","",r.summary)];
    for(const finding of r.findings)out.push(append(el("div","panel"),el("h3","","Finding · "+finding.confidence),el("p","",finding.interpretation),small(finding.limitation),table(["Canonical metric","Value","Range"],finding.metricIds.map(id=>[id,val(m.get(id)),dates(m.get(id).range)]))));
    out.push(el("h3","","Follow-up"),el("p","",r.followUp.measurement),small(r.followUp.limitations.join(" · ")));
    if(unsaved)out.push(button("Save simulated analysis",()=>commit({type:"analysis.save",receipt:a,confirm:true},true),"primary",store.locked));
    else if(r.actions.length){
      const form=el("form","stack");
      for(const x of r.actions){
        const used=c().planActions.some(y=>y.sourceActionId===x.id&&c().plans.some(p=>p.id===y.planId&&p.analysisId===a.id));
        const box=el("fieldset");box.append(el("legend","",x.title),small("Proposed target: "+val({...m.get(x.target.metricId),value:x.target.quantity})));
        field(f("pick:"+x.id,"Include in plan","checkbox",false,{disabled:used}),box);field(f("title:"+x.id,"Action title","text",x.title,{required:true,maxLength:120,disabled:used}),box);field(f("due:"+x.id,"Due date","date",x.dueDate,{required:true,disabled:used}),box);form.append(box);
      }
      form.addEventListener("input",()=>{markDirty(form);});const b=el("button","primary","Save selected plan");b.type="submit";b.disabled=store.locked;form.append(b);
      form.addEventListener("submit",async e=>{e.preventDefault();if(busy||store.locked||!guardOtherDraft(form))return;try{const v=values(form),actions=r.actions.filter(x=>v["pick:"+x.id]).map(x=>({id:store.id("action"),sourceActionId:x.id,title:v["title:"+x.id],dueDate:v["due:"+x.id]}));if(!actions.length)throw new Error("Select at least one action");if(confirm("Save selected plan? No tasks will be created yet."))await commit({type:"plan.save",id:store.id("plan"),analysisId:a.id,actions,confirm:true},true);}catch(err){notify(safeError(err),true);}});out.push(form);
    }
    return stack(out);
  }
  function insights(){
    const form=el("form","stack compact-config"),fields=el("div","fields");
    field(f("question","Your question","textarea",coachState.question,{required:true,maxLength:1000,wide:true}),fields);
    field(f("focus","Focus","select",coachState.focus,{choices:choices("custom","comprehensive","financial","learning","task","goal/habit")}),fields);
    const kind=field(f("kind","Date range","select",coachState.kind,{choices:choices("7days","30days","90days","week","month","custom")}),fields);
    const from=field(f("from","Custom start","date",coachState.from),fields),through=field(f("through","Custom end","date",coachState.through),fields);
    customDates(kind,from,through);
    field(f("prior","Prior plan (optional)","select",coachState.prior,{choices:[["","Do not include"],...c().plans.filter(p=>!p.legacyReadOnly).map(p=>[p.id,p.id])]}),fields);form.append(fields);
    const fs=el("fieldset","category-grid");fs.append(el("legend","","Explicitly authorize categories"));for(const k of REPORT_CATEGORIES)field(f(k,categoryNames[k],"checkbox",coachState.selected.includes(k)),fs);form.append(fs);
    const sync=()=>{const v=values(form);Object.assign(coachState,{question:v.question,focus:v.focus,kind:v.kind,from:v.from,through:v.through,prior:v.prior,selected:REPORT_CATEGORIES.filter(k=>v[k])});};
    form.addEventListener("input",()=>{sync();invalidate();markDirty(form);const old=page.querySelector("[data-consent-panel]");old?.remove();page.querySelector("[data-unsaved-analysis]")?.remove();notify("Request changed; a new preview and consent are required.");});
    const b=el("button","primary","Preview exact AI request");b.type="submit";b.disabled=store.locked;form.append(b);
    form.addEventListener("submit",async e=>{e.preventDefault();if(busy||store.locked||!guardOtherDraft(form))return;sync();invalidate();setBusy(true);try{request=buildCoachRequest(ws(),{requestId:store.id("request"),question:coachState.question,focus:coachState.focus,spec:specFor(coachState.kind,coachState.from,coachState.through),selected:coachState.selected,asOf:store.now(),previousPlanId:coachState.prior||null});preview=await controller.preview(request);dirty=false;dirtyForm=null;render();notify("Preview ready. No model called.");}catch(err){invalidate();notify(safeError(err),true);}finally{setBusy(false);}});
    const out=[section("AI Personal Coach",small("Mock transport only. Nothing is sent outside this preview. In the real product, one authorized call may consume Anna credits."),form)];
    if(preview&&request){
      const box=section("Exact authorized payload",small("SHA-256: "+preview.digest),el("pre","payload",preview.payload),small(preview.creditNotice),small("Demo: no credits used. No automatic retries."));
      box.dataset.consentPanel="true";const consent=el("div");const tick=field(f("consent","I authorize this one simulated analysis","checkbox",false),consent);box.append(consent);
      const run=button("Run simulated analysis",async()=>{if(!tick.checked)return;setBusy(true);const p=preview,r=request;notify("Running isolated simulated analysis…");try{controller.consent(p.digest,true);receipt=await controller.run({digest:p.digest,request:r,workspace:ws()});preview=null;request=null;notify("Validated simulated result · not saved yet.");dirty=true;dirtyForm=null;render();}catch(err){invalidate();render();notify(safeError(err),true);}finally{setBusy(false);}},"primary",true);
      tick.addEventListener("change",()=>{run.disabled=!tick.checked||busy;});box.append(run);out.push(box);
    }
    if(receipt){const unsaved=section("Unsaved analysis",analysisView(receipt,true));unsaved.dataset.unsavedAnalysis="true";out.push(unsaved);}
    const hist=section("Analysis history");
    for(const a of c().analyses){const state=historyState(ws(),a.id),details=el("details");details.append(el("summary","",a.legacyReadOnly?"Legacy analysis · read-only":a.request.question+" · "+(state.stale?"Historical snapshot":"Current snapshot")),a.legacyReadOnly?el("p","",a.legacyText):analysisView(a));
      details.append(button("Delete analysis",async()=>{if(abandon()&&confirm("Delete this analysis? Linked plans must be deleted first. Historical copies may remain."))await commit({type:"analysis.delete",id:a.id,confirm:true,retainHistoricalCopies:true},true);},"danger",store.locked));hist.append(details);}
    if(!c().analyses.length)hist.append(empty("No saved analysis. Reopening history never invokes a model."));out.push(hist);
    const plans=section("Saved plans");
    for(const p of c().plans){const box=section(p.legacyReadOnly?"Legacy plan · read-only":p.id,small("Source categories: "+p.sourceCategories.join(", ")));
      if(p.legacyReadOnly)box.append(el("p","",p.legacyText));
      for(const a of c().planActions.filter(x=>x.planId===p.id)){
        const controls=[];
        if(a.status==="proposed"){
          controls.push(button("Accept as task",async()=>{if(abandon()&&confirm("Create one linked task for this selected action?"))await commit({type:"action.accept",id:a.id,taskId:store.id("task"),priority:"normal",confirm:true},true);},"primary",store.locked),button("Dismiss",async()=>{if(abandon()&&confirm("Dismiss this proposed action?"))await commit({type:"action.dismiss",id:a.id,confirm:true},true);},"",store.locked));
          box.append(formBox("Edit proposed action",[f("title","Title","text",a.title,{required:true,maxLength:120}),f("dueDate","Due date","date",a.dueDate,{required:true})],v=>commit({type:"action.edit",id:a.id,title:v.title,dueDate:v.dueDate},true),{track:true}));
        }
        box.append(listEntry(a.title,a.status+" · "+a.dueDate,controls));
      }
      box.append(button("Delete plan",async()=>{if(abandon()&&confirm("Delete plan and all linked tasks/events? Historical copies may remain."))await commit({type:"plan.delete",id:p.id,confirm:true,retainHistoricalCopies:true,deleteLinkedTasks:true},true);},"danger",store.locked));plans.append(box);
    }
    if(!c().plans.length)plans.append(empty("No saved plan."));out.push(plans);return stack(out);
  }
  function privacy(){
    return stack(section("Privacy & data",small("No network model or real storage adapter is present. Records and model receipts remain in memory; page reload resets the demo. Analysis and plan deletion are available in AI Insights."),link("insights","Manage simulated analysis history →"),small("Full production erasure is intentionally unavailable; preserved legacy data and platform-side copies cannot be guaranteed removed.")),section("Storage status",metrics([["Revision",ws().revision],["Mock capacity",Math.round(DEMO_LIMIT/1024)+" KiB"],["Used",store.bytes+" B"],["Real APS","BLOCKED"]]),small(store.source),small("Mock capacity is an arbitrary test ceiling, not measured Anna storage capacity."),small("Real create-if-absent, exclusive migration, readback, capacity and full erasure remain blocked.")),section("Developer diagnostics",small("Synthetic fault injection only. Reconcile is not real cross-session recovery."),
      append(el("div","actions"),button("Simulate unconfirmed write",()=>{store.simulateUnconfirmedWrite();notify("Next simulated mutation will fail readback; no real storage.");},"",store.locked),button("Reconcile simulated workspace",async()=>{setBusy(true);try{await store.reconcile();invalidate();clearEditor();render();notify("Reconciled from isolated memory. No retry performed.");}finally{setBusy(false);}},"",!store.locked))));
  }
  const views={overview,reports,insights,tasks,money,learning,journal,goals,privacy};
  function render(){
    heading.textContent=ROUTES.find(x=>x[0]===route)?.[1]??"Overview";
    nav.querySelectorAll("a").forEach(a=>{if(a.dataset.route===route)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
    try{page.replaceChildren(views[route]());if(store.locked){const lock=el("p","notice","Simulated write outcome unconfirmed. Changes are locked; reconcile in Privacy.");page.prepend(lock);}}
    catch(e){page.replaceChildren(empty("Unable to render this view."));notify(safeError(e),true);}
    if(busy)setBusy(true);else page.setAttribute("aria-busy","false");
  }
  function resolve(){const raw=win.location.hash.slice(1);return raw==="savings"?"goals":ROUTES.some(x=>x[0]===raw)?raw:"overview";}
  function navigate(){const next=resolve();if(next===route)return;if(busy||!abandon()){win.history.replaceState(null,"","#"+route);return;}invalidate();clearEditor();route=next;render();heading.tabIndex=-1;heading.focus();}
  nav.replaceChildren(...ROUTES.map(([key,label],i)=>{const a=link(key,"");a.dataset.route=key;append(a,el("span","nav-num",String(i+1).padStart(2,"0")),el("span","",label));return a;}));
  doc.getElementById("demo-date").textContent="Demo date · "+DEMO_DAY;
  route=resolve();render();notify("Isolated workspace ready · revision "+ws().revision);
  doc.querySelector(".skip")?.addEventListener("click",e=>{e.preventDefault();doc.getElementById("main").focus();});
  win.addEventListener("hashchange",navigate);
  win.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});
  return {get route(){return route;},get workspace(){return ws();},render};
}
