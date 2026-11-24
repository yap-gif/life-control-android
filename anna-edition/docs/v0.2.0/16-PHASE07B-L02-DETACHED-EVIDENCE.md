# LC-P07-B-L02 — Detached storage evidence and write comparison
Date 2026-11-24 Asia/Kuching. Baseline 832b40a9f99f582521c5479ec907e3b41db89ed1.
Local L01: owner-reported Windows 11/11 targeted and 185/185 full regression; frozen status integrity PASS, release exit 2, clean matching HEAD. GitHub source run 45396191793 and browser run 45396191736 success. No release promotion.

## Finding and change
An injected adapter may return a reference to its own object, allowing callers to mutate the mock host without a write. A write adapter may also mutate the argument passed into set/create, which formerly was the very object used as expected readback. This could falsely confirm altered data. L02 separates read evidence and passes independent write payloads, retaining a private expected snapshot. Strict canonical JSON rejects malformed nested values, including sparse or extended arrays, hidden extras and accessor-backed array elements without invoking accessors. No claim that arbitrary hostile executable objects/proxies are safely sandboxed.

## Verification
L02-01 to L02-10 cover nested detachment, malformed JSON, accessor/hidden array entries, valid JSON controls, inspection isolation, adapter input mutation during create/CAS, detached confirmed results, invalid post-write readback and malformed legacy. All adapters in memory; no real Anna API or credit-bearing request. Run targeted tests and full regression, then release-status --status (0) and --release (2). Actual execution results must be separately captured; this document is not test evidence by itself.

## Scope
Only v2 candidate modules, synthetic test and documentation. Frozen v0.1.2 files and release ledger unchanged. Real APS contract, CAS/atomic creation, capacity, migration, remote ownership, credit costs and all ten production gates remain unverified/BLOCKED. Vendor reply pending. Credits baseline 975.477, no new live balance check.
