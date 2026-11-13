# Life Control Anna Edition — QA Acceptance Record

**Date:** 2026-11-13  
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
| Core logic, storage/LLM mock runtime, Markdown, prompt, keyboard/source accessibility and error handling | 31 automated tests (current branch) | CI-confirmed |
| Local dev dashboard | `anna-app dev --no-llm` on CI | CI-confirmed |
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
| Updated per-record keyboard focus / aria-labels / delete confirmation | Static source tests pass; needs interactive keyboard + assistive-tech testing in latest Anna Harness | CI-confirmed (source only); manual pending |
| AI quota and storage failure messages | Error classifier unit tests pass; not yet validated against live quota/connection failures | CI-confirmed (unit only); manual pending |
| AI unavailable with `--no-llm --storage legacy` | User-provided Harness screenshot and RPC log: `llm.complete` returned `llm_disabled`, app remained functional and displayed a safe generic error | RPC-confirmed (safe failure); specific explanation retest pending after fix |
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

**Finding:** The previous error classifier treated `llm_disabled` as unknown and displayed a generic connectivity message. This has been corrected to show a specific message that the current development session has AI disabled. The patch passed 31/31 unit tests and `validate --strict` in CI, but the new wording needs one browser retest before recording the UX as fully passed. The log does not prove real AI quota exhaustion behavior or storage failure behavior.

## Next local check

1. Preserve any local edits before updating. From the repository root run `git status --short`, then `git pull --ff-only origin feature/life-control-anna-edition-20261113`.
2. From `anna-edition/`, run `npm.cmd test` and `npm.cmd run validate`.
3. Start `npm.cmd run dev -- --storage aps`. Keep the test data synthetic; real calls may consume credits.
4. Markdown and the targeted ambiguous-title model regression have passed in the user-supplied Anna Harness. Avoid repeated paid model calls merely to re-confirm these exact cases.
5. Review failure handling, accessible keyboard/screen-reader experience, listing metadata and privacy statements before any public submission.
6. Use keyboard-only Tab/Shift+Tab, Enter and Escape to check record-specific actions and the erase confirmation. Confirm keyboard focus returns predictably after mutations.
7. In a sandbox or with non-sensitive test data, verify the revised explicit wording in an unavailable AI runtime (`--no-llm --storage legacy`); do not combine `--no-llm` with `--storage aps`; test storage failure only in a disposable environment.
8. Review the provisional logo, screenshots and listing copy. Replace branch-based privacy URLs with stable ones before publishing. Do not expose Harness URLs containing `t=` tokens or private RPC storage payloads.

## Release decision

**Functional regression accepted for this test scope; public release not yet approved.** PR #2 remains Draft; `main` is untouched. Markdown rendering, real APS persistence, consent-limited LLM input and the targeted non-empty ambiguous-title case have supporting logs. Remaining release work includes real keyboard/screen-reader interaction checks, live failure-path validation, developer approval of image assets, and Anna working-draft verification. Marketplace review and builder grant eligibility are separate platform decisions.
