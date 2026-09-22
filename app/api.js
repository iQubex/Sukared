(function () {
    'use strict';

    const local = ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname);
    const sameOriginProxy = !local && window.LUAVEX_CONFIG?.sameOriginProxy === true;
    const configuredBase = String(window.LUAVEX_CONFIG?.apiBase || '').replace(/\/+$/, '');
    const base = sameOriginProxy ? location.origin
        : (configuredBase || (local ? 'http://localhost:3001' : 'https://backend-luavex.up.railway.app'));
    const requestUrl = path => sameOriginProxy
        ? `${path.startsWith('/auth/') ? '' : '/api'}${path}`
        : `${base}${path}`;
    const request = async (path, options = {}) => {
        const response = await fetch(requestUrl(path), { credentials: 'include', ...options });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(payload.message || 'The request could not be completed.');
            error.code = payload.code || 'REQUEST_FAILED';
            error.status = response.status;
            error.payload = payload;
            throw error;
        }
        return payload;
    };
    let resourceCandidate = false;
    let obfuscatePath = '/obfuscate';
    const backendLocal = ['localhost', '127.0.0.1'].includes(new URL(base, location.origin).hostname);
    const ready = local && backendLocal ? request('/_internal/workspace-config').then(config => {
        if (config.resourceCandidate === true && config.obfuscatePath === '/_internal/resource-obfuscate') {
            resourceCandidate = true; obfuscatePath = config.obfuscatePath;
        } else if (config.resourceCandidate !== false || config.obfuscatePath !== '/obfuscate') {
            throw new Error('Invalid local workspace configuration.');
        }
    }).catch(error => { window.LuavexAPI.configurationError = error.message; }) : Promise.resolve();
    window.LuavexAPI = {
        base,
        request,
        authUrl: sameOriginProxy ? '/auth/discord' : `${base}/auth/discord`,
        sameOriginProxy,
        isLocal: local,
        ready,
        get resourceCandidate() { return resourceCandidate; },
        paths: Object.freeze({
            get obfuscate() { return sameOriginProxy ? `/api${obfuscatePath}` : obfuscatePath; },
            health: sameOriginProxy ? '/api/health' : '/health'
        })
    };
})();
