# Life Control — Marketplace Release Preparation (not yet submitted)

**Prepared:** 2026-11-13  
**Frozen candidate version:** `0.1.0` (immutable version ID **2279**; not submitted or published)  
**Developer handle:** `@lifecontroldev` (reported by developer)  
**GitHub:** [PR #2](https://github.com/yap-gif/life-control-android/pull/2) — Draft

This document prepares review material. The developer installed private Working Draft r2, froze immutable version **0.1.0 (ID 2279)**, and manually confirmed the Versions and Listing checks. **App Review submission and public publication have not occurred.**

## A. Draft Marketplace listing copy

**Name:** Life Control

**Category:** Productivity

**Short tagline:** Plan tasks, track your progress, and request privacy-controlled AI weekly reviews.

**Long description (proposed):**

> Life Control is an independent productivity and personal-growth workspace for the Anna platform.
>
> Organize tasks and due dates, record income and expenses in MYR, track learning sessions, maintain a dated journal, and estimate progress toward a savings goal.
>
> When you want personalized reflection, request an AI Weekly Review. You explicitly select which categories the AI may analyze—Tasks, Money, Learning, and/or Journal—and approve every AI request. Unselected categories are excluded from the request payload.
>
> Data is saved using Anna's per-app storage. This edition does not synchronize with the separate Life Control Android app, connect to bank accounts, send scheduled device push notifications, or provide professional financial advice.
>
> AI processing may use your Anna platform allowance. You can delete individual records or clear the app-accessible workspace; this does not retract already submitted AI requests or guarantee erasure of Anna platform backups and logs.

**App homepage:** GitHub repository / stable release branch once the public version is finalized

**Support:** https://github.com/yap-gif/life-control-android/issues

**Privacy:** Local `app.json` now points to verified public GitHub permalinks at commit `f72944d867da70aa206016b5ca5fa4a025855dba`, including [Privacy](https://github.com/yap-gif/life-control-android/blob/f72944d867da70aa206016b5ca5fa4a025855dba/anna-edition/PRIVACY.md) and [Homepage](https://github.com/yap-gif/life-control-android/tree/f72944d867da70aa206016b5ca5fa4a025855dba/anna-edition). The Anna **remote Listing tab** has not yet been confirmed or synchronized; the commit-pinned policies must be replaced with new versioned links if terms materially change.

## B. Asset plan — internal draft samples prepared, still require approval

Official Listing Fields documentation permits up to **6 screenshot URLs**, a logo URL, and optional cover image. Upload-logo accepts PNG, JPEG, WebP or GIF, up to **2 MB**; the host resizes it to a square 256×256 WebP.

A preliminary app icon and three cropped screenshots of **real previously supplied Harness UI** have been prepared as an off-repository review package. These are not uploaded to Anna. Top Harness URL bars and the right RPC log panels were excluded. The screenshots still require final developer review; retake after the new accessibility patch for final publication.

Suggested screenshots after removing credentials, private records, developer session URLs and RPC logs:

1. **Overview:** dashboard with test metrics showing tasks, learning and cashflow.
2. **Tasks and learning:** dated task entries and lesson records.
3. **Money and goal forecast:** entirely fabricated MYR amounts plus forecast.
4. **AI consent panel:** explicit category toggles and one-time authorization checkbox.
5. **Formatted AI review:** example output using synthetic records only.
6. **Mobile view:** Anna Harness responsive layout with no personal details.

**Logo concept for later approval:** A minimalist rounded square showing a checkmark and growing progress arc; blue/teal, flat enough to read at small sizes. Do not use Anna's logo or imply endorsement.

## C. Critical review gates

### AI-native product fit

The Anna Founding Builder criteria prioritize Apps where AI reasoning is essential to the core value, not superficial chatbot add-ons. The current app includes a functional consent-gated AI Weekly Review, but Tasks, Money, Learning, Journal and forecasts still work without AI. **Program eligibility and product differentiation remain a genuine review risk.**

Before applying, articulate a clear AI-native use case: consent-aware reasoning across selected personal progress categories, evidence-limited weekly insights, and actionable next-step planning. Do not claim automatic coaching, cross-device synchronization, or background AI services that do not exist.

### UX and accessibility

- Keyboard-only navigation through all forms, checkboxes, confirmation dialogs and deletion controls
- Mobile layout at narrow width, without horizontal clipping
- Announced save failures, model quota failures and unavailable Anna storage
- Correct behavior when all AI categories are unselected or consent not checked
- Fallback when an LLM response is missing or cannot be formatted
- Display untrusted AI output and journal contents as safe text; no executable HTML

### Security and privacy

- No API keys, PATs, iframe `t=` session tokens, raw private journal or bank details in screenshots
- Review the public privacy notice's platform-storage and retention limits
- Confirm erase behavior only claims to clear the app-accessible record; it cannot revoke model calls
- Test one prompt-injection-like task title with synthetic data and ensure the model does not act on it as system instruction
- Do not interpret a passing prompt test as a guarantee against all hallucinations

### Acceptance evidence

- 38 CI tests + `anna-app validate --strict`: verified (latest branch)
- Real Anna Harness UI, APS roundtrip across restart, real `llm.complete`: supported by developer-supplied logs
- AI category isolation: supported by real outgoing model request
- Safe Markdown formatting + ambiguous `APS-PERSIST-001` task test: supported by post-patch developer screenshot and RPC
- Manual CRUD, Journal overwrite, erase/restart and Mobile checks: developer-reported
- Keyboard-only smoke navigation: **developer-reported passed** in Harness; assistive-technology screen-reader audit still pending
- Live AI quota failure and storage-permission failure UX: **pending manual**
- Anna private Working Draft: **uploaded** as revision 2, 7-file UI bundle ready, app ID 908; **developer installed** reserved `0.0.0-draft` from console and reported all app functions work in Anna Chat on 2026-11-14; production API traces not independently inspected
- Anna App Review and funding qualification: **not tested or guaranteed**

## D. Anna release sequence — informational only

Sources: [Publishing an App](https://anna.partners/developers/apps/app-publish), [Listing Fields](https://anna.partners/developers/apps/app-listing), and [App Review Timeline](https://forum.anna.partners/t/app-review-timeline-process/318).

1. Finalize listing copy, privacy link and public-facing screenshots/logo.
2. Perform remaining accessibility and failure-path tests.
3. **Completed with explicit developer actions (2026-11-14):** first `apps push` created private Working Draft r1; the developer installed `0.0.0-draft`, tested its features and subsequently pushed the **Life Control** brand update as **r2**. The updated r2 should be reopened and checked in Anna Chat. Neither push was a public publication.
4. **Developer-reported PASS (2026-11-14):** tested all features of the installed private Working Draft in Anna Chat. No per-operation production RPC receipts have been provided.
5. **Completed after explicit developer approval:** `anna-app apps cut 0.1.0` returned immutable version ID **2279**. A separate `apps versions` and `apps status` verified a single, unpublished version on App ID 908.
6. **Only with explicit approval**, submit that version for App Review. The platform may request UX/security fixes; review does not imply an automatic grant.
7. Public release only after approval and a separate affirmative publishing decision.

**Console verification update (2026-11-14):** The developer reported that v0.1.0 (version ID 2279) had a Ready bundle and that the actual Listing name, category, description, logo, genuine screenshots and updated privacy URL were correct. These are manual acceptance statements, not independently fetched platform metadata. Screen-reader testing and live quota/storage-failure scenarios remain unverified.

**Current decision:** Frozen `0.1.0` and user-verified Listing are ready for a *separate decision* on App Review submission. This document does not authorize or perform `submit-review` or `release`. GitHub PR #2 remains Draft and `main` unchanged.
