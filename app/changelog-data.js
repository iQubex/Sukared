(function () {
    'use strict';
    window.SukaRedChangelog = Object.freeze([
        Object.freeze({
            version: 'SukaRed 1.1',
            status: 'Current Beta',
            groups: Object.freeze({
                Added: Object.freeze(['Progressive build transition preview', 'Clearer workspace status feedback']),
                Improved: Object.freeze(['Workspace navigation and responsive layout', 'Profile settings and build summaries', 'Lua/Luau script compatibility']),
                Fixed: Object.freeze(['Preview comment handling', 'Editor alignment and small-screen usability'])
            })
        }),
        Object.freeze({
            version: 'SukaRed 1.0',
            status: 'Previous Beta',
            groups: Object.freeze({
                Added: Object.freeze(['Initial public beta', 'Protection profile selection', 'Local build history']),
                Improved: Object.freeze(['Build reporting', 'Large-script handling', 'General Lua/Luau compatibility']),
                Fixed: Object.freeze(['Method and callback compatibility', 'Output validation and build stability'])
            })
        })
    ]);
})();
