# Life Control — Anna-hosted v0.1.2 second-review repair candidate

An independent, privacy-gated build of Life Control for the Anna platform. The original Android Kotlin/Room app remains unchanged.

## Purpose

This version adapts the product highlighted in the Anna Founding Builder invitation into a **functional Anna-hosted app**. It is a standalone web UI bundle (schema 4) using Anna's official Host APIs; it is **not** an APK upload, not a remote copy of the Android Room database, and not an Android-to-Anna synchronization client.

## Functional scope

| Feature | Current implementation |
| --- | --- |
| Tasks | Add, complete, reopen, delete; due-now and overdue indicators inside the app |
| Money | Record MYR income/expenses by date and category; compute weekly net |
| Learning | Record topic + study minutes, weekly minutes |
| Journal | Add or update one reflection per date |
| Goal forecast | Explicit savings target, saved amount and planned monthly contribution; deterministic months-to-goal estimate |
| AI pattern and next-week plan | Local multi-week evidence preview + scoped Anna LLM request comparing four completed weeks and the partial current week, with a measurable seven-day plan and explicit evidence limits |
| Plan follow-up | User can save one generated plan and, on a later separately authorized call, optionally include it only with all original category scopes; saved plans can be forgotten |
| Anna storage | Per-app `anna.storage.get/set`, loaded before any editing is enabled |
| Data erasure | Individual record deletion and confirmed erase with SDK delete when available, or empty-state overwrite when not available |
| Accessibility | Skip-to-content link, record-specific action labels, focus restoration on task operations, keyboard-accessible erase confirmation |
| Host failures | Stable, non-secret error guidance for AI quota, missing LLM runtime, invalid requests and storage permission failures |

AI context selection is enforced by `bundle/patterns.js::buildPatternContext` and not solely by UI labels. The model receives a JSON payload containing **only** the selected categories. No hidden full-data profile is appended.

## Privacy

- **Default:** no model calls at startup or during ordinary data edits.
- AI runs require fresh approval for **each** review. Consent resets immediately after a request is initiated, including on failure.
- Categories are independently selected: Tasks, Money, Learning, Journal. Unselected fields and derived aggregates (such as the goal forecast when Money is deselected) are excluded.
- Data belongs to the **Anna-hosted app storage**, not to an on-device-only Room store. Do not describe this edition as offline-only or as end-to-end encrypted.
- When the user authorizes AI, selected data is processed by Anna's LLM service; the provider/model and quota are governed by Anna.
- No direct third-party credentials, user token, advertising SDK, external endpoints, automatic AI triggers or hidden telemetry are coded into this module.
- Journal data is rendered via `textContent`. AI responses use an allow-listed Markdown DOM formatter that creates only safe elements and assigns every model-derived string as `textContent` (no raw HTML injection).
- Up to 100 records per collection are retained in the UI data model; the home screen displays the 12 most recent per category. Multi-week analyses include bounded record counts to reduce disclosure and prompt size; the current week is flagged as partial to avoid false comparisons. One user-saved AI plan may be stored explicitly and separately deleted.

For a disclosure of data-handling boundaries and known platform-level limits, see [PRIVACY.md](./PRIVACY.md).

## November 20 second reviewer rejection — v0.1.2 source-only repair

The Anna developer team tested immutable **v0.1.1 / ID 2476** and reported three defects: all features shared one long surface; saving a future-week AI plan stalled; and AI analysis disappeared / plan-generation became unavailable after reopening. This repair is implemented only on branch `fix/life-control-review-r2-20261120`. **Original App ID 908 / frozen v0.1.1 are NOT changed by these GitHub commits.**

The v0.1.2 candidate includes eight separately routable pages (Overview, AI Insights, Tasks, Money, Learning, Journal, Savings, Privacy), a stored `lastReview` distinct from explicit opt-in `savedPlan`, on-launch review restoration with **no automatic model call**, responsive retry after startup failure, ordered Anna Storage writes, 15-second confirmation feedback, and a read-after-write check before reporting the AI plan as saved. A 45-second AI deadline prevents permanent disabled-button state after a hung model request. An explicit analysis-persistence retry button remains available on storage failure. Preserve user records under the existing `life-control-anna:v1` key.

Automated tests now include DOM-driven navigation, real form clicks, host mocked LLM generation and persistence, closing/reopening fresh DOM instances, false-ack rejection, failed-save retry, all other feature pages, and workspace erasure. These tests **are not a substitute for a fresh Anna Cloud Agent install**.

**Release block:** Existing five store screenshots represent v0.1.1 and must be replaced with genuine v0.1.2 multi-page captures. The internal `npm run preflight -- --review-gate` will block until the screenshot source version matches this candidate, even when the HTTPS URLs are valid. No `apps push`, `apps cut 0.1.2`, or `apps submit-review` has been executed for this candidate.

See [second rejection remediation and acceptance plan](./REVIEW-REJECTION-20261120.md).

## Historical November 17 reviewer rejection and v0.1.1 evidence

### Original v0.1.1 notes

The Anna reviewer rejected immutable v0.1.0 (ID 2279) because the server Listing was missing screenshots and the optional weekly AI review did not demonstrate a distinct AI-native workflow. This paragraph describes the historical status at the start of v0.1.1 remediation. The v0.1.1 release was later frozen and resubmitted, then received the second rejection on November 20. The previous versions remain immutable.

The proposed AI-native experience uses multi-week observations, explicit evidence limits and plan adjustments. The historical task completion flag is **not** treated as proof of when tasks were finished. A saved AI response is optional and cannot be included in a new request without new consent and complete category overlap.

A separate `npm run preflight -- --review-gate` checks local screenshot URLs. For v0.1.2, it will **fail deliberately** until genuine replacement screenshots depicting v0.1.2 are supplied and manually re-verified in Anna Console. No local script can prove that remote Listing fields have been saved.

For the exact rejection and cloud-host QA checklist see [REVIEW-REJECTION-20261117.md](./REVIEW-REJECTION-20261117.md).

## Verification evidence (updated 2026-11-14)

**Independent CI evidence:** `anna-app validate --strict` passed; 38 Node/Anna harness unit tests passed, including AI category filtering, new safe Markdown formatting, and evidence-only request contract; `anna-app dev --no-llm` launched and the dashboard responded.

**Developer's real Windows Anna Harness logs:** The app opened successfully; after restarting in APS mode, `storage.get` returned the expected test records. A real `llm.complete` responded to a request containing Tasks and Learning, but no Money or Journal. The developer subsequently reported Task complete/reopen/delete, same-day Journal overwrite, erase-and-restart, and Mobile-mode form checks as successful. Those last items are user-reported manual checks, not independently repeated device tests.

**Post-patch browser checks completed:** The developer supplied real Harness evidence for Markdown formatting, the ambiguous-task regression and safe `llm_disabled` feedback. The developer subsequently installed private Working Draft `life-control-anna` (app ID 908, revision 1) in Anna Chat and reported **all functions working**. These reports do not constitute a separate production RPC or screen-reader audit.

Detailed status: [QA-ACCEPTANCE.md](./QA-ACCEPTANCE.md).

## Marketplace preparation (internal only)

- [Store listing draft](./STORE-LISTING-DRAFT.md) — proposed name, tagline, short and long description, privacy disclosures, screenshot plan.
- [Marketplace release plan](./MARKETPLACE-RELEASE-PREP.md) — production verification gates, logo and final screenshot requirements, approval boundaries.
- The developer approved a six-image AI-generated promotional direction, but these concepts must **not** be represented as real app screenshots. A separate package contains those six concepts, three genuine historical Harness crops and a candidate logo. Five authentic v0.1.1 captures were subsequently pushed to the public repository and used for the previous Listing, but they are historical and not suitable evidence of the new v0.1.2 navigation.
- Keyboard-only focus/confirmation interactions were developer-reported passed; an assistive-technology screen-reader audit is outstanding. The fixed `llm_disabled` explanation was observed working in the actual Anna Harness.

## Known limitations

1. **No Android sync:** Existing Life Control records do not automatically appear here; they must be entered in this Anna-hosted build. There is no migration/importer.
2. **Reminder limitations:** Due and overdue items appear only inside this app's UI, not as scheduled device/OS push notifications.
3. **Forecast limitations:** Simple planning estimate based on manually entered savings amounts; no cashflow predictions or bank integration.
4. **Storage failure:** Editing is blocked if the Anna storage connection cannot be loaded. If a save fails mid-session, the UI reports that the change may not persist.
5. **Review outcome:** No guarantee of Anna App Review approval, qualified active users or grant funding. The in-app erase function does not remove Anna platform backups, logs or previously submitted AI prompts.
6. **Not yet publicly published:** The private Working Draft `0.0.0-draft` was installed and developer-reported functional in Anna Chat. No immutable `0.1.0` cut, App Review submission or Marketplace release has occurred.

## Start locally

Requires Node.js **22+**, `uv`, and Anna developer credentials.

```bash
npm install
npm test
npm run validate
npm run preflight
npm run dev
```

Commands are run from the `anna-edition/` directory. For Windows PowerShell:

```powershell
cd anna-edition
npm install
npm test
npm run validate
npm run preflight
npm run dev
```

The Anna CLI's official quickstart also suggests `anna-app doctor` to verify local runtime requirements. Host UI requires Anna's sandbox: opening `index.html` directly in a browser will not connect to Anna and is not an end-to-end test.

## Release-candidate checks

Run `npm run preflight` for local metadata/privacy validation. This now passes without branch-link warnings because the homepage and privacy URLs are pinned to a publicly verified GitHub commit. The strict `npm run preflight -- --release-gate` is also a **local-only** check; it does not read the actual Anna Console Listing. CI has **38** tests passing. See the [0.1.0 release-candidate gate](./RELEASE-CANDIDATE-0.1.0.md) for outstanding listing assets, stable public links, screen-reader testing and explicit authorization boundaries.

## Verify before submitting

1. Run `npm test`, then `anna-app validate --strict` and `anna-app dev`.
2. Add tasks, expenses, learning sessions and a dated journal reflection. Close and reopen; verify Anna storage restores state.
3. Test journal update on same date and the task due/overdue counters.
4. In the AI panel select **Tasks only**; inspect the outbound `llm.complete` request in the development harness and ensure it contains no Money, Journal or Learning data.
5. Repeat with each single category, all selected, none selected, and consent unchecked.
6. Verify AI failures and quota errors do not leak or modify other records; approval resets after each AI run.
7. Test responsive screens, screen reader labels, rendered AI Markdown and uncertain-task behavior (including safe display of literal HTML).
8. Push an Anna working draft, review actual host behavior, submit for App Review only after validation.

Official guidance: [Anna App CLI quickstart](https://anna.partners/developers/apps/app-quickstart), [Anna Host API](https://anna.partners/developers/apps/app-ui-host-api), [Publishing](https://anna.partners/developers/apps/app-publish), and [Founding Builder rules](https://forum.anna.partners/t/turn-your-ai-agents-apps-into-recurring-monthly-grants-join-the-anna-ai-os-founding-builder-program-up-to-80k-month-pool/205).

## Release boundary

The directory `anna-edition/` is independent from Android's `app/`. App Store publishing and any external-account actions require the user's explicit action. Do not merge or publish based only on static source review.
