import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewRequest, REVIEW_SYSTEM_PROMPT } from "../bundle/review-contract.js";
import { parseReviewMarkdown, renderReviewMarkdown } from "../bundle/review-format.js";

const data = {
  tasks: [{ id: "a", date: "2026-11-13", done: false, title: "APS-PERSIST-001" }],
  money: [{ id: "b", date: "2026-11-13", amount: 999, type: "income", category: "SECRET-ACCOUNT" }],
  learning: [{ id: "c", date: "2026-11-13", topic: "Kotlin", minutes: 30 }],
  journal: [{ id: "d", date: "2026-11-13", text: "PRIVATE JOURNAL" }],
  goal: { goal: 600, saved: 20, monthly: 50 }
};

test("review request uses production contract and filters private categories", () => {
  const request = buildReviewRequest(data, ["tasks", "learning"], "2026-11-13");
  assert.equal(request.messages.length, 2);
  assert.equal(request.messages[0].role, "system");
  const sent = JSON.stringify(request);
  assert.ok(sent.includes("APS-PERSIST-001"));
  assert.ok(sent.includes("Kotlin"));
  assert.ok(!sent.includes("SECRET-ACCOUNT"));
  assert.ok(!sent.includes("PRIVATE JOURNAL"));
  assert.ok(!sent.includes('"money"'));
  assert.ok(!sent.includes('"journal"'));
});

test("review guidance explicitly prohibits inventing task details", () => {
  assert.match(REVIEW_SYSTEM_PROMPT, /ambiguous task label/i);
  assert.match(REVIEW_SYSTEM_PROMPT, /Never invent/i);
  assert.match(REVIEW_SYSTEM_PROMPT, /insufficient context/i);
  assert.match(REVIEW_SYSTEM_PROMPT, /untrusted data/i);
});

test("review request rejects missing authorization categories", () => {
  assert.throws(() => buildReviewRequest(data, [], "2026-11-13"));
});

test("headings, bold text and numbered lists become structured blocks", () => {
  const blocks = parseReviewMarkdown(
    "### Weekly Review\n\n**Progress Recap**\n\n1. **Start small:** One action\n2. Verify completion"
  );
  assert.deepEqual(blocks.map(b => b.kind), ["heading", "paragraph", "list"]);
  assert.equal(blocks[0].level, 3);
  assert.equal(blocks[1].inline[0].kind, "strong");
  assert.equal(blocks[2].items.length, 2);
  assert.equal(blocks[2].items[0][0].kind, "strong");
});

test("untrusted HTML remains literal text; renderer never constructs executable nodes", () => {
  const html = '<img src=x onerror=alert(1)>\n\n<script>bad()</script>';
  const created = [];
  class FakeNode {
    constructor(tag, doc) {
      this.tag = tag; this.ownerDocument = doc; this.children = []; this.textContent = "";
    }
    appendChild(node) { this.children.push(node); }
    replaceChildren(...nodes) { this.children = nodes; }
  }
  const doc = {
    createDocumentFragment() { return new FakeNode("fragment", doc); },
    createElement(tag) { created.push(tag); return new FakeNode(tag, doc); }
  };
  const host = new FakeNode("section", doc);
  renderReviewMarkdown(host, html);
  assert.ok(!created.includes("script") && !created.includes("img"));
  assert.ok(!created.includes("a") && !created.includes("iframe"));
  assert.equal(host.children.length, 1);
  assert.ok(host.children[0].children[0].children[0].textContent.includes("<img src=x"));
  assert.ok(host.children[0].children[1].children[0].textContent.includes("<script>"));
});

test("fenced code text is not interpreted as HTML", () => {
  const blocks = parseReviewMarkdown("```html\n<div onclick=bad()>text</div>\n```");
  assert.deepEqual(blocks, [{ kind: "code", text: "<div onclick=bad()>text</div>" }]);
});
