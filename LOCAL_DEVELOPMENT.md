# Luavex Local Development

For the opt-in server-side resource candidate, seed with `npm run resource:seed-local` while the backend is stopped, then use `npm run dev:resources` in `Backend`. This also enables the existing calibration harness. The public workspace continues to use C/V2; the candidate is available only through `POST /_internal/resource-obfuscate`. See [resource usage and security boundaries](Backend/core/resources/README.md). Private registry state is outside the web workspace; the frontend only serves approved frontend assets.

Install backend dependencies, then start both processes in separate terminals:

```powershell
cd D:\Desktop\Scripts\Obfuscator\Backend
npm ci
npm run dev
```

```powershell
cd D:\Desktop\Scripts\Obfuscator
node frontend-server.js
```

Open `http://localhost:8080/#/workspace`.

The local frontend calls `http://localhost:3001/obfuscate`. For deployment, set `LUAVEX_API_BASE` on the frontend service when the API uses a different origin. Both services honor the platform-provided `PORT`; `HOST` defaults to `0.0.0.0`.

Available controls are Virtualization, VM Protection, String Protection, Constant Protection, Integrity Protection, and Minify Output. The output signature `-- Protected by Luavex 1.3` is mandatory.
