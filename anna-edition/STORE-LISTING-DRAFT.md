# Life Control | Store Listing Draft

**Status: v0.1.0 REVIEW REJECTED (2026-11-17); v0.1.1 is a local/source-code repair candidate only. New Listing changes and screenshot URLs have NOT been independently saved to Anna server. No v0.1.1 push, cut, resubmission or publication.**  
**Candidate app:** `life-control-anna` (created in Developer Console as app ID 908, working revision 2)  
**Repair candidate version:** `0.1.1`  
**Developer:** `@lifecontroldev`  
**Category:** `productivity`

## Listing fields ready for review

### App name
Life Control

### Short description / tagline (within 160 characters)
See real progress patterns. Turn selected history into a measurable AI action plan.

### Long description
Life Control turns explicitly selected, dated personal records into evidence-based AI recommendations and measurable next-week action plans.

Manage your tasks and due dates, record income and expenses in MYR, log learning sessions, write a daily reflection, and forecast progress toward a personal savings goal—all in a single workspace.

**AI history-to-plan workflow.** With one-time approval you choose exactly which categories AI may analyze: Tasks, Money, Learning and/or Journal. The app compares up to four complete weeks and your current (possibly partial) week, locally previews recorded trends, then requests Anna AI to identify evidence-backed changes and propose two measurable actions for the next seven days. You may explicitly save one AI plan, then opt in separately on a future request to compare the plan with new logged evidence. Saved plans are never included automatically; unselected categories are excluded and recording gaps are acknowledged rather than invented.

Your records are saved through Anna's app storage. The app supports individual record deletion and a clear-workspace option. Please note that clearing local app-accessible records does not retract prior AI requests or guarantee removal of platform-side backups and logs.

This Anna-hosted app does not synchronize with the Life Control Android app, connect to banks, deliver background push notifications, or offer professional financial advice. AI requests may use Anna platform quota.

### Customer support URL
https://github.com/yap-gif/life-control-android/issues

### Candidate version-pinned privacy URL
https://github.com/yap-gif/life-control-android/blob/caf787ce72e07ae4c715789ddcc0c9d00e5a3a2b/anna-edition/PRIVACY.md

Version-pinned privacy and homepage URLs were verified through the GitHub connector; the permalink now displays the approved **Life Control** privacy-notice title and are configured in local `app.json` with **zero temporary-branch warnings**. The remote Anna Listing values remain to be synchronized and checked separately. The permalinks are immutable snapshots; publish updated privacy disclosures at a new stable version URL when the notice changes.

## Approved marketing concepts are not actual screenshots

The reviewer explicitly rejected the first Listing because **screenshots were missing**. The developer approved six AI-generated dark-blue/neon visuals as **creative direction only**. These images are mockups, not real screen captures. In particular, one concept incorrectly claims that user data is processed only on the device (this Anna edition is platform-hosted), and another implies generic reminders where only in-app due indicators exist. Do not submit those concepts as truthful in-app store screenshots. An off-repository review package separates six concepts from three older authentic Anna Harness crops; capture final screenshots directly in installed Anna Chat before App Review.

## Promotional screenshots to capture

Up to **6 screenshot URLs** are accepted by Anna's current listing form. These should reflect the **actual running app** using synthetic records, not generated mockups.

1. **AI-first overview:** real v0.1.1 installed-app screenshot of the top AI Pattern & Next-Week Plan panel
2. **Multi-week evidence:** actual local comparison showing two complete weeks with recorded values; label partial weeks
3. **Explicit AI consent:** selected categories, unchecked consent and opt-in past-plan setting
4. **Real AI output:** genuine authorized Anna model response citing dates and measurable next-week actions
5. **Saved-plan follow-up:** show a saved plan and the explicit consent for later AI comparison
6. **Mobile view:** optional real narrow-viewport screenshot, if mobile remains supported

Use synthetic examples, e.g. task `Study Kotlin`, income RM100, expense RM15 and a savings target RM1000.

**Never publish:** Anna App Harness headers containing `t=` tokens, RPC request/response logs, account credentials, private notes or personal financial records. Crop to the app viewport or capture within the application viewport, and verify pixels manually.

Draft crops created from previously supplied developer screenshots are for internal review only; please capture final screenshots **after** the latest accessibility fixes and confirm they match the running app.

## Mandatory Screenshot Listing Repair

The reviewer's finding supersedes the developer's earlier belief that screenshots were present: **they were not available to the reviewer**. Local `app.json` currently contains **no `screenshots` array**, and a local screenshot file is not an Anna Listing URL. Add actual publicly accessible HTTPS screenshot URLs in the **Anna Developer Console Listing**, save, reload the form and open each link in a logged-out browser. Keep the same audited URLs in local `app.json`. Use `npm run preflight -- --review-gate` to enforce a project-level three-authentic-URL rule; this gate cannot verify remote persistence.

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
