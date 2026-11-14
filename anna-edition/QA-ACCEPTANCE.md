# Life Control — QA Acceptance Record

**Date:** 2026-11-14  
**Branch:** `feature/life-control-anna-edition-20261113`  
**PR:** [#2](https://github.com/yap-gif/life-control-android/pull/2) (Draft)

This is an evidence-grounded release gate, not a declaration of App Store approval.

## Evidence levels

- **CI-confirmed:** Executed by GitHub Actions with recorded run results.
- **RPC-confirmed:** Reviewed user-provided Anna Harness RPC logs/screenshots.
- **User-reported:** The developer explicitly marked manual steps passed; no independent device run was performed.
- **Pending:** Changes still needing browser or production verification.

| Check | Evidence | Status |
| --- | --- | --- |
| Anna schema 4 and `validate --strict` | GitHub Actions | CI-confirmed |
| Core logic, storage/LLM mock runtime, Markdown, prompt, keyboard/source accessibility and error handling | 38 automated tests (current branch) | CI-confirmed |
| Local dev dashboard | `anna-app dev --no-llm` on CI | CI-confirmed |
| Read-only release Listing preflight | `npm run preflight`: metadata/privacy structure PASS and commit-pinned public homepage/privacy URLs, no provisional-link warning | CI-confirmed for local files; remote Anna Listing pending |
| Desktop app connection and initial task/finance/study/journal/goal data | Anna Harness screenshot and RPC `storage.set` | RPC-confirmed |
| Persistent records after process restart with real APS mode | `storage.get` result contained `APS-PERSIST-001` | RPC-confirmed |
| Authorized live AI request | `llm.complete` returned normal response | RPC-confirmed |
| Privacy categories | Outbound request contained Tasks + Learning, not Money or Journal | RPC-confirmed |
| Task complete/reopen/delete | Developer marked passed | User-reported |
| Journal overwrite for same date | Developer marked passed | User-reported |
| Erase data then restart | Developer marked passed | User-reported; platform logs/backups outside app control |
| Mobile form and layout | Developer marked passed | User-reported |
| Updated safe Markdown rendering in real browser | Developer-provided post-patch Harness screenshot shows rendered headings, emphasis, bullets and inline code | RPC-confirmed |
| Updated anti-inference instructions with live model | 13:41:32–13:41:35 RPC log: user payload contained the one incomplete task `APS-PERSIST-001` due 2026-11-13; model explicitly stated its domain and requirements were unknown, and gave conditional suggestions | RPC-confirmed (targeted case passed) |
| Updated per-record keyboard focus / aria-labels / delete confirmation | 23:56:35 Complete, 23:56:38 Reopen, 23:56:55 Delete saved successfully; developer reports keyboard focus and Escape/Cancel behaved correctly | RPC-confirmed for mutations; user-reported keyboard interaction passed; screen-reader pending |
| AI quota and storage failure messages | Error classifier unit tests pass; not yet validated against live quota/connection failures | CI-confirmed (unit only); manual pending |
| AI unavailable with `--no-llm --storage legacy` | 23:54:20–23:54:21 Anna Harness: `llm.complete` returned `llm_disabled`; revised UI displayed precise `--no-llm` explanation, did not expose raw RPC error and remained usable | RPC-confirmed (specific error UX passed) |
| Anna server Working Draft upload and developer install | CLI: 7-file 42.0 KB bundle ready; `apps/life-control-anna` revision 1; console showed “Installed working draft (0.0.0-draft) — now available in chat.” | CLI-confirmed and developer screenshot-confirmed |
| Anna Chat installed Working Draft full-feature smoke test | Developer directly reports testing all features of the installed `0.0.0-draft` app successfully on 2026-11-14; individual production API logs/screenshots not provided | User-reported PASS; independent RPC/API confirmation pending |
| Anna server application identity | `life-control-anna`: app ID 908, status draft, 0 cut versions; separate `anna-edition` ID 906 unchanged | CLI-confirmed |
| Marketplace logo / redacted screenshot / listing draft | Draft review materials prepared; no binary assets uploaded to public repo or Anna | Draft only |
| Platform marketplace review and public release | Not submitted | Pending |

## Latest post-patch Anna Harness observation

Developer's screenshot and RPC log show an authenticated `llm.complete` request using the new evidence-only system contract, successful AI response and fully formatted Markdown headings, bold emphasis, lists, and inline code. The outbound business payload was `{period, tasks: [], learning: []}`; Money and Journal were not sent. The model described only the absence of recorded entries.

**Important limitation:** This is not the ambiguous-task regression test. Empty arrays do not demonstrate that the model avoids guessing whether `APS-PERSIST-001` is a coding or infrastructure task. An empty `storage.get` response was also present, consistent with a cleared workspace; it does not demonstrate a failure of earlier APS persistence.

## Targeted non-empty ambiguous-task regression (2026-11-13)

**Evidence: developer-provided Anna App Harness screenshot and full RPC log.**

- **13:41:18** `storage.set` returned success (generation 1) for one task, `APS-PERSIST-001`, incomplete, due `2026-11-13`.
- **13:41:32** the `llm.complete` user request contained only `{period, tasks:[{title:"APS-PERSIST-001",due:"2026-11-13",completed:false}]}`; no Money, Journal or Learning data.
- **13:41:35** the model returned task count 1, completion rate 0%, correct due date, and **explicitly said it could not determine the task's domain, complexity or specific requirements**. Recommendations were conditional, e.g. *if blocked by external factors* / *if too broad*.
- Browser screenshot shows formatted section headings, bold text, ordered items and inline code for the new renderer.

**Disposition:** The precise ambiguous-title regression **passes in this observed real-model run**. Results are not a guarantee against future unsupported model inferences. The response included a reasonable conditional assumption about possible blockers but did not state a speculative blocker as fact. The presence of a real model output does not replace abuse-case testing, accessibility review or platform App Review.

## Real no-LLM failure-path observation (2026-11-14)

Developer supplied Anna Harness screenshot and RPC log from local `anna-app dev --no-llm --storage legacy`. An illustrative test task `AI-ERROR-TEST-001` was saved, a consented Tasks-only `llm.complete` request was sent, and the host returned `res err llm_disabled harness started with --no-llm`. The app stayed usable and showed a non-sensitive failure notice; it did not expose the host diagnostic or any credentials in the user-facing review panel.

**Finding:** The previous error classifier treated `llm_disabled` as unknown and displayed a generic connectivity message. This has been corrected to show a specific message that the current development session has AI disabled. The patch passed 31/31 unit tests and `validate --strict` in CI, and the subsequent browser retest confirmed the specific wording in a real Anna Harness session. The log does not prove real AI quota exhaustion behavior or storage failure behavior.

## Updated no-LLM browser retest (2026-11-14)

**Evidence: user-provided Anna Harness screenshot and RPC log.** A synthetic task titled `task` dated 2026-11-14 was saved through `storage.set`, then the explicitly authorized Tasks-only weekly review sent a request to `llm.complete`. The host returned `res err llm_disabled harness started with --no-llm` at 23:54:21. The interface showed: *“AI is disabled in this Anna development session (--no-llm). No review was generated. Restart without --no-llm to use the configured AI service.”* The app remained responsive, the authorization checkbox was reset, and the user-facing message did not expose the raw host error.

**Disposition:** This specific error-handling regression is **PASS**. Does not establish behavior under real AI quota exhaustion, network loss or production APS failure.

## Final Task action and keyboard check (2026-11-14)

**Evidence classification:** The developer supplied a full Anna Harness RPC log and explicitly stated that all requested interactions ran correctly.

- **23:56:35.306–.314:** `storage.set` changed the only task's `done` flag from `false` to `true`; host returned `ok:true`.
- **23:56:38.053–.064:** `storage.set` changed it from `true` back to `false`; host returned `ok:true`.
- **23:56:55.156–.164:** `storage.set` wrote `tasks:[]`, indicating the record was deleted; host returned `ok:true`.
- The developer reports that keyboard focus recovery and the erase confirmation's Cancel/Escape path also worked. Those UI-only focus events are **not visible in RPC**, so the assertion is a user manual acceptance, not an independently logged accessibility audit.

**Disposition:** Task mutation and user-reported keyboard smoke tests **PASS for the local scope**. Separate screen-reader validation remains a release quality recommendation, not a claim of having passed.

## First private Working Draft deployment and install (2026-11-14)

Developer-provided PowerShell CLI output and Developer Console Versions screenshot establish:

- `anna-app validate --strict` passed.
- `anna-app apps push` staged **7 files / 42.0 KB**, with **working bundle ready**, creating private Working Draft **revision 1** under slug `life-control-anna`.
- `anna-app apps status life-control-anna` returned **app_id 908**, **draft**, **0 total cut versions**.
- The console's Versions tab displayed `Working draft`, `r1`, `Bundle ready`, and the toast **“Installed working draft (0.0.0-draft) — now available in chat.”**
- `anna-app apps list` also showed the distinct developer entry `anna-edition` (ID 906), which was not renamed or deleted. On Windows the list process printed a `UV_HANDLE_CLOSING` assertion on exit; this should be tracked as CLI-runtime instability, not evidence of a failed app upload.

**Disposition:** Private Working Draft creation and developer-side installation **PASS based on platform receipts**. On 2026-11-14 the developer further reported that all features of the installed app worked correctly in Anna Chat. This is **user-reported production-draft smoke acceptance**, without per-operation production RPC logs. No immutable version, review submission or public release has occurred.

## Installed Anna Chat Working Draft manual acceptance (2026-11-14)

**Source:** The developer explicitly reported, “我已经测试所有功能，都可以使用” (“I have tested all functions; everything works”). Context: the previously installed private `life-control-anna` `0.0.0-draft`, app ID 908, working revision 1.

**Disposition:** Installed Working Draft **manual smoke test PASSED by developer report** across the app's functions. This statement does not independently document each storage/LLM request, performance, quotas, screen-reader compatibility or publishing readiness. Keep previously documented CI and local Harness evidence in their own categories; no new production RPC evidence was supplied.

## Local listing release preflight (2026-11-14)

A new `release-preflight.mjs` performs read-only structural checks against the local `app.json`, `manifest.json` and `PRIVACY.md`. Initially it found two feature-branch URL warnings; these were resolved by pinning both URLs to an accessible public GitHub commit. The latest CI passed **38/38** tests plus `validate --strict` and local listing preflight without warnings. The check does **not** prove the Anna server Listing tab has updated metadata or uploaded logo/screenshot assets. Refer to [RELEASE-CANDIDATE-0.1.0.md](./RELEASE-CANDIDATE-0.1.0.md).

## Windows local preflight retest (2026-11-14)

The developer provided PowerShell 5.1 output showing a clean fast-forward to `d01bf66`; **38/38 tests passed**, `npm.cmd run validate` returned **validate passed**, and `npm.cmd run preflight -- --release-gate` returned **Structural metadata and privacy-file checks: PASS** with no warnings. These results are based on developer-supplied local logs, corroborating independent GitHub CI for the same branch.

The Anna CLI's `apps status life-control-anna` reported **app ID 908**, **draft**, **0 cut versions**, and remote listing **name: Life Control**. The developer confirmed **Life Control** is the final public name. Local `app.json`, manifest, browser title and user-facing copy are aligned to this name; the existing slug `life-control-anna` and app ID 908 remain unchanged. The remote Listing's other fields (logo, screenshot URLs, privacy link, category, descriptions) cannot be confirmed from `apps status` alone.

## Final public naming decision (2026-11-14)

The developer explicitly chose the public app name **Life Control**, without the former `Anna Edition` suffix. Anna CLI already reported remote app name **Life Control** for app ID **908**. The feature branch now aligns `app.json`, manifest window title, UI document title, visible brand label, user-facing erase messages and store listing copy to **Life Control**. The internal Anna app slug `life-control-anna`, storage key and app identity are deliberately unchanged.

GitHub CI at commit `08a90b8ea930bc14c76e0b5ead14298c50ae9f35` passed **38/38** tests and Anna strict validation. The branding changes have now been pushed to Anna private Working Draft **r2** (7 files, bundle ready; app ID 908). The developer still needs to open/reinstall r2 in Anna Chat and confirm the new UI branding. No cut version or release occurred.

## Private Working Draft branding upload — revision 2 (2026-11-14)

Developer-provided PowerShell 5.1 log confirms all **38/38** tests passed, `anna-app validate --strict` passed, and `npm run preflight -- --release-gate` passed. The subsequent `apps push --dry-run` resolved the **existing app ID 908** and slug `life-control-anna`; the Windows CLI printed `UV_HANDLE_CLOSING` on exit after completing that preview.

The actual `anna-app apps push` then staged a **7-file / 42.0 KB** working bundle, skipped **4/7 unchanged** files and returned **working draft updated (rev 2), status draft, bundle ready**. A fresh `apps status` reported remote **name Life Control**, app ID **908**, **draft**, no cut versions. This confirms an update to the existing private application, not a new app or public release.

**Verification boundary:** revision 2 has been uploaded but the supplied logs do not show re-installation/opening of the updated branding in Anna Chat. The developer's earlier end-to-end functional smoke report applies to `r1`, not independently to `r2`.

## Windows post-brand-sync verification (2026-11-14)

Developer provided a Windows PowerShell 5.1 log showing a **fast-forward from `47e0792` to `f72944d`** on `feature/life-control-anna-edition-20261113`. The local `npm.cmd test` passed **38/38** tests, including the public product-name check; `npm.cmd run preflight -- --release-gate` passed with the new **“Life Control — local listing preflight”** header and no reported warnings.

**Evidence scope:** These are developer-supplied local output logs; they prove the local source revision and tests, not that the already-uploaded private Anna Working Draft **r2** has been reinstalled and visually checked in Anna Chat. Remote Listing media/logo and screenshot acceptance remain separate gates.

## Next local check

1. Preserve any local edits before updating. From the repository root run `git status --short`, then `git pull --ff-only origin feature/life-control-anna-edition-20261113`.
2. From `anna-edition/`, run `npm.cmd test` and `npm.cmd run validate`.
3. Start `npm.cmd run dev -- --storage aps`. Keep the test data synthetic; real calls may consume credits.
4. Markdown and the targeted ambiguous-title model regression have passed in the user-supplied Anna Harness. Avoid repeated paid model calls merely to re-confirm these exact cases.
5. Review failure handling, accessible keyboard/screen-reader experience, listing metadata and privacy statements before any public submission.
6. Keyboard-only task Complete/Reopen/Delete and erase confirmation focus/Escape have been reported passed by the developer. A dedicated screen-reader audit (e.g., NVDA) remains unperformed.
7. The revised `--no-llm --storage legacy` error wording was confirmed in real Harness. Do not combine `--no-llm` with `--storage aps`. Other live failure cases (quota exhaustion, storage permission/network failure) remain untested and should only be attempted with disposable data.
8. Review the provisional logo, screenshots and listing copy. Replace branch-based privacy URLs with stable ones before publishing. Do not expose Harness URLs containing `t=` tokens or private RPC storage payloads.

## Release decision

**Functional regression accepted for this test scope; public release not yet approved.** PR #2 remains Draft; `main` is untouched. Markdown rendering, real APS persistence, consent-limited LLM input and the targeted non-empty ambiguous-title case have supporting logs. Installed Working Draft functional smoke acceptance is now developer-reported PASS. Remaining release work includes a direct r2 installed-app branding check, an assistive-technology screen-reader audit, untested live quota/storage failure paths, actual (non-generated) app screenshots, remote Listing logo/media checks and an explicit decision before freezing an immutable version. Marketplace review and builder grant eligibility are separate platform decisions.
