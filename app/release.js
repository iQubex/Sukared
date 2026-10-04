(function () {
    'use strict';
    // Frontend presentation only; independent of the protected-script banner.
    window.LuavexRelease = Object.freeze({ version: '2.0', name: 'Luavex 2.0', title: 'Luavex 2.0 — Lua & Luau Obfuscator' });
    document.querySelectorAll('[data-release-label]').forEach(node => {
        node.textContent = node.dataset.releaseLabel === 'version'
            ? window.LuavexRelease.version : window.LuavexRelease.name;
    });
})();
