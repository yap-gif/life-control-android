# Life Control Anna Edition — visual assets claims audit

**Reviewed:** 2026-11-14  
**App:** `life-control-anna`, ID 908, Working Draft `r1`; candidate `0.1.0` is not cut.  
**Evidence:** Six AI-generated, developer-approved concept pictures plus three genuine cropped Anna Harness screenshots from earlier tests.

The developer accepted the **creative appearance** of the six generated visuals. This establishes approval of style, **not** that their illustrated UI features or example data exist in the current installed build.

## Six AI-generated concept visuals — not genuine screenshots

| Concept | Observed claim / mismatch | Store Screenshot field status |
| --- | --- | --- |
| 01 — Dashboard | Invented example metrics and UI arrangement; visually on-theme | **Do not upload as actual app screenshot** |
| 02 — Tasks | Headline says “Create reminders”, but the current build has only in-app due/overdue indicators and no scheduled OS/device push reminders | **Correct before public promotional use** |
| 03 — Weekly AI review | Synthetic review result and navigation/sidebar that are not necessarily the current UI | **Do not upload as actual app screenshot** |
| 04 — Consent | Consent concept is directionally accurate, but the illustrated side-by-side model result and layout are not the observed implemented UI | **Do not upload as actual app screenshot** |
| 05 — Money / learning | Text says data is processed only on user's device. **Incorrect:** records use Anna per-app platform storage, and user-selected data may be sent to Anna's model provider after explicit consent | **Blocked from public use until corrected** |
| 06 — Responsive | Illustrated phone navigation and AI card are not confirmed features in the installed mobile layout | **Do not upload as actual app screenshot** |

All six are useful for internal brand direction. Any public-facing promotional render should be corrected for accurate claims and labeled as illustration/concept if necessary.

## Actual crop evidence — eligible for internal review, not final installed-app screenshots

The separate asset package contains:

- `01-actual-overview-empty.png`: from developer-supplied real Harness screenshot; application empty state.
- `02-actual-overview-test-data.png`: from developer-supplied real Harness screenshot; fictitious records.
- `03-actual-ai-review.png`: from developer-supplied real Harness screenshot; only part of model result.

The original Harness chrome (including potentially session-tokenized URLs) and RPC panels were cropped out. However, these are **older local Harness** captures, not freshly captured public Anna Chat `0.0.0-draft`. They should not be labeled as proof of live deployed app behavior.

## Release media gate

- [x] Visual creative direction approved by developer.
- [x] Preliminary logo supplied; developer has not reported remote Listing logo upload.
- [x] Six conceptual images packaged separately from three genuine old Harness crops.
- [ ] Correct concept #05's false local-only claim before any public distribution.
- [ ] Capture final screenshot URLs from real installed app with synthetic data and no account/session/RPC details, and inspect every image.
- [ ] Host final real screenshots publicly over HTTPS, maximum six URLs.
- [ ] Verify the exact images displayed in Anna's **Listing** match the implemented UI.
- [ ] Only then freeze, submit or release a version with separate explicit authorization.

## Other links

- [Release gate](./RELEASE-CANDIDATE-0.1.0.md)
- [Privacy notice](./PRIVACY.md)
- [Store listing draft](./STORE-LISTING-DRAFT.md)
