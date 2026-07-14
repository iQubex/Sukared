(function () {
    'use strict';

    const state = {
        input: '-- Paste your Luau script here\nprint("Hello SukaRed")',
        output: '',
        sourceName: null,
        sourceOrigin: 'editor',
        modified: false,
        build: null,
        monacoReady: null
    };

    const apiUrl = () => ['localhost', '127.0.0.1', ''].includes(location.hostname)
        ? 'http://localhost:3000/obfuscate'
        : 'https://sukared-backend.onrender.com/obfuscate';
    const bytes = value => new Blob([String(value || '')]).size;
    const formatBytes = value => {
        const size = Number(value) || 0;
        if (size < 1024) return `${size} B`;
        if (size < 1048576) return `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`;
        return `${(size / 1048576).toFixed(1)} MB`;
    };
    const safeFilename = value => String(value || 'Untitled-Script')
        .replace(/\.(lua|luau)$/i, '')
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100) || 'Untitled-Script';

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
        container.hidden = false;
        container.append(window.SukaRedUI.el('h2', '', 'Build Summary'));
        const dl = window.SukaRedUI.el('dl', 'summary-grid');
        const rows = [
            ['Status', 'Completed'], ['Profile', build.publicProfile || build.profile || '-'],
            ['Build Time', `${build.processingTimeMs || 0} ms`], ['Output Size', formatBytes(build.outputBytes)]
        ];
        rows.forEach(([label, value]) => {
            const item = document.createElement('div');
            item.append(window.SukaRedUI.el('dt', '', label), window.SukaRedUI.el('dd', '', value));
            dl.append(item);
        });
        const details = document.createElement('details');
        details.className = 'technical-details';
        details.append(window.SukaRedUI.el('summary', '', 'Technical Details'));
        const technical = window.SukaRedUI.el('dl', 'technical-grid');
        const technicalRows = [
            ['Build ID', build.buildId], ['VM Applied', build.vmApplied ? 'Yes' : 'No'],
            ['Virtualized Functions', `${build.virtualizedFunctions || 0} / ${build.eligibleFunctions || 0}`],
            ['AST Coverage', build.astCoveragePercent == null ? '-' : `${build.astCoveragePercent}%`],
            ['Clustered Functions', build.clusteredFunctions], ['VM Instructions', build.vmInstructionCount],
            ['Fallback Functions', build.fallbackFunctions], ['Runtime', build.runtimeVersion || '-'],
            ['Internal Profile', build.internalProfile || build.profile],
            ['Reason Summary', build.skippedByReason ? Object.entries(build.skippedByReason).map(([reason, count]) => `${count} ${reason}`).join(', ') : 'None']
        ];
        technicalRows.forEach(([label, value]) => {
            const item = document.createElement('div');
            item.append(window.SukaRedUI.el('dt', '', label), window.SukaRedUI.el('dd', '', value == null ? '-' : String(value)));
            technical.append(item);
        });
        details.append(technical);
        container.append(dl, details);
    };

    const view = () => `
        <section class="dashboard-page page-section" aria-labelledby="dashboardTitle">
            <div class="page-heading compact-heading">
                <div><span class="eyebrow">Workspace</span><h1 id="dashboardTitle">Obfuscate</h1></div>
                <div class="workspace-status" id="workspaceStatus" role="status">Ready</div>
            </div>
            <div class="workspace-toolbar">
                <div class="toolbar-group">
                    <button class="button" id="openFileBtn" type="button">Open File</button>
                    <input id="fileInput" type="file" accept=".lua,.luau,text/plain" hidden>
                    <span class="file-state" id="fileState"></span>
                    <button class="button" id="clearBtn" type="button">Clear</button>
                </div>
                <button class="button" id="dashboardSettings" type="button">Settings</button>
            </div>
            <div class="editor-workspace">
                <section class="editor-panel">
                    <header><span>Input</span></header>
                    <div class="editor-host" id="inputEditor"></div>
                    <textarea class="editor-fallback" id="inputFallback" aria-label="Input code"></textarea>
                </section>
                <div class="build-controls">
                    <button class="obfuscate-button" id="obfuscateBtn" type="button" aria-label="Obfuscate" title="Obfuscate"><span class="play-symbol">▶</span><span class="spinner"></span></button>
                    <small id="profileSummary"></small>
                </div>
                <section class="editor-panel">
                    <header><span>Output</span><div class="editor-actions"><button class="icon-button" id="copyOutput" type="button" aria-label="Copy output" title="Copy output">⧉</button><button class="icon-button" id="downloadOutput" type="button" aria-label="Download output" title="Download output">⇩</button></div></header>
                    <div class="editor-host" id="outputEditor"></div>
                    <textarea class="editor-fallback" id="outputFallback" readonly aria-label="Output code"></textarea>
                </section>
            </div>
            <section class="build-summary" id="buildSummary" hidden></section>
            <section class="inline-error" id="buildError" hidden><strong>Build failed</strong><pre></pre></section>
        </section>`;

    const mount = async (outlet, historyStore) => {
        outlet.innerHTML = view();
        const settings = window.SukaRedSettings.load();
        const inputHost = outlet.querySelector('#inputEditor');
        const outputHost = outlet.querySelector('#outputEditor');
        const inputFallback = outlet.querySelector('#inputFallback');
        const outputFallback = outlet.querySelector('#outputFallback');
        const fileState = outlet.querySelector('#fileState');
        const status = outlet.querySelector('#workspaceStatus');
        const errorPanel = outlet.querySelector('#buildError');
        const obfuscate = outlet.querySelector('#obfuscateBtn');
        inputFallback.value = state.input;
        outputFallback.value = state.output;
        outlet.querySelector('#profileSummary').textContent = ({ light: 'Light', light_plus: 'Light+', good: 'Good', pro: 'Pro' }[settings.profile] || 'Light+');
        buildSummary(outlet.querySelector('#buildSummary'), state.build);

        let inputEditor = null;
        let outputEditor = null;
        let suppressChange = true;
        const monaco = await loadMonaco();
        if (!inputHost.isConnected) return () => {};
        if (monaco) {
            monaco.editor.defineTheme('sukared-dark', { base: 'vs-dark', inherit: true, rules: [
                { token: 'keyword', foreground: 'ff5f93' }, { token: 'string', foreground: 'c7a6ff' },
                { token: 'number', foreground: '8ce0c3' }, { token: 'comment', foreground: '6d6674' }
            ], colors: { 'editor.background': '#050507', 'editor.foreground': '#e8e5eb', 'editorCursor.foreground': '#ff2aa7', 'editor.selectionBackground': '#3a1230', 'editor.lineHighlightBackground': '#0c0b10' } });
            const options = { language: 'lua', theme: 'sukared-dark', automaticLayout: true, fontFamily: "'Cascadia Mono', Consolas, monospace", fontLigatures: false, fontSize: 14, lineHeight: 22, letterSpacing: 0, minimap: { enabled: settings.minimap }, wordWrap: settings.wordWrap ? 'on' : 'off', scrollBeyondLastLine: false, padding: { top: 14 }, roundedSelection: false };
            inputEditor = monaco.editor.create(inputHost, { ...options, value: state.input });
            outputEditor = monaco.editor.create(outputHost, { ...options, value: state.output, readOnly: true });
            inputFallback.hidden = true;
            outputFallback.hidden = true;
            inputEditor.onDidChangeModelContent(() => {
                state.input = inputEditor.getValue();
                if (!suppressChange && state.sourceOrigin === 'file') { state.modified = true; updateFileState(); }
            });
            suppressChange = false;
            document.fonts?.ready?.then(() => { inputEditor?.layout(); outputEditor?.layout(); });
        }

        const getInput = () => inputEditor ? inputEditor.getValue() : inputFallback.value;
        const setInput = value => { state.input = value; inputEditor ? inputEditor.setValue(value) : (inputFallback.value = value); };
        const getOutput = () => outputEditor ? outputEditor.getValue() : outputFallback.value;
        const setOutput = value => { state.output = value; outputEditor ? outputEditor.setValue(value) : (outputFallback.value = value); };
        const updateFileState = () => { fileState.textContent = state.sourceName ? `${state.sourceName}${state.modified ? ' · Modified' : ''}` : ''; };
        updateFileState();

        outlet.querySelector('#dashboardSettings').addEventListener('click', window.SukaRedUI.openSettingsModal);
        outlet.querySelector('#openFileBtn').addEventListener('click', () => outlet.querySelector('#fileInput').click());
        outlet.querySelector('#fileInput').addEventListener('change', async event => {
            const file = event.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { window.SukaRedUI.toast('The file is too large.', 'error'); return; }
            state.sourceName = file.name.replace(/^.*[\\/]/, '').slice(0, 180);
            state.sourceOrigin = 'file';
            state.modified = false;
            suppressChange = true;
            setInput((await file.text()).replace(/^\uFEFF/, ''));
            suppressChange = false;
            updateFileState();
        });
        outlet.querySelector('#clearBtn').addEventListener('click', () => {
            setInput(''); setOutput(''); state.sourceName = null; state.sourceOrigin = 'editor'; state.modified = false; state.build = null;
            updateFileState(); buildSummary(outlet.querySelector('#buildSummary'), null); errorPanel.hidden = true;
        });
        outlet.querySelector('#copyOutput').addEventListener('click', async () => {
            if (!getOutput()) return;
            await navigator.clipboard.writeText(getOutput());
            window.SukaRedUI.toast('Output copied', 'success');
        });
        outlet.querySelector('#downloadOutput').addEventListener('click', () => {
            if (!getOutput()) return;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([getOutput()], { type: 'text/plain;charset=utf-8' }));
            link.download = `${safeFilename(state.sourceName)}.sukared.lua`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 0);
        });

        obfuscate.addEventListener('click', async () => {
            const code = getInput();
            if (!code.trim()) { window.SukaRedUI.toast('Input is empty.', 'warning'); return; }
            const currentSettings = window.SukaRedSettings.load();
            const id = crypto.randomUUID ? crypto.randomUUID() : `LOCAL-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            let sourceName = state.sourceName;
            if (!sourceName) {
                const untitled = (await historyStore.list()).filter(item => /^Untitled Script/.test(item.sourceName)).length;
                sourceName = `Untitled Script${untitled ? ` ${untitled + 1}` : ''}`;
            }
            const record = {
                id, buildId: '', createdAt: new Date().toISOString(), completedAt: null, status: 'building',
                profile: ({ light: 'Light', light_plus: 'Light+', good: 'Good', pro: 'Pro' }[currentSettings.profile]),
                sourceName, sourceOrigin: state.sourceOrigin, sourceBytes: bytes(code), outputAvailable: false, outputText: null, creditCharged: false, metadata: {}
            };
            try { await historyStore.put(record); } catch (_) { window.SukaRedUI.toast('History storage unavailable.', 'warning'); }
            status.textContent = 'Processing'; status.className = 'workspace-status is-processing';
            obfuscate.disabled = true; obfuscate.classList.add('is-processing'); errorPanel.hidden = true;
            const started = Date.now();
            try {
                const response = await fetch(apiUrl(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-idempotency-key': id },
                    body: JSON.stringify({ code, profile: currentSettings.profile })
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    const error = new Error(data.details || data.message || response.statusText || 'Build failed.');
                    error.code = data.code || 'BUILD_FAILED';
                    error.build = data.build;
                    throw error;
                }
                setOutput(data.obfuscated || '');
                state.build = data.build || {};
                buildSummary(outlet.querySelector('#buildSummary'), state.build);
                const keepOutput = currentSettings.keepOutputs && bytes(data.obfuscated) <= 2 * 1024 * 1024;
                if (currentSettings.keepOutputs && !keepOutput) window.SukaRedUI.toast('Output is too large to retain locally.', 'warning');
                await historyStore.update(id, {
                    buildId: data.build?.buildId || id,
                    completedAt: new Date().toISOString(), status: 'completed', outputBytes: data.build?.outputBytes ?? bytes(data.obfuscated),
                    buildTimeMs: data.build?.processingTimeMs ?? Date.now() - started, vmApplied: data.build?.vmApplied ?? false,
                    virtualizedFunctions: data.build?.virtualizedFunctions, eligibleFunctions: data.build?.eligibleFunctions,
                    coveragePercent: data.build?.functionCoveragePercent, astCoveragePercent: data.build?.astCoveragePercent,
                    runtimeVersion: data.build?.runtimeVersion || null, outputAvailable: keepOutput, outputText: keepOutput ? data.obfuscated : null,
                    metadata: { fallbackFunctions: data.build?.fallbackFunctions, skippedByReason: data.build?.skippedByReason || {}, internalProfile: data.build?.internalProfile, vmInstructionCount: data.build?.vmInstructionCount, clusteredFunctions: data.build?.clusteredFunctions }
                });
                status.textContent = 'Completed'; status.className = 'workspace-status is-completed';
                window.SukaRedUI.toast('Build completed', 'success');
            } catch (error) {
                const codeValue = error.code || (error.name === 'AbortError' ? 'CANCELLED' : 'NETWORK_ERROR');
                const timeout = codeValue === 'BUILD_TIMEOUT';
                const failureStage = timeout ? 'timeout'
                    : (codeValue === 'NETWORK_ERROR' ? 'network'
                        : (codeValue === 'CANCELLED' ? 'cancelled'
                            : (codeValue.includes('QUEUE') ? 'queue'
                                : (codeValue.includes('WORKER') ? 'worker'
                                    : (codeValue.includes('VM') ? 'virtualization'
                                        : (/\[\d+:\d+\]/.test(error.message) ? 'parsing'
                                            : (codeValue.startsWith('SOURCE_') || codeValue.startsWith('PROFILE_') ? 'validation' : 'transformation')))))));
                await historyStore.update(id, {
                    buildId: error.build?.buildId || `LOCAL-FAIL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    completedAt: new Date().toISOString(), status: timeout ? 'timeout' : 'failed', buildTimeMs: Date.now() - started,
                    errorCode: codeValue, errorMessage: error.message, failureStage, creditCharged: false, outputAvailable: false, outputText: null
                }).catch(() => window.SukaRedUI.toast('Build failed, but history could not be saved.', 'warning'));
                errorPanel.hidden = false;
                errorPanel.querySelector('pre').textContent = `${codeValue}\n${error.message}\nAttempted API URL: ${apiUrl()}`;
                status.textContent = 'Error'; status.className = 'workspace-status is-error';
                window.SukaRedUI.toast('Build failed', 'error');
            } finally {
                obfuscate.disabled = false; obfuscate.classList.remove('is-processing');
            }
        });

        const settingsListener = event => {
            const value = event.detail;
            outlet.querySelector('#profileSummary').textContent = ({ light: 'Light', light_plus: 'Light+', good: 'Good', pro: 'Pro' }[value.profile]);
            inputEditor?.updateOptions({ wordWrap: value.wordWrap ? 'on' : 'off', minimap: { enabled: value.minimap } });
            outputEditor?.updateOptions({ wordWrap: value.wordWrap ? 'on' : 'off', minimap: { enabled: value.minimap } });
        };
        window.addEventListener('sukared:settings', settingsListener);

        return () => {
            state.input = getInput(); state.output = getOutput();
            window.removeEventListener('sukared:settings', settingsListener);
            inputEditor?.dispose(); outputEditor?.dispose();
        };
    };

    window.SukaRedDashboard = { mount };
})();
