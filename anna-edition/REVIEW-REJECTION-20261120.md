# Life Control — Second Anna App Review Rejection & v0.1.2 Engineering Remediation

**Date:** 2026-11-20  
**Product:** Life Control (Anna App ID **908**, slug `life-control-anna`)  
**Rejected immutable release:** v0.1.1, Version ID **2476** (the prior v0.1.0 remains immutable, ID 2279)  
**Remediation branch:** `fix/life-control-review-r2-20261120`  
**Candidate:** v0.1.2 **source only**; no new Anna Working Draft deployment, cut, resubmission, or publication is claimed.

## 0. Reviewer evidence and scope

The owner supplied a screenshot of an email from **Anna Developer Team**. The team reports testing v0.1.1 and specifically requests:

1. **All functions on one surface:** group features into clear categories and separate pages.
2. **Saving a next-week plan stalls:** fix the workflow and **confirm the saved plan can be retrieved afterward**.
3. **Analysis and plan generation lost after reopening:** persist AI analysis and make the generate-plan action available again on reopening.

The reviewer explicitly requests the developer to **perform a complete fresh-install test in a Cloud Agent** before resubmission. This document distinguishes completed repository tests from that outstanding live-platform test.

## 1. Fix implementation and evidence

| Finding | Root cause / observed source risk | Candidate fix | Source QA |
|---|---|---|---|
| R2-UI-01: One long surface | v0.1.1 `index.html` placed AI, Tasks, Money, Learning, Journal, Savings and Privacy in one page | Eight distinct hash-routed pages with keyboard-accessible navigation, mobile-scrolling nav, independent page titles and an Overview landing page | Browser-level navigation/visibility checks and all non-AI form tests |
| R2-STOR-02: Save plan stalls | v0.1.1 plan button was disabled and success was claimed before the write was acknowledged; storage errors/timeouts had insufficient user feedback | Serialized writes, in-progress plan button, 15-second feedback timeout, **await host write acknowledgement**, then **storage.get readback** comparing the exact plan. On failure/false acknowledgment, show NOT confirmed and keep retry available | Promise-level delayed, serialized, failed-write tests; DOM-level failed-storage and false-ack tests |
| R2-REST-03: Analysis disappears on reopen | Generated AI review existed only in a JS variable and DOM. Only voluntarily saved plan was persisted | Persist `lastReview` separately from `savedPlan`, including generated date, text, and authorized source categories. Restore safe Markdown on startup; never automatically call LLM; preserve fresh consent and independent opt-in to transmit saved plan | Normalization/roundtrip, never-auto-send, DOM app close/reopen and regenerate tests |
| R2-REST-04: Generate button unavailable | Form inputs temporarily disabled while host connects; failures left the user without retry; long model requests could retain busy state | Bounded connect/storage boot calls; explicit Retry Anna connection button; once-only event bindings; 45-second model deadline plus `finally` restoring the generate button | Browser startup/routing/button checks, static and source runtime tests |

**Fresh-install hardening:** Anna may return a 404 for a storage key that has never been created. The new boot logic recognizes only definite missing-key responses as an empty initial workspace. It **does not** convert 403 permission denial, connectivity errors, 500 errors, or unclassified timeouts into empty data. Tests exercise both first-install 404 and 403 fail-closed behavior, so the reviewer should not encounter a permanently disabled app on a clean installation solely because no prior records exist.

**Compatibility:** the Anna storage key remains `life-control-anna:v1` and existing tasks, money, learning, journal, savings, and saved plans are preserved. Invalid or missing `lastReview` is normalized to `null`. Last-review restoration never silently includes that text in a new LLM request. Saved-plan inclusion still needs an explicit separate checkbox and fresh AI consent.

**Data boundary:** automatically retaining the most recent analysis (distinct from deliberately saved plans) is disclosed in the updated `PRIVACY.md`. The analysis and plan can be erased with the confirmed workspace deletion control, subject to Anna-platform log and backup limitations.

**Screenshot gate:** the five public v0.1.1 images depict the old single-page UI. They must **not** be presented as proof of v0.1.2's new navigation. The local `--review-gate` intentionally blocks until authentic v0.1.2 screenshots are recaptured, stored, and verified in the Anna Listing. See `store-screenshots/SOURCE-VERSION.txt`.

## 2. Source and CI verification

- Anna CLI `validate --strict`, screenshot/listing structural checks, and the local Anna development harness smoke test are required on every commit by `.github/workflows/anna-edition-tests.yml`.
- Node tests include existing 53 checks plus reviewer-specific source, host-storage queue, screenshot-version and **JSDOM actual UI interaction** regression cases.
- The browser tests navigate tabs, add/complete task, log income/learning/journal, save savings goal, erase workspace, generate AI, save plan and observe storage acknowledgement, close the document and reopen using the same persisted Anna Storage mock, verify analysis returns and generated button remains enabled, then authorize a second AI request.
- Failure tests reject `storage.set` and simulate a host claiming success without saving the plan: **the UI must not report a confirmed saved plan**.
- These checks validate implementation paths in a simulated Anna host, **not actual cloud-network durability, quota, installation state or reviewer acceptance**.

### November 20 further timeout and readback hardening

After the owner reported **75/75 passing local source tests**, a follow-up code inspection identified another genuine edge case: the host `storage.set` Promise can remain pending after the app's 15-second UI deadline. Because writes are serialized, blindly retrying in the same session would queue behind the unresolved write indefinitely. Candidate fix: **mark storage durability as uncertain, stop new record/form writes, disable plan/retry/erase actions, and direct the user to close and reopen the app to reconcile actual Anna Storage contents**. Definite rejected writes remain recoverable via retry. The UI does **not** claim a timed-out operation was canceled or that its data was persisted.

The candidate also verifies that the newly generated AI `lastReview` is actually returned by `anna.storage.get` before promising that the analysis survives reopening, matching the existing saved-plan readback check. Simulated browser tests include an unresolved plan write, a false ACK for analysis, and a false ACK for saved plans.

**Latest verified GitHub CI:** 2026-11-20, commit `8bd542bba1f5be5ae8386682532ca6aeb89f83f0`, [workflow run 44662552638](https://github.com/yap-gif/life-control-android/actions/runs/44662552638): `validate --strict` PASS, **78 tests passed, zero failures**. This supersedes the owner's earlier local **75/75** run: the new commits still require a local fetch + test before Anna private-draft installation.

## 3. Mandatory fresh Cloud Agent acceptance before cutting v0.1.2

Use a **fresh-install Cloud Agent**, not only the local Windows Harness or an already open stale draft. Confirm Anna Developer Console and CLI identify original **App ID 908**, new Working Draft bundle ready, and the new eight-section navigation. Use **synthetic test data only**.

### R2-E2E-01 — Navigation, accessibility and responsive behavior

Open Overview, AI Insights, Tasks, Money, Learning, Journal, Savings, Privacy. Each must be visibly separated, keyboard reachable, and retain its own form/action; browser back/forward must navigate correctly. Repeat at a narrow viewport around 360 px and a desktop viewport. There must be no overlapping controls, missing headings, or inaccessible save buttons. Check keyboard focus and an actual screen reader where possible.

### R2-E2E-02 — Complete data entry and persistence

Add a task, complete/reopen it; add an income and expense; add multiple Learning records on dates in distinct completed weeks; add and replace a same-day Journal entry; save a savings forecast. Navigate away, return, close app, reopen. All records and controls must restore. Test deletion and confirmed workspace erase with only synthetic data. Inspect actual Anna Storage acknowledgements when possible.

### R2-E2E-03 — AI review, consent and restored analysis

1. In Learning, enter synthetic historical sessions: 2026-11-04 Kotlin 120 min; 2026-11-11 Kotlin 60 min; 2026-11-17 DBMS 40 min (adjust only if the actual test date changes the comparable-week interpretation).
2. In AI Insights, select **Learning only**, verify the local 120 → 60 full-week trend, and explicitly authorize one AI analysis. Check that a real LLM request is performed once and its payload excludes nonselected Tasks/Money/Journal even when those categories hold data.
3. Confirm the generated report is displayed and a corresponding `lastReview` write is acknowledged. Close the app completely and reopen on the same Cloud Agent; verify the exact report text is **restored** without a model call. Verify `Analyze pattern & adjust plan` remains usable after fresh consent.
4. Test a second authorized AI generation after reopen. It must not be stuck or permanently disabled.

### R2-E2E-04 — Save plan readback / duplicate / delayed failure

Click **Save this AI plan** and verify waiting feedback. It must show success only after the host has acknowledged the write **and** a subsequent `storage.get` contains the same saved text, date and source categories. Repeat after closing/reopening to confirm persistence. Rapid double-click must not duplicate or block writes. If Anna returns an error or times out, the UI must show a concrete failure/unconfirmed status, remain accessible, and offer a safe retry instead of claiming success. Do not intentionally consume paid model quota to create failures.

### R2-E2E-05 — Saved plan privacy and realistic follow-up

Do not send an old plan unless `Include my saved AI plan` and all original categories are selected and a **new** AI consent is checked. New analysis must not treat records dated on or before plan save as proof of following that plan. To genuinely test adaptation after the plan is saved, use a later calendar date in a real follow-up session; do **not** falsify chronology by entering future activity on the same day.

### R2-E2E-06 — Updated Listing, version and submission gate

Take **new authentic** screenshots of the eight-page navigation, an AI trend/consent screen, a real AI report, and the saved/restored plan. Ensure the image is of the actual v0.1.2 installed draft, not a generated mockup. Replace v0.1.1 screenshots in the original Anna Listing, save, reload, and verify public HTTPS image URLs. Correct any non-image Cover URL, and verify the updated privacy URL loads. Only then update the screenshot source-version marker and let `npm run preflight -- --review-gate` pass.

**Release sequencing:** do not push to Anna, cut, submit review, release or publish solely because CI passes. Request owner approval for the private draft update; complete Cloud Agent acceptance; request a separate approval to cut `v0.1.2` and then submit that exact immutable version for review. The rejected v0.1.1 / ID 2476 remains immutable.

## 4. Final acceptance status

- Reviewer issues: documented; source repairs committed on a separate branch.
- Automated source checks: track the newest GitHub Actions run, report exact pass/fail counts from the log.
- Anna Cloud Agent full fresh-install verification of **v0.1.2**: **NOT YET PERFORMED**.
- New screenshot Listing and refreshed privacy validation: **NOT YET VERIFIED**.
- Approval to update App ID 908 Working Draft, immutable version cut and third review submission: **NOT GRANTED HERE**.

It is not possible to guarantee a completely bug-free app. A passing source CI is necessary, but the release decision requires actual behavior and evidence under the target Anna Cloud Agent runtime.
