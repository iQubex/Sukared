# Luavex Local Development

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
