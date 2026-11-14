import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeState, localDate, weekStart, calculateForecast, calculateSummary,
  buildReviewContext
} from "../bundle/logic.js";

const sample = {
  tasks: [{id:"t1",title:"Finish Kotlin homework",date:"2026-11-13",done:false}],
  money: [{id:"m1",date:"2026-11-13",type:"expense",amount:7.5,category:"Private money"}],
  learning: [{id:"l1",date:"2026-11-12",topic:"Room",minutes:35}],
  journal: [{id:"j1",date:"2026-11-13",text:"private diary"}],
  goal: {goal:1000,saved:100,monthly:150}
};

test("normalizes malformed state without creating private data", () => {
  const value = normalizeState({money:[{date:"bad",amount:42,type:"expense"}],tasks:"invalid"});
  assert.equal(value.tasks.length,0);
  assert.equal(value.money.length,0);
});
test("Monday-start weekly date is deterministic", () => {
  assert.equal(weekStart("2026-11-13"),"2026-11-09");
});
test("only chosen categories appear in AI payload", () => {
  const payload = buildReviewContext(sample,["tasks","learning"],"2026-11-13");
  assert.deepEqual(Object.keys(payload),["period","tasks","learning"]);
  assert.equal(JSON.stringify(payload).includes("private diary"),false);
  assert.equal(JSON.stringify(payload).includes("Private money"),false);
  assert.equal(JSON.stringify(payload).includes("goalForecast"),false);
});
test("journal-only review excludes all task and money data", () => {
  const payload = buildReviewContext(sample,["journal"],"2026-11-13");
  assert.deepEqual(Object.keys(payload),["period","journal"]);
  assert.equal(payload.journal[0].reflection,"private diary");
});
test("missing selection and unknown selections fail closed", () => {
  assert.throws(()=>buildReviewContext(sample,[],"2026-11-13"));
  assert.throws(()=>buildReviewContext(sample,["tasks","secret"],"2026-11-13"));
});
test("goal forecast handles reached and zero contribution safely", () => {
  assert.equal(calculateForecast({goal:100,saved:120,monthly:0}).status,"reached");
  assert.equal(calculateForecast({goal:100,saved:20,monthly:0}).months,null);
  assert.equal(calculateForecast({goal:1000,saved:100,monthly:150}).months,6);
});
test("due counts and weekly metrics reflect actual user records", () => {
  const totals = calculateSummary(sample,"2026-11-13");
  assert.deepEqual(totals,{openTasks:1,dueTasks:1,studyMinutes:35,weeklyNet:-7.5});
});
test("week boundary does not send older entries", () => {
  const data={...sample,journal:[{id:"a",date:"2026-11-01",text:"past private note"}]};
  assert.equal(buildReviewContext(data,["journal"],"2026-11-13").journal.length,0);
});
test("dates must be real calendar days",()=>{
  const value=normalizeState({tasks:[{title:"fake",date:"2026-02-30"}]});
  assert.equal(value.tasks.length,0);
});
test("duplicate selected keys do not affect filtering",()=>{
  assert.equal(Object.keys(buildReviewContext(sample,["tasks","tasks"],"2026-11-13")).length,2);
});
