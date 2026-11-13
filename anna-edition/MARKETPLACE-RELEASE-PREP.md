# Life Control Anna Edition — Marketplace Release Preparation (not yet submitted)

**Prepared:** 2026-11-13  
**Candidate version:** `0.1.0` (draft; not cut or published)  
**Developer handle:** `@lifecontroldev` (reported by developer)  
**GitHub:** [PR #2](https://github.com/yap-gif/life-control-android/pull/2) — Draft

This document prepares review material only. **No Anna CLI push, cut, submit-review, release or Marketplace publication has been authorized or performed.**

## A. Draft Marketplace listing copy

**Name:** Life Control — Anna Edition

**Category:** Productivity

**Short tagline:** Plan tasks, track your progress, and request privacy-controlled AI weekly reviews.

**Long description (proposed):**

> Life Control — Anna Edition is an independent productivity and personal-growth workspace for the Anna platform.
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

**Privacy:** Link a stable public `anna-edition/PRIVACY.md` at the time of publishing; the current feature-branch URL is appropriate only for draft testing.

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

- 30 CI tests + `anna-app validate --strict`: verified (latest branch)
- Real Anna Harness UI, APS roundtrip across restart, real `llm.complete`: supported by developer-supplied logs
- AI category isolation: supported by real outgoing model request
- Safe Markdown formatting + ambiguous `APS-PERSIST-001` task test: supported by post-patch developer screenshot and RPC
- Manual CRUD, Journal overwrite, erase/restart and Mobile checks: developer-reported
- Keyboard-only and screen-reader validation following accessibility changes: **pending manual**
- Live AI quota failure and storage-permission failure UX: **pending manual**
- Public installation after creating Anna Working Draft: **not tested**
- Anna App Review and funding qualification: **not tested or guaranteed**

## D. Anna release sequence — informational only

Sources: [Publishing an App](https://anna.partners/developers/apps/app-publish), [Listing Fields](https://anna.partners/developers/apps/app-listing), and [App Review Timeline](https://forum.anna.partners/t/app-review-timeline-process/318).

1. Finalize listing copy, privacy link and public-facing screenshots/logo.
2. Perform remaining accessibility and failure-path tests.
3. **Only with explicit developer approval**, run `anna-app apps push` to create/update a private Working Draft and verify it in Anna's Developer Console. Push is **not** public publication.
4. Test the uploaded draft in the actual platform, not just the local Anna Harness.
5. **Only with explicit approval**, cut the planned immutable version (`anna-app apps cut 0.1.0`); review the resulting candidate.
6. **Only with explicit approval**, submit that version for App Review. The platform may request UX/security fixes; review does not imply an automatic grant.
7. Public release only after approval and a separate affirmative publishing decision.

**Current decision:** Remain in PR Draft / internal test preparation. Do not merge to `main`, cut a version, submit review or publish automatically.
