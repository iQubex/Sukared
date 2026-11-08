'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const tick = () => new Promise(resolve => setImmediate(resolve));

class Element {
    constructor(tag = 'div', className = '', textContent = '') {
        Object.assign(this, { tag, className, textContent, children: [], listeners: {}, value: '', dataset: {}, isConnected: true });
        this.classList = { add() {}, remove() {}, toggle() {} };
    }
    append(...children) { for (const child of children) { if (typeof child === 'string') { this.textContent += child; continue; } child.parentNode = this; this.children.push(child); } }
    replaceChildren(...children) { for (const child of this.children) child.parentNode = null; this.children = []; this.textContent = ''; this.append(...children); }
    setAttribute() {}
    removeAttribute() {}
    focus() { this.focused = true; }
    addEventListener(event, fn) { this.listeners[event] = fn; }
    removeEventListener(event) { delete this.listeners[event]; }
    fire(event) { return this.listeners[event]?.({ target: this }); }
    querySelector(selector) { return (this.selectors ??= {})[selector] ??= new Element(); }
    click() { if (this.tag === 'a') this.downloaded = true; else return this.fire('click'); }
}
const descendants = node => [node, ...node.children.flatMap(descendants)];
const id = 'a'.repeat(48);
const name = '<Example 🌙>';
const output = '-- fixture protected shell\nreturn 42';
const script = { id, name, createdAt: Date.now(), tier: 'FREE', status: 'ACTIVE' };
let slots = 0, records = [], mode = 'hosted', buildFailure, deleteStatus = 204, copied, downloaded, blob;
const calls = [], notices = [];
let decision, confirmArgs, deleteComplete, delayDelete = false;
const auth = { authenticated: true, account: { id: 'account-one' } };
const listeners = new Set();
const publish = () => listeners.forEach(fn => fn(auth));
const window = {
    LUAVEX_CONFIG: { sameOriginProxy: true }, LuavexRelease: { name: 'Luavex' },
    SukaRedIcons: { icon: () => new Element('svg') },
    SukaRedSettings: { load: () => ({ protectionFeatures: {} }) },
    SukaRedUI: { el: (...args) => new Element(...args), toast: msg => notices.push(msg),
        customSelect: () => ({ value: '', element: new Element() }),
        confirm: (...args) => { confirmArgs = args; return new Promise(resolve => { decision = resolve; }); } },
    LuavexAuth: { state: auth, subscribe(fn) { listeners.add(fn); fn(auth); return () => listeners.delete(fn); },
        applyUsage() {}, login() {}, async refresh() { auth.authenticated = false; publish(); } },
    addEventListener() {}, removeEventListener() {}
};
const response = (status, data) => ({ status, ok: status < 400,
    json: async () => { if (status === 204) throw new Error('No content'); return data; } });
const ctx = vm.createContext({
    window, location: { hostname: 'frontend.test', origin: 'https://frontend.test' }, Blob, AbortController,
    URL: class extends URL { static createObjectURL(value) { blob = value; return 'blob:test'; } static revokeObjectURL() {} },
    document: { createElement: tag => {
        const node = new Element(tag);
        if (tag === 'a') node.click = () => { downloaded = node.download; };
        return node;
    } },
    navigator: { clipboard: { writeText: async text => { copied = text; } } },
    crypto, performance, setTimeout, clearTimeout,
    fetch: async (url, options = {}) => {
        const method = options.method || 'GET';
        calls.push({ url, method, options });
        assert.equal(options.credentials, 'include');
        if (url.endsWith('/protected-scripts') && method === 'GET') {
            if (mode === 'legacy') return response(404, {});
            if (mode === 'expired') return response(401, { code: 'AUTH_REQUIRED' });
            return response(200, { scripts: records, freeSlots: { used: slots, limit: 6 } });
        }
        if (url.endsWith('/obfuscate')) {
            if (buildFailure === 'SOURCE_TOO_LARGE') return response(413, {});
            if (buildFailure) return response(409, { code: buildFailure, message: 'Free slots full' });
            records = [script]; slots = 6;
            return response(200, { obfuscated: output, script, build: {} });
        }
        if (url.endsWith('/protected-scripts/' + id) && method === 'DELETE') {
            if (delayDelete) await new Promise(resolve => { deleteComplete = resolve; });
            records = []; slots = 5;
            return response(deleteStatus, {});
        }
        throw new Error('Unexpected mock URL: ' + url);
    }
});
for (const file of ['app/api.js', 'app/dashboard.js', 'app/views.js'])
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });

(async () => {
    const helpers = window.SukaRedDashboard.helpers;
    for (const label of ['', '  ', 'x\n', '\ud800', 'x'.repeat(81), '🌙'.repeat(61)])
        assert(helpers.scriptNameError(label));
    assert.equal(helpers.scriptNameError('界'.repeat(80)), '');
    assert.equal(helpers.scriptNameError('🌙'.repeat(60)), '');
    assert.equal(helpers.bytes('é🌙'), 6);
    const outlet = new Element();
    const cleanup = await window.SukaRedDashboard.mount(outlet);
    await tick();
    const find = key => outlet.querySelector('#' + key);
    assert.equal(find('freeSlotState').textContent, 'Free Protection Slots: 0 / 6');
    assert.doesNotMatch(outlet.innerHTML, /id="scriptName"/);
    let enterName;
    window.SukaRedViews.nameScript = (_trigger, done) => { enterName = done; return () => {}; };
    find('inputFallback').value = 'é🌙';
    find('inputFallback').fire('input');
    assert.doesNotMatch(outlet.innerHTML, /sourceBytes|UTF-8 bytes/);
    await find('obfuscateBtn').fire('click');
    assert.equal(typeof enterName, 'function');
    assert(!calls.some(r => r.method === 'POST'));

    find('inputFallback').value = 'x'.repeat(2097153);
    buildFailure = 'SOURCE_TOO_LARGE';
    enterName(name);
    await tick();
    assert(calls.some(r => r.method === 'POST'));
    assert.equal(notices.at(-1), 'This script is too large to process.');
    buildFailure = undefined;
    find('inputFallback').value = 'return 42';
    await find('obfuscateBtn').fire('click');
    const posted = JSON.parse(calls.filter(r => r.method === 'POST').at(-1).options.body);
    assert.equal(posted.scriptName, name); assert.equal(posted.code, 'return 42'); assert.equal(posted.tier, undefined);
    assert.equal(find('outputFallback').value, output);
    await find('copyOutput').fire('click');
    find('downloadOutput').fire('click');
    assert.equal(copied, output); assert.equal(await blob.text(), output); assert.match(downloaded, /\.luavex\.lua$/);
    assert.equal(find('freeSlotState').textContent, 'Free Protection Slots: 6 / 6');
    assert.equal(find('obfuscateBtn').disabled, true);
    slots = 5; await find('refreshSlots').fire('click');
    assert.equal(find('obfuscateBtn').disabled, false);
    buildFailure = 'FREE_SCRIPT_LIMIT'; slots = 6;
    await find('obfuscateBtn').fire('click');
    assert.equal(find('freeSlotState').textContent, 'Free Protection Slots: 6 / 6');
    assert.equal(find('obfuscateBtn').disabled, true);
    mode = 'expired'; await find('refreshSlots').fire('click');
    assert.equal(find('obfuscateBtn').disabled, true);
    assert.equal(auth.authenticated, false);
    cleanup();
    mode = 'hosted'; auth.authenticated = true;

    let legacyReads = 0;
    const store = { list: async () => { legacyReads++; return []; } };
    const historyCleanup = window.SukaRedViews.history({ outlet, store });
    await tick();
    const read = text => descendants(outlet).find(n => n.textContent === text);
    assert(read(name)); assert(read('FREE'));
    assert(!read(id)); assert(!read(output)); assert.equal(legacyReads, 0);
    const remove = read('Delete');
    let click = remove.fire('click');
    assert(confirmArgs[0].includes(name)); assert.match(confirmArgs[1], /disable future executions/);
    assert(!calls.some(r => r.method === 'DELETE'));
    decision(false); await click;
    assert(!calls.some(r => r.method === 'DELETE'));
    delayDelete = true;
    click = remove.fire('click'); decision(true); await tick();
    assert(read(name)); assert.equal(remove.disabled, true);
    deleteComplete(); await click; delayDelete = false;
    assert.equal(calls.filter(r => r.method === 'DELETE').length, 1);
    assert(read('Free Protection Slots: 5 / 6')); assert(!read(name));
    historyCleanup();

    records = [script]; mode = 'hosted'; deleteStatus = 404;
    const staleCleanup = window.SukaRedViews.history({ outlet, store });
    await tick();
    click = read('Delete').fire('click'); decision(true); await click;
    assert(!read(name)); assert.equal(notices.filter(n => n === 'Protected script deleted').length, 1);
    staleCleanup();
    mode = 'legacy';
    const oldCleanup = window.SukaRedViews.history({ outlet, store });
    await tick();
    assert.equal(legacyReads, 1); assert(read('Build History'));
    oldCleanup();
    mode = 'expired';
    const expiredCleanup = window.SukaRedViews.history({ outlet, store });
    await tick();
    assert.equal(auth.authenticated, false); assert(read('Connect Discord')); assert.equal(legacyReads, 1);
    expiredCleanup();
    console.log('Hosted workspace, UTF-8 limits, copy/download, quota refresh, hosted delete, session expiry and legacy fallback: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
