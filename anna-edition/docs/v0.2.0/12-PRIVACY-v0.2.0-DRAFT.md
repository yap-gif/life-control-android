# Privacy notice — Life Control v0.2.0 (DRAFT, NOT PUBLISHED)
This proposed text must be reconciled with verified real host behavior before release. The active v0.1.2 privacy file remains unchanged.

Life Control is a personal workspace for tasks, financial records in MYR, learning, journal reflections, goals, milestones, habits and user-approved AI plans. It does not read bank accounts, the separate Android database, contacts or device files; it does not provide financial or medical advice.

## Storage and migration
The proposed Anna-hosted version uses own-app storage. Migration from v1 to v2 preserves the retained legacy copy, validates records and requires confirmed storage capability; failed or ambiguous reads do not initialize an empty workspace. No capacity or cross-device guarantee is made. Users should not store passwords or other secrets. Data retention depends on the platform and user deletion choices.

## Optional AI and history
AI is off by default. A specific question, selected date range and selected categories determine the exact request preview, including selected journal text if explicitly authorized. The question itself may contain personal data. Evidence sampling/limits and omitted counts are disclosed; no automatic transmission of unselected categories or earlier plans. A prior plan requires separate opt-in and every original category plus Tasks. Each model request requires fresh explicit consent and may consume Anna credits. No automatic retry; the outcome of a timeout may be unknown. AI narrative is interpretation, not verified fact.

Validated analyses and separately selected plans may be explicitly saved and restored without model calls. Saved history may contain copies of the original evidence; a new edit does not silently change historical analyses. Linked tasks require explicit acceptance and recorded events. Selective deletion warns about retained copies, including preserved legacy data.

## Deletion
The intended whole-workspace erase will require confirmation and verify the absence of every owned v1/v2 key and any owned artifacts. Partial failure must be disclosed and prevent unsafe writes/re-import. This feature is a release blocker until tested on the real platform. Deletion cannot retract prior model requests or guarantee removal from platform/provider logs, backups or external copies. No end-to-end encryption or universal erasure claim.

The present isolated preview uses fictional data in memory and a deterministic simulated response. It is not the production Anna runtime and is not evidence that real storage, model transport, or erase has been verified. Final notice requires verified implementation and owner review. Support: https://github.com/yap-gif/life-control-android/issues.
