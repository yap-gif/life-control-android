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

## 3A. Owner's actual Anna Working Draft upload — revision 4 (2026-11-20)

The owner supplied the PowerShell output of local source verification (**78 tests / 78 pass / zero fail**, Anna CLI `validate --strict` PASS, ordinary preflight PASS). The safety check correctly read `app_id: 908`, but **detected `status: pending_review` and threw** the message `An active review is pending. Stop.` **The owner continued manually afterward**, so the guard did not prevent the subsequent remote change.

The authenticated `anna-app apps push` then **succeeded**, reporting: staged **9 UI bundle files**, **74.8 KB**, 3 unchanged files deduplicated; bundle `ready`; `apps/life-control-anna: working draft updated (rev 4)`. An additional `apps status life-control-anna` confirmed `app_id: 908`, `status: pending_review`, latest immutable `v0.1.1 (ID 2476, published=—)`, and `in review: v0.1.1 (pinned at submit-review)`, 2 total frozen versions.

**Disposition:** **PASS for upload of the v0.1.2 source to the private original-app Working Draft r4**; **NOT PASS for a new review or actual Cloud Agent behavior**. The pending review is still explicitly pinned to v0.1.1; the new draft is not the candidate. The user also supplied an Anna Developer rejection email describing v0.1.1 issues, so there is a discrepancy between emailed review feedback and server-visible `pending_review`. Do not assume the server status was reset or that v0.1.2 has been submitted; check the Console/version review history or contact Anna Dev for clarification before any new `cut` or `submit-review`.

**Next safe step:** Install the **Working Draft r4** (`0.0.0-draft`) in a fresh Anna Cloud Agent. Run the full `R2-E2E` acceptance sequence below and save evidence for each reviewer defect. Fresh screenshots of the revised multipage UI are mandatory before lifting release/review gates. Do not run `apps cut 0.1.2`, `apps submit-review`, `apps release` or `publish` while the ambiguous pending-review state remains unresolved.

## 3B. Anna Console draft install and eight separate desktop views — screenshots (2026-11-20)

The owner supplied **nine screenshots** from Anna. **Versions** clearly displays **Working Draft r4**, green **Bundle ready**, content hash beginning `bf9be41d38f3`, the **Install draft** control and an Anna toast **"Installed working draft (0.0.0-draft) — now available in chat."** The same Console still displays **"In review: v0.1.1"** and identifies v0.1.1 as review candidate; no v0.1.2 cut/review is evidenced.

The other **eight screenshots** show separate desktop views in the Anna-hosted Life Control window, with a consistent eight-item navigation bar and **"Anna connected"** status: **Overview**, **AI Insights**, **Tasks**, **Money**, **Learning**, **Journal**, **Savings**, and **Privacy**. The active tab changes appropriately. Overview displays dashboard and a direct AI Insights entry; AI Insights shows the local historical preview **Learning: 120 min → 60 min** and explicit category-selection checkboxes; Tasks and Money display their own empty form panels; Learning displays three earlier dated synthetic sessions **2026-11-04 Kotlin 120 min**, **2026-11-11 Kotlin 60 min**, **2026-11-17 DBMS 40 min**; Journal and Savings show their own input panels; Privacy shows the dedicated **Erase saved data** control and disclosure. No obvious desktop navigation overlap is visible; Anna's translation widget floats over the far right edge of some captures and should be excluded from store screenshots.

**Disposition:** **PASS (in-platform visual evidence)** for reviewer finding **R2-UI-01** — the functions are visibly separated into distinct categories/pages, rather than one long scrolling surface. **PARTIAL** for R2-E2E-01 — desktop click navigation and form visibility shown, but narrow-mobile viewport, keyboard focus, browser back/forward and screen-reader support are not demonstrated. **PASS (visual only)** for reinstalled working draft launch and existing Learning record display. **NOT YET VERIFIED** for true blank-data fresh Cloud Agent (the reinstalled app shows pre-existing Learning records), live form submissions and storage persistence, LLM generation, saving next-week plan/host readback, relaunch review restoration and generate-button availability. Do **not** treat visible buttons as evidence their actions succeed.

**Next priority:** In a fresh isolated Cloud Agent (or other confirmed clean test storage scope), do the full R2-E2E-02 through R2-E2E-05 sequence using synthetic records: generate a real AI analysis, verify it is stored, save the plan and verify readback, close/reopen, verify the analysis and plan are restored without an automatic LLM call, then re-consent and successfully generate another analysis. Keep evidence of the saved-plan state and real generated output. Re-capture v0.1.2 Listing screenshots only after the flow passes.

## 3C. Actual Anna AI analysis and plan readback — UI evidence (2026-11-20)

The owner supplied two separate screenshots from the installed Life Control **Working Draft r4** app window.

1. The first shows a real generated cross-week AI analysis: four complete weeks plus partial week 2026-11-16–20, Kotlin **120 → 60 logged minutes**, a 40-minute DBMS session, uncertainty statements and a seven-day adjusted plan. The UI presents: **`Generated 2026-11-20 · Analysis saved and verified by Anna Storage readback.`** and **`Analysis verified in storage. Save as a comparison plan only if you choose.`**. AI consent is visibly not checked after the request, and the **Analyze pattern & adjust plan** button appears enabled.
2. The second shows a generated report including measurable next-week actions, with the separate footer: **`Saved plan verified by Anna Storage readback. It can be recovered after reopening.`**. The Save button appears disabled after saving, while Forget remains available. The visible UI is consistent with a successful `storage.set` then `storage.get` readback match for an explicitly chosen saved plan.

**Disposition:** **PASS (live in-platform UI evidence)** for generating analysis, reporting analysis persistence/readback verification, and reporting saved-plan persistence/readback verification without visible ongoing Saving lockup. This materially addresses the reviewer's second issue in the exercised normal path. The screenshots **do not** independently show the host RPC transactions, inject a real storage timeout, or demonstrate durability **after fully closing and reopening the app**. The two model outputs differ; do not infer sequence, number of calls, or which output was stored as the current comparison plan without further host evidence.

**Next essential closure test:** Fully close the Life Control app window, then reopen the installed `0.0.0-draft`; confirm the **exact prior analysis text** is restored without automatic AI invocation, the saved plan remains present, and **Analyze pattern & adjust plan** can be used with fresh explicit AI consent to generate another report after reopening. Check any unexpected stuck/disabled button or error message. Only then mark reviewer issue three complete. Also test a true clean storage scope, responsive mobile navigation, and real form writes before release freeze.

## 3D. Reopen restored previous AI analysis; new AI output and data discrepancy (2026-11-20)

The owner supplied three additional images of the installed Life Control Draft r4 UI, after the prior steps to fully close/reopen the app and run another authorized AI analysis.

- **Screenshot 1:** AI Insights shows "Anna connected" and the startup message **"Ready. Your last AI analysis was restored. A new AI call still needs fresh consent."** The app still shows the multiweek local Learning preview **120 min → 60 min**, supporting restored host state and safe non-automatic consent UI.
- **Screenshot 2:** An AI report is visible with the prior **Kotlin 120 and 60 min**, a **DBMS 40-minute entry in partial week 2026-11-16–20**, and a Tasks summary. Save and Forget plan buttons are visible.
- **Screenshot 3:** The AI report shows **"Generated 2026-11-20 · Analysis saved and verified by Anna Storage readback."** A new analysis is visible, and the generation button is partly visible at the top; its content lists Kotlin 120/60 and **0 minutes in the 2026-11-16–20 partial week**, describing Kotlin as the only recorded topic. The report includes two specific next-week actions. This is consistent with successful user-initiated post-reopen regeneration and storage verification.

**Disposition:** **PASS (in-platform screenshot evidence)** for reopening and showing the restored-analysis startup state, keeping navigation usable, and displaying a newly generated, readback-confirmed analysis. **PARTIAL** for complete R2-REST-03: the screenshot does not include the exact prior report side-by-side with the restored text or independent RPC proof of no automatic LLM call, although the visible UX is consistent with the intended implementation. **PENDING** for explicit saved-plan restored indicator following close/reopen and separate post-reopen inclusion with fresh authorization.

**Important accuracy discrepancy — investigate before final review:** Screenshot 2 reports a **DBMS 40-minute** Learning entry on 2026-11-17, consistent with the earlier live Learning page screenshot. Screenshot 3 instead claims **0 partial-week minutes**, and reports Kotlin as the only topic. These outputs can both be legitimate **only if** the underlying Learning state, selected data categories, or scope changed between requests; the available screenshots do not establish such a change. Confirm the current Learning entries, category selection, and (if possible) selected JSON payload from the two `llm.complete` calls. If the 40-minute DBMS entry was still present and Learning was selected when Screenshot 3 was generated, treat this as **FAIL — factual contradiction in model analysis**, investigate and strengthen validation rather than submitting. Do not mislabel it as a definitively identified source bug without payload evidence.

**Remaining gates:** Genuine fresh empty-storage Cloud Agent (this installation reused historical Learning records), Tasks/Money/Journal/Savings persistence and erase, 360 px narrow view/keyboard support, authentic v0.1.2 screenshots replacing the v0.1.1 store images and reloaded Anna Listing, and resolution of the old `pending_review v0.1.1` discrepancy. Do not cut or submit v0.1.2 until these are closed.

## 3E. Data discrepancy reconciled by owner's deletion confirmation (2026-11-20)

The owner explicitly clarified that they **personally deleted** the previously logged **2026-11-17 DBMS 40-minute Learning record** before the subsequent AI analysis showing 0 minutes in the 2026-11-16–20 partial week. Thus, the screenshots are of **different underlying Learning data states**. The earlier report with DBMS 40 minutes and the later report with 0 partial-week minutes are consistent with this intervening authorized deletion. **Disposition: RESOLVED — the previously suspected AI factual contradiction is not supported as a bug by the supplied evidence.**

This confirms the chronology as described by the owner, but the deletion operation itself was not accompanied by a host RPC trace. Treat updated-model output as **in-platform observation consistent with deletion**, not a test that conclusively proves every category-selection or privacy rule. Other release blockers remain: complete saved-plan recovery verification after reopen, fresh empty-storage Cloud Agent acceptance, non-AI form persistence, mobile/accessibility testing, new v0.1.2 screenshots and server Listing verification, and clarification of the still-pinned v0.1.1 pending review state. No frozen v0.1.2 or new submission is authorized here.

## 3F. Owner confirms remaining v0.1.2 validation (2026-11-20)

After reviewing the screenshot-confirmed draft installation, eight functional pages, live AI generation and Anna Storage readback, reopening/regeneration and the resolved DBMS data deletion, the owner stated explicitly **"我全部确认过了"** ("I personally verified everything") in reply to the outstanding acceptance list.

**Disposition — PASS (owner-reported manual verification):** the owner confirms the formerly pending remaining in-app tests, including (1) saved AI plan remains recoverable after closing and reopening, (2) Tasks, Money, Journal and Savings save/reload operations, (3) narrow/mobile navigation, and (4) fresh-install behavior / new v0.1.2 visual checks. These are **owner attestations**, not independently available per-step RPC logs, mobile-screen captures or a fresh clean-storage transcript. The prior screenshots independently establish draft r4 installed, multi-page desktop layout, analysis and saved-plan readback state, and restored analysis indicator. The previously flagged 40-versus-0-minute discrepancy was explained by the owner's deliberate deletion of DBMS 40-minute record.

**Remaining release-state work, not encompassed by manual feature confirmation:** the GitHub source manifest still references five **v0.1.1** screenshots and `store-screenshots/SOURCE-VERSION.txt` still reads **0.1.1**. Therefore **both `--review-gate` and `--release-gate` are deliberately blocked for source candidate v0.1.2**. New genuine v0.1.2 multi-page screenshot files must be hosted at immutable HTTPS links, reflected in `app.json`, and actually saved/reopened in Anna Console Listing; only then may the source-version marker be updated. Also verify a valid Cover image URL, and resolve/confirm the Console's old **`pending_review` pinned to v0.1.1** despite the reviewer email reporting v0.1.1 rejection, before considering v0.1.2 cut/resubmission. These platform/release checks cannot be inferred from "all tested."

**No new immutable version cut, review submission or publication authorized or performed.** This attestation closes the owner's requested manual feature test round, but does not guarantee the app is bug-free.

## 3G. Six new genuine v0.1.2 store screenshots committed and source gate unblocked (2026-11-20)

Following the owner's instruction to **directly update the screenshots and continue**, six images were sourced from their actual **Anna Working Draft r4** captures, showing Overview, AI Insights, Tasks, Learning, plan storage and restored AI analysis. The original uploaded PNG files were converted to WebP at quality 92 without replacing or inventing the displayed UI. All six blobs were uploaded and verified by their Git object SHA and byte count in the **public** GitHub repository under `anna-edition/store-screenshots/v0.1.2/`.

**Immutable image-import commit:** `ccadc9676a997aab9c2f93ec2066ca309a576488`. The six image URLs in `anna-edition/app.json` are pinned to that exact commit (not a moving branch). `store-screenshots/SOURCE-VERSION.txt` was updated from `0.1.1` to `0.1.2`. The outdated-cover issue was addressed in source metadata by using the authentic v0.1.2 Overview image as `cover_url`, replacing the previously seen ChatGPT share URL. The homepage link also now points to an immutable v0.1.2 repository tree. Tests were updated to assert **six** version-appropriate screenshot URLs and still reject older 0.1.1 fixtures. CI now runs the **local `--review-gate`**, not just structural preflight.

**Source-side disposition:** **PASS — six authentic screenshots uploaded; URLs and version stamp updated.** The originals previously supplied are authentic app captures, though Anna translation widgets and/or window chrome remain visible in some; the repo docs disclose this. Do **not** claim independently verified Anna remote Listing state: the **user's latest provided Console screenshot still displayed v0.1.1 image URLs and a ChatGPT cover link**. Updating the GitHub manifest is **not** an Anna Console Listing edit. The user must paste six new URLs and replace or clear Cover URL in the original **App ID 908 → Listing**, Save, refresh and verify image display. Live review remains **pinned to v0.1.1** according to last verified Console; v0.1.2 has **not** been cut, resubmitted or published.

**Image URLs for direct Console paste (one per line):**
```text
https://raw.githubusercontent.com/yap-gif/life-control-android/ccadc9676a997aab9c2f93ec2066ca309a576488/anna-edition/store-screenshots/v0.1.2/01-v012-overview.webp
https://raw.githubusercontent.com/yap-gif/life-control-android/ccadc9676a997aab9c2f93ec2066ca309a576488/anna-edition/store-screenshots/v0.1.2/02-v012-ai-insights.webp
https://raw.githubusercontent.com/yap-gif/life-control-android/ccadc9676a997aab9c2f93ec2066ca309a576488/anna-edition/store-screenshots/v0.1.2/03-v012-tasks.webp
https://raw.githubusercontent.com/yap-gif/life-control-android/ccadc9676a997aab9c2f93ec2066ca309a576488/anna-edition/store-screenshots/v0.1.2/04-v012-learning.webp
https://raw.githubusercontent.com/yap-gif/life-control-android/ccadc9676a997aab9c2f93ec2066ca309a576488/anna-edition/store-screenshots/v0.1.2/05-v012-ai-plan-storage.webp
https://raw.githubusercontent.com/yap-gif/life-control-android/ccadc9676a997aab9c2f93ec2066ca309a576488/anna-edition/store-screenshots/v0.1.2/06-v012-ai-restored.webp
```

## 3G. Listing screenshot URLs entered; Cover image and Save still need verification (2026-11-20)

The owner provided a fresh authenticated **Life Control → Listing** screenshot after asking to continue. The six updated screenshot URLs are **visibly pasted**, and the first URL starts with the genuine v0.1.2 image commit `ccadc9676a997aab9c2f93ec2066ca309a576488`, path `anna-edition/store-screenshots/v0.1.2/01-v012-overview.webp`. This is evidence of the correct new screenshot **input**, not proof that the Console saved and reloaded the setting: the **Save** button is still visible and no subsequent refreshed Listing response was provided.

**Remaining defect visible in the same screenshot:** Cover image URL is still the old `https://chatgpt.com/s/m_6af7e66d0d0881918bb14fe372f485ba` sharing page, not a publicly fetchable raw image URL. Replace with the *same first v0.1.2 Overview WebP direct HTTPS URL* used for Screenshots; click Save; reload Listing and verify the six URLs plus Cover persist and load. The source `anna-edition/app.json` already has `cover_url` configured to that Overview direct image. GitHub CI `44670234049` passed the v0.1.2 review gate; no new code action is required for this Console-only discrepancy.

**Review status nuance:** Previously the Console displayed `pending_review` pinned to **v0.1.1** despite the owner's rejection email. Current official Anna developer documentation (`Anna-Partners/anna-developer-docs/docs/apps/app-publish.md`, updated 2026-11-02) allows **explicitly switching review candidates during `PENDING_REVIEW`** by cutting a new version and then running `apps submit-review` again; cutting alone never changes the pinned candidate. This may resolve the workflow without waiting for the old pending state to change, but **do not perform cut or re-pin until remote Listing is saved/reloaded and the local manifest and Working Draft are verified to match the final v0.1.2 screenshot metadata**. Confirm App ID 908 and the updated current server status before any consequential action.

## 3H. Local final 79/79 gate passed; Anna private draft unchanged at r4 (2026-11-20)

The owner uploaded a 260-line PowerShell 5.1 transcript, filename `Pasted text(20261120-035542).txt`. It confirms fast-forward merge on branch `fix/life-control-review-r2-20261120`, **79 tests / 79 passed / 0 failed**, `anna-app validate --strict` **PASS**, and `npm run preflight -- --review-gate` **PASS** for `life-control-anna` candidate `0.1.2` with six screenshots. The user checked the remote target and obtained **`TARGET VERIFIED: Life Control / 908`**.

The authenticated `anna-app apps push` response was:
```
✓ apps/life-control-anna: working draft unchanged (rev 4)
status: pending_review
```
This is **PASS — no new draft revision necessary**. The follow-up `apps status life-control-anna` confirmed **App ID 908, status `pending_review`, latest cut `v0.1.1` ID `2476`, pinned review `v0.1.1`, two cut versions**. No v0.1.2 cut, candidate re-pin, approval, or publication occurred.

**Next gate remains Anna Console Listing media:** The preceding screenshot displayed the six `v0.1.2` screenshot URLs entered, but still showed a `chatgpt.com/s/...` Cover image URL and had no post-save refresh confirmation. Replace Cover URL with the first valid direct GitHub WebP URL already in the manifest, click Save and reload Listing, verify that **six** image URLs plus Cover actually persisted and load without login. CLI Working Draft `unchanged` does **not** imply Listing fields were saved. Once remote Listing verification succeeds, the next consequential owner-controlled actions are to cut `0.1.2`, confirm version identity, and explicitly resubmit/re-pin the review candidate, subject to fresh status and final safety checks. Official Anna documentation permits explicit re-pin even while `PENDING_REVIEW`, but none has been attempted yet.

## 3I. Immutable v0.1.2 successfully frozen — version ID 2720 (2026-11-20)

The owner supplied a complete Windows PowerShell 5.1 transcript. It confirms the `life-control-anna` manifest **v0.1.2** with **six screenshot links**, strict Anna CLI validation **PASS**, and `npm run preflight -- --review-gate` **PASS**. A pre-cut authenticated `apps status` returned the correct original **App ID 908**, `status: pending_review`, newest prior immutable `v0.1.1 (ID 2476)`, and review candidate pinned to `v0.1.1`. The draft synchronization before cut returned `working draft unchanged (rev 4)`.

The owner ran `anna-app apps cut 0.1.2` and Anna returned:
```
✓ apps/life-control-anna: cut immutable version 0.1.2 (version_id=2720)
status: pending_review
```

Two subsequent Anna server-side CLI reads confirmed:
```
apps status life-control-anna:
  app_id: 908
  status: pending_review
  latest: v0.1.2 (id=2720, published=—)
  in review: v0.1.1 (pinned at submit-review)
  versions: 3 total

apps versions life-control-anna:
           v0.1.2 (id=2720, published=—)
  [review] v0.1.1 (id=2476, published=—)
           v0.1.0 (id=2279, published=—)
```

**Disposition: PASS — immutable v0.1.2 frozen on original App ID 908; old versions intact; no publication.** Cut **did not switch the candidate**. The remaining deliberate action is `anna-app apps submit-review` to re-pin the pending review to **v0.1.2 ID 2720**. Per current official `Anna-Partners/anna-developer-docs/docs/apps/app-publish.md`, candidate switching is allowed while `PENDING_REVIEW` after a newer cut; it re-runs precheck and preserves the previous review candidate if it fails. This is an actual external review submission; owner must execute it explicitly. Post-submit verification must confirm **`in review: v0.1.2`** and **`[review] v0.1.2 (id=2720)`**. Do not use the generic `apps release` hint from the Cut output.

The owner earlier verbally confirmed the updated Anna Console Listing saved successfully, but the persistence was not independently read through an authenticated API. This is classified as owner-confirmed rather than independently server-verified.

## 3J. v0.1.2 successfully pinned for new Anna App Review — ID 2720 (2026-11-20)

The owner supplied a PowerShell 5.1 transcript for the **actual authenticated Anna CLI v0.1.64** submission. Before submitting, the script independently verified **App ID 908**, latest immutable version **v0.1.2 / ID 2720**, app **`pending_review`**, and previous review candidate **v0.1.1**. The owner then executed `anna-app apps submit-review` and received:

```text
✓ apps/life-control-anna: submitted for review
status: pending_review
under review: v0.1.2
```

The script subsequently fetched `apps status life-control-anna` and `apps versions life-control-anna` and **both post-submit assertions passed**, ending with **`V0.1.2 REVIEW CANDIDATE VERIFIED`**. Those assertions explicitly checked `in review: v0.1.2` and `[review] v0.1.2 (id=2720)`.

**Disposition: PASS — the review candidate was successfully re-pinned from v0.1.1 to frozen v0.1.2, ID 2720, under original Life Control App ID 908.** This is a real Anna server submission, **not** an approval, publication, or guarantee of reviewer acceptance. Earlier immutable v0.1.1 / ID 2476 and v0.1.0 / ID 2279 remain separate versions; no `apps release` or `publish` was performed. Do not change the review candidate, create new cuts, release, or resubmit absent a new reason and explicit approval.

**Follow-up:** monitor Anna Developer Console and developer email for the official v0.1.2 review decision. If a new rejection arrives, preserve its precise findings before commencing a targeted new candidate. If approved, check whether Anna automatically published it or requires a separate authorized release step; do not assume either outcome in advance.

## 4. Final acceptance status (as of owner-provided 2026-11-20 CLI response)

- **79/79 local source tests and strict Anna validation: PASS** based on the owner's Windows output and tracked GitHub CI; tests are not a proof of absolute freedom from bugs.
- **Anna-hosted Working Draft r4:** installation, separated UI, live AI generation, analysis and plan readback, and restored-analysis indicators supported by actual owner screenshots. Additional full-flow checks, including saved-plan recovery, non-AI forms, mobile and fresh install, were explicitly **attested PASS by owner** (not independently reproduced by this report).
- **Six v0.1.2 screenshots, Cover and Listing:** GitHub source/URLs and local review gate PASS; Anna Console Save reported successful by owner. A fresh independently retrieved server-side Listing is not included in this evidence.
- **Immutable version cut:** PASS — original App ID 908, **v0.1.2 / ID 2720**; old versions retained.
- **App Review re-pin:** PASS — **`pending_review`, in review `v0.1.2`, `[review] v0.1.2 (id=2720)` verified by explicit post-submit CLI assertions**.
- **Anna decision / approval / public release:** **NOT YET KNOWN; do not claim success or publish**.

Next event: the platform's official review decision. No additional change or submission is required while v0.1.2 remains pending review.
