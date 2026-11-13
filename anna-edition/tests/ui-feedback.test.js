import test from "node:test";
import assert from "node:assert/strict";
import { hostErrorCode, explainHostError, entryActionLabel } from "../bundle/ui-feedback.js";

test("AI quota errors are actionable without exposing raw RPC data", () => {
  const secret = "pat=very-secret-user-token";
  const message = explainHostError({ code: "quota_exceeded", message: secret }, "ai");
  assert.match(message, /quota/i);
  assert.ok(!message.includes(secret));
});
test("offline/no-LLM errors identify unavailable runtime", () => {
  assert.match(explainHostError({ errorCode: "not_implemented" }, "ai"), /unavailable/i);
});
test("unknown AI error never displays sensitive host message", () => {
  const m = explainHostError({ message: "t=session-sensitive-token&code=500" }, "ai");
  assert.match(m, /failed/i);
  assert.ok(!m.includes("session-sensitive-token"));
});
test("storage errors distinguish permissions and general failure", () => {
  assert.match(explainHostError({ code: "forbidden" }, "storage"), /permission/i);
  assert.match(explainHostError({ code: "timeout" }, "storage"), /could not/i);
});
test("record actions include text-specific accessible labels", () => {
  assert.equal(entryActionLabel("Delete", "Study Kotlin"), "Delete: Study Kotlin");
  assert.equal(entryActionLabel("Complete", "task"), "Complete: task");
});
test("host error classifier tolerates null and numeric codes", () => {
  assert.equal(hostErrorCode(null), "unknown");
  assert.equal(hostErrorCode({ code: 403 }), "403");
  assert.match(explainHostError({ code: 403 }, "ai"), /not authorized/i);
});
