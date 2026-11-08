(function () {
    'use strict';

    const state = {
        input: '-- Paste your Luau script here\nprint("Hello Luavex")', output: '', sourceName: null,
        sourceOrigin: 'editor', modified: false, build: null, monacoReady: null, scriptId: null, scriptUpdated: null, scriptName: '', outputName: null
    };
    const apiUrl = () => `${window.LuavexAPI.base}${window.LuavexAPI.paths.obfuscate}`;
    const bytes = value => new Blob([String(value || '')]).size;
    const wellFormed = value => !/[\uD800-\uDFFF]/u.test(value);
    const scriptNameError = value => {
        if (!wellFormed(value) || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value)) return 'Enter a valid script name without control characters.';
        const name = value.trim();
        if (!name) return 'Enter a script name.';
        if ([...name].length > 80 || bytes(name) > 240) return 'Use up to 80 characters and 240 UTF-8 bytes.';
        return '';
    };
    const formatBytes = value => { const size = Number(value) || 0; if (size < 1024) return `${size} B`; if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`; return `${(size / 1048576).toFixed(1)} MB`; };
    const lineCount = value => String(value || '').replace(/\r\n?/g, '\n').split('\n').length;
    const inputMetadata = value => { const count = lineCount(value); return `${count} ${count === 1 ? 'LINE' : 'LINES'}`; };
    const outputMetadata = value => value ? formatBytes(bytes(value)) : '';
    const canUseBuildShortcut = (event, disabled, processing) => Boolean(event && !event.repeat && (event.ctrlKey || event.metaKey) && event.key === 'Enter' && !disabled && !processing);
    const quotaView = auth => {
        const usage = auth?.authenticated && auth.usage && Number.isInteger(auth.usage.remaining) ? auth.usage : null;
        if (!usage) return { visible: false, exhausted: false, label: '', note: '' };
        if (usage.exempt === true) return { visible: true, exhausted: false, label: 'UNLIMITED', note: '' };
        const remaining = Math.max(0, usage.remaining);
        const reset = new Date(usage.resetsAt);
        const resetText = Number.isNaN(reset.getTime()) ? '' : ` Resets at ${reset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
        return { visible: true, exhausted: remaining === 0,
            label: remaining === 0 ? 'LIMIT REACHED' : `${remaining} BUILD${remaining === 1 ? '' : 'S'} LEFT`,
            note: remaining === 0 ? `Daily limit reached.${resetText}` : '' };
    };
    const safeFilename = value => String(value || 'Untitled-Script').replace(/\.(lua|luau)$/i, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'Untitled-Script';
    const buildErrorMessage = (code, fallback) => ({
        AUTH_REQUIRED: 'Connect Discord before starting a build.',
        SOURCE_REQUIRED: 'Add Luau source code before starting a build.',
        DAILY_LIMIT_REACHED: 'Daily limit reached. Try again after reset.',
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
        container.hidden = false;
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
        const initialStatus = configurationFailed ? 'Failed' : authenticated ? 'Ready' : 'SIGN IN';
        const initialStatusClass = configurationFailed ? ' is-error' : authenticated ? '' : ' is-auth-required';
        const initialNote = configurationFailed ? 'Workspace unavailable' : 'Connect Discord to build';
        return `
        ${window.SukaRedLanding?.planetMarkup.replace('class="web-planet"', 'class="workspace-planet"') || ''}
        <section class="dashboard-page page-section" aria-labelledby="workspaceTitle"><a class="v0-back" href="/#/history" data-route>← Back to My Scripts</a>
            <header class="workspace-heading"><div><span class="eyebrow">Workspace</span><h1 id="workspaceTitle">Protect your Luau</h1><p>Open your source, create a build, and download the protected output.</p></div><button class="obfuscate-button" id="obfuscateBtn" type="button" aria-label="Build protected output" disabled><span class="run-icon-slot"></span><span class="spinner"></span><span class="build-button-label">Obfuscate</span></button></header>
            <div class="build-controls" aria-label="Build control"><button type="button" class="workspace-file-tab" id="workspaceFileTab" aria-label="Rename file"><span id="workspaceFileName">Untitled.luau</span></button><span id="workspaceUnsaved" class="workspace-unsaved" hidden>Unsaved changes</span><button class="icon-button" id="openFileBtn" type="button" aria-label="Upload source file" title="Upload source file"></button><div class="workspace-status${initialStatusClass}" id="workspaceStatus" role="status">${initialStatus}</div><small class="quota-state" id="quotaState" hidden></small><small class="auth-build-note" id="authBuildNote"${authenticated && !configurationFailed ? ' hidden' : ''}>${initialNote}</small></div>
            <div class="workspace-tabs" role="group" aria-label="Editor panels"><button type="button" id="sourceTab" aria-pressed="true" aria-controls="sourcePanel">Source</button><button type="button" id="outputTab" aria-pressed="false" aria-controls="outputPanel">Output</button></div>
            <div class="editor-workspace" id="editorWorkspace" data-panel="source">
                <section class="editor-panel" id="sourcePanel" aria-labelledby="inputLabel">
                    <header class="board-topbar"><div class="board-identity"><span class="board-accent" aria-hidden="true"></span><div class="board-label"><span id="inputLabel">SOURCE</span><span class="board-context">Lua / Luau</span></div><small class="file-state" id="fileState">1 LINE</small></div><div class="editor-actions"><button class="icon-button" id="clearBtn" type="button" aria-label="Clear input" title="Clear input"></button></div></header>
                    <input id="fileInput" type="file" accept=".lua,.luau,text/plain" hidden><div class="editor-stack"><div class="editor-host" id="inputEditor"></div><textarea class="editor-fallback" id="inputFallback" spellcheck="false" aria-label="Input code"></textarea></div>
                </section>
                <section class="editor-panel" id="outputPanel" aria-labelledby="outputLabel">
                    <header class="board-topbar"><div class="board-identity"><span class="board-accent" aria-hidden="true"></span><div class="board-label"><span id="outputLabel">OUTPUT</span><span class="board-context">Protected build</span></div><small id="outputState"></small></div><div class="editor-actions"><button class="button" id="saveToStorage" type="button" hidden>Retry save</button><button class="icon-button" id="copyOutput" type="button" aria-label="Copy output" title="Copy output"></button><button class="icon-button" id="downloadOutput" type="button" aria-label="Download output" title="Download output"></button></div></header>
                    <div class="editor-stack"><div class="editor-host" id="outputEditor"></div><textarea class="editor-fallback" id="outputFallback" spellcheck="false" readonly aria-label="Output code"></textarea><div class="editor-empty-state" id="outputEmptyState" aria-hidden="true"><span class="output-empty-mark"></span><strong>No output yet</strong><span>Run a build to see your protected script here.</span></div><span class="sr-only" id="outputAssist" role="status" aria-live="polite">Output is empty.</span></div>
                </section>
            </div>
            <div class="v0-editor-status"><span>Luau</span><span id="workspaceBufferStatus"></span><span class="v0-editor-release">${window.LuavexRelease.name}</span></div>
            <div class="hosted-slots" id="hostedSlots" hidden><small id="freeSlotState" role="status"></small><button class="text-button" id="refreshSlots" type="button">Refresh</button></div>
            <section class="build-summary" id="buildSummary" hidden></section><section class="inline-error" id="buildError" hidden><strong>Build failed</strong><pre></pre></section>
        </section>`;
    };

    const mount = async (outlet, historyStore) => {
        await window.LuavexAPI.ready;
        outlet.innerHTML = view();
        const candidate = window.LuavexAPI.resourceCandidate;
        let hostedMode = candidate ? 'standard' : 'checking', slots = null, revision = 0, account;
        const hostedSlots = outlet.querySelector('#hostedSlots');
        const slotState = outlet.querySelector('#freeSlotState');
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
        outlet.querySelector('#openFileBtn').append(window.SukaRedIcons.icon('upload'), 'Upload'); outlet.querySelector('#clearBtn').append(window.SukaRedIcons.icon('trash'));
        copyButton.append(window.SukaRedIcons.icon('copy'), 'Copy'); downloadButton.append(window.SukaRedIcons.icon('download'), 'Download');
        outlet.querySelector('.run-icon-slot').append(window.SukaRedIcons.icon('sparkles', { size: 16 }));
        inputFallback.value = state.input; outputFallback.value = state.output; buildSummary(outlet.querySelector('#buildSummary'), state.build);

        let processing = false; const controller = new AbortController();
        let inputEditor = null; let outputEditor = null; let suppressChange = true; let resizeObserver = null; let dprQuery = null; let disposed = false; let terminalStatus = false;
        const layoutEditors = () => { if (!disposed) { inputEditor?.layout(); outputEditor?.layout(); } };
        const editorWorkspace = outlet.querySelector('#editorWorkspace');
        const sourceTab = outlet.querySelector('#sourceTab');
        const outputTab = outlet.querySelector('#outputTab');
        const viewStates = {};
        const showPanel = panel => {
            const previous = editorWorkspace.dataset.panel;
            const mobile = window.matchMedia?.('(max-width: 760px)').matches;
            const activeEditor = previous === 'source' ? inputEditor : outputEditor;
            if (mobile && panel !== previous && activeEditor) viewStates[previous] = activeEditor.saveViewState();
            editorWorkspace.dataset.panel = panel;
            sourceTab.setAttribute('aria-pressed', String(panel === 'source'));
            outputTab.setAttribute('aria-pressed', String(panel === 'output'));
            layoutEditors();
        };
        sourceTab.addEventListener('click', () => showPanel('source'));
        outputTab.addEventListener('click', () => showPanel('output'));
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
            ], colors: { 'editor.background': '#080a0e', 'editor.foreground': '#e6e6e6', 'editorCursor.foreground': '#ffffff', 'editor.selectionBackground': '#383838', 'editor.lineHighlightBackground': '#0b0b0b', 'editorGutter.background': '#080a0e' } });
            const options = { language: 'lua', theme: 'sukared-mono', automaticLayout: false, fontFamily: "'Fira Code', 'Cascadia Mono', Consolas, monospace", fontLigatures: false, fontSize: 13, lineHeight: 21, letterSpacing: 0, minimap: { enabled: settings.minimap }, wordWrap: settings.wordWrap ? 'on' : 'off', scrollBeyondLastLine: false, padding: { top: 15, bottom: 12 }, roundedSelection: false };
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
        const fileTab = outlet.querySelector('#workspaceFileTab');
        fileTab.prepend(window.SukaRedIcons.icon('file', {size:14})); fileTab.append(window.SukaRedIcons.icon('pencil',{size:12}));
        const updateInputMetadata = () => { const input = getInput(); const name = state.scriptName || state.sourceName || 'Untitled.luau'; outlet.querySelector('#workspaceFileName').textContent = name; fileTab.title = name; outlet.querySelector('#workspaceUnsaved').hidden = !(input !== (state.builtSource || '') || state.pendingSave); outlet.querySelector('#workspaceBufferStatus').textContent = input ? inputMetadata(input) : 'Ready for source'; fileState.textContent = inputMetadata(input); fileState.title = state.sourceName ? `${state.sourceName}${state.modified ? ' / Modified' : ''}` : 'Editor buffer';
        };
        const saveButton = outlet.querySelector('#saveToStorage');
        outlet.querySelector('.output-empty-mark').append(window.SukaRedIcons.icon('shield', { size: 24 }));
        const updateOutputActions = () => { const output = getOutput(); const available = Boolean(output); saveButton.hidden = !state.pendingSave; copyButton.disabled = !available; downloadButton.disabled = !available; outlet.querySelector('#outputState').textContent = outputMetadata(output); outlet.querySelector('#outputEmptyState').hidden = available; outlet.querySelector('#outputAssist').textContent = available ? 'Protected output is available.' : 'Output is empty.'; };
        const setStatus = (label, modifier = '') => { status.textContent = ({ READY: 'Ready', RUNNING: 'Building', COMPLETE: 'Completed', FAILED: 'Failed' })[label] || label; status.className = `workspace-status${modifier ? ` ${modifier}` : ''}`; };
        const idleStatus = auth => { const configurationFailed = Boolean(window.LuavexAPI.configurationError); const quota = quotaView(auth); setStatus(configurationFailed || hostedMode === 'unavailable' ? 'UNAVAILABLE' : !auth.authenticated ? 'SIGN IN' : quota.exhausted || full() ? 'LIMIT' : hostedMode === 'checking' ? 'CHECKING' : 'READY', configurationFailed || quota.exhausted || full() ? 'is-error' : auth.authenticated ? '' : 'is-auth-required'); };
        const fallbackInputListener = () => { state.input = inputFallback.value; updateInputMetadata(); };
        inputFallback.addEventListener('input', fallbackInputListener);
        updateInputMetadata(); updateOutputActions();
        const authBuildNote = outlet.querySelector('#authBuildNote');
        const quotaState = outlet.querySelector('#quotaState');
        const full = () => slots && slots.used >= slots.limit;
        const applyAuth = auth => {
            saveButton.hidden = !state.pendingSave;
            const quota = quotaView(auth);
            const blocked = !auth.authenticated || quota.exhausted || full() || ['checking', 'unavailable'].includes(hostedMode) || Boolean(window.LuavexAPI.configurationError);
            updateDeveloperPanel();
            if (!processing) obfuscate.disabled = blocked;
            hostedSlots.hidden = !auth.authenticated || hostedMode === 'standard';
            slotState.textContent = slots ? `Free Protection Slots: ${slots.used} / ${slots.limit}` :
                hostedMode === 'checking' ? 'Checking protection slots…' : 'Protection slots unavailable.';
            updateInputMetadata();
            const buildTitle = !auth.authenticated ? 'Connect Discord to build' : full() ? 'Free protection slots full' : quota.exhausted ? 'Daily limit reached' : 'Build protected output (Ctrl/Cmd + Enter)';
            obfuscate.title = window.LuavexAPI.configurationError ? 'Workspace unavailable' : buildTitle;
            obfuscate.setAttribute('aria-label', obfuscate.title);
            quotaState.textContent = quota.label;
            quotaState.hidden = !quota.visible;
            authBuildNote.textContent = window.LuavexAPI.configurationError ? 'Workspace unavailable' : !auth.authenticated ? 'Connect Discord to build' : quota.note;
            authBuildNote.hidden = !window.LuavexAPI.configurationError && auth.authenticated && !quota.exhausted;
            if (!processing && !terminalStatus) idleStatus(auth);
        };
        const refreshSlots = async () => {
            if (candidate || disposed || !window.LuavexAuth.state.authenticated) return;
            const request = ++revision;
            try {
                const data = await window.LuavexAPI.protectedScripts({ signal: controller.signal });
                if (disposed || request !== revision) return;
                hostedMode = data ? 'hosted' : 'standard';
                slots = data?.freeSlots ?? null;
            } catch (error) {
                if (disposed || request !== revision) return;
                slots = null;
                if (error.status === 401 || error.code === 'AUTH_REQUIRED') {
                    hostedMode = 'unavailable';
                    await window.LuavexAuth.refresh();
                } else if (hostedMode !== 'hosted') hostedMode = 'unavailable';
            }
            if (!disposed && request === revision) applyAuth(window.LuavexAuth.state);
        };
        const unsubscribeAuth = window.LuavexAuth.subscribe(auth => {
            const next = auth.authenticated ? auth.account?.id ?? true : null;
            if (!candidate && next !== account) {
                account = next; revision++; slots = null; hostedMode = 'checking';
                if (next) void refreshSlots();
            }
            applyAuth(auth);
        });
        outlet.querySelector('#refreshSlots').addEventListener('click', refreshSlots);
        window.addEventListener('focus', refreshSlots);

        outlet.querySelector('#openFileBtn').addEventListener('click', () => outlet.querySelector('#fileInput').click());
        outlet.querySelector('#fileInput').addEventListener('change', async event => {
            const file = event.target.files[0]; if (!file) return;
            state.scriptId = null; state.scriptName = ''; state.pendingBuild = null;
            state.sourceName = file.name.replace(/^.*[\\/]/, '').slice(0, 180); state.sourceOrigin = 'file'; state.modified = false; suppressChange = true; setInput((await file.text()).replace(/^\uFEFF/, '')); suppressChange = false; updateInputMetadata();
        });
        outlet.querySelector('#clearBtn').addEventListener('click', () => { setInput(''); setOutput(''); state.scriptId = null; state.scriptName = ''; state.sourceName = null; state.outputName = null; state.sourceOrigin = 'editor'; state.modified = false; state.build = null; state.builtSource = null; state.pendingSave = null; state.pendingBuild = null; terminalStatus = false; updateInputMetadata(); updateOutputActions(); buildSummary(outlet.querySelector('#buildSummary'), null); errorPanel.hidden = true; idleStatus(window.LuavexAuth.state); });

        saveButton.addEventListener('click', async () => {
            if (!state.pendingSave || !window.LuavexAuth.state.storageAvailable || saveButton.disabled) return;
            saveButton.disabled = true;
            setStatus('Saving', 'is-processing');
            const dismissSaveToast = window.SukaRedUI.toast('Saving protected output', 'loading');
            try {
                const { script } = await window.LuavexAPI.request('/scripts/retry-build', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(state.pendingSave)
                });
                state.pendingSave = null;
                setStoredIdentity(script);
                errorPanel.hidden = true;
                setStatus('Saved', 'is-completed');
                updateOutputActions();
                window.SukaRedUI.toast('Script saved', 'success');
            } catch (error) {
                setStatus('Save failed', 'is-error');
                errorPanel.hidden = false; errorPanel.querySelector('pre').textContent = error.message;
            } finally { dismissSaveToast?.(); saveButton.disabled = false; }
        });
        copyButton.addEventListener('click', async () => { if (!getOutput()) return; try { await navigator.clipboard.writeText(getOutput()); window.SukaRedUI.toast('Output copied', 'success'); } catch { window.SukaRedUI.toast('Clipboard unavailable. Select and copy the output.', 'error'); } });
        downloadButton.addEventListener('click', () => { if (!getOutput()) return; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([getOutput()], { type: 'text/plain;charset=utf-8' })); link.download = `${safeFilename(state.outputName || state.sourceName)}.luavex.lua`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 0); });

        const setStoredIdentity = script => {
            state.scriptId = script.id;
            state.scriptUpdated = script.updated;
            state.scriptName = state.sourceName = state.outputName = script.name;
            updateInputMetadata();
        };
        let naming = null;
        const runBuild = async (intent = null) => {
            if (!window.LuavexAuth.state.authenticated) { window.LuavexAuth.login(); return; }
            if (window.SukaRedDashboard.helpers.quotaView(window.LuavexAuth.state).exhausted) { applyAuth(window.LuavexAuth.state); return; }
            if (full() || ['checking', 'unavailable'].includes(hostedMode)) return;
            const code = getInput(); if (!code.trim()) { window.SukaRedUI.toast('Input is empty.', 'warning'); return; } if (processing) return;
            const hosted = hostedMode === 'hosted';
            const automatic = window.LuavexAuth.state.automaticStorage === true;
            if (naming) return;
            if (state.pendingSave) { window.SukaRedUI.toast('Retry saving the current output first.', 'warning'); return; }
            if (!intent && state.pendingBuild?.code === code && state.pendingBuild.intent) intent = state.pendingBuild.intent;
            if (!intent && (automatic || (hosted && scriptNameError(state.scriptName)))) {
                naming = window.SukaRedViews.nameScript(obfuscate, choice => {
                    naming = null;
                    if (choice && !disposed) void runBuild(typeof choice === 'string' ? { name: choice } : choice);
                }, { initial: state.scriptName || state.sourceName || '', checkDuplicates: automatic,
                    existing: automatic && state.scriptId ? { id: state.scriptId, name: state.scriptName, updated: state.scriptUpdated } : null });
                return;
            }
            const currentSettings = window.SukaRedSettings.load();
            processing = true; const started = performance.now();

            const dismissBuildToast = automatic ? window.SukaRedUI.toast('Building protected output', 'loading') : null;
            terminalStatus = false; setStatus('RUNNING', 'is-processing'); obfuscate.setAttribute('aria-busy', 'true'); obfuscate.disabled = true; obfuscate.classList.add('is-processing'); errorPanel.hidden = true;
            if (getOutput()) outlet.querySelector('#outputState').textContent = 'Previous output';
            try {
                const payload = candidate ? { code, bindings: developerPanel && !developerPanel.hidden ? JSON.parse(resourceBindings.value) : {}, build_id: crypto.randomUUID() } : { code, features: currentSettings.protectionFeatures, resourceProtection: true };
                if (automatic && intent?.target) {
                    payload.scriptId = intent.target.id;
                    payload.scriptUpdated = intent.target.updated;
                } else if (hosted || automatic) payload.scriptName = intent?.name ?? state.scriptName;
                if (intent?.name) state.scriptName = intent.name;
                const body = JSON.stringify(payload);
                const id = state.pendingBuild?.body === body ? state.pendingBuild.id : crypto.randomUUID();
                state.pendingBuild = { id, body, code, intent };
                const response = await fetch(apiUrl(), { method: 'POST', credentials: 'include', signal: controller.signal, headers: { 'Content-Type': 'application/json', 'x-idempotency-key': id }, body });
                const data = await response.json().catch(() => ({}));
                if (response.status === 413) { state.pendingBuild = null; const error = new Error('This script is too large to process.'); error.code = 'SOURCE_TOO_LARGE'; throw error; }
                if (!response.ok) { if (response.status < 500 && data.code !== 'BUILD_IN_PROGRESS') state.pendingBuild = null; const error = new Error(data.message || 'Build failed.'); error.code = response.status === 401 ? 'AUTH_REQUIRED' : data.code || 'BUILD_FAILED'; error.build = data.build; error.details = data.details; error.usage = data.usage; throw error; }
                if (disposed) return;
                if (typeof data.obfuscated !== 'string' || !data.obfuscated) throw new Error('No build output received.');
                if (hosted && !data.script?.id) throw new Error('No protected script record received.');
                state.pendingBuild = null;
                state.pendingSave = data.storage?.status === 'failed' ? { ...data.storage, source: code, output: data.obfuscated } : null;
                state.outputName = hosted || automatic ? state.scriptName : null;
                if (automatic && data.storage?.status === 'saved') setStoredIdentity(data.script);
                state.builtSource = code;
                updateInputMetadata();
                delete viewStates.output; setOutput(data.obfuscated); showPanel('output'); updateOutputActions(); state.build = { ...data.build, outputBytes: bytes(data.obfuscated), processingTimeMs: data.build?.processingTimeMs ?? Math.round(performance.now() - started) }; buildSummary(outlet.querySelector('#buildSummary'), state.build);
                if (data.usage) window.LuavexAuth.applyUsage(data.usage);
                terminalStatus = true;
                if (state.pendingSave) {
                    setStatus('Save failed', 'is-error');
                    errorPanel.hidden = false; errorPanel.querySelector('pre').textContent = data.storage.message;
                } else {
                    setStatus(data.storage?.status === 'saved' ? 'Saved' : 'COMPLETE', 'is-completed');
                    window.SukaRedUI.toast(data.storage?.status === 'saved' ? (intent?.target ? 'Script overwritten successfully' : 'Script saved') : 'Build completed', 'success');
                }
            } catch (error) {
                if (disposed) return;
                const codeValue = error.code || (error.name === 'AbortError' ? 'CANCELLED' : 'NETWORK_ERROR');
                if (codeValue === 'SOURCE_TOO_LARGE') {
                    terminalStatus = true; setStatus('FAILED', 'is-error');
                    window.SukaRedUI.toast('This script is too large to process.', 'error'); return;
                }
                if (codeValue === 'DAILY_LIMIT_REACHED' && error.usage) window.LuavexAuth.applyUsage(error.usage);
                errorPanel.hidden = false; errorPanel.querySelector('pre').textContent = buildErrorMessage(codeValue, error.message); terminalStatus = true; setStatus(codeValue === 'DAILY_LIMIT_REACHED' ? 'LIMIT REACHED' : 'FAILED', 'is-error'); window.SukaRedUI.toast(codeValue === 'DAILY_LIMIT_REACHED' ? 'Daily limit reached' : 'Build failed', 'error');
                if (codeValue === 'AUTH_REQUIRED') await window.LuavexAuth.refresh();
            } finally { dismissBuildToast?.(); if (!disposed && hosted) await refreshSlots(); processing = false; obfuscate.removeAttribute('aria-busy'); obfuscate.classList.remove('is-processing'); if (!disposed) applyAuth(window.LuavexAuth.state); }
        };
        fileTab.addEventListener('click', () => {
            if (processing || naming || state.pendingSave) return;
            const id = state.scriptId;
            naming = window.SukaRedViews.renameScript(fileTab, state.scriptName || state.sourceName || '', async name => {
                if (!id) return { script: { name } };
                return window.LuavexAPI.request('/scripts/' + encodeURIComponent(id), {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({name})
                });
            }, result => {
                naming = null;
                if (!result || disposed) return;
                if (id) setStoredIdentity(result.script);
                else { state.scriptName = result.script.name; updateInputMetadata(); }
                window.SukaRedUI.toast('Script renamed', 'success');
            });
        });
        obfuscate.addEventListener('click', () => runBuild());
        const shortcutListener = event => { if (!canUseBuildShortcut(event, obfuscate.disabled, processing)) return; event.preventDefault(); runBuild(); };
        outlet.addEventListener('keydown', shortcutListener);

        const settingsListener = event => { const value = event.detail; updateDeveloperPanel(); inputEditor?.updateOptions({ wordWrap: value.wordWrap ? 'on' : 'off', minimap: { enabled: value.minimap } }); outputEditor?.updateOptions({ wordWrap: value.wordWrap ? 'on' : 'off', minimap: { enabled: value.minimap } }); layoutEditors(); };
        window.addEventListener('sukared:settings', settingsListener);
        return () => { state.input = getInput(); state.output = getOutput(); disposed = true; naming?.(); controller.abort(); document.fonts?.removeEventListener('loadingdone', refreshFontMetrics); unsubscribeAuth(); inputFallback.removeEventListener('input', fallbackInputListener); outlet.removeEventListener('keydown', shortcutListener); window.removeEventListener('focus', refreshSlots); window.removeEventListener('sukared:settings', settingsListener); window.removeEventListener('resize', layoutEditors); dprQuery?.removeEventListener?.('change', refreshFontMetrics); resizeObserver?.disconnect(); inputEditor?.dispose(); outputEditor?.dispose(); };
    };

    window.SukaRedDashboard = { mount, apiUrl, loadMonaco, newScript() { Object.assign(state, { input: '', output: '', sourceName: null, sourceOrigin: 'editor', modified: false, build: null, scriptId: null, scriptUpdated: null, scriptName: '', outputName: null, builtSource: null, pendingBuild: null, pendingSave: null }); }, openStored(script) { state.scriptId = script.id; state.scriptUpdated = script.updated; state.pendingBuild = state.pendingSave = null; state.input = script.source; state.output = script.output; state.sourceName = script.name; state.scriptName = script.name; state.outputName = script.name; state.builtSource = script.source; state.build = null; }, helpers: Object.freeze({ formatBytes, lineCount, inputMetadata, outputMetadata, canUseBuildShortcut, quotaView, scriptNameError, bytes }) };
})();
