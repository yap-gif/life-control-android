# LC-P01 — Life Control v0.2.0 Product Architecture
Date: 2026-11-24 (Asia/Kuching)
Status: DESIGN BASELINE / proposed implementation contract; no runtime changes or release authorization.
Owner request: begin Phase 01 directly after third review feedback. Product name Life Control; Anna App ID 908, slug life-control-anna; frozen v0.1.2 version ID 2720 remains unchanged.
Base commit: cfa7a3b75c6e875bc8e2b1df2e88a1f9169b8822.
Reviewer email supplied 2026-11-24: improve reporting and AI analysis; expand current features; e.g. weekly/monthly income/expense totals; detailed personalized analysis of user requests; improve prompts; expand according to product vision. This is feedback, not a guarantee of approval or a specific mandated feature count.

## 1. Product outcome and scope
An Anna-hosted personal management workspace that helps users turn actual recorded activity into measurable plans and assess their subsequent progress. Target initial users: individuals managing tasks, money, study, and personal goals. No claim of medical, investment, or professional advice. Primary journey: record → see deterministic reports → ask a specific question → authorize evidence → review evidence-grounded suggestions → accept selected actions → track completion → compare later evidence. A user must be able to benefit without paying for or invoking AI. Model calls may use Anna credits; no new paid infrastructure or monetization claims in this release.

### Priorities and explicit exclusions
| ID | Feature | v0.2.0 mandatory scope |
|---|---|---|
| F01 | Overview | Today/current week/current month; tasks due, logged income/expense/net, study minutes, active goals; shortcuts to deeper reports; empty states |
| F02 | Reports | Week/month/custom inclusive range; comparable prior period; income/expense/net, category breakdown, learning minutes/sessions/topics, task due-status and real completion events; coverage and partial-period labels; accessible charts/tables; CSV export only if supported and tested |
| F03 | Money | Add/edit/delete transaction; income/expense category filters; monthly category budget, actual and remaining, no bank integration; currency MYR |
| F04 | Tasks | Add/edit/complete/reopen/delete; priority and optional due date for new records; actual completion timestamps; filters; linked AI action; no system push notifications |
| F05 | Learning | Add/edit/delete session; weekly target, topic totals and progress; optional manual timer only after host lifecycle tested; no fabricated focus/efficiency score |
| F06 | Journal | Date-based reflection, edit/delete, optional explicit user-entered tags; no mood diagnosis or automated profiling |
| F07 | Goals & Habits | Multiple savings/general goals, milestones, explicit progress/check-ins; daily habits and completion dates; streaks based on scheduled days, no inferred activity; preserve existing savings forecast |
| F08 | AI Coach | Custom question, focus presets, date range, category controls, exact payload preview, bounded consent, structured evidence/insight/action output, history, accept actions into Tasks, follow-up based on later actual evidence |
| F09 | Privacy & Data | Explicit migration/recovery, category consent, selective AI history deletion, plan forget, confirmed whole-workspace erase, capacity and save-state warnings |

Deferred: recurring tasks and timers beyond basic tested support, calendar/bank integrations, Android sync, collaboration, automated agents, external notifications, cloud backup export integrations, investment recommendations, paid tier and external providers. No additional Executas, credentials, cross-app scopes, or external origins required. No claim that the app accesses other Anna conversations.

## 2. Screen architecture
Nine top-level views (one visible at a time). Desktop persistent nav; narrow viewport scrollable or accessible compact nav; no return to one long surface.
| Route | Responsibility | Main action |
|---|---|---|
| #overview | Snapshot and today priorities | Open relevant detail |
| #reports | Report filters and period comparison | Select range |
| #insights | Coach request, result, history, action review | Authorize one analysis |
| #tasks | Priorities, due dates, completion events | Add/complete task |
| #money | Transactions, budgets and summaries | Record transaction |
| #learning | Sessions, topics and target progress | Log session |
| #journal | Reflections and optional tags | Save reflection |
| #goals | Savings forecast, milestones, habits | Update progress/check-in |
| #privacy | Consent explanation, storage status and delete controls | Manage data |
Old #savings maps to #goals with savings subsection focused. Unknown hash falls back to overview. Every form has clear labels, keyboard focus, validation, pending/error/confirmed states. No silent navigation on unsaved edits. A 360px width must preserve reachable actions with no horizontal page overflow. Charts have numerical tables/text alternatives. Use native UI and safe text nodes; no remote chart libraries or HTML from model output.

## 3. Application layering
Existing static SPA and Anna SDK remain. Proposed modules are implementation targets, not existing files.
```
UI routes + components
  -> domain commands / selectors
  -> state repository (validation, migration, version/etag, confirmed writes)
       -> Anna own-app storage
  -> report engine (pure, deterministic)
       -> scoped evidence builder -> consent gate -> Anna llm.complete
       -> result validator -> report history -> user-approved action importer
```
Separate UI state (loading, route, draft inputs) from persisted domain records. Reports are derived from immutable snapshots, not cached independently as authoritative totals. AI never has direct storage mutation authority. Commands return success only after acknowledgement + readback; failures must not masquerade as saved. Keep common calculations shared between reports and AI evidence.

## 4. Existing baseline audit
- logic.js normalizes each record array via slice(0,100); app.js limitEntries also slices to 100. Historical records previously discarded cannot be reconstructed by v0.2.0. UI renderList shows 12 items only; new lists must be paginated/searchable independently of persisted data.
- calculateSummary exposes current-week net but not complete weekly/monthly income/expense and category reports.
- patterns.js builds 4 completed weeks + current week; legacy tasks record current done flag and due date only, so historical completion is unknown.
- review-contract.js uses fixed headings, maximum two actions, maxTokens 1000, no custom question. v0.2.0 replaces this with a validated evidence-based contract.
- app.js persists lastReview and savedPlan and uses write queue/readback; preserve this behavior. Existing timeout/404 handling needs stricter missing-key and concurrency validation, not assumed safe because CI passed.

## 5. Phase sequencing
P01 architecture (this baseline). P02 report engine + storage compatibility foundation; P03 advanced management UI/data commands; P04 AI evidence/consent/output/action contracts; P05 UI integration and mobile accessibility; P06 adversarial regression and migration QA; P07 clean Cloud Agent acceptance and release materials. Only after P07 and explicit owner action: private Working Draft → freeze actual version → submit review. Release of v0.2.0 is not authorized by this document. Do not change app.json version or screenshots during P01; later candidate must have new screenshots and privacy copy, and CI must keep source tests separate from intentionally blocked release checks.

## 6. Companion contracts
- [Data, migration & storage](02-DATA-STORAGE.md)
- [Reporting & AI](03-REPORTING-AI.md)
- [Acceptance and implementation backlog](04-ACCEPTANCE.md)
