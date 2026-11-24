# LC-P07-B-L06 — Local integration audit and platform handoff
Date: 2026-11-24, Asia/Kuching. Audited commit: 04bbcf3bf70fbc1ade2fda9c0a6e0e504b2570b3. Tree: 8f80b538a53897bb3a64f704d4880ecaabd76164.
Disposition: LOCAL ROUTE ACCEPTED within synthetic scope; production integration NOT AUTHORIZED / BLOCKED. This audit does not update the frozen P07-A release ledger.

## 1. Accepted local evidence
| Stage | Added tests | Full source regression | Source run | Browser run | Owner Windows |
|---|---:|---:|---|---|---|
| L01 | 11 | 185/185 | 45396191793 | 45396191736 | PASS |
| L02 | 10 | 195/195 | 45397297379 | 45397297448 | PASS |
| L03 | 10 | 205/205 | 45406542948 | 45406542907 | PASS |
| L04 | 12 | 217/217 | 45407095304 | 45407095862 | PASS |
| L05 | 14 | 231/231 | 45407755579 | 45407755519 | PASS |
All listed CI workflows completed successfully at their respective candidate commits. Owner L05 log: 14/14 targeted, 60/60 separate prior storage regression, 231/231 full (0 failed/cancelled/skipped, 5201.8977 ms); clean matching HEAD; frozen integrity PASS and release exit 2. Counts overlap; 231 is the suite total, not the sum of stages. 57 new test cases versus 174-test baseline.
Latest source job 138492950915 actual 231/231. Browser job 138492950551 log: BROWSER_QA routeChecks 27, failures []. Artifact 14927105675 (isolated-v2-browser-evidence), metadata size 3050150 bytes, reported SHA256 5adc1aa0a6189444c7cbf29cc1559681787051213f06dc42301c07cffb820e66; latest artifact bytes not downloaded/rehashed by this audit. Original P07-A browser evidence remains pinned, not replaced.
L04 Windows and CI: hypothetical value cap 16384 bytes; 178527-byte workspace, 15 shards, largest 16360, index 4000; exact roundtrip 1500 transaction + 250 learning records plus other fixture fields. Not measured APS capacity.

## 2. Scope and tree review
Compare P06-R1 90557b9de7149ff4b852b0367f38330d13310670 to audited head: both recursive trees nontruncated; all 59 pre-existing Anna Edition blobs outside bundle/v2/ and docs/v0.2.0/ unchanged (SHA comparison, not a claim about every repository file). Only repository.js and workspace.js changed within existing bundle. L04/L05 are under qa/sharding and not connected to preview or production. P05 baseline 9b4de493c47f26e790ff2a035a939e2be1ae91a1: all 154 existing repo blobs compared by mode/SHA; nine changed, namely workflow anna-edition-tests.yml; v2 ai-coach.js, repository.js, workspace.js; preview-v2 index.html, preview.css, ui.js; tests v2-preview-ui.test.js and v2-workspace.test.js. These are candidate/QA changes; do not describe all 154 as frozen. The nine pinned frozen text blobs checked locally by qa/v2-release-status.mjs remain intact. All ten gate IDs remain BLOCKED. The release tool intentionally reports historical applicationSourceCommit 90557b9, not the current development HEAD.

## 3. Integration findings and open prerequisites
| ID | Finding | Disposition |
|---|---|---|
| I01 | Null-only legacy read is ambiguous, not absence. Candidate exact absence/error/ETag rules need real SDK contract, including changed-token semantics and no ABA assumption. | OPEN / APS-CONTRACT |
| I02 | Detached JSON and exact readback protect against modeled adapter mutations, not arbitrary hostile JS/Proxies or spoofed host identity. | OPEN / HOST-ADAPTER, APS-SCOPE |
| I03 | CAS lock is instance-local; timeout does not cancel a pending write. Demo reconcile creates a new repository after read-only inspection of a synthetic host. Do not use that as real cross-session recovery. | OPEN / APS-CONTRACT, CLOUD-AGENT |
| I04 | Single flat index may exceed cap. Size budget covers canonical value bytes only; real key/envelope/quota limits, content-addressed equality leakage and erasure remain unverified. | OPEN / APS-CAPACITY, ERASURE |
| I05 | L05 receipts and exclusive legacy fence use one retained Map/closure; reconnect is not process restart. Receipt stores whole source and plan with no journal value cap. ARMED can still be explicitly published by a connected client; read-only recover does not authorize that action. A real recovered ARMED operation must stay blocked until an authoritative outcome/fence is established. | OPEN / APS-EXCLUSIVE-MIGRATION |
| I06 | L05 assumes immutable objects and a trusted atomic root/source fence; fault injection can mutate objects outside those assumptions, including between async hash checks and publication. No real atomic multi-key or durable journal guarantee established. | OPEN / APS-EXCLUSIVE-MIGRATION |
| I07 | Old/aborted objects are retained intentionally. No GC, verified conditional erasure, encryption, authenticated root, or real retention policy. | OPEN / ERASURE |
| I08 | Production boot remains frozen, preview uses Map and deterministic model mock. No actual v2 Anna host binding, model call, Cloud Agent or listing acceptance. | OPEN / HOST-ADAPTER, LLM-CONSENT, CLOUD-AGENT, LISTING-MEDIA, OWNER-RELEASE |

## 4. Next decision / handoff
Do not keep expanding isolated test modules absent a concrete failed invariant or new platform evidence. No integrated production adapter yet. Keep existing monolithic candidate and sharding experiment separate until real capacity and contract are known. Await Anna clarification B01–B06; latest official reply not checked by this audit. Credit budget remains 0; previous observed balance 975.477, not a new measurement. Phase 02C-01 isolated login PASS, 02C-02 scoped slug query completed not found (exit 5) but user_id unknown; remote identity, global slug availability and zero-credit guarantee unresolved. No new Anna API calls, draft, live APS reads/writes, AI, release action or credential access during audit.

After response: (1) map each answer to B01–B06, distinguish official claims from observed behavior; (2) only if zero cost confirmed for draft and relevant operations, inspect exact CLI 0.1.64 semantics and verify isolated owner/slug, use previously authorized private draft within scope; (3) attest exact remote App ID !=908 and scope before approved read-only S01 subset; (4) separate explicit authorization required for synthetic writes/deletes/model calls, credit usage, other scopes or release. Do not treat fee guarantee as contract proof. If atomic create or exclusive migration cannot be established, retain block and redesign; if measured size adequate, do not choose sharding solely from synthetic result. All remaining real tests in 11-ISOLATED-PLATFORM-TEST-PROTOCOL.md are unexecuted in real APS. App 908 / v0.1.2 / versionId 2720 frozen, all ten gates BLOCKED. Audit is docs-only and neither modifies the ledger nor approves any release.
