# LC-P08-C1-R1 — Correct floating-point UI assertion
Date: 2026-11-26 Asia/Kuching. Baseline 9f8e84c8abec54367375f12ccebdb8d28fb8c06f.
Owner Windows G0–G4 passed, G5 stopped at 22/23 UI tests. G6–G9 not executed. Linux CI Source Checks 45802198494 job 139848028535: 243/244 passed, one failure, no skips/cancellations. Browser QA 45802198478 succeeded. Both environments report 55.00000000000001 instead of exact 55 in 08C1-03; the journal assertions after it did not execute.
 
Test-only correction: assert exact integer learning totals (165 minutes, target 300), meter maximum (100) and exact accessible text; use absolute tolerance strictly below 1e-10 percentage points for the floating-point ratio. Preserve all remaining journal, revision, route and focus assertions; no test removal or skip. Expected suite remains 244; actual outcomes must be captured separately. No production or preview runtime code changed.
 
Scope: test and this note only. No real APS/AI, Anna login, credits, app mutation or release. App 908 / v0.1.2 / 2720 frozen; ten production gates BLOCKED. Anna mail deferred. C2 remains pending C1-R1 acceptance.
