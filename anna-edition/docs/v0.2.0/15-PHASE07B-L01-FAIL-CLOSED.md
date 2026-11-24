# LC-P07-B-L01 — Storage response compatibility and fail-closed regression
Date 2026-11-24, Asia/Kuching. Baseline f863b0b3dfb45ce5f2d8ecc5a38865f4055e9dfd.
Scope: local synthetic tests only. Remote platform clarification pending; 0 Credits authorized. Account baseline 975.477 Credits observed before this phase, not a fresh balance check. App 908/version 0.1.2/version ID 2720 and release ledger unchanged. No new remote Anna call, draft, login, model call, data write or delete.

## Motivation
P07-B-02B observed legacy GET { "value": null } and LIST { "items": [], "next_cursor": null }. Neither establishes explicit absence, CAS, owner isolation or create-only capability. Existing candidate rejected null-only but accepted some contradictory envelopes with value/etag, malformed exists markers, and contradictory key-not-found HTTP status.

## Candidate policy
- Explicit boolean exists:false without conflicting non-null value, etag, generation or error evidence; precise KEY_NOT_FOUND/key_not_found without conflicting HTTP status. These are candidate rules, not verified actual APS semantics.
- Valid existing record requires own non-null value and nonempty string etag; exists if supplied must be boolean. No prototype/accessor/array envelope; no contradictory error/status/ok markers. Unknown generation semantics on absent response block.
- Generic not_found, HTTP 404, denied, timeout, malformed or ambiguous read never becomes absence. Empty list is not consulted as fallback.
- Pre-write ambiguity prevents any mutation on that attempt; post-attempt uncertainty locks repository, no blind retry. Existing capacity, validated domain and atomic-create gates remain mandatory. No remote compatibility claim.

## Regression plan
L01-01 observed legacy null; L01-02 explicit absence/existing controls; L01-03 malformed/contradictory envelopes; L01-04 error classification; L01-05 read timeout; L01-06/07 inspection at both keys; L01-08 initialize recheck; L01-09 commit pre-read; L01-10/11 ambiguous create/CAS readback and lock. Fixtures are synthetic and injected; simulated mutations are in memory only. Run node --test tests/v2-storage-contract.test.js and npm test from anna-edition, then node qa/v2-release-status.mjs --status. --release remains exit 2. CI/test results require actual execution and separate evidence; not asserted by this document.

## Boundary
No adapter wiring to production boot; no atomic sentinel inference; real APS scope/contract/capacity etc. all ten gates BLOCKED. Await vendor answers on billing, atomic create, max size, private draft access. Do not start real harness while zero-credit condition unverified.
