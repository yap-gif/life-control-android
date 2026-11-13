import test from "node:test";
import assert from "node:assert/strict";
import { mountBundle } from "@anna-ai/cli/test";
import { STORAGE_KEY, buildReviewContext, normalizeState } from "../bundle/logic.js";

const example = normalizeState({
  tasks: [{ id: "task-1", title: "Read docs", date: "2026-11-13", done: false }],
  money: [{ id: "money-1", date: "2026-11-13", type: "expense", amount: 8, category: "Private category" }],
  learning: [{ id: "lesson-1", date: "2026-11-13", topic: "Kotlin", minutes: 25 }],
  journal: [{ id: "diary-1", date: "2026-11-13", text: "Very private reflection" }],
  goal: { goal: 1000, saved: 300, monthly: 70 }
});

test("Anna host-runtime: app storage roundtrip and selected AI context", async () => {
  const storage = new Map();
  const h = await mountBundle({
    manifest: "./manifest.json",
    bundle: "./bundle",
    mocks: {
      "storage.set": ({ key, value }) => {
        storage.set(key, value);
        return { ok: true };
      },
      "storage.get": ({ key }) => ({ value: storage.get(key) ?? null }),
      "storage.delete": ({ key }) => {
        storage.delete(key);
        return { ok: true };
      },
      "llm.complete": ({ messages }) => ({
        role: "assistant",
        content: { type: "text", text: "Review generated" },
        model: "mock",
        stopReason: "endTurn",
        usage: { inputTokens: 5, outputTokens: 3, totalTokens: 8 }
      })
    }
  });
  try {
    await h.runtime.storage.set(STORAGE_KEY, example);
    const fetched = await h.runtime.storage.get(STORAGE_KEY);
    assert.equal(storage.size, 1, "Storage handler did not receive set correctly: " + JSON.stringify(h.calls.all()));
    assert.deepEqual(fetched?.value, example, "Unexpected host reply; call log: " + JSON.stringify(h.calls.all()));

    const context = buildReviewContext(fetched.value, ["tasks", "learning"], "2026-11-13");
    const messages = [
      { role: "user", content: { type: "text", text: JSON.stringify(context) } }
    ];
    const response = await h.runtime.llm.complete({ messages, maxTokens: 200 });
    assert.equal(response.content.text, "Review generated");

    const call = h.calls.lastOf("llm.complete");
    assert.ok(call, "LLM host API call should be recorded by the Anna harness");
    const sent = JSON.stringify(call.args);
    assert.ok(sent.includes("Read docs"));
    assert.ok(sent.includes("Kotlin"));
    assert.ok(!sent.includes("Private category"), "Money must not be sent without selection");
    assert.ok(!sent.includes("Very private reflection"), "Journal must not be sent without selection");
    await h.runtime.storage.delete(STORAGE_KEY);
    assert.equal((await h.runtime.storage.get(STORAGE_KEY)).value, null, "Deleted app storage should be empty");
  } finally {
    if (typeof h.close === "function") await h.close();
  }
});

test("Anna host-runtime: no model request when context is empty", async () => {
  const h = await mountBundle({ manifest: "./manifest.json", bundle: "./bundle" });
  try {
    assert.throws(() => buildReviewContext(example, [], "2026-11-13"));
    assert.equal(h.calls.byNs("llm.complete").length, 0);
  } finally {
    if (typeof h.close === "function") await h.close();
  }
});
