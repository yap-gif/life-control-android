/**
 * Stable, non-sensitive explanations for host API failure cases.
 * Never display raw RPC errors, which may contain URLs or credentials.
 */
export function hostErrorCode(error) {
  const candidate =
    error?.code ?? error?.errorCode ?? error?.data?.code ??
    error?.error?.code ?? error?.cause?.code;
  if (typeof candidate === "string") {
    const code = candidate.toLowerCase().trim();
    if (code === "llm_disabled") return code;
  }

  // The Anna Windows harness can return the exact RPC code only inside
  // the SDK exception message. Inspect it for classification, but NEVER
  // show the raw exception text or embedded URLs/credentials to the user.
  const sources = [error?.message, error?.error?.message, error?.cause?.message];
  if (sources.some(value => typeof value === "string" &&
      /\bllm_disabled\b|harness started with --no-llm/i.test(value))) {
    return "llm_disabled";
  }

  if (typeof candidate === "string") return candidate.toLowerCase().trim();
  return typeof candidate === "number" ? String(candidate) : "unknown";
}

export function explainHostError(error, scope = "ai") {
  const code = hostErrorCode(error);
  if (scope === "ai") {
    if (code === "quota_exceeded" || code === "rate_limited" || code === "429") {
      return "AI quota reached. No review was saved. Check your Anna allowance before requesting another review.";
    }
    if (code === "not_implemented" || code === "llm_disabled") {
      return "AI is disabled in this Anna development session (--no-llm). No review was generated. Restart without --no-llm to use the configured AI service.";
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

/** Only a definite missing storage KEY is a valid empty-workspace response.
 * Do not turn generic API failures, offline errors, or permission denials
 * into an empty workspace; those must leave editing disabled.
 */
export function isMissingStorageKey(error) {
  const statuses = [
    error?.status, error?.statusCode, error?.response?.status,
    error?.data?.status, error?.httpStatus
  ];
  if (statuses.some(x => x === 404 || x === "404")) return true;
  const code = hostErrorCode(error);
  if (["404", "not_found", "key_not_found", "storage_key_not_found"].includes(code)) return true;
  const message = [error?.message, error?.error?.message, error?.cause?.message]
    .find(x => typeof x === "string") ?? "";
  return /\bHTTP\s*404\b|\bstatus\s*404\b/i.test(message);
}

export function entryActionLabel(action, recordText) {
  const normalizedAction = String(action ?? "").trim().slice(0, 30);
  const normalizedRecord = String(recordText ?? "").trim().slice(0, 150);
  return normalizedRecord ? normalizedAction + ": " + normalizedRecord : normalizedAction;
}
