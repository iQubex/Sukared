# Luavex Frontend

Static frontend for Luavex 1.3.

## Local development

```powershell
node frontend-server.js
```

The site is available at `http://localhost:8080`. Local requests use
`http://localhost:3001`; production requests use `LUAVEX_API_BASE` when set or the frontend origin otherwise.

No backend secrets belong in this repository. Discord credentials and session
secrets must be configured on the backend hosting service.
