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
| Updated safe Markdown rendering in real browser | New DOM parser tested, but not yet user-tested | Pending |
| Updated anti-inference instructions with live model | New prompt contract tested, but live output not yet checked | Pending |
| Platform marketplace review and public release | Not submitted | Pending |

## Next local check

1. Preserve any local edits before updating. From the repository root run `git status --short`, then `git pull --ff-only origin feature/life-control-anna-edition-20261113`.
2. From `anna-edition/`, run `npm.cmd test` and `npm.cmd run validate`.
3. Start `npm.cmd run dev -- --storage aps`. Keep the test data synthetic; real calls may consume credits.
4. Run an authorized Tasks+Learning review. Confirm that headings, bold text and numbered lists format correctly and the RPC payload excludes Money/Journal.
5. Test an intentionally ambiguous task label such as `APS-PERSIST-001`. The model must not assert that it entails coding, a particular project, or specific substeps without explicit supporting context.
6. Before releasing, review public listing content, privacy statements, accessibility, and error handling. Do not expose Harness URLs containing `t=` tokens or private RPC storage payloads.

## Release decision

**Not yet approved for release.** PR #2 remains Draft; `main` is untouched. Technical viability is supported by CI and real APS/LLM logs, but the newly changed display/prompt behavior needs the final post-patch visual check. Marketplace review and builder grant eligibility are separate platform decisions.
