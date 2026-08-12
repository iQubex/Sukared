# SukaRed 1.0 Frontend SaaS Report

Date: 2026-07-15

## Routes

- `/` redirects in the client to `/dashboard`
- `/dashboard`
- `/history`
- `/history/:id`
- `/pricing`
- `/changelog`
- `/credits`
- `/profile`
- `/settings`
- Unknown paths render a styled 404 page

The router uses the History API. Internal navigation uses `pushState`, browser back/forward uses `popstate`, query strings are preserved, and route changes do not reload the application.

## Render And Local Fallback

`_redirects` rewrites frontend paths to `/index.html` with status 200. The production API uses a separate backend origin and is not captured by this rewrite. `frontend-server.js` provides equivalent SPA fallback locally.

## Local History

Database: `SukaRedLocal`

Version: `1`

Object store: `builds`, keyed by `id`, with `createdAt`, `status`, and `profile` indexes.

Records contain operational metadata, safe public errors, optional generated output, and bounded technical metadata. They never contain submitted source, source snippets, decoded strings, extracted URLs, filesystem paths, or stack traces.

IndexedDB is preferred. If it is unavailable or a write fails, the application falls back to localStorage key `sukared.history.v1` with minimal metadata and output retention forced off. Storage failures do not block builds.

## Settings

Settings key: `sukared.settings.v1`

Schema version: `1`

Fields:

- `profile`
- `wordWrap`
- `minimap`
- `animations`
- `keepOutputs`
- `maxHistoryEntries`
- `retentionDays`

Defaults are Light+, word wrap on, minimap off, animations on, output retention off, 100 entries, and no age-based deletion.

## Retention

History is pruned after writes and settings changes. Entries older than 7, 30, or 90 days are removed when configured. When the maximum count is exceeded, the oldest records are removed first.

Generated output is stored only when `keepOutputs` is enabled and the output is no larger than the local 2 MiB retention guard. Otherwise `outputAvailable` is false and `outputText` is null.

Metadata export excludes source and output. Import validates schema/version, sanitizes records, disables imported output, and skips existing IDs.

## Build Lifecycle

A `building` record is created before the API call and uses its local ID as the idempotency key. The same record is updated to `completed`, `failed`, `timeout`, or `cancelled`. Parser failures without a server Build ID receive a `LOCAL-FAIL-*` identifier. Failed records always report `creditCharged: false`.

## Privacy And Security

- History user values are rendered with `textContent`.
- Imported records are schema-validated and bounded.
- Only base file names are retained.
- Editor source remains in memory and is never persisted.
- Generated output is opt-in and local only.
- Payment and authentication controls remain disabled.
- Hell, Blatant, and Fatality remain unavailable.

## Responsive And Accessibility

Desktop uses two editor columns. Tablet stacks editors. Mobile uses an accessible hamburger navigation and single-column history/settings layouts. Modal focus trapping, Escape close, semantic buttons/links, visible focus states, status regions, reduced motion, custom scrollbars, and disabled semantics are implemented.

## Remaining Backend Placeholders

- Authentication and cloud synchronization
- Production credits and payment processing
- Cloud history
- API keys
- Server-driven transaction history
- Explicit in-flight build cancellation endpoint

None of these placeholders are presented as functional during beta.
