(function () {
    'use strict';

    const SETTINGS_KEY = 'luavex.settings.v2';
    const defaults = Object.freeze({
        version: 2,
        profile: 'light_plus',
        wordWrap: true,
        minimap: false,
        animations: true
    });

    const normalize = raw => ({
        id: String(raw.id || ''),
        buildId: String(raw.buildId || raw.id || ''),
        createdAt: raw.timestamp || new Date().toISOString(),
        completedAt: raw.timestamp || null,
        status: raw.status === 'success' ? 'completed' : 'failed',
        profile: String(raw.profile || 'unknown').replace(/^./, value => value.toUpperCase()),
        sourceName: `Build ${String(raw.buildId || raw.id || '').slice(0, 12)}`,
        sourceOrigin: 'account',
        sourceBytes: Number(raw.inputBytes) || 0,
        outputBytes: Number(raw.outputBytes) || 0,
        buildTimeMs: Number(raw.buildDurationMs) || 0,
        vmApplied: raw.vmApplied === true,
        errorCode: raw.errorCode || null,
        errorMessage: raw.errorCode ? 'The build did not complete.' : null,
        outputAvailable: false,
        outputText: null,
        metadata: { protectionSummary: raw.protectionSummary || '' }
    });

    class SukaRedHistoryStore {
        constructor() {
            this.mode = 'account-api';
            this.ready = Promise.resolve();
        }

        async list() {
            if (!window.LuavexAuth.state.authenticated) return [];
            const payload = await window.LuavexAPI.request('/builds/history');
            return (payload.records || []).map(normalize);
        }

        async get(id) {
            if (!window.LuavexAuth.state.authenticated) return null;
            try {
                const payload = await window.LuavexAPI.request(`/builds/history/${encodeURIComponent(id)}`);
                return normalize(payload.record);
            } catch (error) {
                if (error.status === 404) return null;
                throw error;
            }
        }

        async put() { return null; }
        async update() { return null; }

        async delete(id) {
            return window.LuavexAPI.request(`/builds/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
        }

        async clearByStatus(statuses) {
            const wanted = new Set(statuses);
            const records = await this.list();
            await Promise.all(records.filter(record => wanted.has(record.status)).map(record => this.delete(record.id)));
        }

        async clearAll() { return window.LuavexAPI.request('/builds/history', { method: 'DELETE' }); }
        async prune() { return null; }
        async exportMetadata() { return { schema: 'LuavexAccountHistory', version: 1, records: await this.list() }; }
        async importMetadata() { throw new Error('Account history imports are not supported.'); }
    }

    const loadSettings = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
            return {
                ...defaults,
                ...saved,
                version: 2,
                profile: ['light', 'light_plus', 'good', 'pro', 'hell'].includes(saved.profile)
                    ? saved.profile : defaults.profile
            };
        } catch (_) { return { ...defaults }; }
    };

    const saveSettings = changes => {
        const value = { ...loadSettings(), ...changes, version: 2 };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
        window.dispatchEvent(new CustomEvent('sukared:settings', { detail: value }));
        return value;
    };

    window.SukaRedHistoryStore = SukaRedHistoryStore;
    window.SukaRedSettings = { defaults, load: loadSettings, save: saveSettings };
})();
