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

## Local Harness multi-week AI runtime verification (2026-11-17, 08:16–08:18)

Developer provided the complete local Anna App Harness RPC log and a real app-window screenshot. This observation **supersedes** the earlier 08:11–08:13 incorrect test dates while preserving the history of the initial test.

**Records and storage:** After removing the three misdated records, successful `storage.set` generations **12–14** saved synthetic Learning records: `2026-11-04 / kotlin / 120 min`, `2026-11-11 / kotlin / 60 min`, `2026-11-17 / DBMS / 40 min`.

**Real LLM request:** At **08:18:15**, `llm.complete` was invoked with a payload containing precisely the selected **Learning** category and five correct date windows: four completed weeks starting 2026-10-19 plus a partial 2026-11-16–17 window. Complete weeks Nov 2–8 and Nov 9–15 contained 120 and 60 logged minutes, respectively; partial week Nov 16–17 contained 40. The transmitted payload had `completeWeeksWithRecords: 2` and `weeksWithRecords: 3`. The JSON contained no `money`, `journal`, tasks or unselected aggregates. **Important limit:** the actual stored Money and Journal categories were empty in this live test; exclusion of populated private data was separately unit-tested but not demonstrated with a nonempty confidential category in the current RPC trace.

**Real LLM response:** At **08:18:21**, Anna returned an `endTurn` response from `google/gemini-3-flash-preview` with 541 output tokens / 1486 total. The response (1) distinguishes complete vs partial weeks; (2) says recorded `kotlin` minutes fell 120 → 60 (50%); (3) recognizes the new `DBMS` topic; (4) avoids inventing reasons for the change; and (5) proposes two conditional, measurable next-week learning actions. App screenshot confirms actual formatted Markdown rendered under **AI Pattern & Next-Week Plan**, and **Save this AI plan for next week's comparison** was enabled.

**Issue observed and targeted source correction:** The LLM emitted a **Saved-plan follow-up** section even though `previousUserSavedPlan` was absent. This was an unnecessary empty follow-up, not a privacy leak. The prompt builder was subsequently amended to request **exactly four headings** when no saved plan was authorized and add a fifth only when the user explicitly opts in. A regression test checks the scoped system prompt and payload. New source change awaits a fresh runtime observation.

**Disposition:** **PASS — local Harness multi-week model response and evidence-grounded plan generation.** **NOT YET VERIFIED** — clicking Save and storage persistence; follow-up with saved plan and renewed consent; filled-category exclusion against the real host; fresh Anna Cloud Agent install/run; authentic screenshots uploaded to Anna Listing. The Harness preview URL in the screenshot contains a session query token: crop/redact the entire Harness chrome/address strip and RPC panes before any public screenshot publication.

## Local Harness saved-plan persistence and reuse (2026-11-17, 08:22–08:23)

Developer supplied full RPC transcript from a **new local Anna App Harness session** (session `sess-4`). A successful `storage.get` at **08:22:54** returned `generation: 15` and a `savedPlan` object containing the prior AI response text, `savedAt: 2026-11-17`, and `categories: ["learning"]`. This proves the plan had been persisted from the prior session and successfully **restored**. The prior save operation's own `storage.set` is **not** included in the new transcript, but the restored object is direct persistence evidence.

At **08:23:29**, a new `llm.complete` was invoked with `previousUserSavedPlan` explicitly present and only Learning evidence. Anna returned `endTurn` at **08:23:35** from `google/gemini-3-flash-preview`, **625 output tokens / 2182 total**, discussing the old plan and its current analysis. There is no Money or Journal content in the payload; the stored Money and Journal collections were empty, so nonempty exclusion remains a separate pending runtime case.

**Acceptance:** PASS for **plan restoration** and **LLM receipt of selected prior-plan context**. The RPC does not independently show checkbox clicks, nor demonstrate a post-plan learning record or actual plan completion. **Persisting and reusing a saved AI plan is not yet evidence of adjusting the plan after a new week of logged activity.**

**Important model attribution defect:** The model's `Saved-plan follow-up` described the 2026-11-17 DBMS session as successful weekly activity for a plan **saved on that same day**, despite the DBMS session already being in the earlier baseline. With date-only records, same-day order is unknown; it is incorrect to treat the entry as evidence of post-plan compliance. A GitHub source fix adds explicit `postPlanEvidence` with strictly later-dated selected activity counts and instructions to report **no post-plan evidence** when zero. Regression tests cover same-day and later-dated observations. This corrective source has **not yet been re-observed through the live model**.

**Next:** Sync latest branch; check the no-newer-evidence wording with the actual LLM; verify saved-plan opt-out and Forget saved plan; verify nonempty excluded categories in a later local Harness test; complete a genuinely fresh Anna Cloud Agent full run. No remote Anna draft update or new cut/resubmission is claimed.

## Local Harness saved-plan opt-out and deletion evidence (2026-11-17, 08:30–08:32)

The developer supplied the next local Anna App Harness RPC transcript. At **08:31:00**, `storage.get` succeeded with the previously saved plan present (Learning source category, saved 2026-11-17). At **08:31:20**, a new `llm.complete` request with **Tasks + Learning** selected included ordinary task-count aggregates and Learning records, but **omitted `previousUserSavedPlan`** and its stored text. The system prompt explicitly stated that no previous plan was included. At **08:31:26**, Anna LLM succeeded and returned the four expected headings without a saved-plan follow-up. This is evidence of **saved-plan opt-out / payload exclusion**, not evidence that all categories other than Learning were excluded (Tasks was also selected).

At **08:31:33**, `storage.set` sent `savedPlan: null`; the Anna Host acknowledged success at **08:31:34**, `generation: 16`. The Learning records were preserved. This supports **PASS — user-initiated saved-plan deletion persisted to Host storage**. However, this transcript does not contain a **subsequent new-session `storage.get`** after deletion, so deletion survival across restart is **not separately verified** here.

**Still pending:** A real same-day-plan follow-up with `previousUserSavedPlan.postPlanEvidence.canAssessFollowThrough: false` and model language that does not infer compliance; a later-dated simulated record showing legitimate comparison; populated Money/Journal privacy exclusion in live RPC; and fresh Anna Cloud Agent and Listing screenshot verification. The latest source fixes must not be mistaken for verified production-host deployment.

## Local Harness deletion-restart and nonempty Money scope isolation (2026-11-17, 08:36–08:38)

Developer provided an Anna App Harness RPC transcript showing a new session and the following results.

- At **08:36:01**, `storage.get` returned the existing three Learning records and **`savedPlan: null`**, with `generation: 16`. This independently **confirms deletion persistence across a new session**, not merely a successful same-session write.
- At **08:36:50**, `storage.set` saved a nonempty `money` array with one synthetic income entry (`2026-11-17`, **RM 100**), with successful acknowledgement `generation: 17`.
- At **08:37:01**, `llm.complete` carried only **Learning** evidence (Nov 4 120 min, Nov 11 60 min, Nov 17 40 min), **no Money key/amount/category**, and no saved plan. The system prompt requested the four expected headings, and the model returned successfully at **08:37:06**.
- The model's answer correctly avoided the Money data, compared the two completed weeks and kept the current week partial. However, it also suggested recording Learning start/end times and a separate Kotlin active/paused status — **neither is a supported field** in the current Learning form, which stores only **topic, minutes, date**. This is an actionable AI-output quality issue, not an observed privacy leak.

**Disposition:** **PASS** for saved-plan deletion across restart, **PASS** for excluding actual nonempty Money data from a Learning-only LLM request, and **PASS** for another real model response. **Journal nonempty exclusion remains untested in live Harness.** New source prompt guidance now prohibits recommending unsupported Learning fields and discourages suggesting unselected modules; a regression test verifies instructions, but its effect on actual model replies remains to be tested after a local source update. The current transcript does **not** show the corrected post-plan attribution logic running.

## Local Harness nonempty Journal isolation and real plan save (2026-11-17, 08:47–08:49)

Developer supplied a subsequent **local Anna Harness** RPC transcript; this is **not** the required newly installed Anna Cloud Agent. The initial `storage.get` at **08:47:05** loaded the Learning records, a nonempty synthetic Money record (RM 100), and `savedPlan: null`. `storage.set` then added a synthetic journal entry, removed it, and saved a replacement containing the deliberate sentinel `PRIVATE-JOURNAL-TEST-999`. The final journal write was **ACKed at 08:47:28** with **generation 20**, while Money still held the RM 100 record.

At **08:48:09**, the actual Anna `llm.complete` request contained **only Learning** summaries and detailed learning sessions: Kotlin 120 min (Nov 4), Kotlin 60 min (Nov 11), DBMS 40 min (Nov 17). **Both nonempty Money and nonempty Journal were excluded from the entire LLM request**: no `money` or `journal` category fields, no RM 100 income record, and no `PRIVATE-JOURNAL-TEST-999` text. No `previousUserSavedPlan` was included. The provider returned successfully at **08:48:16**, model `google/gemini-3-flash-preview`, **460 output / 1536 total tokens**; it used the permitted Learning evidence and provided four requested Markdown sections. The recommendations used **supported Learning form fields (topic, minutes, date)** rather than asking for nonexistent time-of-day or status inputs. This constitutes **PASS** for the revised AI guidance in this one live model run, without guaranteeing future stochastic model compliance.

At **08:48:49**, the app sent `storage.set` with the completed AI response stored as `savedPlan: { savedAt: "2026-11-17", text: <response>, categories: ["learning"] }`. The host acknowledged **generation 21** at **08:48:49**. Both the previously created Money and Journal records were **preserved** in that save. This proves the new saved plan was persisted by Host acknowledgement but **not yet its restoration from a new session**.

**Disposition: PASS** — nonempty Money **and** nonempty Journal excluded from Learning-only LLM input; real LLM generated a plausible evidence-based next-week plan using supported Learning fields; new plan saved in Anna storage (generation 21). **NOT TESTED BY THIS LOG** — later `llm.complete` including this new saved plan with `postPlanEvidence.canAssessFollowThrough: false`; the model not inferring compliance with zero strictly later-dated entries; actual follow-up with a later-dated activity; newly installed Cloud Agent end-to-end test; screenshots present and reloaded in Anna Listing. Continue to separate model prompt-source tests from deployed/installed-app claims.

## Local Harness saved-plan same-day attribution retest (2026-11-17, 08:54)

Developer supplied a new-session local Harness RPC trace (`sess-2`). The `08:54:19` `storage.get` returned the newly saved plan with `savedAt: 2026-11-17` (`generation: 21`) and the previously entered Learning records, as well as nonempty synthetic Money and Journal data.

At `08:54:44`, `llm.complete` sent the expressly included `previousUserSavedPlan` and Learning evidence only. The follow-up payload contained **`postPlanEvidence.strictlyLaterDatedRecords: 0`, `learningSessions: 0`, `canAssessFollowThrough: false`**. No unselected Money/Journal values were sent. At `08:54:49`, `google/gemini-3-flash-preview` returned a completed answer (640 output tokens, 2416 total). Its `Saved-plan follow-up` explicitly recognized zero post-plan evidence and refused to claim compliance, completion or progress toward the saved plan.

**Disposition:** **PASS — live local Harness model behaviour for zero-later-evidence plan attribution**, resolving the earlier same-day evidence defect for the tested case. Recovery, context authorization and nonempty category isolation are also corroborated. **Outstanding:** live test after genuinely later-dated logged activity (to prove useful plan adaptation), fresh Anna **Cloud Agent** install/end-to-end flow, and verified real screenshot URLs in the server-side **Listing**. The original rejected v0.1.0 remains unchanged; v0.1.1 is still a source candidate, not deployed, cut, resubmitted, or published.

## Original Anna App ID 908 Working Draft v0.1.1 uploaded (2026-11-17)

Developer supplied Windows PowerShell 5.1 output of local `npm test` (**52/52 PASS**), `npm run validate` (**strict validation PASS**), and authenticated Anna CLI v0.1.64.

- `anna-app apps status life-control-anna` returned **App ID 908**, Life Control, **status: rejected**, latest immutable **v0.1.0 (ID 2279)**, **one** total cut version.
- `anna-app apps push --dry-run` correctly identified `app_id=908` and `slug=life-control-anna` and the working bundle path, but the local process then ended with a Windows libuv `UV_HANDLE_CLOSING` assertion. This is a dry-run process exit error, **not evidence of a server-side push failure**.
- The **subsequent real** `anna-app apps push` reported `staging working bundle: 8 files, 57.5 KB`, deduplication of 2 unchanged files, and `working bundle staged (8 files, status=ready)`. Server result: **`apps/life-control-anna: working draft updated (rev 3)`**; bundle **ready**; app **still rejected**, with changes relative to v0.1.0. The CLI specifically directs installation and testing of **reserved `0.0.0-draft`** in Developer Console before cutting v0.1.1.
- This push **updates only the existing app's mutable Working Draft**. It does **not** edit the immutable v0.1.0, create a new app, publish, freeze v0.1.1, or submit review. It does not establish Cloud Agent runtime success or screenshot listing completeness.

**Next gate:** In Anna Developer Console → the original **Life Control (App ID 908)** → **Edit → Versions → Working draft → Install & test** the reserved `0.0.0-draft`. Confirm that the installed app is the new draft, not the old **Install v0.1.0** action. Test on a **new Anna Cloud Agent install/session**, use only synthetic data, verify actual live end-to-end consent, AI, storage, saved-plan follow-up and day-precision attribution. Capture authentic, app-only screenshots and populate/reopen the Console **Listing** screenshot URLs. Do not recut or resubmit until these steps are verified.

## Anna main interface screenshot — in-platform UI startup observed (2026-11-17)

Developer supplied a screenshot from the **Anna main interface** (left Anna navigation and a distinct Life Control app window; not the local Harness). The visible app includes the revised v0.1.1-style hero text **"See your patterns. Improve your next week."**, status **"Anna connected"**, four zero-state dashboard metrics, **"AI Pattern & Next-Week Plan"**, and **"Not enough comparable history"** in local preview. The app is visibly rendered rather than showing a launch error. The Anna OS dock overlaps the lower middle of the screenshot; that is an OS overlay rather than conclusive app layout failure.

**Evidence disposition:** **PASS — updated AI-first UI renders inside Anna's main interface and local empty-history preview appears.** The screenshot by itself **does not prove** this is a freshly installed reserved `0.0.0-draft` on App ID 908, does not reveal installed build/version identification, and does not prove cloud storage or real LLM runtime behavior in this host. Verify version from the developer's Versions/installation UI and test the real host before closing the fresh-Cloud-Agent acceptance gate.

**Store screenshot caveat:** The submitted screenshot includes Anna sidebar, OS chrome, and floating dock; it is **not yet an authentic app-only marketplace listing screenshot**. Capture from the live installed app window alone, without host navigation, floating overlays, tokens, sensitive data, or RPC/debug panels.

## Anna Developer Console draft identity and in-platform AI observation (2026-11-17, 09:08–09:11)

User supplied **six screenshots** and the visible AI-generated text from the Anna main interface / Life Control application. The first screenshot is of **Developer Console → Versions** for the existing Life Control app. It explicitly shows **Working draft revision r3**, **Bundle ready**, server content hash starting `dd8ae4ad6c02`, a user-facing **Install draft** button, and version history rows `0.1.0` and `0.0.0-draft`, both with bundle-ready status. The **Submit for review** button targets **v0.1.0**, which must **not** be pressed while the v0.1.1 draft is still being verified. This screenshot corroborates the prior authenticated CLI `apps push` to App ID 908. The screenshots alone do not show the app installation event/version assigned to the open window.

The subsequent screenshots show the **real Anna app window**, not the Windows localhost Harness: (a) local pattern preview **Learning: 120 min → 60 min (last two complete weeks)**, (b) selected-category checkboxes and separately displayed one-time AI consent, (c) a rendered **Evidence across weeks** model response, (d) the product's AI-first header and a 40-minute weekly dashboard metric, (e) Learning records with **2026-11-04 / kotlin / 120 min**, **2026-11-11 / kotlin / 60 min**, **2026-11-17 / DBMS / 40 min**, plus Tasks, Money, Savings goal, and privacy/erase controls. The UI shows no obvious startup or rendering failure in these views.

User also supplied AI analysis text identifying four completed periods plus a current partial week, comparing **120 → 60 recorded minutes**, acknowledging uncertainty around no-logging weeks and topic transition, and generating two conditional measurable next-week actions. This is **direct screen/output evidence of in-platform AI report generation**; without a cloud RPC trace it does not by itself establish the exact model payload, privacy isolation, backend version identity, or storage persistence after relaunch. Screenshots currently show **No saved plan** before the AI output; no saved-plan recovery after reload was submitted for this stage.

**Disposition:** **PASS** — original-app Working Draft r3 Bundle readiness; **PASS** — visual rendering and cross-week local comparison in Anna; **PASS (observed output)** — evidence-grounded AI report displayed; **PENDING** — explicit installed-draft identity if not already verified by install action, cloud saved-plan persistence and repeat authorization, app-opening on new/clean Cloud Agent, record post-plan later than save (cannot be validly demonstrated on same date by future-dating a new record), and actual Listing screenshot URLs saved and reopened.

**Listing image audit:** The first screenshot is developer console only and is **not** a Life Control store image. App-window screenshots are authentic but several are partial/cropped and do not alone form a verified, publicly hosted, complete three-image Listing set. Capture or compose **authentic, unaltered app views** showing AI interface/explicit consent, evidence-based results, and saved plan/next-week actions; exclude Anna console chrome, app dock, translation overlays, debugging panes, tokens and personal data. Do not claim Listing media complete until public HTTPS screenshot URLs are **actually saved and reloaded in Developer Console → Listing**. The current local 3-image review gate is a project QA threshold; Anna platform documentation says **max 6** URLs, not that 3 are universally required.

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
