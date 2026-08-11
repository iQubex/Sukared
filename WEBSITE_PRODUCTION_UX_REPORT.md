# Luavex Website Production UX Report

Date: 2026-08-10

## 1. Files Changed

Frontend production:

- `index.html`, `style.css`
- `app/api.js`, `app/auth.js`, `app/dashboard.js`
- `app/history-store.js`, `app/main.js`, `app/transition.js`
- `app/ui.js`, `app/views.js`

Backend production:

- `Backend/server.js`
- `Backend/core/auth/*`
- `Backend/core/accounts/build_history.js`
- `Backend/core/accounts/build_status.js`
- `Backend/core/service/build_pool.js`
- `Backend/core/service/build_worker.js`

Configuration, documentation, and validation:

- `.env.example`, `.gitignore`
- `DISCORD_KURULUM_TR.md`, `GITHUB_DEPLOYMENT_GUIDE_TR.md`
- `tests-local/website_production_ux.test.js`, `test_frontend.js`
- Relevant backend endpoint tests were updated to use the explicit test-only auth bypass.

## 2. Discord OAuth Architecture

The browser starts OAuth through `GET /auth/discord`. The backend creates a short-lived HMAC-signed state value, stores it in an HttpOnly state cookie, and redirects to Discord with only the `identify` scope. `GET /auth/discord/callback` validates both the signed state and matching cookie before exchanging the authorization code and requesting `/users/@me`.

Discord access tokens are used only for the immediate user lookup and are not returned to the frontend or retained by the account store.

## 3. Session And Security Design

- Opaque session tokens are generated with cryptographic randomness.
- Only SHA-256 token hashes are retained in the in-memory session store.
- Cookies are HttpOnly, SameSite=Lax, and Secure in production.
- Production uses the `__Host-` cookie prefix.
- Sessions expire after a configurable TTL and logout invalidates the server session.
- `/obfuscate`, history, and live status endpoints require a server-side session.
- Local development requests from `localhost`, `127.0.0.1`, or `::1` receive an isolated local account when `SUKARED_LOCAL_DEVELOPMENT=1`; production never enables this bypass.
- Production errors are mapped to stable public codes and sanitized messages.
- The account model includes identity, timestamps, plan, credits, roles, and profile permissions without exposing Discord secrets.

## 4. Build Animation Design

The former character-by-character replay was replaced by a bounded pipeline preview. At most seven source regions are shown. A lightweight scan passes through each block, applies a short protected morph, and restores the source preview while the real build continues. The panel never renders the full output and does not extend in proportion to a large script.

## 5. Progress Stage Architecture

Workers emit real stages through IPC:

`queued -> analyzing -> preparing -> virtualizing -> protecting -> integrity -> finalizing -> completed/failed`

The backend stores only the current public stage and reliable queue position. The frontend polls the account-scoped status endpoint. No fake percentages are shown, and internal seeds, descriptors, or integrity data are excluded.

## 6. Profile Card Changes

Cards now present concise purpose, build/runtime character, protection level, availability, and beta pricing. Good remains recommended, Pro remains available, Hell is publicly marked Experimental, and Blatant/Fatality remain locked. The card styling stays monochrome and increases contrast and structural detail with profile intensity.

## 7. Theme And Motion Changes

The black, white, and grayscale Luavex identity remains intact. Account menus, build states, profile cards, modals, buttons, pipeline scans, and page surfaces received restrained transitions. `prefers-reduced-motion` and the application motion setting disable nonessential animation.

## 8. Mobile Changes

Navigation, account actions, editors, build controls, profile cards, modal content, and the pipeline panel adapt at mobile breakpoints. A 390 x 844 browser check found no horizontal document overflow. Build controls stay reachable between the stacked input and output editors.

## 9. Build History

History is account-scoped and backend-owned. Records contain build ID, timestamp, profile, result, duration, input/output byte counts, VM-applied status, and a high-level summary. Source, generated output, constants, strings, bytecode, and seeds are not retained. The old local IndexedDB history path has been removed.

The current store is intentionally in memory; a durable database adapter is still required for multi-instance production persistence.

## 10. Queue And Live Status

Queue positions are derived from the real workload scheduler. Status records are isolated by account and expire automatically. A build is not marked queued until rate-limit and credit/idempotency admission succeeds, preventing stale queue entries.

## 11. Cleanup Performed

- Added deployment-safe ignore rules for secrets, logs, screenshots, local tests, generated reports, fixtures, and benchmark output.
- Audited production source for embedded credentials; no committed secret value was found.
- Confirmed historical screenshots and logs are not referenced by production, scripts, imports, or active tests.
- Server processes now write local runtime logs under the operating-system temporary directory.

## 12. Files Deleted

No active regression coverage was deleted. The environment blocked deletion of existing binary screenshots and UTF-16 log artifacts; they remain local-only and are excluded by `.gitignore` and the deployment guide.

## 13. Test Directory Location

New production UX integration coverage is in `tests-local/`. Existing backend regression tools remain under `Backend/` because moving the mature suite would create high-risk import and script churn. Both locations are explicitly excluded from production upload.

## 14. Frontend Production Directory

The current frontend deployment root is the repository root and consists of `index.html`, `style.css`, `frontend-server.js`, `_redirects`, `assets/`, and `app/`. The exact list is documented in `GITHUB_DEPLOYMENT_GUIDE_TR.md`.

## 15. Backend Production Directory

The backend deployment root is `Backend/`. Production requires `server.js`, `local_server.js` only for local development, `core/`, `utils/`, parser/runtime modules, and package manifests. Test and benchmark files are excluded from production upload.

## 16. Gitignore Rules

`.env`, `.env.*` except `.env.example`, dependency folders, logs, `tests-local/`, backend test/benchmark tools, generated reports, screenshots, and temporary benchmark output are ignored. Production frontend and backend modules remain tracked.

## 17. Validation Results

- Frontend structural regression: passed.
- OAuth state, secure cookies, logout, and session expiry: passed.
- Unauthenticated build rejection and authenticated build: passed.
- Concurrent users and account history/status isolation: passed.
- Metadata-only history and source retention scan: passed.
- Queue and live stage store: passed.
- Good and Pro production route builds: passed.
- Public and local Hell Experimental availability with operator kill switch: passed.
- Sanitized production build errors: passed.
- Service hardening, worker recovery, and worker memory budget: passed.
- 2,000-line pipeline profiling regression: passed with 99.84% wall-time accounting.
- Desktop and 390 px mobile browser validation: passed; no console errors or warnings.
- Frontend and backend local health checks: HTTP 200 / healthy.

## 18. Remaining Limitations

- Accounts, sessions, history, and live status use process memory. Production scaling across restarts or multiple VPS instances needs a shared database/session adapter such as PostgreSQL plus Redis.
- Discord OAuth cannot complete locally until valid values from `.env.example` are configured in both Discord Developer Portal and the backend environment.
- Progress stages are real but intentionally coarse; the system does not expose sensitive pipeline internals or artificial percentages.
- Existing mature backend tests remain colocated in `Backend/`; the deployment guide and ignore rules separate them without risky mass moves.

Required documents confirmed:

- `DISCORD_KURULUM_TR.md`
- `GITHUB_DEPLOYMENT_GUIDE_TR.md`
- `.env.example`
