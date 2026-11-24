# LC-P01-DATA — Data, storage and migration contract
Date: 2026-11-24. Design only; implement and validate in P02/P03/P06.

## 1. Canonical data model
All dates YYYY-MM-DD represent user-entered local calendar days, validated using calendar arithmetic independent of UTC offsets. Event timestamps UTC ISO 8601; retain recorded local date and timezone when applicable. No time derived from a task due date. New entity IDs immutable, collision-resistant; user-facing titles mutable. Validate strings/lengths/numerical ranges, enum membership, ID uniqueness, references, schema version, and serialized byte budget before persistence.

| Entity | Required fields and semantics |
|---|---|
| Workspace | schemaVersion=2, revision, migration metadata, settings, collections, last operation ID |
| Settings | reporting currency MYR, weekStart Monday, user-chosen timezone default from runtime, optional learning weekly target |
| Task | id, title, dueDate nullable, priority low/normal/high, status open/done, createdAt nullable for legacy, updatedAt, sourceActionId nullable |
| TaskEvent | id, taskId, kind completed/reopened, occurredAt, localDate; legacy done flags produce NO historical events |
| Transaction | id, date, kind income/expense, amountMinor positive integer sen, category, optional note; no bank balance claim |
| Budget | id, month YYYY-MM, categoryId/key, limitMinor; unique month/category; no double counting |
| LearningSession | id, date, topic, minutes positive integer <=1440, optional note |
| JournalEntry | id, date, reflection, tags; one entry/day, update explicitly |
| Goal | id, title, kind savings/general, target, progress, unit, dueDate nullable; savings integers in sen, plannedMonthlyMinor; manual progress separated from cashflow |
| Milestone | id, goalId, title, targetDate nullable, done, completion timestamp nullable |
| Habit | id, title, scheduledWeekdays, startDate, archivedAt nullable |
| HabitCheckin | habitId, date, status completed/skipped; unique habit/date; skipped is not complete |
| Analysis | id, createdAt, period, selectedCategories, sanitized user question, schemaVersion, evidence metadata/snapshot revision, validated result, legacy text optional, status |
| Plan | id, analysisId nullable, sourceCategories, savedAt, actions, legacy text optional |
| PlanAction | id, title, rationale, dueDate, target metric/quantity/unit, evidence refs, status proposed/accepted/completed/dismissed; explicit action import link |

Privacy deletion cascade must remove linked sensitive copies or warn and obtain explicit choice before retaining historical analysis. No dangling references silently treated as success. Legacy reports and plans retained as read-only plain text; do not fabricate structured actions or metadata. Analysis history starts from actual retained latest review; historical outputs no longer present cannot be recreated.

## 2. Migration protocol (non-destructive, reversible before writes)
Legacy key: life-control-anna:v1. New key: life-control-anna:v2. Own-app scope only. Existing v0.1.2 stays frozen. Separate keys prevent legacy normalizers from stripping v2 fields.
1. Read v2 and v1 with metadata/etag. Distinguish explicit absent key from permission/transport/ambiguous 404. Never initialize empty state after an unknown read failure.
2. If v2 exists, validate and load; never overwrite with legacy defaults. Compare current v1 etag/content fingerprint to migration baseline; if changed after migration, show legacy divergence and block writes until reconciliation. Do not auto-merge or choose a winner.
3. If v2 absent, preserve raw v1 intact. Validate all existing arrays, do not use legacy slice(0,100). Preserve IDs, dates, task done state, transaction categories, learning entries, journal text, goal and savedPlan/lastReview. Amounts convert decimal MYR to integer sen using explicit decimal parsing; reject ambiguous precision and out-of-range values for manual reconciliation. Unknown fields retained as legacy metadata only if necessary and bounded; invalid/duplicate records require non-destructive review, never silently dropped. Legacy savings forecast maps to a single savings goal; no inferred history. Missing legacy timestamps stay null.
4. Build deterministic v2 candidate in memory and compare counts, totals and per-record mapped fields. Record migration ID, legacy etag/fingerprint, count summary and schemaVersion. On failed validation, leave v1 untouched and show recovery UI.
5. Create v2 only after verifying the actual SDK's absent-key conditional write semantics. Docs support if_match on existing etags but do not establish create-only CAS. Until P02 proves safe first-write behavior, migration blocked under ambiguous/concurrent initialization; no blind create/overwrite. Require exclusive migration session and detect competing state; if guarantees unavailable, stop and redesign.
6. Read back v2 and compare canonical content, schema and migration ID. Only then mark migrated; v1 remains preserved. Reopen idempotently; no duplicate imported data. After new v2 writes, legacy rollback is not lossless: do not silently switch to v1. User-driven reconciliation/export required.
7. Test unchanged legacy data, concurrent modification, migration timeout, partially completed migration, malformed schema, duplicate IDs, no-data first install, permission failure, and all retained record types. A real fresh isolated Anna test scope is mandatory. Never run migration on production/user data from development scripts.

## 3. Persistence and capacity
Anna official Host API documents storage.get({key}) -> value, etag?, generation?, exists?; set({key,value,if_match?}) -> etag/generation/size_bytes in APS; delete({key,if_match?}); list with prefix/cursor/limit. if_match can fail with precondition_failed. Source: https://github.com/Anna-Partners/anna-developer-docs/blob/main/docs/apps/app-ui-host-api.md (inspected 2026-11-24, file blob 7ebf86d23a2019e4c5ee6d51bed69f67b80655d6). Runtime-state mock is not durable APS evidence.

Initial release uses a single v2 workspace key to avoid unsupported multi-key transactions. P02 must measure actual SDK/APS size, quota and conditional-write behavior in an isolated scope before choosing a safe serialized UTF-8 byte ceiling. No arbitrary claim of unlimited records. No automatic retention eviction. Display capacity and explicit reject-before-write with export/delete options when ceiling approached. Pagination is a view concern (suggest 25 rows), not storage truncation. Load test >=1,000 small transaction records plus realistic mixed records under measured limits; if this cannot fit, redesign chunked/indexed persistence before releasing. Export is a later gated feature: no promise of browser download in host until tested.

All writes use serialized immutable snapshots, expected etag, operation ID, validation, set and readback. Update confirmed snapshot only after verifying exact persisted content. Stale etag -> reload and present conflict, no blind overwrite/retry. Deadline with unresolved write -> mark UNCERTAIN, lock further mutations, reconcile on reopen, do not claim cancellation. Distinguish definite failure and uncertain success. A retry must not duplicate an accepted action or a transaction. On reopening, restore existing report and saved plans without LLM call. Readback failure -> show not confirmed, reconcile before further mutations. Guard against concurrent app instance and legacy-version writes; v2 CAS does not protect v1.

## 4. Erasure & safety
List exact known owned keys and migration artifacts with allowlisted prefix only. Whole-workspace erase includes v1 AND v2, analysis/history/plans and any created backup/export keys; external user-downloaded copies not controlled. No deletion of unrelated app/owner data. Multi-key delete not atomic: track each key, conditional deletes where supported, verify absence of each; if partial, report incomplete, disable new writes until resolved. Prevent legacy re-import during incomplete erasure. Explicit confirmation required. Do not claim platform backups/logs/previous AI requests erased. New privacy text must describe retention, custom questions, structured reports, legacy migration and erasure before release. No private production records or tokens in GitHub/CI/screenshots.
