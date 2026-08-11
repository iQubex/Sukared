(function () {
    'use strict';

    const state = { loaded: false, authenticated: false, account: null };
    const listeners = new Set();
    const emit = () => {
        const snapshot = { ...state };
        listeners.forEach(listener => listener(snapshot));
        window.dispatchEvent(new CustomEvent('luavex:auth', { detail: snapshot }));
    };
    const refresh = async () => {
        try {
            const data = await window.LuavexAPI.request('/auth/session');
            Object.assign(state, { loaded: true, authenticated: data.authenticated === true, account: data.account || null });
        } catch (_) {
            Object.assign(state, { loaded: true, authenticated: false, account: null });
        }
        emit();
        return { ...state };
    };
    const login = () => { location.href = window.LuavexAPI.authUrl; };
    const logout = async () => {
        await window.LuavexAPI.request('/auth/logout', { method: 'POST' });
        Object.assign(state, { loaded: true, authenticated: false, account: null });
        emit();
        window.sukaredApp?.router?.navigate('/workspace');
    };
    const subscribe = listener => { listeners.add(listener); listener({ ...state }); return () => listeners.delete(listener); };
    window.LuavexAuth = { state, refresh, login, logout, subscribe };
})();
