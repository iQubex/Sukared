# LUAVEX — Public Engine Consolidation and Render Readiness Report

## 1. Executive Summary

Luavex 1.3 now presents one public product and one public protection flow. The current Luavex engine is connected to `POST /obfuscate`; the website no longer exposes implementation generations, profiles, development health labels, or foundation terminology. The protected output always begins with `-- Protected by Luavex 1.3` and uses the configured final-output minification behavior.

No production deployment was performed. The local implementation, automated suites, public-route integration, responsive layout, and browser console were validated successfully.

## 2. Previous Public Architecture

The previous website selected between two implementation generations on localhost, used profile-based settings for the older route, called a development-only route for the current engine, and displayed a development readiness indicator. The production `/obfuscate` route still led to the archived implementation.

## 3. New Single-Engine Architecture

The public frontend now has one path:

`source → protection features → POST /obfuscate → Luavex output`

There is no public engine selector or silent fallback. The backend keeps the former implementation only for local rollback/regression work.

## 4. Public Route Changes

`POST /obfuscate` now executes the current Luavex engine. It validates source size, authentication, rate limits, idempotency, feature types, and feature dependencies. The response includes only the protected output and a compact public build summary.

The browser no longer references development-only routes or implementation-generation paths.

## 5. Legacy Engine Isolation

The former implementation remains available only behind `/_internal/rollback-obfuscate`, guarded by the existing loopback/local-development policy. Production requests receive HTTP 404. It is never used as an automatic fallback when the primary engine fails.

## 6. V1/V2 Terminology Removal

The engine selector, generation labels, development readiness copy, conditional request selection, and associated public test expectations were removed. A source audit across `index.html`, public application scripts, and the frontend server found zero occurrences of the prohibited public strings.

Historical test and audit filenames retain internal generation terminology where renaming would add risk. Those references are not shipped as visible interface copy.

## 7. Clyde Terminology Audit

The public frontend, public health response, public build envelope, public error responses, changelog, and generated protected-output header contain no foundation name, branded upstream phrase, or upstream URL. The final output identity gate remains active and the cleanup validation reports zero foundation identity leakage.

Internal adapter paths and the pristine isolated foundation tree retain their technical names. They are not public product surfaces.

## 8. UI Simplification

The settings flow now opens directly to protection controls. Public labels are:

- Virtualization
- VM Protection
- String Protection
- Constant Protection
- Integrity Protection
- Minify Output

The mandatory Luavex signature is not shown as a switch.

## 9. Removed GUI Elements

Removed public elements include the engine selector, implementation-generation descriptions, protection profiles, development backend status, engine/profile rows in build summaries, and detailed architecture metadata. The build summary now shows status, build time, and output size.

## 10. Protection Settings UI

The site remains feature-based and preserves every requested public protection control. Backend option names remain stable internally while labels are concise and user-oriented. No Good, Pro, Hell, Light, or Light+ selection is exposed.

## 11. Dependency Handling

VM Protection requires Virtualization. When Virtualization is disabled, the UI disables VM Protection and provides a short explanation. The backend independently rejects the invalid combination.

## 12. Error Message Cleanup

Public configuration errors return `INVALID_PROTECTION_CONFIGURATION` with `Invalid protection configuration.` Source errors return `SOURCE_COULD_NOT_BE_PROCESSED`; unexpected failures return a generic service-unavailable message. Public errors do not include foundation names, implementation generations, stack traces, filesystem paths, or compiler internals.

## 13. Development Route Cleanup

The public frontend has no dependency on `/local/v2/health` or `/local/v2/obfuscate`. Those routes remain mounted only by the local launcher for internal compatibility and return 404 when local-development conditions are not satisfied.

## 14. API Environment Configuration

The browser consumes a generated `/app/runtime-config.js`. `LUAVEX_API_BASE` selects a separate backend origin without a source edit. Local development falls back to `http://localhost:3001`; a same-origin production setup falls back to `location.origin`.

## 15. Render Readiness

The backend and Node frontend server both honor the platform-provided `PORT` and bind to `HOST`, defaulting to `0.0.0.0`. The frontend serves SPA fallbacks and runtime API configuration. The backend keeps `FRONTEND_ORIGIN`-based credentialed CORS and the existing OAuth/session configuration.

Recommended Render shape:

- Backend Web Service: `cd Backend && npm start`
- Frontend Web Service: `node frontend-server.js`
- Frontend environment: `LUAVEX_API_BASE=https://<backend-service>`
- Backend environment: `FRONTEND_ORIGIN=https://<frontend-service>` plus required OAuth/session secrets

## 16. Health Endpoint

`GET /health` returns only:

```json
{"status":"ok","service":"Luavex"}
```

It reveals no profile, engine-generation, VM, foundation, or deployment-internal data.

## 17. Production Engine Routing

The production entry point mounts the current Luavex engine directly on `/obfuscate`. The old public handler was moved behind the local-only rollback route. A valid full-protection public request passed semantic execution, while invalid settings returned a clean structured 400 response.

## 18. Public Output Format

Luavex 1.3 output begins exactly with:

```lua
-- Protected by Luavex 1.3
```

With `minifyOutput` enabled, the executable body is one physical line. The signature is mandatory and cannot be disabled through configuration or the website.

## 19. Branding Audit

| Metric | Result |
| --- | ---: |
| Public forbidden frontend string matches | 0 |
| Foundation identity leakage | 0 |
| Production diagnostic branding count | 0 |
| Large banner present | false |
| Versioned signature | PASS |
| Visible generation selector | ABSENT |
| Visible profiles | ABSENT |

## 20. Semantic Regression

The full bootstrap suite passed source equivalence, Luau compatibility, VM-enabled/disabled behavior, Roblox compatibility, recovery fixtures, 15/15 compile-pressure cases, long-run execution, and performance gates. The public website route also passed a semantic smoke execution after consolidation.

## 21. Security Regression

The complete protection suite passed bytecode, string/constant, runtime-integrity, diversity, and performance gates. VM hardening passed with 50 unique output fingerprints and 50 unique physical layouts. The cleanup suite passed identity leakage, mandatory signature, same-seed determinism, and semantic gates.

The backend service-hardening suite also passed its authentication, CORS, minimal health response, input limits, public error sanitation, idempotent billing, telemetry privacy, worker recovery, and worker memory-budget checks.

The archived implementation’s direct regression and VM suites also pass, preserving manual rollback confidence without exposing it publicly.

## 22. Performance Result

A generated 2,000-line Luau script was measured directly and through the consolidated public route with full public protections:

| Measurement | Direct engine baseline | Public route |
| --- | ---: | ---: |
| Engine time | 151.650 ms | 112.215 ms |
| End-to-end wall time | 152.766 ms | 182.805 ms |
| Output size | 218,661 bytes | 218,374 bytes |
| Observed RSS delta | 34,004,992 bytes | 11,177,984 bytes |

Output-size ratio was `0.998687`. The route measurement includes HTTP parsing, authentication, rate limiting, idempotency, history metadata, JSON serialization, and client parsing. Engine processing did not regress in this run. These are single-run operational measurements, not a general speedup claim.

## 23. Website Validation

The normal-user browser flow passed: open workspace, configure protections, obfuscate source, receive output, and expose copy/download actions. The result began with the 1.3 signature. No engine selector, profile selection, development readiness indicator, or foundation term was visible.

The changelog shows Version 1.3 first and describes the versioned signature, unified workflow, routing readiness, output consistency, and interface cleanup without disclosing protection architecture.

## 24. Browser Console Result

The desktop and 390×844 responsive checks produced zero console warnings/errors. At 390 pixels, document `scrollWidth` equaled `clientWidth` (380 pixels in the measured content viewport), confirming no horizontal overflow after selector/status removal.

## 25. Remaining Internal Legacy References

Historical reports, test names, the isolated foundation directory, compatibility launcher routes, and archived rollback implementation retain internal names where changing them would increase regression risk. They are not referenced by the public frontend, public health response, public build response, or public errors.

## 26. Final Deployment Recommendation

The repository is ready for a controlled Render friend-testing deployment after the operator supplies the production frontend/backend origins and OAuth/session secrets. No deployment was performed in this phase. Monitor service memory and request latency during the first hosted soak; do not enable internal rollback routes in production.

LUAVEX PUBLIC CONSOLIDATION VERDICT

Public Product Name:
LUAVEX

Public Engines:
1

Primary Engine:
CURRENT CLYDE-BASED LUAVEX ENGINE

Visible V1/V2 Terminology:
NONE

Visible Clyde Terminology:
NONE

Legacy Engine:
INTERNAL ONLY

Public Route:
POST /obfuscate

Profiles:
ABSENT

Settings:
FEATURE_BASED

Render Ready:
YES

Semantic Regression:
PASS

Security Regression:
PASS

Performance:
PASS

Recommended Action:
DEPLOY FOR FRIEND TESTING

STOP AFTER COMPLETING THE CONSOLIDATION.

Do NOT begin the next security-development phase.
