# Privacy notice — Life Control
Updated: 2026-11-17 · v0.1.1 review-repair source candidate (not deployed)

## Data entered into the app
Users can enter tasks, due dates, expense/income categories and amounts, learning sessions, private journal reflections, and a savings target. This prototype stores these entries through the **Anna app storage API**. It does **not** read from or synchronize with the separate Android Life Control app, bank accounts, calendars, contacts, or local device files.

This is **not** a fully offline Android application and the platform controls storage infrastructure. Do not use it for passwords or highly sensitive secrets.

## AI analysis and consent
- AI analysis is **off by default**. Opening the app, viewing records, and editing data do not trigger an AI call.
- To request an AI pattern analysis and next-week plan the user must select one or more of **Tasks, Money, Learning, Journal** and actively approve that request.
- Only selected categories and their corresponding multi-week records/aggregates are sent in the `anna.llm.complete` request. The analysis uses four completed calendar weeks plus the possibly partial current week; evidence is bounded. The checkbox approval is cleared for each subsequent call. Unselected category records are excluded even from derived trend metrics.
- The user may deliberately **save** one AI-generated plan in Anna app storage, including its response text and the categories selected when it was generated. The saved plan is **never automatically sent** in a later AI request. To include it in a future comparison, the user must separately check **Include saved plan**, select all of its original categories and authorize that AI call. Saving a plan does not mean it was followed. The user can forget just the saved plan without erasing other records.
- Selected records are processed using the user's Anna-hosted model and may consume their platform quota. The app developer cannot guarantee the model provider's data retention settings; review the applicable Anna and provider privacy terms.
- The app does not include an advertising SDK, direct Gemini API key, or custom third-party analytics endpoint.

## Storage, deletion and limits
Records are retained in the app's Anna-managed storage until the user deletes them, a platform policy applies, or the app is otherwise removed. The app supports individual record deletion and a user-confirmed **Erase saved data** action that requests deletion of its storage key when available, or overwrites it with an empty workspace on older SDK implementations. This action only erases the app-accessible storage entry: it cannot retract previously sent AI prompts or guarantee deletion of platform backups, security/audit logs, or provider-side records.

The application does not claim end-to-end encryption or automatic deletion by Anna. Storage availability and cross-device behavior depend on Anna's platform service.

## Security controls
The interface uses safe text nodes for stored user entries and an allow-listed Markdown renderer for model results (no unchecked HTML injection). AI prompts explicitly treat user-entered content as data, not instructions. Network AI requests and platform operations still inherit the risks and protections of the Anna host environment.

## Contact
For app feedback or deletion-related product concerns, open a [GitHub issue](https://github.com/yap-gif/life-control-android/issues). For platform-hosted data requests, contact Anna through its official account/privacy channels.
