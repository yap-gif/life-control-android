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
