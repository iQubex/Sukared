# SukaRed Frontend Deployment

The frontend is a History API single-page application. Every browser route must serve `index.html` while static assets keep their normal paths.

For a Render Static Site:

- Publish directory: repository frontend root
- Rewrite rule: `/*` to `/index.html` with status `200`
- Keep the backend as a separate web service
- Do not proxy `/obfuscate` through the static frontend rewrite

The committed `_redirects` file expresses the same fallback rule for static hosts that support it. The frontend calls the production API at `https://sukared-backend.onrender.com/obfuscate`; API traffic is therefore not captured by the frontend rewrite.

For local development run:

```powershell
node frontend-server.js
```

The local server provides SPA fallback for `/dashboard`, `/history`, `/pricing`, `/changelog`, `/credits`, `/profile`, and `/settings`.
