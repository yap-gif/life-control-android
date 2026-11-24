# LC-P07-A — Release readiness dossier (blocked)
Date: 2026-11-24 (Asia/Kuching). Development branch: feature/life-control-v020-architecture-20261124.
Reviewed application source: `90557b9de7149ff4b852b0367f38330d13310670`. App 908 / v0.1.2 / version 2720 stays frozen.
**Status: P06 isolated engineering PASS; P07-A preparation only; production release BLOCKED.**

## Verified source evidence
- Source run [45370877996](https://github.com/yap-gif/life-control-android/actions/runs/45370877996): 168/168 passing, 0 failing, source fixture performance 117 ms for 1,500 transactions + 250 learning records, 178,516 bytes. This is NOT APS capacity/performance evidence.
- Chromium run [45370877903](https://github.com/yap-gif/life-control-android/actions/runs/45370877903): 27/27 route checks at 360/768/1040, 0 failures, 3/3 disclosures verified; browser task and mock consent workflows passed. Reports default screenshot heights 3301/3046/2866 px.
- [Artifact 14908708440](https://github.com/yap-gif/life-control-android/actions/runs/45370877903/artifacts/14908708440): 27 PNGs + browser-results.json. ZIP SHA-256 20f959c94197283b5dbac3aef173cdca10d6e907b59702a440062589a98509fe. Downloaded archive hash and CRC matched, PNGs decoded, JSON checked; actual 360 report screenshot reviewed. Not store-media approval.
- Compared 128 protected Git tree objects against Phase 05 baseline 9b4de493c47f26e790ff2a035a939e2be1ae91a1, no changed objects. This verifies source bytes, not authenticated remote Anna metadata.

## Hard gates (all BLOCKED)
- **APS-SCOPE** — Authenticated isolated test App ID/scope distinct from App 908 and explicit owner authorization; no live user data.
- **APS-CONTRACT** — Real SDK absent-key/error/etag/CAS semantics and stale-write rejection with readback; no guessed create-only sentinel.
- **APS-CAPACITY** — Measured supported payload and quota limits, 1000+ records and realistic mixed history; redesign if insufficient.
- **APS-EXCLUSIVE-MIGRATION** — Verified exclusive migration and legacy-divergence behavior across independent keys; synthetic fresh and upgraded scopes.
- **HOST-ADAPTER** — Actual Anna v2 entry and verified SDK storage/transport adapter, not preview-v2 or its Map/mock transport.
- **LLM-CONSENT** — Real one-call consent, exact payload, bounded credits, scope canaries, output validation and no auto retry.
- **CLOUD-AGENT** — Actual fresh/upgrade/reopen, complete workflows, persisted reports/plans, later events and no boot-time model calls.
- **ERASURE** — Actual own-key conditional deletion, per-key absence verification, partial failure recovery and no legacy resurrection.
- **LISTING-MEDIA** — Genuine screenshots/cover and revised privacy/Listing matching real candidate; stable public URLs and authenticated Listing readback.
- **OWNER-RELEASE** — Exact candidate commit/app/version and separate explicit owner approval; no push/cut/submit/release in this phase.

## Release sequence
1. Obtain owner approval for a separate isolated Anna test app/scope (not 908), synthetic fixtures only, explicit model-credit cap. Record actual identity, SDK revision and exact test code; do not supply tokens in repo.
2. Execute the isolated protocol in 11-ISOLATED-PLATFORM-TEST-PROTOCOL.md. Record raw redacted responses, readback, timings, per-key cleanup; if semantics/capacity cannot be proven, stop and redesign. Do not connect the current preview to real storage.
3. Implement verified production adapter and entry in a later separately reviewed source candidate. Add actual migration, full deletion with partial recovery, consent transport, host lifecycle and credit handling. Run full source/browser/Cloud Agent acceptance on that exact candidate.
4. After platform acceptance, finalize genuine screenshots and Listing/privacy text, stable URLs and authenticated readback. Drafts 12/13 are not approved for publication. Do not use isolated-preview images as deployed product evidence.
5. Separate owner review of exact app, commit, version, media and approved release operation. No push/cut/submit/release authorized by this dossier.

## Read-only local status
From anna-edition:
- `node qa/v2-release-status.mjs --status` -> exit 0 only if blocked dossier and protected local blobs match.
- `node qa/v2-release-status.mjs --release` -> exit 2 (release remains blocked); integrity error -> exit 1.
- `npm test` -> source regressions including dossier integrity/negative tests.
The helper intentionally has no path to authorize a release, no network calls and no deployment command. It verifies reviewed local evidence identities, not remote platform truth. A fresh application change requires re-baselining the actual evidence; do not edit BLOCKED to PASS to bypass tests.

## Windows checkout compatibility
The nine pinned protected files are text. The checker accepts exact blob bytes or a uniform CRLF checkout only when byte-preserving CRLF-to-LF normalization yields the exact pinned Git blob hash. It rejects content changes, BOM and mixed newline forms. No production gate is changed. Windows local checkout evidence remains separate from Anna platform evidence.
