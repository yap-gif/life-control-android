# Life Control — Anna Review Rejection & Repair Gate

**Review feedback received:** 2026-11-17 (developer-provided Gmail screenshot + Anna Developer Console rejected-status screenshot)
**App:** Life Control · slug `life-control-anna` · Anna app ID **908**
**Rejected candidate:** immutable `v0.1.0`, version ID **2279** — do not attempt to modify this immutable version
**Repair work:** `fix/life-control-ai-native-review-20261117`; local code metadata targets **0.1.1**, unreleased
**Current task status:** REVIEW REJECTED → TECHNICAL REMEDIATION IN PROGRESS
**Guardrail:** No `apps push`, `apps cut`, `apps submit-review`, or `apps release` was executed as part of this repair document

## Evidence and reviewer wording

The Anna Developer Team email (visible sender `dev@anna.partners`) reads:

1. **Incomplete App listing:** "The App listing is missing screenshots."
2. **No distinct AI-powered value was demonstrated:** basic tracking and optional weekly review were seen as standard productivity tracking plus a general-purpose AI assistant. Reviewer asks to demonstrate how **longitudinal history** helps users identify patterns and **adjust plans over time**.
3. **Re-test:** "Before you resubmit, please run a full test yourself on a Cloud Agent, starting from a fresh install and testing the full flow."

The separate Anna Developer Console screenshot shows **Rejected** for the Life Control app. These are direct reviewer findings, not our speculation.

### Why the old implementation failed the AI-native test

At `v0.1.0` the model received only `buildReviewContext(..., currentWeek)` and generic instructions to recap progress, note gaps and suggest a next-week priority. The initial UI placed the AI Weekly Review below the other manual tracking forms. This combination can appear to be an optional generic summary tool. The previous local preflight validated schema and privacy links but **did not assert presence of real publicly hosted screenshot URLs**; passing local CI did not prove remote Listing completeness.

## Repair candidate: features designed to answer reviewer feedback

1. **AI-first evidence panel:** The primary product entry is now "AI Pattern & Next-Week Plan", above manual tracking. Client shows local, selected-category preview before any LLM request.
2. **Longitudinal baseline:** `bundle/patterns.js` partitions up to **four completed calendar weeks plus the possibly partial current week**. The payload contains bounded selected-category data; other categories and their derived figures are excluded. Incomplete logging is not evidence of no activity.
3. **Evidence-backed coaching:** The `review-contract.js` prompt instructs Anna LLM to cite dated numerical observations, separate interpretation from fact, avoid unfair full-vs-partial comparisons, and propose at most two measurable seven-day changes.
4. **Closed-loop follow-up:** After user-authorized AI response, user can explicitly **save** a plan to Anna per-app storage. On a later cycle they may separately opt in to include that plan in the next request, only when the new category selections cover every original plan category. User can forget the plan independently; clearing workspace also removes it. Saving a plan is not proof of execution.
5. **Privacy guard:** No startup AI call, new per-review consent remains mandatory, and saved plans are not transmitted by default. Previous saved plan content is treated as untrusted data.
6. **Source tests:** New multi-week comparison, partial-week, category-isolation, saved-plan consent and UI-first regression tests. GitHub CI validates JS syntax and schema.

**Important limitation:** The source change itself is *not* evidence that actual Anna-hosted `llm.complete` gives sufficiently specific, useful advice. Real fresh-install cloud testing is mandatory. The UI currently stores the selected AI response as an optional plan reference; it does not automatically change future Tasks/Money/Learning records.

## Screenshot remediation / verified URL gate

**The reviewer found missing screenshots despite earlier developer-reported Listing checks.** Do not assume prior Console values persisted. Re-open the actual Listing and inspect the `Screenshots` field.

- Capture **3–5 genuine `0.1.1` running UI screenshots** with synthetic test data:
  1. AI-first overview and local trend preview using at least two completed weeks;
  2. category-selection and fresh AI consent state;
  3. a real completed `llm.complete` response showing dated evidence and a measurable next-week plan;
  4. saved-plan status / subsequent plan comparison, if successfully tested;
  5. mobile layout, if supported.
- Do **not** reuse the six earlier AI-generated mockups as real screenshots. Do not show real journal/financial data, session tokens, private identifiers or RPC logs.
- Host PNG/WebP captures at direct, publicly accessible **HTTPS** image URLs. The Anna Listing form accepts **up to 6 URLs**, one per line.
- Paste these URLs into **Developer Console → Life Control (App ID 908) → Listing → Screenshots**, explicitly **Save**, reload the page, and confirm the actual screenshot URLs remain present and each opens without login.
- Record the same URLs in candidate `anna-edition/app.json` for review evidence parity. **This does not synchronize the remote Listing automatically.**
- `npm run preflight -- --review-gate` intentionally **fails** until at least three local screenshot URLs exist. Even PASS would only prove local format, not remote server persistence. Reviewer may expect a richer gallery; three is an internal quality gate, not an Anna platform minimum.
- Independently verify Listing logo, headline, `0.1.1` description, public privacy notice and product screenshots match the actually installed revised bundle.

## Windows local source verification and branch-switch anomaly (2026-11-17)

Developer's Windows PowerShell 5.1 transcript shows that the direct refspec fetch `refs/heads/fix/life-control-ai-native-review-20261117:refs/remotes/origin/fix/life-control-ai-native-review-20261117` succeeded, but `git switch -c ... --track origin/...` returned **"cannot set up tracking information; starting point ... is not a branch"**. Git still reported the old feature branch while `git status --short` showed the new candidate's modifications in the **index** (`M ` / `A `), and an **untracked** `anna-edition/package-lock.json`. Local `app.json` and `package.json` both displayed version **0.1.1**; this is a checked-out working tree, not proof of a successful Git branch switch.

On that **v0.1.1 local working tree**, `npm.cmd test` passed **47/47**, `npm.cmd run validate` returned **validate passed**, and `npm.cmd run preflight -- --review-gate` exited **1** with the **expected blocking error** for missing publicly accessible authentic screenshot URLs. These are developer-supplied local logs; prior remote GitHub CI independently passed the same 47-test source checks.

**Next Git repair:** Protect all staged and untracked edits in a named `git stash push -u`, explicitly switch/create the local repair branch from the fetched remote commit **without auto-tracking**, then check that HEAD matches the remote ref. Retain stash until developer verifies branch integrity; do not blindly pop the stale staged patch over the correct source. No remote Anna changes were performed.

## Local Anna Harness RPC observation — 2026-11-17, 08:11–08:13

Developer provided a local Harness RPC log. The Host responded successfully to `window.hello`, `window.ready`, `storage.get` and three successive `storage.set` requests. The session identity in the log was the local Harness `anna-edition` app, not a verified fresh production Cloud Agent installation. Storage generations 6, 7 and 8 were acknowledged, with all three synthetic Learning records saved.

**Test-data discrepancy:** All three saved learning entries have `date: 2026-11-17` (topics kotlin 120 min, kotlin 60 min, DBMS 40 min), totaling **220 min in the current partial calendar week**. They were intended for `2026-11-04` (120 min), `2026-11-11` (60 min), and `2026-11-17` (40 min). The corresponding expected complete-week comparison is **120 → 60 minutes**, with current partial-week 40 minutes separately labeled. Re-enter the two historical dates in the UI; the date input defaults back to today following each add.

**Current disposition:** **PASS** for basic local Anna storage RPC; **NOT TESTED** for the intended multi-week preview, `llm.complete` (absent from the transcript), saved-plan persistence and authorized next-cycle adjustment; the fresh Cloud Agent end-to-end test remains **PENDING**. The log does not establish an app bug. Re-run the targeted data scenario before changing logic or claiming trend accuracy.

## Required fresh Cloud Agent acceptance

**Do not mark any item PASSED without a platform or user-observed result.**

1. Test the **new version candidate from a fresh installation on Anna Cloud Agent** (not only the Windows local Harness). Confirm the actual UI Bundle version and no errors.
2. Use **synthetic records** dated in multiple complete weeks (e.g. 120 learning minutes in week of Nov 2, 60 minutes in week of Nov 9, 40 minutes in the current partial week of Nov 16), then verify the local preview shows the correct 120 → 60 full-week change rather than comparing the partial week.
3. Start AI request with **Learning only** checked. Confirm fresh consent is required. Verify outgoing LLM request includes learning evidence but excludes unselected Money and Journal, even when those records exist.
4. Check the actual AI response **references evidence accurately** and produces a measurable 7-day experiment/plan. If insufficient history, it must say trends cannot be inferred.
5. Save the generated plan. Reload. Confirm it persists. Attempt a follow-up with a narrower category scope: inclusion should be rejected; uncheck inclusion and repeat successfully. With all saved categories and renewed consent, verify a follow-up plan adjustment based on new logged evidence.
6. Delete the saved plan and verify it is absent in a new request. Verify Erase saved data clears records and saved plan; it must not claim to erase platform logs or already sent model calls.
7. Keyboard/accessible labels, mobile/narrow viewport and an actual screen-reader pass when practical.
8. Confirm graceful no-LLM/quota/storage failure messages; do not intentionally exhaust paid quota just to test.
9. Inspect frozen `0.1.1` bundle readiness, Listing screenshot URLs and privacy link. Capture platform status output.

## Planned release lifecycle — not yet authorized

- v0.1.0 (ID 2279) remains **REJECTED / unpublished**, do not recut it.
- Complete branch CI, test in local Harness and **fresh Anna Cloud Agent**. Address reviewer concerns first.
- After explicit owner authorization, `apps push` latest Working Draft, `apps cut 0.1.1` (new immutable version), verify App ID 908 and new version ID, then submit a new App Review round. Do **not** cut or resubmit simply because source tests pass.
- This new review round has a separate decision and may be rejected again. Do not claim eligibility for grants until publication and qualified-use criteria are met.

## References

- [Anna App Review Timeline & Process](https://forum.anna.partners/t/app-review-timeline-process/318)
- [Anna App Listing Fields](https://anna.partners/developers/apps/app-listing)
- [Build on Anna 101](https://forum.anna.partners/t/build-on-anna-101/228)
- [Prior v0.1.0 QA evidence](./QA-ACCEPTANCE.md)
