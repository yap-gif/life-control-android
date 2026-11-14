# Life Control | 0.1.0 release candidate gate

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
| Source regression | **38 / 38 tests**, `validate --strict`, local dev harness | GitHub Actions |
| Listing structural preflight | Pass with **verified commit-pinned public links**; 38/38 automated tests | CI `npm run preflight`, `validate --strict` |

## Hard gates before irreversible operations

- [x] **Stable public local links:** `app.json` uses GitHub permalink commit `972b8294735310f39000b98ad6abf24ce4bd6e75` for the homepage and privacy policy. Both URLs were fetched successfully through the connected GitHub source. The Anna **remote Listing tab** must still be updated and confirmed. Do not merge PR #2 or overwrite `main` without authorization.
- [ ] **Listing tab:** Windows `apps status` on 2026-11-14 returned remote **name: Life Control**, and the developer confirmed this is the intended final product name. Local `app.json`, UI and manifest titles have now been changed to **Life Control**. Verify the same name remains in the Console after the next private draft push. Also verify tagline, long description, category, homepage, support, privacy URL and media. The local `app.json` cannot prove the remote Listing contains these fields.
- [ ] **Logo:** Developer accepted the blue/teal creative direction. The actual logo upload to Anna **Listing → Upload logo** is still pending (JPEG/PNG/WebP/GIF, ≤2 MB).
- [ ] **Actual screenshots:** Six developer-approved AI-generated **promotional concepts** have been packaged separately from **three real previous Harness captures**. The six concept images are **not** genuine screenshots; some include non-existent UI and incorrect privacy/reminder claims and must not be entered in Anna's Screenshot URLs as live product captures. Capture fresh installed `0.0.0-draft` screenshots with synthetic records, host at HTTPS URLs and verify each without account credentials.
- [ ] **Accessibility:** A keyboard-only smoke test was developer-reported as passed; an actual screen-reader audit (e.g. NVDA) has **not** been run. Complete it or explicitly accept/document the residual risk.
- [ ] **Failure handling:** The `--no-llm` case passed, but genuine quota exhaustion, storage permission failures and network interruption have not been exercised. Test safely with disposable data, or record a conscious acceptance of these residual risks.
- [x] **Local release tests:** Latest CI runs `npm.cmd test`, `npm.cmd run validate` and `npm.cmd run preflight`: **38/38 tests**, strict Anna validation passed and local metadata/link checks now pass. The separate strict release gate runs without branch warnings. This does not validate Anna's remote Listing tab, screenshot authenticity, accessibility or production failure modes.
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
# Verify commit-pinned public links through strict local checks:
npm.cmd run preflight -- --release-gate
```

This script checks only **local** metadata, privacy-file presence and links. It does not inspect real Anna Console screenshots, perform accessibility testing, access Anna credentials or modify remote state.

## Primary references

- [Listing Fields](https://anna.partners/developers/apps/app-listing) — app-level Listing metadata, logo limit and screenshots.
- [Publishing an App](https://anna.partners/developers/apps/app-publish) — draft, cut, submit, approval, release.
- [QA acceptance](./QA-ACCEPTANCE.md)
- [Store copy and image plan](./STORE-LISTING-DRAFT.md)
