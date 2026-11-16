# Life Control | Store Listing Draft

**Status: review copy only. App Working Draft was uploaded and privately installed on 2026-11-14; this listing remains provisional. No immutable version cut, App Review submission or public publication.**  
**Candidate app:** `life-control-anna` (created in Developer Console as app ID 908, working revision 2)  
**Candidate version:** `0.1.0`  
**Developer:** `@lifecontroldev`  
**Category:** `productivity`

## Listing fields ready for review

### App name
Life Control

### Short description / tagline (within 160 characters)
Track what matters. Get AI weekly reviews based only on the life data you choose to share.

### Long description
Life Control combines everyday planning with privacy-conscious AI reflection.

Manage your tasks and due dates, record income and expenses in MYR, log learning sessions, write a daily reflection, and forecast progress toward a personal savings goal—all in a single workspace.

**AI only when you ask.** When requesting a Weekly Review, you choose which categories the AI can analyze: Tasks, Money, Learning and/or Journal. Each review requires fresh consent. Unselected categories are excluded from the request, and the AI is instructed to identify evidence gaps instead of assuming what ambiguous task names mean.

Your records are saved through Anna's app storage. The app supports individual record deletion and a clear-workspace option. Please note that clearing local app-accessible records does not retract prior AI requests or guarantee removal of platform-side backups and logs.

This Anna-hosted app does not synchronize with the Life Control Android app, connect to banks, deliver background push notifications, or offer professional financial advice. AI requests may use Anna platform quota.

### Customer support URL
https://github.com/yap-gif/life-control-android/issues

### Candidate version-pinned privacy URL
https://github.com/yap-gif/life-control-android/blob/f72944d867da70aa206016b5ca5fa4a025855dba/anna-edition/PRIVACY.md

Version-pinned privacy and homepage URLs were verified through the GitHub connector; the permalink now displays the approved **Life Control** privacy-notice title and are configured in local `app.json` with **zero temporary-branch warnings**. The remote Anna Listing values remain to be synchronized and checked separately. The permalinks are immutable snapshots; publish updated privacy disclosures at a new stable version URL when the notice changes.

## Approved marketing concepts are not actual screenshots

The developer approved six AI-generated dark-blue/neon visuals as **creative direction**. These images are mockups, not real screen captures. In particular, one concept incorrectly claims that user data is processed only on the device (this Anna edition is platform-hosted), and another implies generic reminders where only in-app due indicators exist. Do not submit those concepts as truthful in-app store screenshots. An off-repository review package separates six concepts from three older authentic Anna Harness crops; capture final screenshots directly in installed Anna Chat before App Review.

## Promotional screenshots to capture

Up to **6 screenshot URLs** are accepted by Anna's current listing form. These should reflect the **actual running app** using synthetic records, not generated mockups.

1. **Overview (desktop):** navigation/header, four KPI cards, tasks panel and journal entry
2. **Tasks and learning:** add/complete action, due indicator, 30-minute learning example
3. **Money and goal:** income/expense sample with MYR and savings forecast; do not imply banking integration
4. **AI consent:** selectable category checkboxes, unchecked authorization, and explanatory copy
5. **AI Weekly Review:** formatted headings, source-based recommendations and evidence limits
6. **Mobile mode:** narrow viewport showing accessible stacked cards and form controls

Use synthetic examples, e.g. task `Study Kotlin`, income RM100, expense RM15 and a savings target RM1000.

**Never publish:** Anna App Harness headers containing `t=` tokens, RPC request/response logs, account credentials, private notes or personal financial records. Crop to the app viewport or capture within the application viewport, and verify pixels manually.

Draft crops created from previously supplied developer screenshots are for internal review only; please capture final screenshots **after** the latest accessibility fixes and confirm they match the running app.

## Logo preparation

A 512×512 PNG / 256×256 WebP icon candidate has been created and the developer approved the visual direction. Anna remote logo upload remains pending. The current Anna listing accepts JPEG, PNG, WebP or GIF logo uploads up to **2 MB** and server-normalizes to 256×256 WebP. Confirm color contrast, legibility at 48×48, originality and actual ownership before uploading.

## Final listing consistency checks

- Name and slug remain consistent across the Console and code; slug becomes immutable on creation
- App description does not promise offline-only storage, Android sync, actual reminders, bank import or always-on AI
- Consent applies per AI request, not global opt-in
- Platform billing/quota is disclosed accurately
- Privacy and support URLs are publicly accessible and stable
- Screenshots use actual app UI with synthetic data and no session tokens
- Logo is reviewed and approved by the developer

## Release gate

The developer installed private Working Draft `r1` / `0.0.0-draft` (app ID 908), reported all features working, and CI has **38 passing tests**. Six AI-generated promotional concepts are approved for creative direction, but **not** accepted as actual app screenshots. The remote logo/screenshot upload, screen-reader audit and Anna Listing verification remain pending. See [0.1.0 candidate decision gate](./RELEASE-CANDIDATE-0.1.0.md).

## Workflow boundaries

- Draft metadata is not published merely by committing this file to GitHub.
- The developer completed `anna-app apps push` and installed private Working Draft `0.0.0-draft`; all app features were subsequently reported working. Any further push still requires an intentional change.
- `apps cut` creates an immutable version; `apps submit-review` initiates platform review.
- An approved app still requires a separately approved publication step.
- Program grant eligibility is not inferred from feature completion or App Review status.

Source of requirements: [Anna Listing Fields](https://anna.partners/developers/apps/app-listing), [Publishing an App](https://anna.partners/developers/apps/app-publish).
