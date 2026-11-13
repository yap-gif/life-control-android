# Life Control — Anna Edition | Store Listing Draft

**Status: review copy only. Not uploaded, submitted, version-cut, or published.**  
**Candidate app:** `life-control-anna` (availability and final slug must be verified in the Developer Console)  
**Candidate version:** `0.1.0`  
**Developer:** `@lifecontroldev`  
**Category:** `productivity`

## Listing fields ready for review

### App name
Life Control — Anna Edition

### Short description / tagline (within 160 characters)
Track what matters. Get AI weekly reviews based only on the life data you choose to share.

### Long description
Life Control — Anna Edition combines everyday planning with privacy-conscious AI reflection.

Manage your tasks and due dates, record income and expenses in MYR, log learning sessions, write a daily reflection, and forecast progress toward a personal savings goal—all in a single workspace.

**AI only when you ask.** When requesting a Weekly Review, you choose which categories the AI can analyze: Tasks, Money, Learning and/or Journal. Each review requires fresh consent. Unselected categories are excluded from the request, and the AI is instructed to identify evidence gaps instead of assuming what ambiguous task names mean.

Your records are saved through Anna's app storage. The app supports individual record deletion and a clear-workspace option. Please note that clearing local app-accessible records does not retract prior AI requests or guarantee removal of platform-side backups and logs.

This independent Anna edition does not synchronize with the Life Control Android app, connect to banks, deliver background push notifications, or offer professional financial advice. AI requests may use Anna platform quota.

### Customer support URL
https://github.com/yap-gif/life-control-android/issues

### Draft privacy URL
https://github.com/yap-gif/life-control-android/blob/feature/life-control-anna-edition-20261113/anna-edition/PRIVACY.md

Replace this branch URL with a stable versioned public URL before publishing.

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

A preliminary 512×512 PNG / 256×256 WebP icon candidate has been created for visual review. The current Anna listing accepts JPEG, PNG, WebP or GIF logo uploads up to **2 MB** and server-normalizes to 256×256 WebP. Confirm color contrast, legibility at 48×48, originality and actual ownership before uploading.

## Final listing consistency checks

- Name and slug remain consistent across the Console and code; slug becomes immutable on creation
- App description does not promise offline-only storage, Android sync, actual reminders, bank import or always-on AI
- Consent applies per AI request, not global opt-in
- Platform billing/quota is disclosed accurately
- Privacy and support URLs are publicly accessible and stable
- Screenshots use actual app UI with synthetic data and no session tokens
- Logo is reviewed and approved by the developer

## Workflow boundaries

- Draft metadata is not published merely by committing this file to GitHub.
- `anna-app apps push` creates/updates a private Working Draft **only after explicit approval**.
- `apps cut` creates an immutable version; `apps submit-review` initiates platform review.
- An approved app still requires a separately approved publication step.
- Program grant eligibility is not inferred from feature completion or App Review status.

Source of requirements: [Anna Listing Fields](https://anna.partners/developers/apps/app-listing), [Publishing an App](https://anna.partners/developers/apps/app-publish).
