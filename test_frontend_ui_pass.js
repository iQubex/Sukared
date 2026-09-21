'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = file => fs.readFileSync(file, 'utf8');
const dashboardSource = read('app/dashboard.js');
const landingSource = read('app/landing.js');
const css = read('style.css');
const html = read('index.html');

const context = vm.createContext({ window: {}, Blob });
vm.runInContext(dashboardSource, context, { filename: 'app/dashboard.js' });
const helpers = context.window.SukaRedDashboard.helpers;

assert.equal(helpers.lineCount(''), 1);
assert.equal(helpers.lineCount('print(1)'), 1);
assert.equal(helpers.lineCount('local a = 1\nprint(a)'), 2);
assert.equal(helpers.inputMetadata('print(1)'), 'LUAU SOURCE · 1 LINE');
assert.equal(helpers.inputMetadata('a\nb'), 'LUAU SOURCE · 2 LINES');
assert.equal(helpers.outputMetadata(''), 'PROTECTED OUTPUT');
assert.equal(helpers.outputMetadata('x'.repeat(18842)), 'PROTECTED OUTPUT · 18.4 KB');

assert.equal(helpers.canUseBuildShortcut({ key: 'Enter', ctrlKey: true, metaKey: false, repeat: false }, false, false), true);
assert.equal(helpers.canUseBuildShortcut({ key: 'Enter', ctrlKey: false, metaKey: true, repeat: false }, false, false), true);
assert.equal(helpers.canUseBuildShortcut({ key: 'Enter', ctrlKey: true, metaKey: false, repeat: true }, false, false), false);
assert.equal(helpers.canUseBuildShortcut({ key: 'Enter', ctrlKey: true, metaKey: false, repeat: false }, true, false), false);
assert.equal(helpers.canUseBuildShortcut({ key: 'Enter', ctrlKey: true, metaKey: false, repeat: false }, false, true), false);

for (const status of ['AUTH REQUIRED', 'ENGINE READY', 'BUILDING', 'COMPLETE', 'FAILED']) {
    assert(dashboardSource.includes(`'${status}'`) || dashboardSource.includes(`>${status}<`), `missing status ${status}`);
}
assert(dashboardSource.includes('resourceProtection: true'), 'existing resource-protection request flag was lost');
assert(!dashboardSource.includes('id="dashboardSettings"'), 'duplicate center settings control remains');
assert(dashboardSource.includes('id="quotaState" hidden'), 'future quota slot must remain empty and hidden');
assert(dashboardSource.includes('pointer') === false || css.includes('.editor-empty-state'));
assert(css.includes('.editor-empty-state') && css.includes('pointer-events: none'));
assert(dashboardSource.includes("outlet.addEventListener('keydown', shortcutListener)"));
assert(dashboardSource.includes("outlet.removeEventListener('keydown', shortcutListener)"));
assert(dashboardSource.includes('setTimeout(() => finish(null), 3500)'), 'Monaco fallback timeout is missing');

for (const copy of [
    'What happens to your code?',
    'Luavex is a Luau and Lua code obfuscator that transforms scripts to make them harder to read, analyze and reverse engineer while keeping them working as intended.',
    'Build-specific protection, code virtualization, constants and runtime state are transformed during the build process.',
    'Not impossible to reverse. More expensive to understand.'
]) assert(landingSource.includes(copy), `missing landing copy: ${copy}`);

assert(landingSource.includes("sessionStorage.getItem(INFO_SESSION_KEY)"));
assert(landingSource.includes('if (completed || reducedMotion())'));
assert(landingSource.includes("if (typing) { completed = true; sessionStorage.setItem(INFO_SESSION_KEY, '1'); showCompleteInfo(); return; }"));
assert(landingSource.includes("info.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth'"));
assert(css.includes('.boot-start:hover::after') && css.includes('.boot-start:focus-visible::after'));
assert(css.includes('@media (prefers-reduced-motion: reduce)'));
assert(css.includes('.build-controls { position: static; width: 100%'));
assert(!css.includes('.build-controls { position: sticky;'));
assert(html.includes('/style.css?v=luavex-ux-5'));
assert(html.includes('/app/landing.js?v=luavex-ux-2'));
assert(html.includes('/app/dashboard.js?v=luavex-ux-2'));

console.log(JSON.stringify({
    metadata: 'PASS',
    emptyState: 'PASS',
    buildControl: 'PASS',
    keyboardShortcut: 'PASS',
    landingInfo: 'PASS',
    typewriter: 'PASS',
    reducedMotion: 'PASS',
    responsiveControl: 'PASS'
}, null, 2));
