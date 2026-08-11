# Luavex Frontend

Static frontend for Luavex 1.2.

## Local development

```powershell
node frontend-server.js
```

The site is available at `http://localhost:8080`. Local requests use
`http://localhost:3000`; production requests use the configured Render backend.

No backend secrets belong in this repository. Discord credentials and session
secrets must be configured on the backend hosting service.
