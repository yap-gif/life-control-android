# LC-P03 — Advanced management domain foundation
Date: 2026-11-24, Asia/Kuching.
Status: isolated source candidate; CI evidence must be checked on exact commit. No release.

- domain.js provides exact entity schemas, reference/uniqueness validation, immutable command preparation with explicit expected revision and operation ID, explicit UTC timestamp and derived local day, separate task transition events, integer MYR/minutes, budget uniqueness, daily journal, goal/milestone and habit lifecycle.
- selectors.js provides read-only bounded view pagination, normalized text/category filters, date ranges, status/priority and parent filtering. No storage truncation.
- v2-domain.test.js covers synthetic domain operations, migration compatibility, invalid inputs, chronology, deletion acknowledgement, report recomputation, 1001-row pagination and mock repository gates.
- Legacy analysis/plan schemas are validated and preserved read-only. Structured AI records and task-action links are deliberately rejected pending P04.
- Deletion removes dependent task events, milestones or habit checkins in v2 only after explicit confirmation. Migrated workspaces require explicit acknowledgement that preserved v1 and historical reports may retain copies. Full privacy erasure remains gated, not implemented here.
- Habit schedule/start are immutable; archive first inactive day and create a new habit for a changed schedule. No retroactive schedule rewrite. Goal kind/unit immutable. Task events are append-ordered; migrated completion timestamps stay unknown.
- Commands prepare candidates, not save acknowledgements. Repository remains unchanged. Real APS capacity, atomic create-if-absent, exclusive migration, and platform integration remain BLOCKED. No real writes, model calls or production migration. Mock verified capability is synthetic only.
- Active v0.1.2 UI, package, manifest, listing and Anna App 908 frozen version 2720 unchanged. No push/cut/submit/release to Anna. Full management UI and real runtime acceptance remain open for P05–P07.
- P04 can proceed on isolated pure data; extend exact domain schemas for structured AI records before enabling such records. Retain all P02 safety gates.
