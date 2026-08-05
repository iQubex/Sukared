(function () {
    'use strict';
    window.SukaRedChangelog = Object.freeze([
        Object.freeze({
            version: 'Luavex Beta',
            status: 'Current Beta',
            groups: Object.freeze({
                Added: Object.freeze(['Luavex identity update', 'Multi-page dashboard', 'Monaco-powered workspace', 'Local build history']),
                Improved: Object.freeze(['VM-based protection', 'Runtime support', 'Pro profile availability', 'Public beta privacy safeguards']),
                Fixed: Object.freeze(['Adaptive profile handling for small scripts', 'Build transition pacing', 'Editor alignment and responsive usability'])
            })
        }),
        Object.freeze({
            version: 'Version 1.1',
            status: 'Previous Beta',
            groups: Object.freeze({
                Added: Object.freeze(['Progressive build transition preview', 'Clearer workspace status feedback']),
                Improved: Object.freeze(['Workspace navigation', 'Profile settings', 'Lua/Luau script compatibility']),
                Fixed: Object.freeze(['Method and callback compatibility', 'Output validation and build stability'])
            })
        }),
        Object.freeze({
            version: 'Version 1.0',
            status: 'Archive',
            groups: Object.freeze({
                Added: Object.freeze(['Initial public beta', 'Protection profile selection', 'Local build history']),
                Improved: Object.freeze(['Build reporting', 'Large-script handling', 'General Lua/Luau compatibility']),
                Fixed: Object.freeze(['Early compatibility and validation issues'])
            })
        })
    ]);
})();
