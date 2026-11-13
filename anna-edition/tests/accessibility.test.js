import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../bundle/index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../bundle/app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../bundle/style.css", import.meta.url), "utf8");

test("form fields have labels and review has consent", () => {
  for (const id of ["task-form", "money-form", "learning-form", "journal-form", "goal-form", "review-form"]) {
    assert.ok(html.includes(`id="${id}"`), "Missing form: " + id);
  }
  assert.match(html, /<fieldset><legend>Share only these categories<\/legend>/);
  assert.match(html, /id="ai-consent" required/);
  assert.match(html, /id="review-result"[^>]*aria-live="polite"/);
});

test("keyboard navigation can reach main content and destructive confirmations", () => {
  assert.match(html, /class="skip-link" href="#main-content"/);
  assert.match(html, /id="erase-data"[^>]*aria-controls="erase-confirm-panel"[^>]*aria-expanded="false"/);
  assert.match(html, /id="erase-confirm-panel"[^>]*role="group"[^>]*aria-labelledby="erase-confirm-title"/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /\$\("erase-cancel"\)\.focus\(\)/);
  assert.match(app, /\$\("erase-data"\)\.focus\(\)/);
});

test("record action buttons are announced with their record and focus is restored", () => {
  assert.match(app, /button\.setAttribute\("aria-label", entryActionLabel\(b\.label, primary\)\)/);
  assert.match(app, /button\.dataset\.entryId = recordId/);
  assert.match(app, /candidate\.dataset\.entryId === recordKey/);
  assert.match(app, /\(replacementButton \|\| fallbackInput\)\?\.focus\(\)/);
});

test("host failures do not show raw RPC errors in user-facing feedback", () => {
  assert.match(app, /explainHostError\(error, "ai"\)/);
  assert.match(app, /explainHostError\(error, "storage"\)/);
  assert.ok(!app.includes('String(error.message || error)'), "Do not render raw host error messages");
});

test("time-sensitive date inputs are checked against real calendar dates", () => {
  const count = (app.match(/!validDate\(date\)/g) || []).length;
  assert.equal(count, 4, "All four record forms should reject invalid dates");
});

test("styles provide visible keyboard focus", () => {
  assert.match(css, /\.skip-link:focus/);
  assert.match(css, /\.entries button:focus-visible/);
});
