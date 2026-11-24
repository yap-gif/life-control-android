# LC-P02 — Reporting engine and storage foundation
Date: 2026-11-24, Asia/Kuching.
Status: reporting engine implemented; migration and repository implemented as isolated foundation; production APS capability gate BLOCKED. Not an app release.

## Delivered modules
- `bundle/v2/calendar.js`: strict civil date arithmetic, leap dates, Monday weeks, calendar months, inclusive custom ranges, partial cutoff and comparable prior intervals. Custom ranges bounded to 3660 elapsed days; trend ranges up to 24 periods.
- `bundle/v2/reporting.js`: pure `buildReport(workspace,spec,today,selected)`, integer-sen financial totals, category distribution, monthly budgets, learning topics and configured targets, task due-cohort versus actual event counts, journal day counts, current goal snapshots, scheduled habit check-ins, explicit coverage and canonical metric IDs; `buildTrend` provides chronological chart-ready periods. No AI calls or storage mutations.
- `bundle/v2/workspace.js`: strict non-truncating legacy mapper, canonical JSON and byte counting, decimal MYR conversion, v2 envelope validator. Legacy task timestamps remain unknown; legacy report/plan plain text preserved read-only, with conservative expanded scope for former Money/Savings context; no automatic resend. Duplicate journal days and unknown legacy fields block migration for reconciliation rather than silently merge/drop.
- `bundle/v2/repository.js`: explicit missing-key classification, read-only inspection/candidate preparation, legacy etag divergence checks, conditional update, full readback, bounded timeout and mutation lock. Initialization requires injected atomic create-only capability; all mutations require explicitly verified capacity plus complete synchronous domain validation. P03 must implement exhaustive entity schemas and domain commands before live integration. The mocked validator is envelope-only for test purposes.
- `tests/v2-reporting.test.js`, `tests/v2-workspace.test.js`: synthetic exact totals, comparison/coverage, cross-timezone behavior, category isolation, >1000 small records in memory, migration, no-data, malformed data, capacity refusal, conflicts, false ACK, timeout and readback verification.

## Scope and date semantics
Reporting engine operates on a validated workspace contract, not arbitrary raw Anna data. Current goal snapshots are not historical goals. Weekly target reflects current settings, not a reconstructed prior goal. Monthly budget actuals may include earlier days in the same month outside a custom reporting range; metric range explicitly identifies this. P04 must exclude these extra-range budget facts from model payload unless the user separately authorizes their full evidence range. Period totals include only recorded activity. No ratio when income/baseline is zero; negative baseline comparison does not produce a misleading percent. Streaks are within selected period, not all-time streaks. Report charts/UI and AI integration remain open.

## Reference fixture (fictional)
November through 24th: MYR 1000 income, MYR 275 expense, MYR 725 net, 72.5% recorded net/income. Food expense MYR 225, Transport MYR 50, Food budget MYR 200 -> MYR 25 over. Weekly net values Nov 2,9,16,23 weeks: MYR 500,350,-125,0; last week partial and empty, not proof of inactivity.

## Storage platform gate — do not deploy yet
Source inspected: https://github.com/Anna-Partners/anna-developer-docs/blob/main/docs/tools/executa-storage.md (2026-11-24). It documents APS conditional overwrite via if_match and an advisory single KV value limit of 64 KB, hard cap environment-dependent. This is Executa storage documentation, not a verified limit for this App UI SDK/account. It describes missing etag on first write but does not establish create-only CAS semantics. Host API documentation: https://github.com/Anna-Partners/anna-developer-docs/blob/main/docs/apps/app-ui-host-api.md. No live APS call or migration was made during Phase 02.
The 1,000+ row pure/mocked tests are not service-capacity proof. The single-key candidate remains conditional. In a separately authorized isolated test app/scope (not App ID 908, not live user data):
1. Confirm app scope and real SDK version, explicit absence/error shape, conditional overwrite/readback and stale-write rejection.
2. Determine whether documented atomic create-if-absent exists; concurrent initializers must result in only one winner, no overwrite. Do not guess an if_match sentinel or treat get-then-set as atomic.
3. Measure UTF-8 serialized payload sizes and actual permitted write/readback with synthetic mixed records, including >1000 transactions; bound test data and quota, clean up only exact probe keys and verify deletion.
4. If capacity insufficient, design immutable bounded shards plus an etag-protected index/pointer commit, orphan cleanup and recovery. Do not assume atomic multi-key transactions or use unverified initialization.
5. Verify legacy etag behavior across windows, interrupted initialization and timeout. A legacy write can race with v2 because independent keys are not atomic together; require exclusive migration and reconciliation. Until verified, do not connect repository to production boot, migrate user data or claim unlimited records.

## Gates and deployment
- P02-A source implementation complete; test evidence from GitHub Actions, with final run reported separately.
- P02-B source/mocked foundation implemented; actual APS capacity, create-only and full domain validation unresolved. Live writes BLOCKED.
- P03 can implement pure domain commands/validation and mock UI on this branch, but no real data mutation integration before P02-B platform gate.
- Existing app.js/index.html, manifest, package and old listing still v0.1.2. New modules are not imported into active UI. Prior v0.1.2 preflight only checks old manifest/media; not v0.2.0 approval. No Anna push, cut, review or release; do not run them from this branch yet. No existing Android code changes.
