# Life Control | 0.1.0 release candidate gate

**Prepared:** 2026-11-14  
**Status:** **IMMUTABLE VERSION CUT CONFIRMED** (Anna version ID **2279**); **no App Review submission, no publication**  
**Anna app:** `life-control-anna` (ID **908**), DRAFT; Working Draft **r2** was tested; immutable **v0.1.0 (version ID 2279)** now exists and is not published  
**GitHub:** [Draft PR #2](https://github.com/yap-gif/life-control-android/pull/2); `main` remains unchanged.

## Evidence already accepted

| Item | Result | Evidence type |
| --- | --- | --- |
| Anna UI Bundle | 7 files / 42.0 KB; bundle ready | Anna CLI + Console screenshot |
| Private install | `Installed working draft (0.0.0-draft)` | Anna Console screenshot |
| Installed functionality | All features reported working in Anna Chat | **Developer manual report**; no production per-operation logs supplied |
| Real APS + real model | Storage persistence, category-isolated AI request and safe response observed in developer Harness | Developer screenshots and RPC logs |
| No-LLM failure | `llm_disabled` handled with safe, precise message | Developer screenshot and RPC log |
| Source regression | **38 / 38 tests**, `validate --strict`, local dev harness | GitHub Actions |
| Listing structural preflight | Pass with **verified commit-pinned public links**; 38/38 automated tests | CI `npm run preflight`, `validate --strict` |
| Immutable version freeze | `apps cut 0.1.0`: id 2279; `apps versions` and `apps status` confirm 1 version, app still DRAFT, unpublished | Developer CLI transcript |

## Post-freeze Console acceptance (developer report, 2026-11-14)

The developer confirmed the **Versions** tab shows immutable **v0.1.0, version ID 2279** and the associated UI Bundle **Ready**. In **Listing**, the developer verified **Life Control** name, Productivity category, app description, approved logo, genuine app screenshot entries and the corrected privacy policy URL. These checks are recorded as **developer-reported PASS**, not independently retrieved Anna server metadata. No App Review submission or public release has taken place.

## Hard gates before irreversible operations

- [x] **Stable public local links:** `app.json` now uses verified GitHub permalink commit `f72944d867da70aa206016b5ca5fa4a025855dba` for its homepage and privacy notice, whose heading correctly says **Life Control**. These local values were updated **after r2 was uploaded**, so the remote Anna Listing must be checked and, if necessary, explicitly updated. No PR merge is required.
- [x] **Listing tab (developer-reported verification on 2026-11-14):** Remote **name: Life Control** was confirmed by the CLI, and the developer's installed r2 screenshot now independently shows the **Life Control** window and in-app header. The developer also reports all checks passed. Still verify the Console's actual tagline, description, category, homepage/support/**updated privacy URL** and screenshots, because neither the CLI status command nor the screenshot exposes these metadata fields.
- [x] **Logo Listing field (developer-reported):** Developer's installed-app icon screenshot shows the approved blue/teal icon labeled **Life Control**. This confirms the visible installed app icon, **not** the remote Listing's specific `logo_url` or upload result; inspect Listing → Logo to verify it.
- [x] **Actual screenshot Listing review (developer-reported):** Developer supplied a genuine **installed r2 empty-state UI** screenshot and an installed app icon screenshot. A crop-only authentic overview screenshot is packaged outside GitHub; additional real feature screenshots and their public HTTPS URLs are still needed if the Listing uses a six-image gallery. The six developer-approved AI-generated visuals are **promotional concepts, not real screenshots**; some contain inaccurate functionality/privacy claims and must not be used as actual app screenshots.
- [ ] **Accessibility:** A keyboard-only smoke test was developer-reported as passed; an actual screen-reader audit (e.g. NVDA) has **not** been run. Complete it or explicitly accept/document the residual risk.
- [ ] **Failure handling:** The `--no-llm` case passed, but genuine quota exhaustion, storage permission failures and network interruption have not been exercised. Test safely with disposable data, or record a conscious acceptance of these residual risks.
- [x] **Local release tests:** Latest CI runs `npm.cmd test`, `npm.cmd run validate` and `npm.cmd run preflight`: **38/38 tests**, strict Anna validation passed and local metadata/link checks now pass. The separate strict release gate runs without branch warnings. This does not validate Anna's remote Listing tab, screenshot authenticity, accessibility or production failure modes.
- [ ] **CLI dependency reproducibility:** The developer's Windows machine has a local, untracked `anna-edition/package-lock.json`; review its contents and decide whether to commit it so npm installs are deterministic. Do not commit `.anna/` or `node_modules/`.
- [x] **Human authorization for cut:** Developer explicitly requested the `0.1.0` immutable freeze and executed `apps cut 0.1.0`; CLI independently confirms version ID **2279**. **No authorization for App Review submission or public release has been granted.**

## Anna sequence (informational; not executed by this document)

1. **2026-11-14:** Working Draft `r2` was uploaded to existing app ID 908. Developer supplied a live installed-window screenshot showing **Life Control** branding and reported all checks passed. The current local privacy/homepage links were subsequently updated to a newer verified public commit; remote Listing values need to be reconciled before review.
2. **Completed 2026-11-14:** `anna-app apps cut 0.1.0` created immutable version **2279**. Post-cut `apps versions` and `apps status` verified the DRAFT state and 1 unpublished version. Recheck the candidate UI bundle and Listing in the Console.
3. **Next gate, not yet authorized:** The developer reports the remote Listing and frozen bundle checks passed. Only on separate explicit authorization, run `anna-app apps submit-review life-control-anna` to pin v0.1.0 as review candidate.
4. Approval is a platform decision, not guaranteed. Public `release` is a separate action requiring separate developer approval.

**Important:** **Do not repeat `apps cut 0.1.0`** — version ID 2279 already exists and is immutable. Do not use `apps publish` as a shortcut: it combines push and cut. Do not run `submit-review`, `release`, `discard`, `rename-slug` or `delete` without the appropriate new approval. A warning/hint printed by CLI is not authorization to release.

## Local read-only preflight

From `anna-edition/` on Windows PowerShell:

```powershell
npm.cmd run preflight
npm.cmd test
npm.cmd run validate
# Verify commit-pinned public links through strict local checks:
npm.cmd run preflight -- --release-gate
```

This script checks only **local** metadata, privacy-file presence and links. It does not inspect real Anna Console screenshots, perform accessibility testing, access Anna credentials or modify remote state.

## Primary references

- [Listing Fields](https://anna.partners/developers/apps/app-listing) — app-level Listing metadata, logo limit and screenshots.
- [Publishing an App](https://anna.partners/developers/apps/app-publish) — draft, cut, submit, approval, release.
- [QA acceptance](./QA-ACCEPTANCE.md)
- [Store copy and image plan](./STORE-LISTING-DRAFT.md)
