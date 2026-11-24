# LC-P05 — Nine-page responsive integration preview
Date: 2026-11-24, Asia/Kuching. P04 source CI run 45368229617 completed success on a18bd2cacf1b5be66e80d071ec4f2a0fac75c761.
Status: isolated functional preview; candidate source CI must be verified. No Anna deployment.

## Scope
- Separate preview-v2/index.html, preview.css, boot.js, ui.js and demo-store.js. Open over localhost from anna-edition; never replace the frozen bundle/index.html or app.json. The preview imports P02/P03/P04 modules directly.
- Nine independent routes, savings alias and unknown fallback, active nav, focus, skip link, responsive desktop/mobile layout, labels, keyboard focus, safe text rendering, explicit error/empty/loading/confirmed states and unsaved draft navigation guard.
- Overview and Reports use shared deterministic reports, inclusive ranges, comparison coverage, category/period controls, chart and numeric table alternatives, trend series. Money, tasks, learning, journal, goals/milestones and habits expose validated management operations; main lists use filters and bounded view pagination.
- AI Insights uses exact payload preview, category selection, digest-bound one-call consent, simulated validated output, history/plan/explicit task import and follow-up opt-in. The response is deterministic mock, not a real AI analysis. No default selected categories. No real credits, no host transport, no network requests.
- Privacy shows mock revision/capacity, blocked real APS, simulated unconfirmed write and reconciliation. Synthetic legacy fixture is migrated in a closed Map and writes pass through actual repository conditional-write/readback plus full domain validation. Mock capacity is not a real service limit. Reload discards data. Full real erasure is intentionally unavailable.

## Run locally
From repository root: cd anna-edition; python -m http.server 8080 --bind 127.0.0.1
Open http://127.0.0.1:8080/preview-v2/ in a modern browser. No credentials needed. For automated source tests use npm test in anna-edition (Node >=22 and installed dependencies).

## Remaining gates
DOM integration tests and CSS breakpoint checks are not actual 360/768/1040 browser viewport evidence. P06 must perform real browser layout/accessibility, adversarial and complete lifecycle checks, including nested list pagination and full form coverage. P07 still requires real isolated APS capacity/create-only and exclusive migration, verified Anna SDK transport/credits, real Cloud Agent fresh/upgrade/reopen, privacy erasure and release materials. No Anna push/cut/submit/release. Frozen App 908 v0.1.2 version 2720 and active manifest/UI unchanged.
