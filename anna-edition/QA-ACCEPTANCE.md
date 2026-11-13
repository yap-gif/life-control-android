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
| Core logic, storage/LLM mock runtime, Markdown and prompt contract | 18 automated tests | CI-confirmed |
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
| Updated anti-inference instructions with live model | Live post-patch response with Tasks and Learning **empty** made no domain-specific inventions; still needs a deliberately ambiguous non-empty task | Partially RPC-confirmed; targeted test pending |
| Platform marketplace review and public release | Not submitted | Pending |

## Latest post-patch Anna Harness observation

Developer's screenshot and RPC log show an authenticated `llm.complete` request using the new evidence-only system contract, successful AI response and fully formatted Markdown headings, bold emphasis, lists, and inline code. The outbound business payload was `{period, tasks: [], learning: []}`; Money and Journal were not sent. The model described only the absence of recorded entries.

**Important limitation:** This is not the ambiguous-task regression test. Empty arrays do not demonstrate that the model avoids guessing whether `APS-PERSIST-001` is a coding or infrastructure task. An empty `storage.get` response was also present, consistent with a cleared workspace; it does not demonstrate a failure of earlier APS persistence.

## Next local check

1. Preserve any local edits before updating. From the repository root run `git status --short`, then `git pull --ff-only origin feature/life-control-anna-edition-20261113`.
2. From `anna-edition/`, run `npm.cmd test` and `npm.cmd run validate`.
3. Start `npm.cmd run dev -- --storage aps`. Keep the test data synthetic; real calls may consume credits.
4. Markdown formatting and category isolation have now been observed post-patch with empty Tasks+Learning; no need to repeat this exact empty-data check. Verify non-empty data and the ambiguous-title case instead.
5. Test an intentionally ambiguous task label such as `APS-PERSIST-001`. The model must not assert that it entails coding, a particular project, or specific substeps without explicit supporting context.
6. Before releasing, review public listing content, privacy statements, accessibility, and error handling. Do not expose Harness URLs containing `t=` tokens or private RPC storage payloads.

## Release decision

**Not yet approved for release.** PR #2 remains Draft; `main` is untouched. The new Markdown display is confirmed in a real browser and the empty-data model response was conservative. The ambiguous-title anti-inference check with non-empty task data remains pending. Marketplace review and builder grant eligibility are separate platform decisions.
