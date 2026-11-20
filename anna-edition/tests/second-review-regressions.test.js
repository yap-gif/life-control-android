import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeState } from "../bundle/logic.js";
import { buildReviewRequest } from "../bundle/review-contract.js";

const html = readFileSync(new URL("../bundle/index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../bundle/app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../bundle/style.css", import.meta.url), "utf8");
const pages = ["overview","insights","tasks","money","learning","journal","savings","privacy"];

test("issue 1: eight feature groups have distinct navigable views", () => {
  for (const name of pages) {
    assert.ok(html.includes('id="view-' + name + '" data-page="' + name + '"'), name);
    assert.ok(html.includes('href="#' + name + '" data-nav="' + name + '"'), name);
  }
  assert.equal((html.match(/class="page" id="view-/g) || []).length, pages.length);
  assert.match(app, /window.addEventListener\("hashchange", navigateToCurrentPage\)/);
  assert.match(app, /el.hidden = el.dataset.page !== page/);
  assert.match(css, /\.feature-nav/);
  assert.match(css, /\.nav-link\[aria-current="page"\]/);
});

test("issue 1: every existing feature still has one form or action", () => {
  const ids = ["task-form","money-form","learning-form","journal-form","goal-form",
    "review-form","review-result","save-plan-btn","forget-plan-btn",
    "erase-data","erase-confirm-panel","ai-consent","include-saved-plan"];
  for (const id of ids) assert.equal(html.split('id="' + id + '"').length - 1, 1, id);
});

test("issue 3: last review restores from Anna-normalized data without auto saving as plan", () => {
  const state=normalizeState({
    learning:[{id:"l1",date:"2026-11-17",topic:"Kotlin",minutes:60}],
    lastReview:{generatedAt:"2026-11-20",text:"120 min to 60 min",categories:["learning"]}
  });
  assert.equal(state.lastReview.text,"120 min to 60 min");
  assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(state))).lastReview,state.lastReview);
  assert.equal(state.savedPlan,null);
});

test("issue 3: invalid stored review fails closed while existing records survive", () => {
  const state=normalizeState({
    tasks:[{id:"t1",title:"Persist task",date:"2026-11-20"}],
    lastReview:{generatedAt:"invalid",text:"bad",categories:["learning"]}
  });
  assert.equal(state.tasks.length,1);
  assert.equal(state.lastReview,null);
});

test("issue 3: restored report does not leak into a fresh LLM request", () => {
  const state=normalizeState({
    learning:[{id:"l1",date:"2026-11-17",topic:"Kotlin",minutes:60}],
    lastReview:{generatedAt:"2026-11-20",text:"PRIVATE_LAST_REVIEW",categories:["learning"]}
  });
  assert.doesNotMatch(JSON.stringify(buildReviewRequest(state,["learning"],"2026-11-20")),/PRIVATE_LAST_REVIEW/);
  assert.match(app,/function restoreAnalysis\(\)/);
  assert.match(app,/renderReviewMarkdown\(\$\("review-result"\), previous.text\)/);
  assert.match(app,/restoreAnalysis\(\);/);
});

test("issue 2: save plan waits for Anna acknowledgment and does not claim false success", () => {
  assert.match(app,/const confirmed = await persistAndRender\(\{ notify: false \}\)/);
  assert.match(app,/AI plan saved and verified by Anna Storage readback/);
  assert.match(app,/Plan save was NOT confirmed by readback/);
  assert.match(app,/planSaving = true/);
  assert.match(app,/withDeadline\(write, 15000/);
});

test("issue 3: definite storage failure keeps retry; uncertain timeout requires app reload", () => {
  assert.match(app,/state\.lastReview = \{ generatedAt, text: output\.slice\(0, 6000\)/);
  assert.match(app,/\$\("retry-save-result"\)\.hidden = storageWriteUncertain/);
  assert.match(app,/\$\("retry-save-result"\)\.addEventListener\("click"/);
  assert.match(html,/id="retry-save-result" hidden/);
});

test("issue 3: startup fails safely with reconnect and without duplicate bindings", () => {
  assert.match(app,/\$\("retry-connect"\)\.hidden = false/);
  assert.match(app,/Editing is disabled to prevent overwriting records/);
  assert.match(app,/if \(!listenersAttached\)/);
  assert.match(html,/id="retry-connect" hidden/);
});

test("consent remains one-shot, never automatic when reopening", () => {
  assert.match(app,/if \(!\$\("ai-consent"\)\.checked\)/);
  assert.match(app,/\$\("ai-consent"\)\.checked = false/);
  assert.match(html,/id="ai-consent" required/);
});

test("uncertain storage timeout locks out subsequent writes pending reload", () => {
  assert.match(app,/storageWriteUncertain = true/);
  assert.match(app,/function lockUnsafeEdits\(\)/);
  assert.match(app,/if \(storageWriteUncertain\) \{/);
  assert.match(app,/Close and reopen this app to verify saved records/);
});
