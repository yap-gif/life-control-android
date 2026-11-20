import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import * as logic from "../bundle/logic.js";
import * as feedback from "../bundle/ui-feedback.js";
import * as review from "../bundle/review-contract.js";
import * as patterns from "../bundle/patterns.js";
import * as formatting from "../bundle/review-format.js";
import * as storageFlow from "../bundle/storage-flow.js";

const html=readFileSync(new URL("../bundle/index.html",import.meta.url),"utf8");
const appSource=readFileSync(new URL("../bundle/app.js",import.meta.url),"utf8");
const script=appSource.replace(/^import[\s\S]*?from\s+["'][^"']+["'];\s*/gm,"");
if (/\bimport\s+/.test(script)) throw Error("Unexpected import remains in browser test bundle");

const useDeps=String.raw`
const AnnaAppRuntime=window.__deps.AnnaAppRuntime;
const {STORAGE_KEY,normalizeState,localDate,calculateForecast,calculateSummary,validDate}=window.__deps.logic;
const {explainHostError,entryActionLabel,isMissingStorageKey}=window.__deps.feedback;
const {buildReviewRequest}=window.__deps.review;
const {summarizePatternPreview}=window.__deps.patterns;
const {renderReviewMarkdown}=window.__deps.formatting;
const {queueStorageWrite}=window.__deps.storageFlow;
`;

async function waitFor(predicate,details="condition",ms=6000) {
  const until=Date.now()+ms;
  while(Date.now()<until) {
    if(predicate()) return;
    await new Promise(resolve=>setTimeout(resolve,15));
  }
  throw new Error("Timed out waiting for "+details);
}
function setup({database=new Map(),rejectPlanSave=false,ackWithoutPersist=false,missingKeyAs404=false,readError=null,modelCalls={count:0}}={}) {
  const dom=new JSDOM(html,{
    url:"https://anna.partners/apps/life-control-anna#overview",
    runScripts:"outside-only",
    pretendToBeVisual:true
  });
  const {window}=dom;
  const anna={
    storage:{
      get:async({key})=>{
        if(readError)throw readError;
        if(missingKeyAs404 && !database.has(key))throw {status:404,code:"NOT_FOUND"};
        return {value:database.get(key)??null};
      },
      set:async({key,value})=>{
        if(rejectPlanSave && value.savedPlan)throw new Error("mock storage rejected plan");
        if(ackWithoutPersist && value.savedPlan)return {etag:"fake-ack"};
        database.set(key,JSON.parse(JSON.stringify(value)));
        return {etag:"mock-ack",generation:1};
      },
      delete:async({key})=>{database.delete(key);return {ok:true};}
    },
    llm:{
      complete:async()=>{
        modelCalls.count++;
        return {
          role:"assistant",content:{type:"text",
            text:"### Evidence across weeks\n- 120 minutes then 60 minutes.\n\n### Seven-day adjusted plan\n- Record a learning session."},
          model:"mock",stopReason:"endTurn",usage:{totalTokens:30}
        };
      }
    }
  };
  window.__deps={
    AnnaAppRuntime:{connect:async()=>anna},
    logic,feedback,review,patterns,formatting,storageFlow
  };
  window.eval(useDeps+script);
  return {dom,window,document:window.document,database,modelCalls};
}

test("reviewer issues 1 and 3: navigation and AI report survive closing and reopening",async()=>{
  const database=new Map();
  const modelCalls={count:0};
  const first=setup({database,modelCalls});
  try {
    const d=first.document;
    await waitFor(()=>d.getElementById("connection").textContent==="Anna connected","Anna boot");
    first.window.location.hash="#insights";
    await waitFor(()=>!d.getElementById("view-insights").hidden,"insights page shown");
    assert.ok(d.getElementById("view-tasks").hidden,"Tasks must be another page");
    assert.ok(d.getElementById("view-money").hidden,"Money must be another page");
    d.getElementById("ai-consent").checked=true;
    d.getElementById("review-form").dispatchEvent(
      new first.window.Event("submit",{bubbles:true,cancelable:true}));
    await waitFor(()=>!!database.get(logic.STORAGE_KEY)?.lastReview,"AI report persisted");
    assert.equal(modelCalls.count,1);
    assert.equal(d.getElementById("ai-consent").checked,false);
    assert.equal(d.getElementById("review-btn").disabled,false);
    d.getElementById("save-plan-btn").click();
    await waitFor(()=>!!database.get(logic.STORAGE_KEY)?.savedPlan,"plan acknowledged");
    assert.ok(d.getElementById("review-save-status").textContent.includes("verified"));
  } finally {first.window.close();}

  const next=setup({database,modelCalls});
  try {
    const d=next.document;
    await waitFor(()=>d.getElementById("connection").textContent==="Anna connected","Anna reboot");
    assert.equal(modelCalls.count,1,"Reopening must never call LLM automatically");
    assert.ok(d.getElementById("review-result").textContent.includes("120 minutes"));
    assert.ok(d.getElementById("analysis-meta").textContent.includes("Restored analysis"));
    assert.equal(d.getElementById("review-btn").disabled,false,"Generation must remain clickable");
    assert.equal(d.getElementById("ai-consent").checked,false,"Consent must be fresh");
    assert.equal(database.get(logic.STORAGE_KEY).savedPlan.categories[0],"tasks");
    next.window.location.hash="#learning";
    await waitFor(()=>!d.getElementById("view-learning").hidden,"learning page");
    assert.ok(d.getElementById("view-insights").hidden,"Insights must be a distinct page");
    next.window.location.hash="#insights";
    await waitFor(()=>!d.getElementById("view-insights").hidden,"insights after navigation");
    d.getElementById("ai-consent").checked=true;
    d.getElementById("review-form").dispatchEvent(
      new next.window.Event("submit",{bubbles:true,cancelable:true}));
    await waitFor(()=>modelCalls.count===2,"second deliberate AI call");
    await waitFor(()=>!d.getElementById("review-btn").disabled,"generate button restored");
  } finally {next.window.close();}
});

test("reviewer issue 2: failed plan save stays retryable and is not falsely labeled saved",async()=>{
  const database=new Map([[logic.STORAGE_KEY,logic.normalizeState({
    lastReview:{generatedAt:logic.localDate(),text:"### Evidence\n- Example",categories:["learning"]}
  })]]);
  const testApp=setup({database,rejectPlanSave:true});
  try{
    const d=testApp.document;
    await waitFor(()=>d.getElementById("connection").textContent==="Anna connected","boot");
    assert.equal(d.getElementById("save-plan-btn").disabled,false);
    d.getElementById("save-plan-btn").click();
    await waitFor(()=>d.getElementById("review-save-status").textContent.includes("NOT confirmed"),
      "unconfirmed plan error");
    assert.equal(d.getElementById("save-plan-btn").disabled,false,"Save should be retryable");
    assert.equal(database.get(logic.STORAGE_KEY).savedPlan,null);
    assert.doesNotMatch(d.getElementById("review-save-status").textContent,/Saved plan confirmed/);
    assert.ok(d.getElementById("review-result").textContent.includes("Evidence"),
      "Analysis must remain readable after failed plan save");
  }finally{testApp.window.close();}
});

test("all non-AI pages still work and keep serialized state across navigation", async()=>{
  const database=new Map();
  const app=setup({database});
  const d=app.document;
  const today=logic.localDate();
  const submit=id=>d.getElementById(id).dispatchEvent(
    new app.window.Event("submit",{bubbles:true,cancelable:true}));
  const open=async(name)=>{
    app.window.location.hash="#"+name;
    await waitFor(()=>!d.getElementById("view-"+name).hidden,name+" view");
  };
  const getSaved=()=>database.get(logic.STORAGE_KEY);
  try{
    await waitFor(()=>d.getElementById("connection").textContent==="Anna connected","boot");

    await open("tasks");
    const task=d.getElementById("task-form");
    task.elements.namedItem("title").value="Review task";
    task.elements.namedItem("date").value=today;
    submit("task-form");
    await waitFor(()=>getSaved()?.tasks.length===1,"task persisted");
    d.querySelector("#task-list button").click();
    await waitFor(()=>getSaved()?.tasks[0]?.done===true,"completion persisted");
    assert.equal(getSaved().tasks[0].title,"Review task");

    await open("money");
    const money=d.getElementById("money-form");
    money.elements.namedItem("amount").value="33.50";
    money.elements.namedItem("type").value="income";
    money.elements.namedItem("category").value="Test income";
    money.elements.namedItem("date").value=today;
    submit("money-form");
    await waitFor(()=>getSaved()?.money.length===1,"money persisted");
    assert.equal(getSaved().money[0].amount,33.5);

    await open("learning");
    const learning=d.getElementById("learning-form");
    learning.elements.namedItem("topic").value="Database";
    learning.elements.namedItem("minutes").value="45";
    learning.elements.namedItem("date").value=today;
    submit("learning-form");
    await waitFor(()=>getSaved()?.learning.length===1,"learning persisted");

    await open("journal");
    const journal=d.getElementById("journal-form");
    journal.elements.namedItem("text").value="Fictional QA reflection";
    journal.elements.namedItem("date").value=today;
    submit("journal-form");
    await waitFor(()=>getSaved()?.journal.length===1,"journal persisted");
    assert.equal(getSaved().journal[0].text,"Fictional QA reflection");

    await open("savings");
    const goal=d.getElementById("goal-form");
    goal.elements.namedItem("goal").value="1000";
    goal.elements.namedItem("saved").value="250";
    goal.elements.namedItem("monthly").value="100";
    submit("goal-form");
    await waitFor(()=>getSaved()?.goal.goal===1000,"savings persisted");
    assert.equal(getSaved().goal.monthly,100);

    await open("overview");
    assert.ok(d.getElementById("study-count").textContent.includes("45 min"));
    await open("privacy");
    d.getElementById("erase-data").click();
    assert.equal(d.getElementById("erase-confirm-panel").hidden,false);
    d.getElementById("erase-confirm").click();
    await waitFor(()=>!database.has(logic.STORAGE_KEY),"workspace erased");
    assert.equal(d.getElementById("open-count").textContent,"0");
  }finally{app.window.close();}
});

test("reviewer issue 2: a fake successful write without stored plan must fail readback",async()=>{
  const database=new Map([[logic.STORAGE_KEY,logic.normalizeState({
    lastReview:{generatedAt:logic.localDate(),text:"### Review\n- Test",categories:["learning"]}
  })]]);
  const app=setup({database,ackWithoutPersist:true});
  try{
    const d=app.document;
    await waitFor(()=>d.getElementById("connection").textContent==="Anna connected","boot");
    d.getElementById("save-plan-btn").click();
    await waitFor(()=>d.getElementById("review-save-status").textContent.includes("NOT confirmed"),
      "readback failure");
    assert.equal(database.get(logic.STORAGE_KEY).savedPlan,null);
    assert.equal(d.getElementById("save-plan-btn").disabled,false);
    assert.doesNotMatch(d.getElementById("review-save-status").textContent,/verified by/);
  }finally{app.window.close();}
});

test("fresh Cloud Agent install: a missing storage key (HTTP 404) is a usable new workspace",async()=>{
  const app=setup({database:new Map(),missingKeyAs404:true});
  try{
    const d=app.document;
    await waitFor(()=>d.getElementById("connection").textContent==="Anna connected",
      "first install with missing storage key");
    assert.equal(d.getElementById("task-form").elements.namedItem("title").disabled,false);
    const form=d.getElementById("task-form");
    form.elements.namedItem("title").value="New user's first task";
    form.elements.namedItem("date").value=logic.localDate();
    form.dispatchEvent(new app.window.Event("submit",{bubbles:true,cancelable:true}));
    await waitFor(()=>app.database.get(logic.STORAGE_KEY)?.tasks.length===1,"first task persisted");
  }finally{app.window.close();}
});

test("storage permission error must not create an empty workspace or enable editing",async()=>{
  const app=setup({readError:{status:403,code:"FORBIDDEN"}});
  try{
    const d=app.document;
    await waitFor(()=>d.getElementById("connection").textContent==="Connection unavailable",
      "permission failure");
    assert.equal(d.getElementById("task-form").elements.namedItem("title").disabled,true);
    assert.equal(d.getElementById("retry-connect").hidden,false);
    assert.equal(app.database.size,0);
  }finally{app.window.close();}
});
