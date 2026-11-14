# Life Control — Anna Edition (0.1.0)

An independent, privacy-gated Anna AI OS edition of the Life Control concept. The original Android Kotlin/Room app remains unchanged.

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
| AI weekly review | Real `anna.llm.complete` call with per-request consent, safe Markdown rendering, and evidence-only coaching instructions |
| Anna storage | Per-app `anna.storage.get/set`, loaded before any editing is enabled |
| Data erasure | Individual record deletion and confirmed erase with SDK delete when available, or empty-state overwrite when not available |
| Accessibility | Skip-to-content link, record-specific action labels, focus restoration on task operations, keyboard-accessible erase confirmation |
| Host failures | Stable, non-secret error guidance for AI quota, missing LLM runtime, invalid requests and storage permission failures |

AI context selection is enforced by `bundle/logic.js::buildReviewContext` and not solely by UI labels. The model receives a JSON payload containing **only** the selected categories. No hidden full-data profile is appended.

## Privacy

- **Default:** no model calls at startup or during ordinary data edits.
- AI runs require fresh approval for **each** review. Consent resets immediately after a request is initiated, including on failure.
- Categories are independently selected: Tasks, Money, Learning, Journal. Unselected fields and derived aggregates (such as the goal forecast when Money is deselected) are excluded.
- Data belongs to the **Anna-hosted app storage**, not to an on-device-only Room store. Do not describe this edition as offline-only or as end-to-end encrypted.
- When the user authorizes AI, selected data is processed by Anna's LLM service; the provider/model and quota are governed by Anna.
- No direct third-party credentials, user token, advertising SDK, external endpoints, automatic AI triggers or hidden telemetry are coded into this module.
- Journal data is rendered via `textContent`. AI responses use an allow-listed Markdown DOM formatter that creates only safe elements and assigns every model-derived string as `textContent` (no raw HTML injection).
- Up to 100 records per collection are retained in the UI data model; the home screen displays the 12 most recent per category. Week reviews include bounded record counts to reduce disclosure and prompt size.

For a disclosure of data-handling boundaries and known platform-level limits, see [PRIVACY.md](./PRIVACY.md).

## Verification evidence (updated 2026-11-14)

**Independent CI evidence:** `anna-app validate --strict` passed; 36 Node/Anna harness unit tests passed, including AI category filtering, new safe Markdown formatting, and evidence-only request contract; `anna-app dev --no-llm` launched and the dashboard responded.

**Developer's real Windows Anna Harness logs:** The app opened successfully; after restarting in APS mode, `storage.get` returned the expected test records. A real `llm.complete` responded to a request containing Tasks and Learning, but no Money or Journal. The developer subsequently reported Task complete/reopen/delete, same-day Journal overwrite, erase-and-restart, and Mobile-mode form checks as successful. Those last items are user-reported manual checks, not independently repeated device tests.

**Post-patch browser checks completed:** The developer supplied real Harness evidence for Markdown formatting, the ambiguous-task regression and safe `llm_disabled` feedback. The developer subsequently installed private Working Draft `life-control-anna` (app ID 908, revision 1) in Anna Chat and reported **all functions working**. These reports do not constitute a separate production RPC or screen-reader audit.

Detailed status: [QA-ACCEPTANCE.md](./QA-ACCEPTANCE.md).

## Marketplace preparation (internal only)

- [Store listing draft](./STORE-LISTING-DRAFT.md) — proposed name, tagline, short and long description, privacy disclosures, screenshot plan.
- [Marketplace release plan](./MARKETPLACE-RELEASE-PREP.md) — production verification gates, logo and final screenshot requirements, approval boundaries.
- A preliminary icon and three token-free application screenshots have been prepared separately for developer review; no binary images have been pushed to the public repository.
- Keyboard-only focus/confirmation interactions were developer-reported passed; an assistive-technology screen-reader audit is outstanding. The fixed `llm_disabled` explanation was observed working in the actual Anna Harness.

## Known limitations

1. **No Android sync:** Existing Life Control records do not automatically appear here; they must be entered in Anna Edition. There is no migration/importer.
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

Run `npm run preflight` for local metadata/privacy validation. This intentionally reports warnings because the homepage and privacy URLs currently target a feature branch. The strict `npm run preflight -- --release-gate` must pass before release review, and it never reads the actual Anna Console Listing. See the [0.1.0 release-candidate gate](./RELEASE-CANDIDATE-0.1.0.md) for outstanding listing assets, stable public links, screen-reader testing and explicit authorization boundaries.

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
