# LC-P07-B-02B — Local SDK evidence and next entry gate
Date: 2026-11-24. Evidence timestamps UTC; project timezone Asia/Kuching.
Status: local read-only SDK observation complete. Real APS, remote scope and release BLOCKED.

## Provenance and boundary
Owner supplied terminal output and browser RPC screenshot/JSON; reviewed in chat, not independently replayed. No raw screenshot, development URL/token, key material, machine identity or account credential retained here. Source baseline 68ae453583bf224ee30f4687cba83ef4ce58786a. Lab is an external local directory, not the frozen bundle. Windows source check PASS with ten hard gates BLOCKED; local Git branch/tracking repaired. Linux native WSL Node 22.23.5, npm 10.9.9, uv 0.13.8, Python 3.12.16, CLI 0.1.64, dispatcher 0.33.0, runtime 0.2.0a33. Four lab files matched owner-reported normalized SHA-256:
- manifest.json: 7ffacc14404afd00b85fd7603ba6fda7e457f7f0681896d5e2e25841592edb9f
- app.json: 07ecec930a96f2b6472d531ab55342dc3b6a3462f6a4dad874c617fe72509db9
- bundle/index.html: 431bc0a33b401f02c44274c0beda178ceed430b30f002ce7b0562df45a9e97be
- bundle/app.js: f779fd727fcb8609967a35c8d768dc0cc62aafdc18c02eee4c0d04f532e7160f

Windows Doctor rejected POSIX mode and exited with libuv assertion. WSL isolated HOME, no copied credentials, Doctor exit 0. First bridge boot timed out after 8s while downloading dependencies; cache prewarm imports passed, second boot ready. Runtime banner confirms legacy in-memory backend and disabled LLM bridge. Web backend local, not called. Lab slug life-control-aps-lab-20261124, local simulated app ID 1, version declared 0.0.1. This is not a remote app identity.

## Observations
| ID | UTC time | Observed | Disposition |
|---|---|---|---|
| SDK-01 | 11:03:52.853 | SDK connect; RPC window.hello success, host_api_version 0.1.0 | PASS local |
| SDK-02 | 11:03:52.873 | GET a fresh random lab key, scope app; successful response only {"value":null}; exists/etag/generation missing | OBSERVED ambiguous absence, not initialization proof |
| SDK-03 | 11:03:52.925 | LIST same random prefix, limit 1; {"items":[],"next_cursor":null} | PASS local shape only |
| SDK-04 | 11:03:52.873 | No etag or generation in missing-key response | OBSERVED; existing-value CAS not tested |
| SDK-05 | — | No error or timeout injected in SDK run | NOT EXECUTED |
| SDK-06 | 11:03:52.925 | Probe reports 0 writes/deletes/model calls; supplied RPC view corroborates GET/LIST and window lifecycle calls only | PASS within observed run |

No claim of complete RPC audit, actual absence, quota, atomic create, CAS, production isolation, erasure or remote host parity. Do not translate value:null or empty list into create permission. No keys require deletion from this read-only run. Stop local harness and end exposed screenshot session; never share token.

## P07-B-02C entry requirements (not authorized by this record)
- Owner separately approves private independent test app creation/registration and read-only scope verification, including any service-side effects. No App 908 operations. Confirm intended Anna host/account, unique slug, actual server assigned ID distinct from 908, owner binding and private lifecycle before storage access. Do not infer ownership from local ID 1 or a 404 alone.
- Use separate lab HOME; do not copy existing tokens. CLI docs: own app storage needs no extra scopes; do not request user/tool/cross-app grants. https://github.com/Anna-Partners/anna-developer-docs/blob/main/docs/apps/app-ui-host-api.md
- Official local-dev documentation says real APS requires real LLM bridge and is incompatible with --no-llm/--mock-llm. https://github.com/Anna-Partners/anna-developer-docs/blob/main/docs/apps/local-dev.md. Verify exact installed implementation and identity resolution before enabling; require explicit approval of any potential charges and a verified zero-model-call path. No assumed free service operations.
- Initial remote phase read-only, synthetic random keys only; no writes, deletion, migrations, model calls, review, cut or release. Separate subsequent authorization required for bounded synthetic writes, cleanup and any credit-bearing test. Never guess create-only sentinel.
- All ten release gates remain BLOCKED; original release ledger and frozen files unchanged. Actual platform protocol 11 remains NOT EXECUTED.
