# LC-P06 — Engineering QA candidate
Baseline 9b4de493c47f26e790ff2a035a939e2be1ae91a1; Phase 05 CI 45369006768 success.
## Corrections
- Require injected full domain validation on repository inspection and validate immutable copies; freeze capability at construction; reject mutating validators; retain CAS and readback.
- Reject disguised sparse arrays, accessors, hidden and symbol properties in canonical JSON.
- Bind consent to copied request; invalidate before queued transport and discard late responses.
- Add draft guards, nested milestone/check-in pagination, narrow-card constraints, local-only preview CSP.
## Evidence
- v2-engineering-qa.test.js covers corruption, unverified capability mutation, validator mutation, serialization, read/ACK/timeout/CAS/legacy divergence, consent cancellation and 1500 transaction + 250 learning performance with exact report/pagination.
- Browser QA runs actual headless Chromium at 360/768/1040 across all nine routes, captures screenshots and JSON, checks horizontal overflow, labels, runtime errors, external requests, task lifecycle and consent flow. CI artifacts are evidence only after exact-head success. Not an accessibility certification or real Anna runtime test.
- Source CI retains frozen v0.1.2 checks and prior regression tests. Separate browser job cannot deploy. No credentials or real data. All actual APS/LLM/platform/erasure/release gates remain BLOCKED; no Anna push/cut/submit/release. Do not present synthetic benchmark as real APS performance.

## P06-R1 evidence review (2026-11-24)
- Browser run 45370261597 on e78f52d0aad863a76c636371805172904c33c454: success; 27/27 route checks, zero reported failures, zero unlabelled inputs, no horizontal overflow. Artifact 14908038831 SHA-256 4a99a861050d1da69a898bf608a28621b2a1477a79af01db218ee5a55e11b113; downloaded ZIP digest verified, CRC checked, 27 PNGs decoded and JSON examined.
- Visual contact-sheet review and full 360px reports image found a non-blocking usability issue: default Reports 10,067px tall and narrow columns split amounts/dates. Correction: disclosure-based trends and canonical evidence, activity overview, local horizontal table scrolling. Recheck source and browser CI on the new commit; no claim of new pass before actual run.

## P06-R1 final acceptance
Reviewed application source 90557b9de7149ff4b852b0367f38330d13310670: source run 45370877996, 168/168; Chromium run 45370877903, 27/27, 3/3 disclosures, zero failures. Artifact 14908708440 verified SHA-256 20f959c94197283b5dbac3aef173cdca10d6e907b59702a440062589a98509fe; CRC, all PNGs and JSON checked. Default report heights 3301/3046/2866 px. P06 isolated engineering PASS; all actual APS/LLM/host/release gates remain BLOCKED. P07-A starts without deployment.
