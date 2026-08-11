(function () {
    'use strict';

    const state = {
        input: '-- Paste your Luau script here\nprint("Hello Luavex")', output: '', sourceName: null,
        sourceOrigin: 'editor', modified: false, build: null, monacoReady: null
    };
    const profileNames = { light: 'Light', light_plus: 'Light+', good: 'Good', pro: 'Pro', hell: 'Hell' };
    const apiUrl = () => `${window.LuavexAPI.base}/obfuscate`;
    const bytes = value => new Blob([String(value || '')]).size;
    const formatBytes = value => { const size = Number(value) || 0; if (size < 1024) return `${size} B`; if (size < 1048576) return `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`; return `${(size / 1048576).toFixed(1)} MB`; };
    const safeFilename = value => String(value || 'Untitled-Script').replace(/\.(lua|luau)$/i, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'Untitled-Script';
    const buildErrorMessage = (code, fallback) => ({
        AUTH_REQUIRED: 'Connect Discord before starting a build.',
        SOURCE_REQUIRED: 'Add Luau source code before starting a build.',
        PROFILE_UNAVAILABLE: 'The selected profile is not available in this environment.',
        RATE_LIMITED: 'Too many build requests. Wait a moment and try again.',
        QUEUE_FULL: 'The build queue is currently full. Try again shortly.',
        BUILD_TIMEOUT: 'The build exceeded its time limit. Your source was not stored.',
        WORKER_CRASH: 'The isolated build worker stopped unexpectedly. Try the build again.',
        NETWORK_ERROR: 'The build server could not be reached. Check that the backend is online.'
    }[code] || (code === 'BUILD_FAILED' ? 'The build could not be completed. Check the source syntax and try again.' : fallback || 'The build could not be completed.'));

    const loadMonaco = () => {
        if (state.monacoReady) return state.monacoReady;
        state.monacoReady = new Promise(resolve => {
            if (!window.require) { resolve(null); return; }
            window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
            window.require(['vs/editor/editor.main'], () => resolve(window.monaco), () => resolve(null));
        });
        return state.monacoReady;
    };

    const buildSummary = (container, build) => {
        container.replaceChildren();
        if (!build) { container.hidden = true; return; }
        container.hidden = false; container.append(window.SukaRedUI.el('h2', '', 'Build Summary'));
        const dl = window.SukaRedUI.el('dl', 'summary-grid');
        [['Status', 'Completed'], ['Profile', build.publicProfile || build.profile || '-'], ['Build Time', `${build.processingTimeMs || 0} ms`], ['Output Size', formatBytes(build.outputBytes)]].forEach(([label, value]) => {
            const item = document.createElement('div'); item.append(window.SukaRedUI.el('dt', '', label), window.SukaRedUI.el('dd', '', value)); dl.append(item);
        });
        const details = document.createElement('details'); details.className = 'technical-details'; details.append(window.SukaRedUI.el('summary', '', 'Technical Details'));
        const technical = window.SukaRedUI.el('dl', 'technical-grid');
        [
            ['Build ID', build.buildId], ['VM Applied', build.vmApplied ? 'Yes' : 'No'], ['Virtualized Functions', `${build.virtualizedFunctions || 0} / ${build.eligibleFunctions || 0}`],
            ['AST Coverage', build.astCoveragePercent == null ? '-' : `${build.astCoveragePercent}%`], ['Clustered Functions', build.clusteredFunctions],
            ['VM Instructions', build.vmInstructionCount], ['Fallback Functions', build.fallbackFunctions], ['Runtime', build.runtimeVersion || '-'],
            ['Adaptive Analysis', build.adaptiveAnalysisEnabled ? 'Enabled' : 'Disabled'],
            ['Internal Profile', build.internalProfile || build.profile], ['Reason Summary', build.skippedByReason ? Object.entries(build.skippedByReason).map(([reason, count]) => `${count} ${reason}`).join(', ') : 'None']
        ].forEach(([label, value]) => { const item = document.createElement('div'); item.append(window.SukaRedUI.el('dt', '', label), window.SukaRedUI.el('dd', '', value == null ? '-' : String(value))); technical.append(item); });
        details.append(technical); container.append(dl, details);
    };

    const view = () => `
        <section class="dashboard-page page-section" aria-labelledby="workspaceTitle">
            <header class="workspace-heading"><div><span class="eyebrow">Workspace</span><h1 id="workspaceTitle">Obfuscation Workspace</h1></div><div class="workspace-status" id="workspaceStatus" role="status">Ready</div></header>
            <div class="editor-workspace">
                <section class="editor-panel" aria-labelledby="inputLabel">
                    <header><div><span id="inputLabel">INPUT</span><small class="file-state" id="fileState">Editor buffer</small></div><div class="editor-actions"><button class="icon-button" id="openFileBtn" type="button" aria-label="Open source file" title="Open source file"></button><button class="icon-button" id="clearBtn" type="button" aria-label="Clear input" title="Clear input"></button></div></header>
                    <input id="fileInput" type="file" accept=".lua,.luau,text/plain" hidden><div class="editor-host" id="inputEditor"></div><textarea class="editor-fallback" id="inputFallback" aria-label="Input code"></textarea>
                </section>
                <div class="build-controls"><button class="center-settings" id="dashboardSettings" type="button"><span class="settings-icon-slot"></span><span>Settings</span></button><button class="obfuscate-button" id="obfuscateBtn" type="button" aria-label="Obfuscate source" title="Connect Discord to obfuscate" disabled><span class="run-icon-slot"></span><span class="spinner"></span></button><small id="profileSummary"></small><small class="auth-build-note" id="authBuildNote">Connect Discord to build</small></div>
                <section class="editor-panel" aria-labelledby="outputLabel">
                    <header><div><span id="outputLabel">OUTPUT</span><small id="outputState">No build yet</small></div><div class="editor-actions"><button class="icon-button" id="copyOutput" type="button" aria-label="Copy output" title="Copy output"></button><button class="icon-button" id="downloadOutput" type="button" aria-label="Download output" title="Download output"></button></div></header>
                    <div class="editor-host" id="outputEditor"></div><textarea class="editor-fallback" id="outputFallback" readonly aria-label="Output code"></textarea>
                </section>
            </div>
            <section class="build-summary" id="buildSummary" hidden></section><section class="inline-error" id="buildError" hidden><strong>Build failed</strong><pre></pre></section>
        </section>`;

    const mount = async (outlet, historyStore) => {
        outlet.innerHTML = view();
        const settings = window.SukaRedSettings.load();
        const inputHost = outlet.querySelector('#inputEditor'); const outputHost = outlet.querySelector('#outputEditor');
        const inputFallback = outlet.querySelector('#inputFallback'); const outputFallback = outlet.querySelector('#outputFallback');
        const fileState = outlet.querySelector('#fileState'); const status = outlet.querySelector('#workspaceStatus'); const errorPanel = outlet.querySelector('#buildError'); const obfuscate = outlet.querySelector('#obfuscateBtn');
        const copyButton = outlet.querySelector('#copyOutput'); const downloadButton = outlet.querySelector('#downloadOutput');
        outlet.querySelector('#openFileBtn').append(window.SukaRedIcons.icon('upload')); outlet.querySelector('#clearBtn').append(window.SukaRedIcons.icon('trash'));
        copyButton.append(window.SukaRedIcons.icon('copy')); downloadButton.append(window.SukaRedIcons.icon('download'));
        outlet.querySelector('.settings-icon-slot').append(window.SukaRedIcons.icon('settings', { size: 15 })); outlet.querySelector('.run-icon-slot').append(window.SukaRedIcons.icon('play', { size: 23 }));
        inputFallback.value = state.input; outputFallback.value = state.output; outlet.querySelector('#profileSummary').textContent = profileNames[settings.profile] || 'Light+'; buildSummary(outlet.querySelector('#buildSummary'), state.build);

        let inputEditor = null; let outputEditor = null; let suppressChange = true; let resizeObserver = null; let dprQuery = null; let disposed = false;
        const layoutEditors = () => { if (!disposed) { inputEditor?.layout(); outputEditor?.layout(); } };
        const monaco = await loadMonaco();
        if (!inputHost.isConnected) return () => {};
        if (monaco) {
            monaco.editor.defineTheme('sukared-mono', { base: 'vs-dark', inherit: true, rules: [
                { token: 'keyword', foreground: 'ffffff' }, { token: 'string', foreground: 'c8c8c8' }, { token: 'number', foreground: 'dedede' }, { token: 'comment', foreground: '6d6d6d' }
            ], colors: { 'editor.background': '#050505', 'editor.foreground': '#e6e6e6', 'editorCursor.foreground': '#ffffff', 'editor.selectionBackground': '#383838', 'editor.lineHighlightBackground': '#0b0b0b', 'editorGutter.background': '#050505' } });
            const options = { language: 'lua', theme: 'sukared-mono', automaticLayout: false, fontFamily: "'Fira Code', 'Cascadia Mono', Consolas, monospace", fontLigatures: false, fontSize: 14, lineHeight: 22, letterSpacing: 0, minimap: { enabled: settings.minimap }, wordWrap: settings.wordWrap ? 'on' : 'off', scrollBeyondLastLine: false, padding: { top: 14 }, roundedSelection: false };
            inputEditor = monaco.editor.create(inputHost, { ...options, value: state.input }); outputEditor = monaco.editor.create(outputHost, { ...options, value: state.output, readOnly: true });
            inputFallback.hidden = true; outputFallback.hidden = true;
            inputEditor.onDidChangeModelContent(() => { state.input = inputEditor.getValue(); if (!suppressChange && state.sourceOrigin === 'file') { state.modified = true; updateFileState(); } }); suppressChange = false;
            resizeObserver = new ResizeObserver(layoutEditors); resizeObserver.observe(inputHost); resizeObserver.observe(outputHost); window.addEventListener('resize', layoutEditors);
            dprQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`); dprQuery.addEventListener?.('change', layoutEditors);
            document.fonts?.ready?.then(layoutEditors); requestAnimationFrame(layoutEditors);
        }

        const getInput = () => inputEditor ? inputEditor.getValue() : inputFallback.value;
        const setInput = value => { state.input = value; inputEditor ? inputEditor.setValue(value) : (inputFallback.value = value); };
        const getOutput = () => outputEditor ? outputEditor.getValue() : outputFallback.value;
        const setOutput = value => { state.output = value; outputEditor ? outputEditor.setValue(value) : (outputFallback.value = value); };
        const updateFileState = () => { fileState.textContent = state.sourceName ? `${state.sourceName}${state.modified ? ' / Modified' : ''}` : 'Editor buffer'; };
        const updateOutputActions = () => { const available = Boolean(getOutput()); copyButton.disabled = !available; downloadButton.disabled = !available; outlet.querySelector('#outputState').textContent = available ? formatBytes(bytes(getOutput())) : 'No build yet'; };
        updateFileState(); updateOutputActions();
        const authBuildNote = outlet.querySelector('#authBuildNote');
        const applyAuth = auth => {
            const blocked = !auth.authenticated;
            if (!obfuscate.classList.contains('is-processing')) obfuscate.disabled = blocked;
            obfuscate.title = blocked ? 'Connect Discord to obfuscate' : 'Obfuscate source';
            authBuildNote.textContent = blocked ? 'Connect Discord to build' : `Signed in as ${auth.account.displayName || auth.account.username}`;
        };
        const unsubscribeAuth = window.LuavexAuth.subscribe(applyAuth);

        outlet.querySelector('#dashboardSettings').addEventListener('click', event => window.SukaRedUI.openSettingsModal(event.currentTarget));
        outlet.querySelector('#openFileBtn').addEventListener('click', () => outlet.querySelector('#fileInput').click());
        outlet.querySelector('#fileInput').addEventListener('change', async event => {
            const file = event.target.files[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { window.SukaRedUI.toast('The file is too large.', 'error'); return; }
            state.sourceName = file.name.replace(/^.*[\\/]/, '').slice(0, 180); state.sourceOrigin = 'file'; state.modified = false; suppressChange = true; setInput((await file.text()).replace(/^\uFEFF/, '')); suppressChange = false; updateFileState();
        });
        outlet.querySelector('#clearBtn').addEventListener('click', () => { setInput(''); setOutput(''); state.sourceName = null; state.sourceOrigin = 'editor'; state.modified = false; state.build = null; updateFileState(); updateOutputActions(); buildSummary(outlet.querySelector('#buildSummary'), null); errorPanel.hidden = true; });
        copyButton.addEventListener('click', async () => { if (!getOutput()) return; await navigator.clipboard.writeText(getOutput()); window.SukaRedUI.toast('Output copied', 'success'); });
        downloadButton.addEventListener('click', () => { if (!getOutput()) return; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([getOutput()], { type: 'text/plain;charset=utf-8' })); link.download = `${safeFilename(state.sourceName)}.luavex.lua`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 0); });

        obfuscate.addEventListener('click', async () => {
            if (!window.LuavexAuth.state.authenticated) { window.LuavexAuth.login(); return; }
            const code = getInput(); if (!code.trim()) { window.SukaRedUI.toast('Input is empty.', 'warning'); return; } if (window.SukaRedTransition.active) return;
            const currentSettings = window.SukaRedSettings.load();
            if (currentSettings.profile === 'hell') {
                const accepted = await window.SukaRedUI.confirm(
                    'Hell Experimental',
                    'Hell is an experimental maximum protection profile.\n\nHigher build time and resource usage may occur.\n\nRecommended for high-value scripts.'
                );
                if (!accepted) return;
            }
            const transition = window.SukaRedTransition.begin(code);
            const id = crypto.randomUUID ? crypto.randomUUID() : `LOCAL-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            status.textContent = 'Processing'; status.className = 'workspace-status is-processing'; obfuscate.disabled = true; obfuscate.classList.add('is-processing'); errorPanel.hidden = true;
            let polling = true;
            const pollStatus = async () => {
                while (polling) {
                    try {
                        const payload = await window.LuavexAPI.request(`/builds/status/${encodeURIComponent(id)}`);
                        transition?.setStage(payload.status.stage, payload.status);
                    } catch (_) { /* status may not exist until the request is accepted */ }
                    await new Promise(resolve => setTimeout(resolve, 550));
                }
            };
            pollStatus();
            try {
                const response = await fetch(apiUrl(), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-idempotency-key': id }, body: JSON.stringify({ code, profile: currentSettings.profile }) });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) { const error = new Error(data.message || 'Build failed.'); error.code = data.code || 'BUILD_FAILED'; error.build = data.build; throw error; }
                setOutput(data.obfuscated || ''); updateOutputActions(); state.build = data.build || {}; buildSummary(outlet.querySelector('#buildSummary'), state.build);
                status.textContent = 'Completed'; status.className = 'workspace-status is-completed'; await transition.close('success'); window.SukaRedUI.toast('Build completed', 'success');
            } catch (error) {
                const codeValue = error.code || (error.name === 'AbortError' ? 'CANCELLED' : 'NETWORK_ERROR');
                errorPanel.hidden = false; errorPanel.querySelector('pre').textContent = `${codeValue}\n${buildErrorMessage(codeValue, error.message)}\nAttempted API URL: ${apiUrl()}`; status.textContent = 'Error'; status.className = 'workspace-status is-error'; await transition?.close('error'); window.SukaRedUI.toast('Build failed', 'error');
                if (codeValue === 'AUTH_REQUIRED') await window.LuavexAuth.refresh();
            } finally { polling = false; obfuscate.classList.remove('is-processing'); applyAuth(window.LuavexAuth.state); }
        });

        const settingsListener = event => { const value = event.detail; outlet.querySelector('#profileSummary').textContent = profileNames[value.profile]; inputEditor?.updateOptions({ wordWrap: value.wordWrap ? 'on' : 'off', minimap: { enabled: value.minimap } }); outputEditor?.updateOptions({ wordWrap: value.wordWrap ? 'on' : 'off', minimap: { enabled: value.minimap } }); layoutEditors(); };
        window.addEventListener('sukared:settings', settingsListener);
        return () => { state.input = getInput(); state.output = getOutput(); disposed = true; unsubscribeAuth(); window.removeEventListener('sukared:settings', settingsListener); window.removeEventListener('resize', layoutEditors); dprQuery?.removeEventListener?.('change', layoutEditors); resizeObserver?.disconnect(); inputEditor?.dispose(); outputEditor?.dispose(); };
    };

    window.SukaRedDashboard = { mount, apiUrl };
})();
