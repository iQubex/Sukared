# Luavex Local Website Testing

## 1. Install dependencies

```powershell
cd D:\Desktop\Scripts\Obfuscator\Backend
npm ci
cd v2
npm run install:foundation
npm run build:foundation
```

## 2. Start the backend

```powershell
cd D:\Desktop\Scripts\Obfuscator\Backend
npm run dev
```

Backend: `http://localhost:3001`
Health: `http://localhost:3001/health`

## 3. Start the frontend

```powershell
cd D:\Desktop\Scripts\Obfuscator
node frontend-server.js
```

## 4. Test a build

Open `http://localhost:8080/#/workspace`, paste Luau source, choose the protection settings, select **Obfuscate**, then copy or download the result.

The output always starts with `-- Protected by Luavex 1.3`. VM Protection requires Virtualization; the interface prevents the invalid combination and the backend validates it independently.

## Automated verification

```powershell
cd D:\Desktop\Scripts\Obfuscator
node test_frontend.js
cd Backend
node test_local_v2_website.js
cd v2
npm run test:cleanup
```

The public frontend uses `POST /obfuscate` and does not depend on development-only routes.
