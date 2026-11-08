(function () {
    'use strict';

    const local = ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname);
    const sameOriginProxy = !local && window.LUAVEX_CONFIG?.sameOriginProxy === true;
    const configuredBase = String(window.LUAVEX_CONFIG?.apiBase || '').replace(/\/+$/, '');
    const base = sameOriginProxy ? location.origin
        : (configuredBase || (local ? 'http://localhost:3001' : 'https://luavex-api.duckdns.org'));
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
    const protectedScripts = async options => {
        let payload;
        try { payload = await request('/protected-scripts', { cache: 'no-store', ...options }); }
        catch (error) { if (error.status === 404) return null; throw error; }
        const slots = payload.freeSlots;
        if (!Array.isArray(payload.scripts) || slots?.limit !== 6 ||
            !Number.isInteger(slots.used) || slots.used < 0 || slots.used > slots.limit)
            throw new Error('Protected script status could not be loaded.');
        return { scripts: payload.scripts.map(({ id, name, createdAt, tier }) => {
            if (typeof id !== 'string' || !/^[a-f0-9]{48}$/.test(id) || typeof name !== 'string' ||
                !Number.isFinite(createdAt) || Number.isNaN(new Date(createdAt).getTime()) || !['FREE', 'PAID'].includes(tier))
                throw new Error('Invalid protected script record.');
            return { id, name, createdAt, tier };
        }), freeSlots: { used: slots.used, limit: slots.limit } };
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
        protectedScripts,
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
