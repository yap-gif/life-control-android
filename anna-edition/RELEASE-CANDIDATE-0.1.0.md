# Life Control — Anna Edition | 0.1.0 release candidate gate

**Prepared:** 2026-11-14  
**Status:** PREPARATION ONLY — no immutable version cut or App Review submission  
**Anna app:** `life-control-anna` (ID **908**); private Working Draft `r1`, installed as `0.0.0-draft`  
**GitHub:** [Draft PR #2](https://github.com/yap-gif/life-control-android/pull/2); `main` remains unchanged.

## Evidence already accepted

| Item | Result | Evidence type |
| --- | --- | --- |
| Anna UI Bundle | 7 files / 42.0 KB; bundle ready | Anna CLI + Console screenshot |
| Private install | `Installed working draft (0.0.0-draft)` | Anna Console screenshot |
| Installed functionality | All features reported working in Anna Chat | **Developer manual report**; no production per-operation logs supplied |
| Real APS + real model | Storage persistence, category-isolated AI request and safe response observed in developer Harness | Developer screenshots and RPC logs |
| No-LLM failure | `llm_disabled` handled with safe, precise message | Developer screenshot and RPC log |
| Source regression | **36 / 36 tests**, `validate --strict`, local dev harness | GitHub Actions |
| Listing structural preflight | Pass, **two branch-link warnings** | CI `npm run preflight` |

## Hard gates before irreversible operations

- [ ] **Stable public links:** The currently configured `homepage_url` and `privacy_url` still point to the feature branch. Publish the privacy notice at a stable, public `main` or versioned URL and verify it in a logged-out browser; update Anna's actual **Listing tab**. Do not silently merge PR #2 or overwrite main.
- [ ] **Listing tab:** Verify the live Anna server listing's name, tagline, long description, category, homepage, support and privacy URLs. The local `app.json` is not independent proof that the remote Listing tab contains all fields.
- [ ] **Logo:** Developer reviews and approves the preliminary icon, verifies originality and readability at 48×48, then uploads it through **Listing → Upload logo** (JPEG/PNG/WebP/GIF, at most 2 MB).
- [ ] **Screenshots:** Capture current installed Anna Chat `0.0.0-draft` UI using only fictional records. Up to six screenshot URLs; no tokenized iframe URLs, account details, raw RPC logs or private notes. Upload/host and check public HTTPS links.
- [ ] **Accessibility:** A keyboard-only smoke test was developer-reported as passed; an actual screen-reader audit (e.g. NVDA) has **not** been run. Complete it or explicitly accept/document the residual risk.
- [ ] **Failure handling:** The `--no-llm` case passed, but genuine quota exhaustion, storage permission failures and network interruption have not been exercised. Test safely with disposable data, or record a conscious acceptance of these residual risks.
- [ ] **Release tests:** Pull the latest branch, run `npm.cmd test`, `npm.cmd run validate` and `npm.cmd run preflight -- --release-gate`. The strict release gate should fail until temporary branch URLs are corrected.
- [ ] **CLI dependency reproducibility:** The developer's Windows machine has a local, untracked `anna-edition/package-lock.json`; review its contents and decide whether to commit it so npm installs are deterministic. Do not commit `.anna/` or `node_modules/`.
- [ ] **Human authorization:** Obtain explicit separate approval to freeze `0.1.0`. A green CI or successful draft install is **not** authorization to cut, submit or release.

## Anna sequence (informational; not executed by this document)

1. **Today:** Private draft `r1` is installed and developer-reported working. Continue editing listing/assets without cutting an immutable version.
2. After all gates pass, and **only on explicit authorization**, run `anna-app apps cut 0.1.0`; confirm `apps versions life-control-anna` and the Console's UI bundle readiness.
3. After reviewing the pinned immutable candidate, and **only on separate explicit authorization**, run `anna-app apps submit-review life-control-anna`.
4. Approval is a platform decision, not guaranteed. Public `release` is a separate action requiring separate developer approval.

**Important:** Do not run `anna-app apps publish` as a shortcut: it combines push and cut. Do not run `release`, `discard`, `rename-slug` or `delete` during this review phase.

## Local read-only preflight

From `anna-edition/` on Windows PowerShell:

```powershell
npm.cmd run preflight
npm.cmd test
npm.cmd run validate
# Later, after fixing public links, evaluate the stricter gate:
npm.cmd run preflight -- --release-gate
```

This script checks only **local** metadata, privacy-file presence and links. It does not inspect real Anna Console screenshots, perform accessibility testing, access Anna credentials or modify remote state.

## Primary references

- [Listing Fields](https://anna.partners/developers/apps/app-listing) — app-level Listing metadata, logo limit and screenshots.
- [Publishing an App](https://anna.partners/developers/apps/app-publish) — draft, cut, submit, approval, release.
- [QA acceptance](./QA-ACCEPTANCE.md)
- [Store copy and image plan](./STORE-LISTING-DRAFT.md)
