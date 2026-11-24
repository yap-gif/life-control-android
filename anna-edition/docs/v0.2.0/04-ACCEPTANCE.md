# LC-P01-QA — Implementation backlog and acceptance gates
Date: 2026-11-24. All P02–P07 engineering and runtime acceptance items OPEN. Phase 01 is document baseline only.

## 1. Reviewer traceability
| Reviewer feedback | Requirements | Closing evidence |
|---|---|---|
| Weekly/monthly income and expense reporting | F01/F02/F03; deterministic reporting contract | Known fixture totals, live weekly/monthly view, category breakdown and budget; no LLM needed |
| More detailed AI analysis tailored to user requests | F08; question, date range, mode, evidence preview, structured findings/actions | Two materially different questions on same synthetic data produce relevant evidence-supported answers, valid structured actions; scope and credit consent tests |
| Broaden product in line with vision | F04–F09; goal/habit progress and execution loop | End-to-end accepted action -> recorded progress -> user-authorized follow-up with no invented completion |
| Prior review regressions must not recur | independent routes, persisted report and plan, reopen usable generation | real Cloud Agent fresh install, existing-workspace upgrade, closure/reopen, re-consent and generation; previous 79-test baseline retained |

## 2. Implementation gates
| Gate | Work package | Exit criteria |
|---|---|---|
| P01 | Product architecture | Four versioned design files, source audit anchored to base, isolated branch, no runtime changes |
| P02-A | Pure reporting engine | exact arithmetic, dates, comparison, coverage, empty/invalid inputs, shared selectors and known synthetic fixtures |
| P02-B | Storage/migration foundation | verify SDK/APS etag, create-only semantics, capacity in isolated test scope; implement lossless migration and readback, conflict/recovery, explicit capacity policy; no eviction |
| P03 | Advanced management | validated domain commands, paginated lists, budgets, priorities, completion events, learning target, goals/habits and journal; preserve legacy functions |
| P04 | AI Coach | immutable consent-bound request, strict scope, structured validator, saved history, explicit action import and later evidence follow-up |
| P05 | UI/UX | nine independent pages, consistent styling, responsive nav, report tables/charts and all form states; 360/768/1040 widths, keyboard accessibility |
| P06 | Engineering QA | all existing non-obsolete behavior tests plus new tests, CI strict validation, migration and runtime mocks, failure injection and no external writes; source/release gate separated |
| P07 | Platform release readiness | actual fresh Cloud Agent and upgraded synthetic workspace, all functions, migration, reports, real model analysis, save/reopen, privacy deletion, new public screenshots + cover and revised privacy/Listing, local review gate, exact app/branch/version verification |

Dependencies: P02-A can be implemented on synthetic pure-data fixtures without access to Anna. P02-B can be designed and mocked locally, but actual storage capability verification is a hard gate before migrating real data. P03 mutations require validated storage adapter. P04 depends on shared report engine and storage. P05 integrates P02–P04. P06/P07 must exercise frozen source corresponding to actual deployed candidate. No gate is deemed passed by this document.

## 3. Acceptance cases (minimum)
| ID | Scenario | Expected result |
|---|---|---|
| R01 | Weekly/monthly known fixture and category budget | exact integer sen totals and consistent UI/AI metrics |
| R02 | Partial periods, empty logs, zero income, leap date/timezone | explicit coverage, valid dates, undefined ratios not misleading |
| R03 | 1,000+ records and mixed data capacity | no silent truncation; measured limits; reject safely before write if over budget |
| D01 | v1 migration with all data types and retained review/plan | counts, dates, totals and legacy text preserved; no guessed completion dates |
| D02 | Repeat launch after migration | no duplicate imports; v2 state restored; old key intact |
| D03 | Malformed/unknown key/read failure | do not wipe or default empty; recovery visible |
| D04 | Stale etag / concurrent write / legacy divergence | no blind overwrite; explicit conflict |
| D05 | False ACK / timeout / readback mismatch | no false save; reconcile uncertain state |
| U01 | All nine routes and legacy savings route | independent views, active state, back navigation, no overflow |
| U02 | Every form create/edit/delete + reopening | expected confirmed storage and report recalculation |
| U03 | Goal/habit check-in and task completion/reopen | explicit date/event, no duplicate action, correct totals |
| A01 | Personalized question, selected range and categories | relevant output anchored to exact metrics |
| A02 | Hidden category canaries and plan/history inclusion | no excluded raw or derived evidence; no auto-inclusion |
| A03 | Edit question/range while consent present | consent invalidated, no stale or duplicate request |
| A04 | Invalid response / hallucinated IDs / injection / HTML | safe rendering, no import of invalid actions |
| A05 | Approve one action, retry, reopen | at most one linked task, persisted report and plan |
| A06 | Follow-up after execution | evidence of actual later event only; no same-day legacy inference |
| A07 | Quota/error/timeout | bounded feedback; no automatic paid retry; generation recoverable |
| P01 | Remove analysis or plan | respective data removed and verified; no hidden resend |
| P02 | Full erase, partial erase, legacy re-import risk | all owned keys verified absent or incomplete erase reported; no resurrection |
| C01 | Fresh and upgraded Cloud Agent | normal start; no model call at boot; all core flows, genuine storage/readback |
| C02 | Listing/review readiness | actual v0.2.0 media and privacy, matching metadata, exact approved release action |

Evidence for each case: candidate commit SHA, test ID, environment (pure test/mock/real Anna), input fixture, expected/actual, status PASS/FAIL/BLOCKED, relevant log or screenshot with private fields redacted. User attestation distinct from independent RPC evidence. No absolute bug-free guarantee. No live user secrets, paid test loops, or actual production migration during development.

## 4. Phase 01 completion and next action
Phase 01 artifacts form a proposed baseline at source branch feature/life-control-v020-architecture-20261124. Keep app.json/package.json at 0.1.2 until an implementation candidate exists; do not claim feature release. Old frozen version 2720 is untouched. Third reviewer email is evidence of further requested improvements, not an independently fetched current console state. No remote Anna push/cut/submit/release. Next work is P02-A deterministic Reporting Engine implementation, with P02-B storage capability work tracked separately. No need for owner to repeat earlier v0.1.2 tests at this design-only stage.
