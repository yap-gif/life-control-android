# LC-P07-B — Isolated platform acceptance protocol (NOT EXECUTED)
This is a test plan, not approval to run. Do not use App 908 or any production user scope, real personal records, credentials in logs, live credits without owner approval, or an unverified API operation.

## Entry gate
Record separate approved test App ID, owner scope, app/version, SDK version and verified API documentation revision, commit, timezone Asia/Kuching, bounded synthetic fixture, explicit credit budget and cleanup authority. Abort if scope is ambiguous, equals production, or cannot be confirmed. No test app creation or calls have occurred in P07-A.

## Evidence sequence
| ID | Isolated check | Required observed evidence / stop rule |
|---|---|---|
| S01 | Empty, absent, denied, ambiguous read | Capture redacted actual response shape/etag or precise error; ambiguous/denied never counts as absence. |
| S02 | Existing-key CAS | Write synthetic record only with actual documented conditional semantics, read back; stale etag fails without overwriting. |
| S03 | Atomic create-if-absent | Two contenders for one fresh synthetic key; exactly one creation and loser cannot overwrite; no guessed sentinel or get-then-set. Stop if unsupported. |
| S04 | Capacity | Measure UTF-8 serialized bytes, SDK limits, quotas, successful confirmed write and rejection boundaries; 1,000+ transactions and realistic mixed data, no truncation. If insufficient redesign before promotion. |
| S05 | Exclusive migration | Preserve v1 bytes/etag, convert all retained fields, verify counts/totals/IDs, exact v2 readback; prove exclusive session and detect legacy divergence; second open does not re-import. |
| S06 | Fault/recovery | Permission, timeout, false/uncertain acknowledgement, concurrent mutation, stale etag, failed readback; refuse unsafe writes and show recovery. Never assume timeout cancelled a write. |
| S07 | Selective/full erase | Only exact owned test keys; explicit choice for retained copies; verify each absence, partial error prevents resurrection. No blind prefix-wide deletion. |
| A01 | Fresh host runtime | Actual v2 entry with real verified adapter; no model call at boot; all nine routes and supported forms operate on synthetic data. |
| A02 | Personalized analysis | Two materially different questions, selected-only evidence, exact preview/digest, user consent for each call; verify charge behavior within approved cap; malformed outputs never imported. |
| A03 | Scope negative tests | Category canaries, out-of-range values, unselected history and prior plan; inspect actual outgoing payload; no unapproved data transfer. |
| A04 | Plan and reopen | Save via confirmed readback, close/reopen and restore without model call; explicit accept once, recorded complete/reopen, opt-in follow-up based only on later timestamps. |
| A05 | Failure/credits | Bounded approved model test, no automatic retry, timeout/outcome unknown clearly shown; stop at approved budget. |
| C01 | Fresh + upgraded Cloud Agent | Actual host, 360/768/1040 if supported, navigation/keyboard, persistence across reopen, error paths, scope and cleanup verification. |
| C02 | Listing | On exact approved candidate, capture real host images, stable URLs, saved/reopened remote listing; no release action without separate approval. |

For each item record actual environment/app scope, commit, test ID, timestamp, sanitized inputs/outputs, observed vs expected, PASS/FAIL/BLOCKED and evidence hash/link. Record each exact key cleanup outcome; stop on unknown or partial result. No user secrets or real records. Real test acceptance is distinct from mocks and local Chromium evidence.
