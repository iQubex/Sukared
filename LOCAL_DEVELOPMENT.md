# Luavex Local Development

## Profiles

- Light
- Light+
- Good (Recommended)
- Pro
- Hell (Experimental)

Hell is available only in the local development environment. It is intended for controlled testing of high-value scripts and may use more build time, memory, and output space than Pro.

Blatant and Fatality remain unavailable.

## Start Locally

Start the backend with the development launcher:

```powershell
cd Backend
npm run dev
```

This launcher sets `NODE_ENV=development`, `SUKARED_LOCAL_DEVELOPMENT=1`, and `SUKARED_HELL_ENABLED=1` before loading the API.

Start the frontend separately:

```powershell
node frontend-server.js
```

Open `http://localhost:8080/workspace`. Selecting Hell requires confirmation before each build.

## Production Safety

The production command remains:

```powershell
cd Backend
npm start
```

Hell is disabled unless all local-development conditions are explicitly satisfied. `NODE_ENV=production` always keeps Hell unavailable, including when `SUKARED_HELL_ENABLED=1` is present.
