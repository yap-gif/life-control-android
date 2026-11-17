import test from "node:test";
import assert from "node:assert/strict";
import { buildPatternContext, summarizePatternPreview } from "../bundle/patterns.js";
import { buildReviewRequest } from "../bundle/review-contract.js";
import { normalizeState } from "../bundle/logic.js";
import { readFileSync } from "node:fs";

const sample = {
  tasks: [
    { id: "t1", title: "Read Kotlin notes", date: "2026-11-02", done: true },
    { id: "t2", title: "APS-PERSIST-001", date: "2026-11-16", done: false }
  ],
  learning: [
    { id: "l1", topic: "Kotlin", minutes: 120, date: "2026-11-04" },
    { id: "l2", topic: "Kotlin", minutes: 60, date: "2026-11-11" },
    { id: "l3", topic: "DBMS", minutes: 40, date: "2026-11-17" }
  ],
  money: [{ id: "m1", type: "expense", amount: 777, category: "SENSITIVE-EXPENSE", date: "2026-11-10" }],
  journal: [{ id: "j1", text: "PRIVATE-JOURNAL", date: "2026-11-12" }],
  goal: { goal: 2000, saved: 300, monthly: 60 }
};

test("analyzes historical completed weeks but marks current one partial", () => {
  const context = buildPatternContext(sample, ["learning"], "2026-11-17");
  assert.equal(context.period.from, "2026-10-19");
  assert.equal(context.weeks.length, 5);
  assert.deepEqual(context.weeks.map(w => w.complete), [true, true, true, true, false]);
  assert.equal(context.weeks[2].learning.loggedMinutes, 120);
  assert.equal(context.weeks[3].learning.loggedMinutes, 60);
  assert.equal(context.weeks[4].learning.loggedMinutes, 40);
  assert.equal(context.weeks[4].daysInWindow, 2);
  assert.match(summarizePatternPreview(sample, ["learning"], "2026-11-17")[0], /120 min.*60 min/);
});

test("selected learning-only data excludes confidential money and journal values and fields", () => {
  const context = buildPatternContext(sample, ["learning"], "2026-11-17");
  const sent = JSON.stringify(context);
  assert.ok(!sent.includes("SENSITIVE-EXPENSE"));
  assert.ok(!sent.includes("PRIVATE-JOURNAL"));
  assert.ok(!sent.includes('"money"'));
  assert.ok(!sent.includes('"journal"'));
  assert.ok(!sent.includes("goalForecast"));
});

test("task due-week flags are explicitly described as current state, not completion-at-date", () => {
  const context = buildPatternContext(sample, ["tasks"], "2026-11-17");
  assert.equal(context.weeks[2].tasks.currentlyCompleted, 1);
  assert.ok(context.interpretationRules.some(x => x.includes("completion dates were not collected")));
  assert.ok(!JSON.stringify(context).includes("completedAt"));
});

test("saved plan is never transmitted unless explicitly selected with all source categories", () => {
  const data = normalizeState({...sample, savedPlan: {
    savedAt: "2026-11-10", text: "PLAN-PRIVATE-LOOKBACK", categories: ["tasks", "learning"]
  }});
  assert.equal(buildPatternContext(data, ["learning"], "2026-11-17").previousUserSavedPlan, undefined);
  assert.throws(() => buildPatternContext(data, ["learning"], "2026-11-17", {includeSavedPlan: true}), /Select every category/);
  assert.equal(buildPatternContext(data, ["tasks", "learning"], "2026-11-17", {includeSavedPlan: true}).previousUserSavedPlan.text, "PLAN-PRIVATE-LOOKBACK");
});

test("saved plan text and category scope survive storage normalization and can be cleared", () => {
  const withPlan = normalizeState({savedPlan:{savedAt:"2026-11-13",text:"Review",categories:["learning","learning"]}});
  assert.deepEqual(withPlan.savedPlan.categories, ["learning"]);
  assert.equal(normalizeState({}).savedPlan, null);
  assert.equal(normalizeState({savedPlan:{savedAt:"invalid",text:"bad",categories:["money"]}}).savedPlan, null);
});

test("AI request uses multi-week history, no unselected values, and a measurable follow-up instruction", () => {
  const request = buildReviewRequest(sample, ["learning"], "2026-11-17");
  const serialized = JSON.stringify(request);
  assert.match(serialized, /2026-11-04/);
  assert.match(serialized, /2026-11-11/);
  assert.match(serialized, /seven-day action/i);
  assert.ok(!serialized.includes("PRIVATE-JOURNAL"));
  assert.ok(!serialized.includes("SENSITIVE-EXPENSE"));
  assert.ok(!serialized.includes("PLAN-PRIVATE-LOOKBACK"));
});

test("AI-first screen exposes opt-in stored-plan controls", () => {
  const html = readFileSync(new URL("../bundle/index.html", import.meta.url), "utf8");
  assert.ok(html.indexOf('id="review-form"') < html.indexOf('id="task-form"'),
    "AI pattern analysis should appear before manual record forms");
  for(const id of ["pattern-preview","include-saved-plan","saved-plan-status","save-plan-btn","forget-plan-btn","ai-consent"]) {
    assert.ok(html.includes('id="' + id + '"'), "Missing: "+id);
  }
});
