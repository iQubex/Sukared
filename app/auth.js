(function () {
    'use strict';

    const localAccount = Object.freeze({
        id: 'luavex-local-development',
        username: 'local',
        displayName: 'Local Developer',
        avatarUrl: null,
        plan: 'development'
    });
    const local = window.LuavexAPI.isLocal === true;
    const state = {
        loaded: local,
        authenticated: local,
        account: local ? localAccount : null,
        localDevelopment: local
    };
    const listeners = new Set();
    const emit = () => {
        const snapshot = { ...state };
        listeners.forEach(listener => listener(snapshot));
        window.dispatchEvent(new CustomEvent('luavex:auth', { detail: snapshot }));
    };
    const refresh = async () => {
        try {
            const data = await window.LuavexAPI.request('/auth/session');
            Object.assign(state, {
                loaded: true,
                authenticated: local || data.authenticated === true,
                account: data.account || (local ? localAccount : null),
                localDevelopment: local || data.localDevelopment === true
            });
        } catch (_) {
            Object.assign(state, {
                loaded: true,
                authenticated: local,
                account: local ? localAccount : null,
                localDevelopment: local
            });
        }
        emit();
        return { ...state };
    };
    const login = () => {
        if (local) return refresh();
        location.href = window.LuavexAPI.authUrl;
    };
    const logout = async () => {
        if (local) {
            Object.assign(state, { loaded: true, authenticated: true, account: localAccount, localDevelopment: true });
            emit();
            return;
        }
        await window.LuavexAPI.request('/auth/logout', { method: 'POST' });
        Object.assign(state, { loaded: true, authenticated: false, account: null, localDevelopment: false });
        emit();
        window.sukaredApp?.router?.navigate('/workspace');
    };
    const subscribe = listener => { listeners.add(listener); listener({ ...state }); return () => listeners.delete(listener); };
    window.LuavexAuth = { state, refresh, login, logout, subscribe };
})();
