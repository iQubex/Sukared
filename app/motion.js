(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.SukaRedMotion = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    const TIMING = Object.freeze({
        bootTotal: 1800,
        bootFrame: 52,
        landingExit: 320,
        transitionOpen: 180,
        transitionPreview: 280,
        tokenCorrupt: 55,
        tokenSettle: 30,
        transitionFinal: 220,
        transitionSuccess: 220,
        transitionClose: 180,
        reducedPreview: 120,
        reducedTransform: 80,
        maxIdentifiers: 10
    });

    const KEYWORDS = new Set([
        'and', 'break', 'continue', 'do', 'else', 'elseif', 'end', 'export', 'false',
        'for', 'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return',
        'then', 'true', 'type', 'until', 'while'
    ]);
    const COMMON_GLOBALS = new Set([
        '_G', 'assert', 'bit32', 'collectgarbage', 'coroutine', 'debug', 'error', 'game',
        'getfenv', 'getmetatable', 'ipairs', 'math', 'next', 'os', 'pairs', 'pcall',
        'print', 'rawequal', 'rawget', 'rawlen', 'rawset', 'require', 'script', 'select',
        'setfenv', 'setmetatable', 'shared', 'string', 'table', 'task', 'tonumber',
        'tostring', 'type', 'typeof', 'unpack', 'utf8', 'warn', 'workspace', 'xpcall'
    ]);
    const GLITCH_SYMBOLS = '#$%&*+?@';

    const longBracketAt = (source, index) => {
        if (source[index] !== '[') return null;
        let cursor = index + 1;
        while (source[cursor] === '=') cursor++;
        if (source[cursor] !== '[') return null;
        return { level: cursor - index - 1, length: cursor - index + 1 };
    };

    const stripLuaComments = sourceValue => {
        const source = String(sourceValue || '').replace(/\r\n?/g, '\n');
        let output = '';
        let index = 0;
        let quote = null;
        let longStringLevel = null;
        let longCommentLevel = null;

        while (index < source.length) {
            if (quote) {
                const character = source[index];
                output += character;
                index++;
                if (character === '\\' && index < source.length) {
                    output += source[index++];
                } else if (character === quote) {
                    quote = null;
                }
                continue;
            }

            if (longStringLevel !== null) {
                const close = `]${'='.repeat(longStringLevel)}]`;
                if (source.startsWith(close, index)) {
                    output += close;
                    index += close.length;
                    longStringLevel = null;
                } else {
                    output += source[index++];
                }
                continue;
            }

            if (longCommentLevel !== null) {
                const close = `]${'='.repeat(longCommentLevel)}]`;
                if (source.startsWith(close, index)) {
                    index += close.length;
                    longCommentLevel = null;
                } else {
                    if (source[index] === '\n') output += '\n';
                    index++;
                }
                continue;
            }

            const character = source[index];
            if (character === '"' || character === "'") {
                quote = character;
                output += character;
                index++;
                continue;
            }

            const longString = longBracketAt(source, index);
            if (longString) {
                longStringLevel = longString.level;
                output += source.slice(index, index + longString.length);
                index += longString.length;
                continue;
            }

            if (source.startsWith('--', index)) {
                const longComment = longBracketAt(source, index + 2);
                if (longComment) {
                    longCommentLevel = longComment.level;
                    index += 2 + longComment.length;
                } else {
                    index += 2;
                    while (index < source.length && source[index] !== '\n') index++;
                }
                continue;
            }

            output += character;
            index++;
        }
        return output;
    };

    const capLine = (line, maxLength) => line.length > maxLength ? `${line.slice(0, Math.max(0, maxLength - 3))}...` : line;
    const selectSourceSnippet = (source, maxLines = 5, maxLength = 92) => {
        const lines = stripLuaComments(source).split('\n');
        const useful = lines.map((line, index) => ({ line, index })).filter(item => item.line.trim());
        if (!useful.length) return '';

        const weakLine = /^\s*(?:end|else|elseif|until|[}\]);,]+)\s*$/;
        const preferred = /\b(?:local\s+function|function|local|if|for|while|repeat)\b|(?:^|[^=])=(?!=)|\w\s*\(/;
        const search = useful.slice(0, 16);
        const startItem = search.find(item => !weakLine.test(item.line) && preferred.test(item.line))
            || search.find(item => !weakLine.test(item.line))
            || useful[0];

        const selected = [];
        for (let index = startItem.index; index < lines.length && selected.length < Math.max(1, Math.min(6, maxLines)); index++) {
            if (!lines[index].trim()) continue;
            selected.push(capLine(lines[index], maxLength));
        }
        return selected.join('\n');
    };

    const tokenizePreview = sourceValue => {
        const source = String(sourceValue || '');
        const tokens = [];
        let index = 0;
        let previousSignificant = null;
        const push = (type, value) => {
            const token = { type, value, eligible: false };
            if (type === 'identifier') {
                token.type = previousSignificant && (previousSignificant.value === '.' || previousSignificant.value === ':') ? 'property' : 'identifier';
                token.eligible = !COMMON_GLOBALS.has(value);
            }
            tokens.push(token);
            if (type !== 'whitespace' && type !== 'newline') previousSignificant = token;
        };

        while (index < source.length) {
            const character = source[index];
            if (character === '\n') { push('newline', '\n'); index++; continue; }
            if (/\s/.test(character)) {
                const start = index;
                while (index < source.length && source[index] !== '\n' && /\s/.test(source[index])) index++;
                push('whitespace', source.slice(start, index));
                continue;
            }
            if (character === '"' || character === "'") {
                const start = index;
                const quote = character;
                index++;
                while (index < source.length) {
                    if (source[index] === '\\') { index += Math.min(2, source.length - index); continue; }
                    const current = source[index++];
                    if (current === quote) break;
                }
                push('string', source.slice(start, index));
                continue;
            }
            const longString = longBracketAt(source, index);
            if (longString) {
                const start = index;
                const close = `]${'='.repeat(longString.level)}]`;
                index += longString.length;
                const end = source.indexOf(close, index);
                index = end < 0 ? source.length : end + close.length;
                push('string', source.slice(start, index));
                continue;
            }
            if (/[A-Za-z_]/.test(character)) {
                const start = index++;
                while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) index++;
                const value = source.slice(start, index);
                push(KEYWORDS.has(value) ? 'keyword' : 'identifier', value);
                continue;
            }
            if (/\d/.test(character) || (character === '.' && /\d/.test(source[index + 1] || ''))) {
                const start = index++;
                while (index < source.length && /[A-Za-z0-9_.]/.test(source[index])) index++;
                push('number', source.slice(start, index));
                continue;
            }
            const operator = ['...', '//=', '..=', '==', '~=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '^=', '::', '->', '..', '//'].find(value => source.startsWith(value, index));
            if (operator) { push('operator', operator); index += operator.length; continue; }
            push(/[+\-*/%^#=<>]/.test(character) ? 'operator' : 'punctuation', character);
            index++;
        }
        return tokens;
    };

    const createIdentifierPlan = (tokens, random = Math.random, maxIdentifiers = TIMING.maxIdentifiers) => {
        const mapping = new Map();
        const steps = [];
        const used = new Set();
        for (const token of tokens) {
            if (!token.eligible || mapping.has(token.value) || steps.length >= maxIdentifiers) continue;
            let numeric = Math.floor(random() * 0xE00 + 0x100) + steps.length;
            let replacement = `_0x${numeric.toString(16).toUpperCase()}`;
            while (used.has(replacement)) replacement = `_0x${(++numeric).toString(16).toUpperCase()}`;
            used.add(replacement);
            mapping.set(token.value, replacement);
            steps.push({ identifier: token.value, replacement });
        }
        return { mapping, steps };
    };

    const renderTokenText = (tokens, plan, settledCount = 0, activeText = null) => {
        const settled = new Set(plan.steps.slice(0, settledCount).map(step => step.identifier));
        const active = plan.steps[settledCount];
        return tokens.map(token => {
            if (settled.has(token.value)) return plan.mapping.get(token.value);
            if (active && token.value === active.identifier && activeText !== null) return activeText;
            return token.value;
        }).join('');
    };

    const createTokenGlitchFrame = (value, progress = 0, random = Math.random) => {
        const input = String(value || '');
        const intensity = Math.max(0, Math.min(1, Number(progress) || 0));
        return Array.from(input, (character, index) => {
            if (!/[A-Za-z0-9_]/.test(character)) return character;
            const threshold = .15 + intensity * .55;
            if (random() > threshold || index === 0 && character === '_') return character;
            return GLITCH_SYMBOLS[Math.floor(random() * GLITCH_SYMBOLS.length)];
        }).join('');
    };

    return {
        TIMING,
        KEYWORDS,
        COMMON_GLOBALS,
        stripLuaComments,
        selectSourceSnippet,
        tokenizePreview,
        createIdentifierPlan,
        renderTokenText,
        createTokenGlitchFrame
    };
});
