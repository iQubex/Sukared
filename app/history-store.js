(function () {
    'use strict';

    const DB_NAME = 'SukaRedLocal';
    const DB_VERSION = 1;
    const STORE_NAME = 'builds';
    const FALLBACK_KEY = 'sukared.history.v1';
    const SETTINGS_KEY = 'sukared.settings.v1';
    const allowedStatuses = new Set(['building', 'completed', 'failed', 'cancelled', 'timeout']);
    const defaults = Object.freeze({
        version: 1,
        profile: 'light_plus',
        wordWrap: true,
        minimap: false,
        animations: true,
        keepOutputs: false,
        maxHistoryEntries: 100,
        retentionDays: 0
    });

    const text = (value, max = 240) => String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
    const number = (value) => value === null || value === undefined || value === ''
        ? null
        : (Number.isFinite(Number(value)) ? Number(value) : null);
    const boolOrNull = (value) => typeof value === 'boolean' ? value : null;
    const safeMetadata = (value) => {
        try {
            const json = JSON.stringify(value || {});
            return json.length <= 50000 ? JSON.parse(json) : {};
        } catch (_) {
            return {};
        }
    };

    const sanitizeRecord = (raw = {}) => ({
        id: text(raw.id || crypto.randomUUID(), 100),
        buildId: text(raw.buildId, 120),
        createdAt: text(raw.createdAt || new Date().toISOString(), 40),
        completedAt: raw.completedAt ? text(raw.completedAt, 40) : null,
        status: allowedStatuses.has(raw.status) ? raw.status : 'failed',
        profile: text(raw.profile || 'Light+', 30),
        sourceName: text(raw.sourceName || 'Untitled Script', 180),
        sourceOrigin: raw.sourceOrigin === 'file' ? 'file' : 'editor',
        sourceBytes: Math.max(0, number(raw.sourceBytes) || 0),
        outputBytes: number(raw.outputBytes),
        buildTimeMs: number(raw.buildTimeMs),
        vmApplied: boolOrNull(raw.vmApplied),
        virtualizedFunctions: number(raw.virtualizedFunctions),
        eligibleFunctions: number(raw.eligibleFunctions),
        coveragePercent: number(raw.coveragePercent),
        astCoveragePercent: number(raw.astCoveragePercent),
        errorCode: raw.errorCode ? text(raw.errorCode, 80) : null,
        errorMessage: raw.errorMessage ? text(raw.errorMessage, 600) : null,
        failureStage: raw.failureStage ? text(raw.failureStage, 80) : null,
        runtimeVersion: raw.runtimeVersion ? text(raw.runtimeVersion, 100) : null,
        outputAvailable: raw.outputAvailable === true && typeof raw.outputText === 'string',
        outputText: raw.outputAvailable === true && typeof raw.outputText === 'string' ? raw.outputText : null,
        creditCharged: false,
        metadata: safeMetadata(raw.metadata)
    });

    class SukaRedHistoryStore {
        constructor() {
            this.db = null;
            this.mode = 'indexeddb';
            this.ready = this.open();
        }

        async open() {
            if (!('indexedDB' in window)) {
                this.mode = 'localStorage';
                return;
            }
            try {
                this.db = await new Promise((resolve, reject) => {
                    const request = indexedDB.open(DB_NAME, DB_VERSION);
                    request.onupgradeneeded = () => {
                        const db = request.result;
                        if (!db.objectStoreNames.contains(STORE_NAME)) {
                            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                            store.createIndex('createdAt', 'createdAt');
                            store.createIndex('status', 'status');
                            store.createIndex('profile', 'profile');
                        }
                    };
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                    request.onblocked = () => reject(new Error('History database is blocked.'));
                });
            } catch (_) {
                this.mode = 'localStorage';
                this.db = null;
            }
        }

        fallbackRead() {
            try {
                const value = JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
                return Array.isArray(value) ? value.map(sanitizeRecord) : [];
            } catch (_) {
                return [];
            }
        }

        fallbackWrite(records) {
            const minimal = records.map(record => ({ ...record, outputAvailable: false, outputText: null, metadata: {} }));
            localStorage.setItem(FALLBACK_KEY, JSON.stringify(minimal));
        }

        async transaction(mode, operation) {
            await this.ready;
            if (!this.db) return null;
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(STORE_NAME, mode);
                const store = tx.objectStore(STORE_NAME);
                let result;
                try { result = operation(store); } catch (error) { reject(error); return; }
                tx.oncomplete = () => resolve(result?.result);
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error || new Error('History transaction aborted.'));
            });
        }

        async list() {
            await this.ready;
            if (!this.db) return this.fallbackRead().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            const records = await new Promise((resolve, reject) => {
                const tx = this.db.transaction(STORE_NAME, 'readonly');
                const request = tx.objectStore(STORE_NAME).getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
            return records.map(sanitizeRecord).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }

        async get(id) {
            const safeId = text(id, 100);
            await this.ready;
            if (!this.db) return this.fallbackRead().find(item => item.id === safeId) || null;
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(STORE_NAME, 'readonly');
                const request = tx.objectStore(STORE_NAME).get(safeId);
                request.onsuccess = () => resolve(request.result ? sanitizeRecord(request.result) : null);
                request.onerror = () => reject(request.error);
            });
        }

        async put(record) {
            const clean = sanitizeRecord(record);
            try {
                await this.ready;
                if (this.db) await this.transaction('readwrite', store => store.put(clean));
                else {
                    const records = this.fallbackRead().filter(item => item.id !== clean.id);
                    records.push(clean);
                    this.fallbackWrite(records);
                }
                await this.prune();
                return clean;
            } catch (error) {
                this.mode = 'localStorage';
                this.db = null;
                try {
                    const records = this.fallbackRead().filter(item => item.id !== clean.id);
                    records.push({ ...clean, outputAvailable: false, outputText: null, metadata: {} });
                    this.fallbackWrite(records);
                    return clean;
                } catch (_) {
                    throw error;
                }
            }
        }

        async update(id, changes) {
            const current = await this.get(id);
            if (!current) return null;
            return this.put({ ...current, ...changes, id: current.id });
        }

        async delete(id) {
            await this.ready;
            if (this.db) return this.transaction('readwrite', store => store.delete(text(id, 100)));
            this.fallbackWrite(this.fallbackRead().filter(item => item.id !== id));
        }

        async clearByStatus(statuses) {
            const wanted = new Set(statuses);
            const records = await this.list();
            await Promise.all(records.filter(item => wanted.has(item.status)).map(item => this.delete(item.id)));
        }

        async clearAll() {
            await this.ready;
            if (this.db) return this.transaction('readwrite', store => store.clear());
            localStorage.removeItem(FALLBACK_KEY);
        }

        async prune() {
            const settings = loadSettings();
            let records = await this.list();
            if (settings.retentionDays > 0) {
                const cutoff = Date.now() - settings.retentionDays * 86400000;
                const expired = records.filter(item => new Date(item.createdAt).getTime() < cutoff);
                await Promise.all(expired.map(item => this.delete(item.id)));
                records = records.filter(item => !expired.includes(item));
            }
            const overflow = records.slice(Math.max(1, settings.maxHistoryEntries));
            await Promise.all(overflow.map(item => this.delete(item.id)));
        }

        async exportMetadata() {
            const records = (await this.list()).map(item => ({ ...item, outputAvailable: false, outputText: null }));
            return { schema: 'SukaRedHistory', version: 1, exportedAt: new Date().toISOString(), records };
        }

        async importMetadata(payload) {
            if (!payload || payload.schema !== 'SukaRedHistory' || payload.version !== 1 || !Array.isArray(payload.records)) {
                throw new Error('Unsupported history file.');
            }
            const existing = new Set((await this.list()).map(item => item.id));
            let imported = 0;
            for (const raw of payload.records.slice(0, 1000)) {
                const record = sanitizeRecord({ ...raw, outputAvailable: false, outputText: null });
                if (existing.has(record.id)) continue;
                await this.put(record);
                imported++;
            }
            return imported;
        }
    }

    const loadSettings = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
            return {
                ...defaults,
                ...saved,
                version: 1,
                profile: ['light', 'light_plus', 'good', 'pro'].includes(saved.profile) ? saved.profile : defaults.profile,
                maxHistoryEntries: Math.min(500, Math.max(10, Number(saved.maxHistoryEntries) || defaults.maxHistoryEntries)),
                retentionDays: [0, 7, 30, 90].includes(Number(saved.retentionDays)) ? Number(saved.retentionDays) : 0
            };
        } catch (_) {
            return { ...defaults };
        }
    };

    const saveSettings = (changes) => {
        const value = { ...loadSettings(), ...changes, version: 1 };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
        window.dispatchEvent(new CustomEvent('sukared:settings', { detail: value }));
        return value;
    };

    window.SukaRedHistoryStore = SukaRedHistoryStore;
    window.SukaRedSettings = { defaults, load: loadSettings, save: saveSettings };
})();
