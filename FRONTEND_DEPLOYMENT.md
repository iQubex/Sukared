# Luavex Frontend Deployment

The frontend is a History API single-page application. Every browser route must serve `index.html` while static assets keep their normal paths.

For a Render Static Site:

- Publish directory: repository frontend root
- Rewrite rule: `/*` to `/index.html` with status `200`
- Keep the backend as a separate web service
- Do not proxy `/obfuscate` through the static frontend rewrite

The committed `_redirects` file expresses the same fallback rule for static hosts that support it. When the frontend and backend use different origins, run the Node frontend service and set `LUAVEX_API_BASE` to the backend origin. The browser always calls the normal `/obfuscate` route; no source edit is needed between local and production environments.

For local development run:

```powershell
node frontend-server.js
```

The local server provides SPA fallback for `/dashboard`, `/history`, `/changelog`, `/credits`, and `/settings`. It honors `PORT` and binds to `HOST` (default `0.0.0.0`).
