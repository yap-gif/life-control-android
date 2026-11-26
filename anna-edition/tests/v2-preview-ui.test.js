import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {JSDOM} from "jsdom";
import {mountPreview,ROUTES} from "../preview-v2/ui.js";
import {createDemoStore,DEMO_DAY} from "../preview-v2/demo-store.js";
import {buildReport} from "../bundle/v2/reporting.js";
const html=await readFile(new URL("../preview-v2/index.html",import.meta.url),"utf8");
const css=await readFile(new URL("../preview-v2/preview.css",import.meta.url),"utf8");
async function setup(route="overview"){
  const dom=new JSDOM(html,{url:"http://localhost/preview-v2/#"+route});
  dom.window.confirm=()=>true;
  const store=await createDemoStore(),ui=await mountPreview(dom.window.document,dom.window,store);
  const d=dom.window.document;
  const wait=async(predicate)=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}assert.fail("UI wait failed: "+d.getElementById("status").textContent);};
  const navigate=async route=>{dom.window.location.hash=route;await wait(()=>ui.route===(route==="savings"?"goals":route==="unknown"?"overview":route));};
  const click=(label,root=d)=>{const b=[...root.querySelectorAll("button")].find(x=>x.textContent===label);assert.ok(b,"Missing button: "+label);assert.equal(b.disabled,false,"Disabled button: "+label);b.click();};
  const set=(form,name,v)=>{const n=[...form.querySelectorAll("[name]")].find(x=>x.name===name);assert.ok(n,"Missing field: "+name);if(n.type==="checkbox")n.checked=v;else n.value=v;n.dispatchEvent(new dom.window.Event("input",{bubbles:true}));n.dispatchEvent(new dom.window.Event("change",{bubbles:true}));};
  const form=(name)=>{const f=[...d.querySelectorAll("form")].find(x=>x.dataset.form===name);assert.ok(f,"Missing form: "+name);return f;};
  const submit=f=>f.dispatchEvent(new dom.window.Event("submit",{bubbles:true,cancelable:true}));
  return {dom,d,store,ui,wait,navigate,click,set,form,submit};
}
test("nine independent routes, active state, savings alias, unknown fallback and skip link",async()=>{
  const x=await setup();try{
    assert.equal(x.d.querySelectorAll("#nav a").length,9);
    for(const [id,title] of ROUTES){await x.navigate(id);assert.equal(x.d.getElementById("page-title").textContent,title);assert.equal(x.d.querySelectorAll('[aria-current="page"]').length,1);assert.equal(x.d.querySelector('[aria-current="page"]').dataset.route,id);assert.ok(!x.d.getElementById("page").textContent.includes("Unable to render"));}
    await x.navigate("savings");assert.equal(x.ui.route,"goals");
    await x.navigate("unknown");assert.equal(x.ui.route,"overview");
    await x.navigate("money");x.d.querySelector(".skip").click();assert.equal(x.ui.route,"money");
  }finally{x.dom.window.close();}
});
test("responsive stylesheet includes 1040, 768 and 420 breakpoints and keyboard focus",()=>{
  assert.match(css,/@media\(max-width:1040px\)/);assert.match(css,/@media\(max-width:768px\)/);assert.match(css,/@media\(max-width:420px\)/);assert.match(css,/:focus-visible/);assert.match(css,/min-height:44px/);
});
test("overview and reports use exact fixture and accessible numerical tables",async()=>{
  const x=await setup();try{assert.match(x.d.getElementById("page").textContent,/725/);
    await x.navigate("reports");assert.match(x.d.getElementById("page").textContent,/225/);assert.match(x.d.getElementById("page").textContent,/Partial period/);
    assert.ok(x.d.querySelectorAll("table").length>=3);assert.ok(x.d.querySelector(".chart[aria-hidden=true]"));assert.ok(x.d.querySelector("th[scope=col]"));
    const detail=[...x.d.querySelectorAll("details.report-disclosure")].find(d=>d.querySelector("summary")?.textContent==="Canonical evidence");assert.ok(detail);assert.equal(detail.open,false);assert.ok(detail.querySelectorAll("table").length>=2);assert.ok(detail.querySelectorAll("td").length>30);assert.match(x.d.getElementById("page").textContent,/Activity at a glance/);
  }finally{x.dom.window.close();}
});
test("task add, edit, complete and reopen through real domain and simulated readback",async()=>{
  const x=await setup("tasks");try{
    const start=x.ui.workspace.revision;x.click("Add task");let f=x.form("Add tasks");x.set(f,"title","New task");x.set(f,"priority","high");x.submit(f);
    await x.wait(()=>x.ui.workspace.revision===start+1&&x.d.getElementById("page").getAttribute("aria-busy")==="false");const task=x.ui.workspace.collections.tasks.find(t=>t.title==="New task");assert.equal(task.priority,"high");
    let row=[...x.d.querySelectorAll(".entry")].find(r=>r.textContent.includes("New task"));x.click("Edit",row);f=x.form("Edit tasks");x.set(f,"title","Edited task");x.submit(f);
    await x.wait(()=>x.ui.workspace.revision===start+2&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    row=[...x.d.querySelectorAll(".entry")].find(r=>r.textContent.includes("Edited task"));x.click("Complete",row);
    await x.wait(()=>x.ui.workspace.revision===start+3&&x.d.getElementById("page").getAttribute("aria-busy")==="false");assert.equal(x.ui.workspace.collections.tasks.find(t=>t.id===task.id).status,"done");
    row=[...x.d.querySelectorAll(".entry")].find(r=>r.textContent.includes("Edited task"));x.click("Reopen",row);
    await x.wait(()=>x.ui.workspace.revision===start+4&&x.d.getElementById("page").getAttribute("aria-busy")==="false");assert.equal(x.ui.workspace.collections.taskEvents.filter(t=>t.taskId===task.id).length,2);
  }finally{x.dom.window.close();}
});
test("money add and filters preserve full storage; reports recalculate",async()=>{
  const x=await setup("money");try{
    const start=x.ui.workspace.revision;x.click("Add transaction");const f=x.form("Add transactions");x.set(f,"amount","1.23");x.set(f,"category","Test");x.submit(f);
    await x.wait(()=>x.ui.workspace.revision===start+1&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    assert.equal(buildReport(x.ui.workspace,{kind:"month"},DEMO_DAY,["money"]).current.money.expenseMinor,27623);
    const filter=[...x.d.querySelectorAll("form.toolbar")][0];x.set(filter,"category","Test");x.submit(filter);assert.match(x.d.getElementById("page").textContent,/1 records/);assert.equal(x.ui.workspace.collections.transactions.length,6);
  }finally{x.dom.window.close();}
});
test("learning, journal, goals and habit commands work from independent pages",async()=>{
  const x=await setup("learning");try{
    let start=x.ui.workspace.revision;x.click("Log session");let f=x.form("Add learning");x.set(f,"topic","Test topic");x.set(f,"minutes","30");x.submit(f);
    start++;await x.wait(()=>x.ui.workspace.revision===start&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    await x.navigate("journal");x.click("Add reflection");f=x.form("Add journal");x.set(f,"date","2026-11-23");x.set(f,"reflection","Another fictional record");x.submit(f);
    start++;await x.wait(()=>x.ui.workspace.revision===start&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    await x.navigate("goals");x.click("Add goal");f=x.form("Add goals");x.set(f,"title","New savings");x.set(f,"target","100");x.submit(f);
    start++;await x.wait(()=>x.ui.workspace.revision===start&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    const habit=[...x.d.querySelectorAll(".entry")].find(r=>r.textContent.includes("Read for 20 minutes"));x.click("Record check-in",habit);f=x.form("Add habit Checkins");x.submit(f);
    start++;await x.wait(()=>x.ui.workspace.revision===start&&x.d.getElementById("page").getAttribute("aria-busy")==="false");assert.equal(x.ui.workspace.collections.habitCheckins.length,1);
  }finally{x.dom.window.close();}
});
test("unsaved editor navigation requires explicit discard; user strings render as text",async()=>{
  const x=await setup("journal");try{x.click("Add reflection");const f=x.form("Add journal");x.set(f,"reflection","<img src=x onerror=alert(1)>");x.set(f,"date","2026-11-23");x.dom.window.confirm=()=>false;x.dom.window.location.hash="money";await new Promise(r=>setTimeout(r,20));assert.equal(x.ui.route,"journal");assert.equal(f.querySelector("textarea").value,"<img src=x onerror=alert(1)>");
    x.dom.window.confirm=()=>true;const start=x.ui.workspace.revision;x.submit(f);await x.wait(()=>x.ui.workspace.revision===start+1&&x.d.getElementById("page").getAttribute("aria-busy")==="false");assert.equal(x.d.querySelector("img"),null);assert.match(x.d.getElementById("page").textContent,/<img src=x/);
  }finally{x.dom.window.close();}
});
test("AI consent, result save, plan selection and explicit task import end to end",async()=>{
  const x=await setup("insights");try{
    const start=x.ui.workspace.revision;const f=x.d.querySelector("#page form");x.set(f,"question","Review my money");x.set(f,"money",true);x.submit(f);
    await x.wait(()=>x.d.querySelector("[data-consent-panel]")&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    const consent=x.d.querySelector('[name="consent"]');assert.ok(!consent.checked);const run=[...x.d.querySelectorAll("button")].find(b=>b.textContent==="Run simulated analysis");assert.equal(run.disabled,true);
    consent.checked=true;consent.dispatchEvent(new x.dom.window.Event("change",{bubbles:true}));x.click("Run simulated analysis");
    await x.wait(()=>x.d.querySelector("[data-unsaved-analysis]")&&x.d.getElementById("page").getAttribute("aria-busy")==="false");assert.equal(x.ui.workspace.revision,start);
    x.click("Save simulated analysis");await x.wait(()=>x.ui.workspace.revision===start+1&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    const details=x.d.querySelector("details");details.open=true;const plan=details.querySelector("form");x.set(plan,"pick:demo-action",true);x.submit(plan);
    await x.wait(()=>x.ui.workspace.revision===start+2&&x.d.getElementById("page").getAttribute("aria-busy")==="false");assert.equal(x.ui.workspace.collections.planActions[0].status,"proposed");assert.equal(x.ui.workspace.collections.tasks.length,3);
    x.click("Accept as task");await x.wait(()=>x.ui.workspace.revision===start+3&&x.d.getElementById("page").getAttribute("aria-busy")==="false");assert.equal(x.ui.workspace.collections.tasks.length,4);
    await x.navigate("tasks");const row=[...x.d.querySelectorAll(".entry")].find(r=>r.textContent.includes("AI-linked"));x.click("Complete",row);
    await x.wait(()=>x.ui.workspace.revision===start+4&&x.d.getElementById("page").getAttribute("aria-busy")==="false");assert.equal(x.ui.workspace.collections.planActions[0].status,"completed");
  }finally{x.dom.window.close();}
});
test("request changes invalidate preview and consent",async()=>{
  const x=await setup("insights");try{
    let f=x.d.querySelector("#page form");x.set(f,"question","Review");x.set(f,"money",true);x.submit(f);
    await x.wait(()=>x.d.querySelector("[data-consent-panel]")&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    f=x.d.querySelector("#page form");x.set(f,"question","Changed");assert.equal(x.d.querySelector("[data-consent-panel]"),null);assert.match(x.d.getElementById("status").textContent,/new preview/);
  }finally{x.dom.window.close();}
});
test("unconfirmed mock write locks UI, no false save, reconcile without retry",async()=>{
  const x=await setup("privacy");try{
    const start=x.ui.workspace.revision;x.click("Simulate unconfirmed write");await x.navigate("tasks");x.click("Add task");const f=x.form("Add tasks");x.set(f,"title","Unconfirmed");x.submit(f);
    await x.wait(()=>x.store.locked&&x.d.getElementById("page").getAttribute("aria-busy")==="false");assert.equal(x.ui.workspace.revision,start);assert.match(x.d.getElementById("status").textContent,/not confirmed/);
    await x.navigate("privacy");x.click("Reconcile simulated workspace");await x.wait(()=>!x.store.locked&&x.d.getElementById("page").getAttribute("aria-busy")==="false");assert.equal(x.ui.workspace.revision,start);assert.equal(x.ui.workspace.collections.tasks.some(t=>t.title==="Unconfirmed"),false);
  }finally{x.dom.window.close();}
});

test("08B1-01 overview has exact learning progress and four route links without mutating",async()=>{
  const x=await setup();try{
    const bar=x.d.querySelector("progress");assert.equal(bar.value,45);assert.equal(bar.max,100);
    assert.match(bar.getAttribute("aria-valuetext"),/135 \/ 300 min/);
    const rev=x.ui.workspace.revision;
    assert.deepEqual([...x.d.querySelectorAll(".quick-nav a")].map(a=>a.getAttribute("href")),["#tasks","#money","#learning","#journal"]);
    x.d.querySelector('.quick-nav a[href="#learning"]').click();await x.wait(()=>x.ui.route==="learning");
    assert.equal(x.ui.workspace.revision,rev);
  }finally{x.dom.window.close();}
});
test("08B1-02 report custom date controls only visible for custom and retain values",async()=>{
  const x=await setup("reports");try{
    const form=x.d.querySelector("#page form"),from=form.querySelector('[name="from"]'),through=form.querySelector('[name="through"]');
    assert.ok(from.closest("label").hidden&&through.closest("label").hidden);
    assert.equal(form.querySelectorAll(".category-grid input:checked").length,6);
    x.set(form,"kind","custom");assert.equal(from.closest("label").hidden,false);
    x.set(form,"from","2026-11-03");x.set(form,"through","2026-11-20");
    x.set(form,"kind","week");assert.ok(from.closest("label").hidden);
    x.set(form,"kind","custom");assert.equal(from.value,"2026-11-03");assert.equal(through.value,"2026-11-20");
    x.submit(form);assert.match(x.d.getElementById("page").textContent,/2026-11-03 – 2026-11-20/);
  }finally{x.dom.window.close();}
});
test("08B1-03 coach categories remain opt-in and custom range changes invalidate payload",async()=>{
  const x=await setup("insights");try{
    let f=x.d.querySelector("#page form");assert.equal(f.querySelectorAll(".category-grid input:checked").length,0);
    assert.ok(f.querySelector('[name="from"]').closest("label").hidden);
    x.set(f,"question","Review money");x.set(f,"money",true);x.submit(f);
    await x.wait(()=>x.d.querySelector("[data-consent-panel]")&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    f=x.d.querySelector("#page form");x.set(f,"kind","custom");
    assert.equal(f.querySelector('[name="from"]').closest("label").hidden,false);
    assert.equal(x.d.querySelector("[data-consent-panel]"),null);assert.equal(f.querySelector('[name="money"]').checked,true);
  }finally{x.dom.window.close();}
});
test("08B1-04 learning and goals progress use canonical metrics and privacy separates diagnostics",async()=>{
  const x=await setup("learning");try{
    assert.equal(x.d.querySelector("progress").value,45);
    await x.navigate("goals");assert.equal(x.d.querySelector("progress").value,25);
    await x.navigate("privacy");assert.equal(x.d.querySelector("#page h2").textContent,"Privacy & data");
    const diagnostics=[...x.d.querySelectorAll("section")].find(s=>s.querySelector("h2")?.textContent==="Developer diagnostics");
    assert.ok(diagnostics);assert.match(diagnostics.textContent,/not real cross-session recovery/);
    assert.ok([...diagnostics.querySelectorAll("button")].some(b=>b.textContent==="Simulate unconfirmed write"));
  }finally{x.dom.window.close();}
});

test("08B2-01 cashflow uses exact money values, distinct visual directions and balance disclaimer",async()=>{
  const x=await setup("money");try{
    const panel=x.d.querySelector(".cashflow-summary");assert.match(panel.textContent,/725/);assert.match(panel.textContent,/72.5%/);
    assert.match(panel.textContent,/not an account balance/);assert.ok(panel.querySelector(".fill.income"));assert.ok(panel.querySelector(".fill.expense"));
    const bars=[...x.d.querySelectorAll(".expense-meter")];assert.equal(bars.length,2);
    assert.ok(Math.abs(bars.reduce((n,b)=>n+b.value,0)-100)<0.00001);
    assert.match(x.d.querySelector(".budget-item").textContent,/Over budget/);
    assert.match(x.d.querySelector(".budget-item").textContent,/25.00 over limit/);
    assert.equal(x.d.querySelector(".budget-item progress").value,100);
  }finally{x.dom.window.close();}
});
test("08B2-02 report financial trend preserves six exact period values and selection scope",async()=>{
  const x=await setup("reports");try{
    const trend=x.d.querySelector(".flow-trend");assert.equal(trend.querySelectorAll(".trend-period").length,6);
    assert.match(trend.textContent,/2026-11-23 \*/);assert.ok(trend.querySelector(".fill.income"));assert.ok(trend.querySelector(".fill.expense"));
    const f=x.d.querySelector("#page form");x.set(f,"money",false);x.submit(f);
    assert.equal(x.d.querySelector(".cashflow-summary"),null);assert.equal(x.d.querySelector(".flow-trend"),null);assert.equal(x.d.querySelector(".budget-summary"),null);
  }finally{x.dom.window.close();}
});
test("08B2-03 recorded negative net and zero income are not misrepresented as positive balance",async()=>{
  const x=await setup("money");try{
    for(const t of [...x.ui.workspace.collections.transactions].filter(t=>t.kind==="income")){
      await x.store.apply({type:"record.delete",collection:"transactions",id:t.id,confirm:true,retainHistoricalCopies:true});
    }
    await x.navigate("overview");await x.navigate("money");
    const cf=x.d.querySelector(".cashflow-summary");assert.match(cf.textContent,/Deficit/);assert.match(cf.textContent,/N\/A/);assert.ok(cf.querySelector(".cashflow-net strong.negative"));
    assert.ok(x.d.querySelector(".metric-negative"));assert.equal(cf.querySelector(".fill.income").style.width,"0%");
  }finally{x.dom.window.close();}
});
test("08B2-04 budget visual updates from confirmed transaction and zero limit has no invalid ratio",async()=>{
  const x=await setup("money");try{
    await x.store.apply({type:"record.add",collection:"budgets",id:x.store.id("budget"),data:{month:"2026-11",category:"Other",limitMinor:0}});
    await x.navigate("overview");await x.navigate("money");
    const zero=[...x.d.querySelectorAll(".budget-item")].find(n=>n.textContent.includes("Other"));
    assert.match(zero.textContent,/Zero limit/);assert.match(zero.textContent,/Limit reached/);assert.equal(zero.querySelector("progress"),null);
    x.click("Add transaction");const form=x.form("Add transactions");x.set(form,"amount","5");x.set(form,"category","Food");const rev=x.ui.workspace.revision;x.submit(form);
    await x.wait(()=>x.ui.workspace.revision===rev+1&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    assert.match(x.d.querySelector(".budget-item").textContent,/30.00 over limit/);
  }finally{x.dom.window.close();}
});

test("08C1-01 overview directly records a task and restores focus after confirmed save",async()=>{
  const x=await setup();try{
    const rev=x.ui.workspace.revision;
    const buttons=[...x.d.querySelectorAll(".quick-record-grid button")];
    assert.deepEqual(buttons.map(b=>b.dataset.quickKind),["tasks","transactions","learning","journal"]);
    x.click("Add task");const f=x.form("Add tasks");
    assert.equal(x.ui.route,"overview");assert.equal(x.ui.workspace.revision,rev);
    assert.equal(x.d.activeElement,f.querySelector('[name="title"]'));
    x.set(f,"title","Quick task");x.set(f,"dueDate",DEMO_DAY);x.submit(f);
    await x.wait(()=>x.ui.workspace.revision===rev+1&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    assert.equal(x.ui.route,"overview");assert.match(x.d.querySelector(".overview-grid").textContent,/Quick task/);
    assert.equal(x.d.querySelector('form[data-form="Add tasks"]'),null);
    assert.equal(x.d.activeElement.dataset.quickKind,"tasks");
  }finally{x.dom.window.close();}
});
test("08C1-02 quick transaction updates overview exactly and Money puts budget and records before charts",async()=>{
  const x=await setup();try{
    const rev=x.ui.workspace.revision;x.click("Add transaction");const f=x.form("Add transactions");
    assert.equal(x.ui.route,"overview");assert.equal(x.ui.workspace.revision,rev);
    x.set(f,"amount","1.23");x.set(f,"category","Food");x.submit(f);
    await x.wait(()=>x.ui.workspace.revision===rev+1&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    assert.match(x.d.querySelector(".cashflow-net").textContent,/723.77/);
    await x.navigate("money");
    const titles=[...x.d.querySelectorAll("#page h2")].map(h=>h.textContent);
    assert.ok(titles.indexOf("Budget overview")<titles.indexOf("Monthly cashflow"));
    assert.ok(titles.indexOf("Transactions")<titles.indexOf("Monthly cashflow"));
    assert.match(x.d.querySelector(".budget-item").textContent,/26.23 over limit/);
  }finally{x.dom.window.close();}
});
test("08C1-03 quick learning updates progress and today's reflection edits rather than duplicates",async()=>{
  const x=await setup();try{
    let rev=x.ui.workspace.revision;x.click("Log session");let f=x.form("Add learning");x.set(f,"topic","Quick study");x.set(f,"minutes","30");x.submit(f);
    rev++;await x.wait(()=>x.ui.workspace.revision===rev&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    const report=buildReport(x.ui.workspace,{kind:"week"},DEMO_DAY,["learning"]).current.learning;
    assert.equal(report.minutes,165);
    assert.equal(report.weeklyTargetMinutes,300);
    const meter=x.d.querySelector(".overview-grid progress");
    assert.equal(meter.max,100);
    assert.equal(meter.getAttribute("aria-valuetext"),"165 / 300 min");
    // IEEE 754: (165 / 300) * 100 is 55.00000000000001.
    assert.ok(Math.abs(meter.value-55)<1e-10,"Expected learning progress of 55%");
    const before=x.ui.workspace.collections.journal.length,today=x.ui.workspace.collections.journal.find(j=>j.date===DEMO_DAY);
    assert.ok(today);x.click("Edit today\'s reflection");f=x.form("Edit journal");
    assert.equal(f.querySelector("textarea").value,today.reflection);x.set(f,"reflection","Edited fictional reflection");x.submit(f);
    rev++;await x.wait(()=>x.ui.workspace.revision===rev&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    assert.equal(x.ui.workspace.collections.journal.length,before);assert.equal(x.ui.workspace.collections.journal.find(j=>j.id===today.id).reflection,"Edited fictional reflection");
    assert.equal(x.ui.route,"overview");assert.equal(x.d.activeElement.dataset.quickKind,"journal");
  }finally{x.dom.window.close();}
});

test("08C1-04 quick editor guards dirty drafts and cancellation restores focus",async()=>{
  const x=await setup();try{
    const rev=x.ui.workspace.revision;x.click("Add task");const f=x.form("Add tasks");x.set(f,"title","Keep this draft");
    x.dom.window.confirm=()=>false;x.click("Add transaction");assert.equal(x.form("Add tasks"),f);
    x.click("Cancel",f);assert.equal(x.form("Add tasks"),f);
    x.dom.window.location.hash="money";await new Promise(r=>setTimeout(r,20));assert.equal(x.ui.route,"overview");assert.equal(f.querySelector('[name="title"]').value,"Keep this draft");
    x.dom.window.confirm=()=>true;x.click("Cancel",f);assert.equal(x.d.querySelector("form[data-form]"),null);assert.equal(x.d.activeElement.dataset.quickKind,"tasks");assert.equal(x.ui.workspace.revision,rev);
  }finally{x.dom.window.close();}
});
test("08C1-05 unconfirmed quick write locks all direct record actions",async()=>{
  const x=await setup("privacy");try{
    const rev=x.ui.workspace.revision;x.click("Simulate unconfirmed write");await x.navigate("overview");
    x.click("Add task");const f=x.form("Add tasks");x.set(f,"title","Unconfirmed quick");x.submit(f);
    await x.wait(()=>x.store.locked&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    assert.equal(x.ui.workspace.revision,rev);assert.match(x.d.getElementById("status").textContent,/not confirmed/);
    assert.ok([...x.d.querySelectorAll(".quick-record-grid button")].every(b=>b.disabled));
    assert.equal(x.ui.workspace.collections.tasks.some(t=>t.title==="Unconfirmed quick"),false);
  }finally{x.dom.window.close();}
});

test("08C2-01 applied report evidence and key metrics precede controls and update only on apply",async()=>{
  const x=await setup("reports");try{
    const rev=x.ui.workspace.revision;
    const coverage=x.d.querySelector(".report-coverage"),form=x.d.querySelector("#page form");
    assert.ok(coverage.compareDocumentPosition(form)&x.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.ok(x.d.querySelector("#page .metrics").compareDocumentPosition(form)&x.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.match(coverage.textContent,/Applied categories: Money/);
    x.set(form,"money",false);assert.match(coverage.textContent,/Applied categories: Money/);
    x.submit(form);assert.doesNotMatch(x.d.querySelector(".report-coverage").textContent,/Applied categories: Money/);
    assert.equal(x.d.querySelector(".cashflow-summary"),null);
    assert.equal(x.ui.workspace.revision,rev);
  }finally{x.dom.window.close();}
});
test("08C2-02 rejected custom report leaves last applied evidence and data intact",async()=>{
  const x=await setup("reports");try{
    const rev=x.ui.workspace.revision,coverage=x.d.querySelector(".report-coverage"),before=coverage.textContent,form=x.d.querySelector("#page form");
    x.set(form,"kind","custom");x.set(form,"from","2026-11-24");x.set(form,"through","2026-11-01");x.submit(form);
    assert.equal(x.d.querySelector(".report-coverage").textContent,before);
    assert.match(x.d.getElementById("status").textContent,/Operation rejected/);
    assert.equal(x.ui.workspace.revision,rev);
    x.set(form,"from","2026-11-01");x.set(form,"through","2026-11-24");x.submit(form);
    assert.match(x.d.getElementById("status").textContent,/Report recalculated locally/);
    assert.equal(x.ui.workspace.revision,rev);
  }finally{x.dom.window.close();}
});
test("08C2-03 record filters show applied scope, zero matches and clear without mutating",async()=>{
  const x=await setup("money");try{
    const rev=x.ui.workspace.revision,records=structuredClone(x.ui.workspace.collections.transactions);
    const getForm=()=>[...x.d.querySelectorAll("form[data-filter-key]")].find(f=>f.dataset.filterKey==="transactions:");
    const getSummary=()=>getForm().parentElement.querySelector(".filter-summary");
    let f=getForm();assert.match(getSummary().textContent,/5 of 5 records/);
    x.set(f,"category","No such category");assert.match(getSummary().textContent,/5 of 5 records/);
    x.submit(f);f=getForm();assert.match(getSummary().textContent,/0 of 5 records/);assert.match(getSummary().textContent,/No such category/);
    assert.match(f.parentElement.textContent,/Clear filters to see all records/);
    assert.equal(x.d.activeElement,f.querySelector('button[type="submit"]'));
    x.click("Clear filters",f);f=getForm();assert.equal(f.querySelector('[name="category"]').value,"");
    assert.match(getSummary().textContent,/5 of 5 records/);assert.equal(getSummary().querySelector(".filter-tags"),null);
    assert.equal(x.d.activeElement,f.querySelector("[data-clear-filters]"));
    assert.deepEqual(x.ui.workspace.collections.transactions,records);assert.equal(x.ui.workspace.revision,rev);
  }finally{x.dom.window.close();}
});
test("08C2-04 clear filters cannot discard dirty editor without confirmation",async()=>{
  const x=await setup("tasks");try{
    const rev=x.ui.workspace.revision;let f=x.d.querySelector("form.toolbar");x.set(f,"query","Review");x.submit(f);
    x.click("Add task");const draft=x.form("Add tasks");x.set(draft,"title","Keep draft");
    f=x.d.querySelector("form.toolbar");x.dom.window.confirm=()=>false;x.click("Clear filters",f);
    assert.equal(x.form("Add tasks"),draft);assert.equal(draft.querySelector('[name="title"]').value,"Keep draft");
    assert.equal(f.querySelector('[name="query"]').value,"Review");
    x.dom.window.confirm=()=>true;x.click("Clear filters",f);
    assert.equal(x.d.querySelector('form[data-form="Add tasks"]'),null);
    assert.equal(x.d.querySelector('form.toolbar [name="query"]').value,"");assert.equal(x.ui.workspace.revision,rev);
  }finally{x.dom.window.close();}
});
test("08C2-05 clearing one money list retains other list filters and invalid ranges preserve applied evidence",async()=>{
  const x=await setup("money");try{
    const rev=x.ui.workspace.revision;
    const form=kind=>[...x.d.querySelectorAll("form[data-filter-key]")].find(f=>f.dataset.filterKey===kind+":");
    let f=form("transactions");x.set(f,"category","Food");x.submit(f);
    f=form("budgets");x.set(f,"category","Food");x.submit(f);
    f=form("transactions");const before=f.parentElement.querySelector(".filter-summary").textContent;
    x.set(f,"from","2026-11-24");x.set(f,"through","2026-11-01");x.submit(f);
    assert.match(x.d.getElementById("status").textContent,/Operation rejected/);
    assert.equal(f.parentElement.querySelector(".filter-summary").textContent,before);
    x.click("Clear filters",f);assert.equal(form("budgets").querySelector('[name="category"]').value,"Food");
    assert.equal(form("transactions").querySelector('[name="category"]').value,"");
    assert.equal(x.ui.workspace.revision,rev);
  }finally{x.dom.window.close();}
});

test("08D1-01 question starters never authorize categories or generate requests automatically",async()=>{
  const x=await setup("insights");try{
    const rev=x.ui.workspace.revision;
    const f=x.d.querySelector("#page form"),q=f.querySelector('[name="question"]');
    assert.equal(x.d.querySelector('.coach-step[aria-current="step"]').textContent,"1. Configure");
    x.click("Review spending");
    assert.match(q.value,/recorded spending/);assert.equal(f.querySelectorAll(".category-grid input:checked").length,0);
    assert.equal(f.querySelector('[name="focus"]').value,"custom");
    assert.match(x.d.querySelector(".question-count").textContent,new RegExp(q.value.length+" / 1000"));
    assert.equal(x.d.querySelector("[data-consent-panel]"),null);assert.equal(x.ui.workspace.revision,rev);
    x.dom.window.confirm=()=>false;x.click("Review learning");assert.match(q.value,/recorded spending/);
  }finally{x.dom.window.close();}
});
test("08D1-02 request review shows exact scoped evidence without authorization or save",async()=>{
  const x=await setup("insights");try{
    const rev=x.ui.workspace.revision,f=x.d.querySelector("#page form");
    x.set(f,"question","Review money");x.set(f,"money",true);x.submit(f);
    await x.wait(()=>x.d.querySelector("[data-consent-panel]")&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    const box=x.d.querySelector("[data-consent-panel]"),payload=box.querySelector("pre").textContent,req=JSON.parse(JSON.parse(payload).messages[1].content);
    assert.deepEqual(req.authorizedCategories,["money"]);
    assert.match(box.textContent,/Authorized categories: Money/);assert.match(box.textContent,/Prior plan not included/);
    assert.match(box.textContent,new RegExp(String(new TextEncoder().encode(payload).length)));
    assert.deepEqual([...box.querySelectorAll(".coach-request-summary tbody tr")].map(tr=>[...tr.querySelectorAll("td")].map(td=>td.textContent)),[["Money",String(req.coverage.raw.money.available),String(req.coverage.raw.money.included),String(req.coverage.raw.money.omitted)]]);
    assert.equal(x.d.querySelector('.coach-step[aria-current="step"]').textContent,"2. Review & authorize");
    assert.equal(box.querySelector('[name="consent"]').checked,false);
    assert.equal([...box.querySelectorAll("button")].find(b=>b.textContent==="Run simulated analysis").disabled,true);
    assert.equal(x.ui.workspace.revision,rev);
  }finally{x.dom.window.close();}
});
test("08D1-03 discarding preview revokes pending consent and requires fresh unchecked authorization",async()=>{
  const x=await setup("insights");try{
    const rev=x.ui.workspace.revision;let f=x.d.querySelector("#page form");
    x.set(f,"question","Review money");x.set(f,"money",true);x.submit(f);
    const ready=()=>x.d.querySelector("[data-consent-panel]")&&x.d.getElementById("page").getAttribute("aria-busy")==="false";
    await x.wait(ready);const old=x.d.querySelector(".payload").textContent,tick=x.d.querySelector('[name="consent"]');
    tick.checked=true;tick.dispatchEvent(new x.dom.window.Event("change",{bubbles:true}));x.click("Discard request preview");
    assert.equal(x.d.querySelector("[data-consent-panel]"),null);assert.equal(x.d.querySelector('.coach-step[aria-current="step"]').textContent,"1. Configure");
    f=x.d.querySelector("#page form");assert.equal(f.querySelector('[name="question"]').value,"Review money");assert.equal(x.d.activeElement,f.querySelector('[name="question"]'));
    x.submit(f);await x.wait(ready);assert.notEqual(x.d.querySelector(".payload").textContent,old);
    assert.equal(x.d.querySelector('[name="consent"]').checked,false);assert.equal(x.ui.workspace.revision,rev);
  }finally{x.dom.window.close();}
});
test("08D1-04 change-only input invalidates preview; running remains distinct from saving",async()=>{
  const x=await setup("insights");try{
    const rev=x.ui.workspace.revision;let f=x.d.querySelector("#page form");x.set(f,"question","Review money");x.set(f,"money",true);x.submit(f);
    const ready=()=>x.d.querySelector("[data-consent-panel]")&&x.d.getElementById("page").getAttribute("aria-busy")==="false";
    await x.wait(ready);f=x.d.querySelector("#page form");const focus=f.querySelector('[name="focus"]');focus.value="financial";focus.dispatchEvent(new x.dom.window.Event("change",{bubbles:true}));
    assert.equal(x.d.querySelector("[data-consent-panel]"),null);assert.equal(x.d.querySelector('.coach-step[aria-current="step"]').textContent,"1. Configure");
    x.submit(f);await x.wait(ready);const tick=x.d.querySelector('[name="consent"]');tick.checked=true;tick.dispatchEvent(new x.dom.window.Event("change",{bubbles:true}));x.click("Run simulated analysis");
    await x.wait(()=>x.d.querySelector("[data-unsaved-analysis]")&&x.d.getElementById("page").getAttribute("aria-busy")==="false");
    assert.equal(x.d.querySelector('.coach-step[aria-current="step"]').textContent,"3. Review result");assert.equal(x.ui.workspace.revision,rev);assert.equal(x.ui.workspace.collections.analyses.length,0);
  }finally{x.dom.window.close();}
});
