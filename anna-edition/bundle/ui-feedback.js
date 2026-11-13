/**
 * Stable, non-sensitive explanations for host API failure cases.
 * Never display raw RPC errors, which may contain URLs or credentials.
 */
export function hostErrorCode(error) {
  const candidate = error?.code ?? error?.errorCode ?? error?.data?.code;
  if (typeof candidate === "string") return candidate.toLowerCase();
  return typeof candidate === "number" ? String(candidate) : "unknown";
}

export function explainHostError(error, scope = "ai") {
  const code = hostErrorCode(error);
  if (scope === "ai") {
    if (code === "quota_exceeded" || code === "rate_limited" || code === "429") {
      return "AI quota reached. No review was saved. Check your Anna allowance before requesting another review.";
    }
    if (code === "not_implemented") {
      return "AI calls are unavailable in this runtime, for example with --no-llm. Use a configured Anna developer session.";
    }
    if (code === "invalid_arg") {
      return "The AI request was rejected as invalid. No review was saved.";
    }
    if (["401", "403", "unauthorized", "forbidden"].includes(code)) {
      return "Anna has not authorized the AI request. Check your developer session.";
    }
    return "The AI request failed or the service was unavailable. No review was saved; you can retry after checking connectivity.";
  }
  if (["401", "403", "unauthorized", "forbidden"].includes(code)) {
    return "Anna storage permission was denied. Verify your developer session and app storage access.";
  }
  if (code === "quota_exceeded" || code === "429") {
    return "Anna storage quota or rate limit was reached. Your latest changes may not have been saved.";
  }
  return "Anna storage could not complete this operation. Your latest changes may not have been saved.";
}

export function entryActionLabel(action, recordText) {
  const normalizedAction = String(action ?? "").trim().slice(0, 30);
  const normalizedRecord = String(recordText ?? "").trim().slice(0, 150);
  return normalizedRecord ? normalizedAction + ": " + normalizedRecord : normalizedAction;
}
