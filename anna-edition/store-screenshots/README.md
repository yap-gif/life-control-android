# Life Control — authenticated Anna screenshot inventory

## Current v0.1.2 screenshots (2026-11-20)

Six real screenshots from the **installed Anna Working Draft r4 (Life Control, App ID 908)**. Images were supplied by the owner and converted from PNG to WebP at quality 92, **without synthesizing app UI or modifying the recorded text**. Each image is stored in [v0.1.2/](./v0.1.2/). The image-import commit `ccadc9676a997aab9c2f93ec2066ca309a576488` is pinned in `../app.json` so that Listing URLs remain stable.

| Order | File | Content |
| --- | --- | --- |
| 1 | `v0.1.2/01-v012-overview.webp` | New eight-page Overview and metrics |
| 2 | `v0.1.2/02-v012-ai-insights.webp` | AI Insights with history preview and consent categories |
| 3 | `v0.1.2/03-v012-tasks.webp` | Distinct Tasks page |
| 4 | `v0.1.2/04-v012-learning.webp` | Distinct Learning page with synthetic historical records |
| 5 | `v0.1.2/05-v012-ai-plan-storage.webp` | AI analysis and save-plan follow-up controls / persistent storage UI |
| 6 | `v0.1.2/06-v012-ai-restored.webp` | Reopened app showing restored AI insights |

`../app.json` also sets the **Cover image URL** to the first authentic v0.1.2 screenshot rather than an unrelated ChatGPT share page. The user's original Anna Listing form displayed a ChatGPT share link as Cover URL; this GitHub manifest update does **not** automatically edit the remote Console.

**Required provider step:** in the original app's **Anna Developer Console → Listing**, replace all old v0.1.1 screenshot URLs with the six new commit-pinned URLs and replace/clear the old cover URL; click Save, refresh, re-open and confirm all URLs persist and render as images. This is a **remote state change**, not accomplished by editing GitHub. No `apps push`, `cut`, `release`, or `submit-review` is performed by these screenshot commits.

## Historical v0.1.1 screenshots

Five v0.1.1 screenshots — historical evidence

Five screenshots supplied by the owner on 2026-11-17 and captured from the real Life Control app running in Anna. The screenshot contents are genuine. Files were converted from PNG to WebP at quality 80 for web delivery; no AI imagery or invented app output was added.

| Order | Screenshot | Evidence |
| --- | --- | --- |
| 1 | `01-ai-dashboard-and-trend.webp` | AI-first dashboard, trend preview and selective category controls |
| 2 | `02-ai-analysis-and-plan.webp` | Completed-week evidence, 50% trend and seven-day AI plan |
| 3 | `03-productivity-modules.webp` | Tasks, Money, Journal and Savings goal forms |
| 4 | `04-learning-and-privacy.webp` | Historical Learning records and local data-erase controls |
| 5 | `05-saved-plan-follow-up.webp` | Previous AI plan follow-up, explicit evidence limits and save/delete controls |

These are public-facing synthetic/test-only records. A small Anna translate-overlay icon appears near the right edge in some originals; for a polished Listing, recapture those views without the overlay if desired.

For the official Anna Listing, use the **raw** HTTPS URLs for the five files (not GitHub `blob/` webpage URLs). The Anna Console Listing is independent of the app UI bundle: setting URLs in this repo does not automatically save them in the Console. Save them there, refresh, and open the URLs to confirm.

The old frozen app version v0.1.0 is not modified by this screenshot addition.
