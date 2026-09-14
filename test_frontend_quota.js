'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const dashboardSource = fs.readFileSync('app/dashboard.js', 'utf8');
const dashboardContext = vm.createContext({ window: {}, Blob });
vm.runInContext(dashboardSource, dashboardContext, { filename: 'app/dashboard.js' });
const { quotaView } = dashboardContext.window.SukaRedDashboard.helpers;
const reset = '2026-09-15T00:00:00.000Z';

assert.equal(quotaView({ authenticated: true, usage: { remaining: 2, resetsAt: reset } }).label, '2 BUILDS LEFT');
assert.equal(quotaView({ authenticated: true, usage: { remaining: 1, resetsAt: reset } }).label, '1 BUILD LEFT');
const exhausted = quotaView({ authenticated: true, usage: { remaining: 0, resetsAt: reset } });
assert.equal(exhausted.label, 'LIMIT REACHED');
assert.equal(exhausted.exhausted, true);
assert.match(exhausted.note, /^Daily limit reached\./);
assert.equal(quotaView({ authenticated: false, usage: null }).visible, false);
assert.equal(quotaView({ authenticated: true, usage: null }).visible, false, 'unknown usage must not invent availability');
assert(dashboardSource.includes('const blocked = !auth.authenticated || quota.exhausted'));
assert(dashboardSource.includes("setStatus(codeValue === 'DAILY_LIMIT_REACHED' ? 'LIMIT REACHED' : 'FAILED'"));

const events = [];
const authWindow = {
    LuavexAPI: { isLocal: false, request: async () => ({ authenticated: true, account: { id: 'a' }, usage: { limit: 2, used: 1, remaining: 1, resetsAt: reset } }) },
    dispatchEvent: event => events.push(event)
};
const authContext = vm.createContext({ window: authWindow, location: {}, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } } });
vm.runInContext(fs.readFileSync('app/auth.js', 'utf8'), authContext, { filename: 'app/auth.js' });

(async () => {
    await authWindow.LuavexAuth.refresh();
    assert.equal(authWindow.LuavexAuth.state.usage.remaining, 1, 'session reload must use server usage');
    assert.equal(authWindow.LuavexAuth.applyUsage({ limit: 2, used: 2, remaining: 0, resetsAt: reset }), true);
    assert.equal(authWindow.LuavexAuth.state.usage.remaining, 0, 'successful response usage must be authoritative');
    assert.equal(authWindow.LuavexAuth.applyUsage({ remaining: 2 }), false, 'invalid client data must not replace usage');
    assert.equal(authWindow.LuavexAuth.state.usage.remaining, 0);
    assert(dashboardSource.includes("if (data.usage) window.LuavexAuth.applyUsage(data.usage)"));
    assert(dashboardSource.includes("codeValue === 'DAILY_LIMIT_REACHED' && error.usage"));
    console.log(JSON.stringify({ passed: true, display: 'PASS', zeroState: 'PASS', authoritativeRefresh: 'PASS', signedOut: 'PASS' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
