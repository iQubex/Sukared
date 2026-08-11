(function () {
    'use strict';

    const local = ['localhost', '127.0.0.1', ''].includes(location.hostname);
    const base = local ? 'http://localhost:3000' : 'https://sukared-backend.onrender.com';
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
    window.LuavexAPI = { base, request, authUrl: `${base}/auth/discord` };
})();
