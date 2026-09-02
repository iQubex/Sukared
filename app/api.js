(function () {
    'use strict';

    const local = ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname);
    const configuredBase = String(window.LUAVEX_CONFIG?.apiBase || '').replace(/\/+$/, '');
    const base = configuredBase || (local ? 'http://localhost:3001' : location.origin);
    const request = async (path, options = {}) => {
        const response = await fetch(`${base}${path}`, { credentials: 'include', ...options });
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
    window.LuavexAPI = {
        base,
        request,
        authUrl: `${base}/auth/discord`,
        isLocal: local,
        paths: Object.freeze({ obfuscate: '/obfuscate', health: '/health' })
    };
})();
