(function () {
    'use strict';

    const state = {
        input: '-- Paste your Luau script here\nprint("Hello Luavex")', output: '', sourceName: null,
        sourceOrigin: 'editor', modified: false, build: null, monacoReady: null
    };
    const apiUrl = () => `${window.LuavexAPI.base}${window.LuavexAPI.paths.obfuscate}`;
    const bytes = value => new Blob([String(value || '')]).size;
    const formatBytes = value => { const size = Number(value) || 0; if (size < 1024) return `${size} B`; if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`; return `${(size / 1048576).toFixed(1)} MB`; };
    const lineCount = value => String(value || '').replace(/\r\n?/g, '\n').split('\n').length;
    const inputMetadata = value => { const count = lineCount(value); return `LUAU SOURCE · ${count} ${count === 1 ? 'LINE' : 'LINES'}`; };
    const outputMetadata = value => value ? `PROTECTED OUTPUT · ${formatBytes(bytes(value))}` : 'PROTECTED OUTPUT';
    const canUseBuildShortcut = (event, disabled, processing) => Boolean(event && !event.repeat && (event.ctrlKey || event.metaKey) && event.key === 'Enter' && !disabled && !processing);
    const safeFilename = value => String(value || 'Untitled-Script').replace(/\.(lua|luau)$/i, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'Untitled-Script';
    const buildErrorMessage = (code, fallback) => ({
        AUTH_REQUIRED: 'Connect Discord before starting a build.',
        SOURCE_REQUIRED: 'Add Luau source code before starting a build.',
        RATE_LIMITED: 'Too many build requests. Wait a moment and try again.',
        QUEUE_FULL: 'The build queue is currently full. Try again shortly.',
        BUILD_TIMEOUT: 'The build exceeded its time limit. Your source was not stored.',
        WORKER_CRASH: 'The isolated build worker stopped unexpectedly. Try the build again.',
        INVALID_PROTECTION_CONFIGURATION: 'Invalid protection configuration.',
        CAPABILITY_DEPENDENCY: 'VM Protection requires Virtualization.',
        CAPABILITY_TYPE: 'Every protection setting must be on or off.',
        UNKNOWN_CAPABILITY: 'The request contains an unsupported protection setting.',
        NETWORK_ERROR: 'The build server could not be reached. Check that the backend is online.'
    }[code] || (code === 'BUILD_FAILED' ? 'The build could not be completed. Check the source syntax and try again.' : fallback || 'The build could not be completed.'));

    const loadMonaco = () => {
        if (state.monacoReady) return state.monacoReady;
        state.monacoReady = new Promise(resolve => {
            let settled = false;
            const finish = value => { if (settled) return; settled = true; clearTimeout(timeout); resolve(value); };
            const timeout = setTimeout(() => finish(null), 3500);
            if (!window.require) { finish(null); return; }
            window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
            window.require(['vs/editor/editor.main'], () => finish(window.monaco), () => finish(null));
        });
        return state.monacoReady;
    };

    const buildSummary = (container, build) => {
        container.replaceChildren();
        if (!build) { container.hidden = true; return; }
        container.hidden = false; container.append(window.SukaRedUI.el('h2', '', 'Build Summary'));
        const dl = window.SukaRedUI.el('dl', 'summary-grid');
        const summaryItems = [['Status', 'Completed'], ['Build Time', `${build.processingTimeMs || build.buildTimeMs || 0} ms`], ['Output Size', formatBytes(build.outputBytes)]];
        summaryItems.forEach(([label, value]) => {
            const item = document.createElement('div'); item.append(window.SukaRedUI.el('dt', '', label), window.SukaRedUI.el('dd', '', value)); dl.append(item);
        });
        container.append(dl);
    };

    const view = () => {
        const configurationFailed = Boolean(window.LuavexAPI.configurationError);
        const authenticated = window.LuavexAuth.state.authenticated === true;
        const initialStatus = configurationFailed ? 'FAILED' : authenticated ? 'ENGINE READY' : 'AUTH REQUIRED';
        const initialStatusClass = configurationFailed ? ' is-error' : authenticated ? '' : ' is-auth-required';
        const initialNote = configurationFailed ? 'Workspace unavailable' : 'Connect Discord to build';
        return `
        <section class="dashboard-page page-section" aria-labelledby="workspaceTitle">
            <header class="workspace-heading"><div><span class="eyebrow">Workspace</span><h1 id="workspaceTitle">Obfuscation Workspace</h1></div></header>
            <div class="editor-workspace">
                <section class="editor-panel" aria-labelledby="inputLabel">
                    <header><div><span id="inputLabel">INPUT</span><small class="file-state" id="fileState">LUAU SOURCE · 1 LINE</small></div><div class="editor-actions"><button class="icon-button" id="openFileBtn" type="button" aria-label="Open source file" title="Open source file"></button><button class="icon-button" id="clearBtn" type="button" aria-label="Clear input" title="Clear input"></button></div></header>
                    <input id="fileInput" type="file" accept=".lua,.luau,text/plain" hidden><div class="editor-host" id="inputEditor"></div><textarea class="editor-fallback" id="inputFallback" aria-label="Input code"></textarea>
                </section>
                <div class="build-controls" aria-label="Build control"><div class="workspace-status${initialStatusClass}" id="workspaceStatus" role="status">${initialStatus}</div><button class="obfuscate-button" id="obfuscateBtn" type="button" aria-label="Build protected output" title="${authenticated && !configurationFailed ? 'Build protected output (Ctrl/Cmd + Enter)' : 'Connect Discord to build'}" disabled><span class="run-icon-slot"></span><span class="spinner"></span></button><small class="quota-state" id="quotaState" hidden></small><small class="auth-build-note" id="authBuildNote"${authenticated && !configurationFailed ? ' hidden' : ''}>${initialNote}</small></div>
                <section class="editor-panel" aria-labelledby="outputLabel">
                    <header><div><span id="outputLabel">OUTPUT</span><small id="outputState">PROTECTED OUTPUT</small></div><div class="editor-actions"><button class="icon-button" id="copyOutput" type="button" aria-label="Copy output" title="Copy output"></button><button class="icon-button" id="downloadOutput" type="button" aria-label="Download output" title="Download output"></button></div></header>
                    <div class="editor-stack"><div class="editor-host" id="outputEditor"></div><textarea class="editor-fallback" id="outputFallback" readonly aria-label="Output code"></textarea><div class="editor-empty-state" id="outputEmptyState" aria-hidden="true">OUTPUT WILL APPEAR HERE</div><span class="sr-only" id="outputAssist" role="status" aria-live="polite">Output is empty.</span></div>
                </section>
            </div>
            <section class="build-summary" id="buildSummary" hidden></section><section class="inline-error" id="buildError" hidden><strong>Build failed</strong><pre></pre></section>
        </section>`;
    };

    const mount = async (outlet, historyStore) => {
        await window.LuavexAPI.ready;
        outlet.innerHTML = view();
        const candidate = window.LuavexAPI.resourceCandidate;
        let resourceBindings; let developerPanel;
        if (candidate) {
            const panel = document.createElement('section'); panel.className = 'build-summary'; developerPanel = panel; panel.hidden = true;
            panel.innerHTML = '<strong>Resource Indirection Candidate: ACTIVE</strong><p>Runtime Integrity: ACTIVE. Static Lua source rewrite: ACTIVE for literal HTTPS loadstring(game:HttpGet(...)) calls only. Resource builds execute the root body directly and use the available local HTTP transport.</p><label>Resource bindings (JSON)<textarea aria-label="Resource bindings" rows="3" style="width:100%">{"demo":{"resource_id":"local-demo","version":"1"}}</textarea></label><button type="button">Load resource example</button>';
            outlet.querySelector('.workspace-heading').after(panel);
            resourceBindings = panel.querySelector('textarea');
            panel.querySelector('button').addEventListener('click', () => {
                setInput('return function()\n    return __luavex_resource("demo")\nend');
            });
        }
        const settings = window.SukaRedSettings.load();
        const updateDeveloperPanel = () => {
            if (!developerPanel) return;
            developerPanel.hidden = !(window.LuavexAuth.state.localDevelopment && window.SukaRedSettings.load().developerMode);
            outlet.querySelector('.dashboard-page').classList.toggle('has-developer-tools', !developerPanel.hidden);
        };
        updateDeveloperPanel();
        const inputHost = outlet.querySelector('#inputEditor'); const outputHost = outlet.querySelector('#outputEditor');
        const inputFallback = outlet.querySelector('#inputFallback'); const outputFallback = outlet.querySelector('#outputFallback');
        const fileState = outlet.querySelector('#fileState'); const status = outlet.querySelector('#workspaceStatus'); const errorPanel = outlet.querySelector('#buildError'); const obfuscate = outlet.querySelector('#obfuscateBtn');
        const copyButton = outlet.querySelector('#copyOutput'); const downloadButton = outlet.querySelector('#downloadOutput');
        outlet.querySelector('#openFileBtn').append(window.SukaRedIcons.icon('upload')); outlet.querySelector('#clearBtn').append(window.SukaRedIcons.icon('trash'));
        copyButton.append(window.SukaRedIcons.icon('copy')); downloadButton.append(window.SukaRedIcons.icon('download'));
        outlet.querySelector('.run-icon-slot').append(window.SukaRedIcons.icon('play', { size: 23 }));
        inputFallback.value = state.input; outputFallback.value = state.output; buildSummary(outlet.querySelector('#buildSummary'), state.build);

        let processing = false; const controller = new AbortController();
        let inputEditor = null; let outputEditor = null; let suppressChange = true; let resizeObserver = null; let dprQuery = null; let disposed = false; let terminalStatus = false; let statusResetTimer = null;
        const layoutEditors = () => { if (!disposed) { inputEditor?.layout(); outputEditor?.layout(); } };
        const monaco = await loadMonaco();
        function refreshFontMetrics() {
            if (disposed) return;
            monaco?.editor.remeasureFonts(); layoutEditors();
            dprQuery?.removeEventListener?.('change', refreshFontMetrics);
            dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
            dprQuery.addEventListener?.('change', refreshFontMetrics);
        }
        if (!inputHost.isConnected) return () => {};
        if (monaco) {
            monaco.editor.defineTheme('sukared-mono', { base: 'vs-dark', inherit: true, rules: [
                { token: 'keyword', foreground: 'ffffff' }, { token: 'string', foreground: 'c8c8c8' }, { token: 'number', foreground: 'dedede' }, { token: 'comment', foreground: '6d6d6d' }
            ], colors: { 'editor.background': '#050505', 'editor.foreground': '#e6e6e6', 'editorCursor.foreground': '#ffffff', 'editor.selectionBackground': '#383838', 'editor.lineHighlightBackground': '#0b0b0b', 'editorGutter.background': '#050505' } });
            const options = { language: 'lua', theme: 'sukared-mono', automaticLayout: false, fontFamily: "'Fira Code', 'Cascadia Mono', Consolas, monospace", fontLigatures: false, fontSize: 14, lineHeight: 22, letterSpacing: 0, minimap: { enabled: settings.minimap }, wordWrap: settings.wordWrap ? 'on' : 'off', scrollBeyondLastLine: false, padding: { top: 14 }, roundedSelection: false };
            inputEditor = monaco.editor.create(inputHost, { ...options, value: state.input }); outputEditor = monaco.editor.create(outputHost, { ...options, value: state.output, readOnly: true });
            inputFallback.hidden = true; outputFallback.hidden = true;
            inputEditor.onDidChangeModelContent(() => { state.input = inputEditor.getValue(); updateInputMetadata(); if (!suppressChange && state.sourceOrigin === 'file') { state.modified = true; updateInputMetadata(); } }); suppressChange = false;
            resizeObserver = new ResizeObserver(layoutEditors); resizeObserver.observe(inputHost); resizeObserver.observe(outputHost); window.addEventListener('resize', layoutEditors);
            dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`); dprQuery.addEventListener?.('change', refreshFontMetrics);
            document.fonts?.ready?.then(refreshFontMetrics); document.fonts?.addEventListener('loadingdone', refreshFontMetrics); requestAnimationFrame(refreshFontMetrics);
        }

        const getInput = () => inputEditor ? inputEditor.getValue() : inputFallback.value;
        const setInput = value => { state.input = value; inputEditor ? inputEditor.setValue(value) : (inputFallback.value = value); updateInputMetadata(); };
        const getOutput = () => outputEditor ? outputEditor.getValue() : outputFallback.value;
        const setOutput = value => { state.output = value; outputEditor ? outputEditor.setValue(value) : (outputFallback.value = value); };
        const updateInputMetadata = () => { fileState.textContent = inputMetadata(getInput()); fileState.title = state.sourceName ? `${state.sourceName}${state.modified ? ' / Modified' : ''}` : 'Editor buffer'; };
        const updateOutputActions = () => { const output = getOutput(); const available = Boolean(output); copyButton.disabled = !available; downloadButton.disabled = !available; outlet.querySelector('#outputState').textContent = outputMetadata(output); outlet.querySelector('#outputEmptyState').hidden = available; outlet.querySelector('#outputAssist').textContent = available ? 'Protected output is available.' : 'Output is empty.'; };
        const setStatus = (label, modifier = '') => { status.textContent = label; status.className = `workspace-status${modifier ? ` ${modifier}` : ''}`; };
        const idleStatus = auth => { const configurationFailed = Boolean(window.LuavexAPI.configurationError); setStatus(configurationFailed ? 'FAILED' : auth.authenticated ? 'ENGINE READY' : 'AUTH REQUIRED', configurationFailed ? 'is-error' : auth.authenticated ? '' : 'is-auth-required'); };
        const scheduleIdleStatus = () => { clearTimeout(statusResetTimer); statusResetTimer = setTimeout(() => { terminalStatus = false; idleStatus(window.LuavexAuth.state); }, 2400); };
        const fallbackInputListener = () => { state.input = inputFallback.value; updateInputMetadata(); };
        inputFallback.addEventListener('input', fallbackInputListener);
        updateInputMetadata(); updateOutputActions();
        const authBuildNote = outlet.querySelector('#authBuildNote');
        const applyAuth = auth => {
            const blocked = !auth.authenticated || Boolean(window.LuavexAPI.configurationError);
            updateDeveloperPanel();
            if (!processing) obfuscate.disabled = blocked;
            obfuscate.title = blocked ? 'Connect Discord to build' : 'Build protected output (Ctrl/Cmd + Enter)';
            obfuscate.setAttribute('aria-label', blocked ? 'Connect Discord to build' : 'Build protected output. Shortcut: Control or Command plus Enter');
            authBuildNote.textContent = window.LuavexAPI.configurationError ? 'Workspace unavailable' : blocked ? 'Connect Discord to build' : '';
            authBuildNote.hidden = !blocked;
            if (!processing && !terminalStatus) idleStatus(auth);
        };
        const unsubscribeAuth = window.LuavexAuth.subscribe(applyAuth);

        outlet.querySelector('#openFileBtn').addEventListener('click', () => outlet.querySelector('#fileInput').click());
        outlet.querySelector('#fileInput').addEventListener('change', async event => {
            const file = event.target.files[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { window.SukaRedUI.toast('The file is too large.', 'error'); return; }
            state.sourceName = file.name.replace(/^.*[\\/]/, '').slice(0, 180); state.sourceOrigin = 'file'; state.modified = false; suppressChange = true; setInput((await file.text()).replace(/^\uFEFF/, '')); suppressChange = false; updateInputMetadata();
        });
        outlet.querySelector('#clearBtn').addEventListener('click', () => { setInput(''); setOutput(''); state.sourceName = null; state.sourceOrigin = 'editor'; state.modified = false; state.build = null; terminalStatus = false; clearTimeout(statusResetTimer); updateInputMetadata(); updateOutputActions(); buildSummary(outlet.querySelector('#buildSummary'), null); errorPanel.hidden = true; idleStatus(window.LuavexAuth.state); });
        copyButton.addEventListener('click', async () => { if (!getOutput()) return; try { await navigator.clipboard.writeText(getOutput()); window.SukaRedUI.toast('Output copied', 'success'); } catch { window.SukaRedUI.toast('Clipboard unavailable. Select and copy the output.', 'error'); } });
        downloadButton.addEventListener('click', () => { if (!getOutput()) return; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([getOutput()], { type: 'text/plain;charset=utf-8' })); link.download = `${safeFilename(state.sourceName)}.luavex.lua`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 0); });

        const runBuild = async () => {
            if (!window.LuavexAuth.state.authenticated) { window.LuavexAuth.login(); return; }
            const code = getInput(); if (!code.trim()) { window.SukaRedUI.toast('Input is empty.', 'warning'); return; } if (processing) return;
            const currentSettings = window.SukaRedSettings.load();
            processing = true; const started = performance.now();
            const id = crypto.randomUUID ? crypto.randomUUID() : `LOCAL-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            terminalStatus = false; clearTimeout(statusResetTimer); setStatus('BUILDING', 'is-processing'); obfuscate.setAttribute('aria-busy', 'true'); obfuscate.disabled = true; obfuscate.classList.add('is-processing'); errorPanel.hidden = true;
            try {
                const payload = candidate ? { code, bindings: developerPanel && !developerPanel.hidden ? JSON.parse(resourceBindings.value) : {}, build_id: id } : { code, features: currentSettings.protectionFeatures, resourceProtection: true };
                const response = await fetch(apiUrl(), { method: 'POST', credentials: 'include', signal: controller.signal, headers: { 'Content-Type': 'application/json', 'x-idempotency-key': id }, body: JSON.stringify(payload) });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) { const error = new Error(data.message || 'Build failed.'); error.code = data.code || 'BUILD_FAILED'; error.build = data.build; error.details = data.details; throw error; }
                if (disposed) return;
                if (typeof data.obfuscated !== 'string' || !data.obfuscated) throw new Error('No build output received.');
                setOutput(data.obfuscated); updateOutputActions(); state.build = { ...data.build, outputBytes: bytes(data.obfuscated), processingTimeMs: data.build?.processingTimeMs ?? Math.round(performance.now() - started) }; buildSummary(outlet.querySelector('#buildSummary'), state.build);
                terminalStatus = true; setStatus('COMPLETE', 'is-completed'); scheduleIdleStatus(); window.SukaRedUI.toast('Build completed', 'success');
            } catch (error) {
                if (disposed) return;
                const codeValue = error.code || (error.name === 'AbortError' ? 'CANCELLED' : 'NETWORK_ERROR');
                const detailText = error.details && Object.keys(error.details).length ? `\nDetails: ${JSON.stringify(error.details)}` : '';
                errorPanel.hidden = false; errorPanel.querySelector('pre').textContent = `${codeValue}\n${buildErrorMessage(codeValue, error.message)}${detailText}`; terminalStatus = true; setStatus('FAILED', 'is-error'); scheduleIdleStatus(); window.SukaRedUI.toast('Build failed', 'error');
                if (codeValue === 'AUTH_REQUIRED') await window.LuavexAuth.refresh();
            } finally { processing = false; obfuscate.removeAttribute('aria-busy'); obfuscate.classList.remove('is-processing'); applyAuth(window.LuavexAuth.state); }
        };
        obfuscate.addEventListener('click', runBuild);
        const shortcutListener = event => { if (!canUseBuildShortcut(event, obfuscate.disabled, processing)) return; event.preventDefault(); runBuild(); };
        outlet.addEventListener('keydown', shortcutListener);

        const settingsListener = event => { const value = event.detail; updateDeveloperPanel(); inputEditor?.updateOptions({ wordWrap: value.wordWrap ? 'on' : 'off', minimap: { enabled: value.minimap } }); outputEditor?.updateOptions({ wordWrap: value.wordWrap ? 'on' : 'off', minimap: { enabled: value.minimap } }); layoutEditors(); };
        window.addEventListener('sukared:settings', settingsListener);
        return () => { state.input = getInput(); state.output = getOutput(); disposed = true; clearTimeout(statusResetTimer); controller.abort(); document.fonts?.removeEventListener('loadingdone', refreshFontMetrics); unsubscribeAuth(); inputFallback.removeEventListener('input', fallbackInputListener); outlet.removeEventListener('keydown', shortcutListener); window.removeEventListener('sukared:settings', settingsListener); window.removeEventListener('resize', layoutEditors); dprQuery?.removeEventListener?.('change', refreshFontMetrics); resizeObserver?.disconnect(); inputEditor?.dispose(); outputEditor?.dispose(); };
    };

    window.SukaRedDashboard = { mount, apiUrl, helpers: Object.freeze({ formatBytes, lineCount, inputMetadata, outputMetadata, canUseBuildShortcut }) };
})();
