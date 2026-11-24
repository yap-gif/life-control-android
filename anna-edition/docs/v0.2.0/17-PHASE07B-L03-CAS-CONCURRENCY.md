# LC-P07-B-L03 — Synthetic CAS concurrency and late outcomes
Date 2026-11-24 Asia/Kuching. Baseline ead55b1f0f7dc510266202bc146a28778d9b60b0.
L02 owner-provided Windows log: targeted 10/10, L01 11/11, full 195/195, clean matching HEAD, frozen integrity PASS and release exit 2. GitHub source run 45397297379 and browser run 45397297448 completed successfully.

## Candidate change
A changed revision confirmed with the previous ETag is not sufficient evidence for subsequent conditional writes. Reject ETAG_UNCHANGED and lock after an attempted write. This is a conservative candidate requirement, not a claim about real APS. It does not prove ETag uniqueness across all history or eliminate ABA, nor certify multi-key atomicity.

## Synthetic scenarios
L03-01 independent concurrent CAS; L03-02 independent create-only race; L03-03 stale ETag; L03-04 same token with different content; L03-05 unchanged ETag after changed payload; L03-06 positive CAS; L03-07 late successful write after timeout; L03-08 delayed stale write after another winner; L03-09 committed but acknowledgement timeout; L03-10 overlapping mutation on same repository. In-memory host enforces atomic comparison/create, which is an explicit assumption of this simulation, not observed platform behavior. Run targeted and full tests plus frozen release checks; this document does not assert their results.

## Remaining risks and gates
Timeout is not cancellation. The current repository lock is instance-local; read-only inspection does not clear it. Restarting/recreating an instance cannot prove pending remote operations settled. Cross-session reconciliation, durable operation receipts and exclusive legacy migration require later design and actual platform evidence. Do not wire to production. The real service may not provide the modeled atomic operations. No guessed create-only token. Real APS, AI, draft creation and credit-bearing actions remain outside this run. Credits authorization 0; baseline 975.477 not freshly queried. Vendor clarification pending. Frozen App 908 / 0.1.2 / 2720, frozen files and ten blocked gates unchanged.
