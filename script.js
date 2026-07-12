const PRODUCT_VERSION = 'SukaRed 1.0';
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const dom = {
    root: document.documentElement,
    mainTitle: document.getElementById('mainTitle'),
    subTitle: document.getElementById('subTitle'),
    inputHost: document.getElementById('inputEditor'),
    outputHost: document.getElementById('outputEditor'),
    inputFallback: document.getElementById('codeInput'),
    outputFallback: document.getElementById('codeOutput'),
    obfuscate: document.getElementById('obfuscateBtn'),
    copy: document.getElementById('copyBtn'),
    download: document.getElementById('downloadBtn'),
    clear: document.getElementById('clearBtn'),
    openFile: document.getElementById('openFileBtn'),
    fileInput: document.getElementById('fileInput'),
    fileName: document.getElementById('fileNameLabel'),
    settings: document.getElementById('settingsBtn'),
    settingsOverlay: document.getElementById('settingsOverlay'),
    settingsModal: document.getElementById('settingsModal'),
    settingsClose: document.getElementById('settingsCloseBtn'),
    settingsCancel: document.getElementById('settingsCancelBtn'),
    settingsSave: document.getElementById('settingsSaveBtn'),
    profileDropdown: document.getElementById('profileDropdown'),
    vmDropdown: document.getElementById('vmDropdown'),
    wordWrapToggle: document.getElementById('wordWrapToggle'),
    minimapToggle: document.getElementById('minimapToggle'),
    animationsToggle: document.getElementById('animationsToggle'),
    status: document.getElementById('statusPill'),
    buildInfo: document.getElementById('buildInfo'),
    buildInfoGrid: document.getElementById('buildInfoGrid'),
    errorDetails: document.getElementById('errorDetails'),
    errorToggle: document.getElementById('errorToggle'),
    errorText: document.getElementById('errorText'),
    dropZone: document.getElementById('dropZone'),
    toast: document.getElementById('toast')
};

const settingsState = {
    profile: 'balanced',
    vmMode: 'off',
    wordWrap: true,
    minimap: false,
    animations: true
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const config = {
    apiUrl() {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host === '') {
            return 'http://localhost:3000/obfuscate';
        }
        return 'https://sukared-backend.onrender.com/obfuscate';
    }
};

const notifications = (() => {
    let timer = null;
    const showToast = (message) => {
        clearTimeout(timer);
        dom.toast.textContent = message;
        dom.toast.hidden = false;
        timer = setTimeout(() => {
            dom.toast.hidden = true;
        }, 1800);
    };
    return { showToast };
})();

const stateManager = (() => {
    const setStatus = (status, details = '') => {
        dom.status.className = `status-pill ${status.toLowerCase()}`;
        dom.status.textContent = status;
        if (status !== 'Error') {
            dom.errorDetails.hidden = true;
            dom.errorText.hidden = true;
            dom.errorText.textContent = '';
        } else {
            dom.errorDetails.hidden = false;
            dom.errorText.textContent = details || 'Unable to process the script.';
        }
    };

    const setProcessing = (isProcessing) => {
        dom.obfuscate.disabled = isProcessing;
        dom.obfuscate.classList.toggle('processing', isProcessing);
        dom.settings.disabled = isProcessing;
    };

    return { setStatus, setProcessing };
})();

const editorManager = (() => {
    let monacoApi = null;
    let inputEditor = null;
    let outputEditor = null;
    let inputWrap = true;
    let resizeObserver = null;
    let dprQuery = null;

    const MONACO_FONT_STACK = "'Fira Code', 'Cascadia Code', 'Cascadia Mono', Consolas, monospace";
    const MONACO_OPTIONS = {
        fontFamily: MONACO_FONT_STACK,
        fontLigatures: false,
        fontSize: 14,
        lineHeight: 22,
        letterSpacing: 0,
        tabSize: 4,
        insertSpaces: true,
        automaticLayout: false,
        minimap: { enabled: false },
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true }
    };

    const fallback = {
        getInputCode: () => dom.inputFallback.value,
        setInputCode: (value) => { dom.inputFallback.value = value; },
        getOutputCode: () => dom.outputFallback.value,
        setOutputCode: (value) => { dom.outputFallback.value = value; }
    };

    const defineTheme = () => {
        monacoApi.editor.defineTheme('sukared-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: 'ff5f93' },
                { token: 'string', foreground: 'c7a6ff' },
                { token: 'number', foreground: '8ce0c3' },
                { token: 'comment', foreground: '6d6674' }
            ],
            colors: {
                'editor.background': '#030303',
                'editor.foreground': '#e4e0e8',
                'editorLineNumber.foreground': '#504a56',
                'editorCursor.foreground': '#ff0055',
                'editor.selectionBackground': '#3a1230',
                'editor.lineHighlightBackground': '#0b0b0f'
            }
        });
    };

    const waitForFonts = async () => {
        if (!document.fonts || !document.fonts.ready) return;
        try {
            await document.fonts.ready;
        } catch (_) {
            // Monaco still receives explicit fallback font metrics below.
        }
    };

    const integerDimension = (element) => {
        const rect = element.getBoundingClientRect();
        return {
            width: Math.max(1, Math.round(rect.width)),
            height: Math.max(1, Math.round(rect.height)),
            rawWidth: rect.width,
            rawHeight: rect.height
        };
    };

    const layoutEditor = (editor, host) => {
        if (!editor || !host) return;
        const dim = integerDimension(host);
        editor.layout({ width: dim.width, height: dim.height });
        host.dataset.fractionalWidth = String(dim.rawWidth % 1 !== 0);
        host.dataset.fractionalHeight = String(dim.rawHeight % 1 !== 0);
    };

    const layoutEditors = () => {
        layoutEditor(inputEditor, dom.inputHost);
        layoutEditor(outputEditor, dom.outputHost);
    };

    const bindLayoutObservers = () => {
        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(layoutEditors);
        });
        resizeObserver.observe(dom.inputHost);
        resizeObserver.observe(dom.outputHost);

        window.addEventListener('resize', layoutEditors, { passive: true });

        const bindDprListener = () => {
            dprQuery?.removeEventListener?.('change', bindDprListener);
            dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
            dprQuery.addEventListener?.('change', () => {
                bindDprListener();
                layoutEditors();
            });
        };
        bindDprListener();
    };

    const createEditors = async () => {
        await waitForFonts();
        defineTheme();
        inputEditor = monacoApi.editor.create(dom.inputHost, {
            value: dom.inputFallback.value,
            language: 'lua',
            theme: 'sukared-dark',
            ...MONACO_OPTIONS,
            wordWrap: settingsState.wordWrap ? 'on' : 'off',
            minimap: { enabled: settingsState.minimap },
        });
        outputEditor = monacoApi.editor.create(dom.outputHost, {
            value: dom.outputFallback.value,
            language: 'lua',
            theme: 'sukared-dark',
            ...MONACO_OPTIONS,
            wordWrap: settingsState.wordWrap ? 'on' : 'off',
            minimap: { enabled: settingsState.minimap },
            readOnly: true
        });
        document.body.classList.add('monaco-ready');
        document.body.classList.remove('monaco-fallback');
        bindLayoutObservers();
        layoutEditors();
        document.fonts?.ready?.then(() => {
            inputEditor?.updateOptions({ fontFamily: MONACO_FONT_STACK, fontLigatures: false, letterSpacing: 0 });
            outputEditor?.updateOptions({ fontFamily: MONACO_FONT_STACK, fontLigatures: false, letterSpacing: 0 });
            layoutEditors();
        });
    };

    const loadMonaco = () => new Promise((resolve) => {
        if (!window.require) {
            resolve(false);
            return;
        }
        window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
        window.require(['vs/editor/editor.main'], async () => {
            monacoApi = window.monaco;
            await createEditors();
            resolve(true);
        }, () => resolve(false));
    });

    const init = async () => {
        document.body.classList.add('monaco-fallback');
        const loaded = await loadMonaco();
        if (!loaded) document.body.classList.add('monaco-fallback');
    };

    const getInputCode = () => inputEditor ? inputEditor.getValue() : fallback.getInputCode();
    const setInputCode = (value) => {
        if (inputEditor) inputEditor.setValue(value);
        fallback.setInputCode(value);
    };
    const getOutputCode = () => outputEditor ? outputEditor.getValue() : fallback.getOutputCode();
    const setOutputCode = (value) => {
        if (outputEditor) outputEditor.setValue(value);
        fallback.setOutputCode(value);
    };
    const toggleInputWrap = () => {
        inputWrap = !inputWrap;
        settingsState.wordWrap = inputWrap;
        if (inputEditor) inputEditor.updateOptions({ wordWrap: inputWrap ? 'on' : 'off' });
        if (outputEditor) outputEditor.updateOptions({ wordWrap: inputWrap ? 'on' : 'off' });
        layoutEditors();
    };

    const setWordWrap = (enabled) => {
        inputWrap = enabled;
        settingsState.wordWrap = enabled;
        inputEditor?.updateOptions({ wordWrap: enabled ? 'on' : 'off' });
        outputEditor?.updateOptions({ wordWrap: enabled ? 'on' : 'off' });
        layoutEditors();
    };

    const setMinimap = (enabled) => {
        settingsState.minimap = enabled;
        inputEditor?.updateOptions({ minimap: { enabled } });
        outputEditor?.updateOptions({ minimap: { enabled } });
        layoutEditors();
    };

    const loadAlignmentTestText = () => {
        const text = [
            'print("hello world")',
            'local unicode = "こんにちは ⠁⠂⠃"',
            'local tabbed =\t"tab test"',
            'local longLine = "abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789"'
        ].join('\n');
        setInputCode(text);
        layoutEditors();
    };

    const exposeAlignmentTest = () => {
        window.sukaredMonacoAlignmentTest = loadAlignmentTestText;
        globalThis.sukaredMonacoAlignmentTest = loadAlignmentTestText;
    };
    exposeAlignmentTest();

    return { init, getInputCode, setInputCode, getOutputCode, setOutputCode, toggleInputWrap, setWordWrap, setMinimap, layoutEditors, loadAlignmentTestText, exposeAlignmentTest };
})();

const titleAnimation = (() => {
    const finalTitle = 'SukaRed';
    const visibleVersion = '1.0';
    const symbols = ['#', '$', '%', '&', '*', '+', '?', '@', '[', ']'];
    const scrambleDurationMs = 1500;
    const frameMs = 45;
    let scrambleTimer = null;
    let idleTimer = null;

    const animationsAllowed = () => settingsState.animations && !prefersReducedMotion.matches;

    const clearTimers = () => {
        clearInterval(scrambleTimer);
        clearInterval(idleTimer);
        scrambleTimer = null;
        idleTimer = null;
    };

    const setFinalText = () => {
        dom.mainTitle.textContent = finalTitle;
        dom.subTitle.textContent = visibleVersion;
    };

    const scrambleText = (lockedCount) => {
        return finalTitle
            .split('')
            .map((letter, index) => (index < lockedCount ? letter : symbols[Math.floor(Math.random() * symbols.length)]))
            .join('');
    };

    const startIdleGlitch = () => {
        clearInterval(idleTimer);
        if (!animationsAllowed()) return;
        idleTimer = setInterval(() => {
            const index = Math.floor(Math.random() * finalTitle.length);
            const chars = finalTitle.split('');
            chars[index] = symbols[Math.floor(Math.random() * symbols.length)];
            dom.mainTitle.textContent = chars.join('');
            setTimeout(() => {
                if (animationsAllowed()) dom.mainTitle.textContent = finalTitle;
            }, 90);
        }, 3600);
    };

    const start = () => {
        clearTimers();
        setFinalText();
        document.body.classList.toggle('animations-off', !animationsAllowed());
        if (!animationsAllowed()) return;

        const startedAt = Date.now();
        scrambleTimer = setInterval(() => {
            const elapsed = Date.now() - startedAt;
            const progress = Math.min(1, elapsed / scrambleDurationMs);
            const lockedCount = Math.floor(progress * (finalTitle.length + 1));
            dom.mainTitle.textContent = scrambleText(lockedCount);
            if (progress >= 1) {
                clearInterval(scrambleTimer);
                scrambleTimer = null;
                setFinalText();
                startIdleGlitch();
            }
        }, frameMs);
    };

    const setEnabled = (enabled) => {
        settingsState.animations = enabled;
        document.body.classList.toggle('animations-off', !animationsAllowed());
        start();
    };

    prefersReducedMotion.addEventListener?.('change', start);

    return { start, setEnabled };
})();

const settingsController = (() => {
    let draft = { ...settingsState };
    let closeTimer = null;

    const dropdowns = () => [dom.profileDropdown, dom.vmDropdown];
    const labelFor = (value) => value.charAt(0).toUpperCase() + value.slice(1);

    const closeDropdowns = (except = null) => {
        dropdowns().forEach((dropdown) => {
            if (!dropdown || dropdown === except) return;
            dropdown.classList.remove('open');
            dropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
            const menu = dropdown.querySelector('.dropdown-menu');
            if (menu) menu.hidden = true;
        });
    };

    const allowedVmModes = (profile) => {
        if (profile === 'light') return ['off'];
        if (profile === 'balanced') return ['off', 'selected'];
        return ['off', 'selected', 'aggressive'];
    };

    const normalizeDraft = () => {
        const allowed = allowedVmModes(draft.profile);
        if (!allowed.includes(draft.vmMode)) draft.vmMode = allowed.includes('selected') ? 'selected' : 'off';
        if (draft.profile === 'strong' && draft.vmMode === 'off') draft.vmMode = 'selected';
    };

    const setDropdownValue = (dropdown, value) => {
        const selected = dropdown.querySelector(`[data-value="${value}"]`);
        const label = selected?.textContent?.trim() || labelFor(value);
        dropdown.dataset.value = value;
        dropdown.querySelector('.dropdown-value').textContent = label;
        dropdown.querySelectorAll('[role="option"]').forEach((option) => {
            option.setAttribute('aria-selected', String(option.dataset.value === value));
        });
    };

    const syncVmOptions = () => {
        const allowed = allowedVmModes(draft.profile);
        dom.vmDropdown.querySelectorAll('[role="option"]').forEach((option) => {
            option.disabled = !allowed.includes(option.dataset.value);
        });
    };

    const syncModal = () => {
        normalizeDraft();
        setDropdownValue(dom.profileDropdown, draft.profile);
        syncVmOptions();
        setDropdownValue(dom.vmDropdown, draft.vmMode);
        dom.wordWrapToggle.checked = draft.wordWrap;
        dom.minimapToggle.checked = draft.minimap;
        dom.animationsToggle.checked = draft.animations;
    };

    const toggleDropdown = (dropdown) => {
        const isOpen = dropdown.classList.contains('open');
        closeDropdowns(dropdown);
        dropdown.classList.toggle('open', !isOpen);
        dropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', String(!isOpen));
        const menu = dropdown.querySelector('.dropdown-menu');
        if (menu) menu.hidden = isOpen;
    };

    const selectOption = (dropdown, value) => {
        if (dropdown.dataset.setting === 'profile') {
            draft.profile = value;
            normalizeDraft();
            syncModal();
        } else {
            draft.vmMode = value;
            normalizeDraft();
            syncModal();
        }
        closeDropdowns();
    };

    const open = () => {
        draft = { ...settingsState };
        syncModal();
        clearTimeout(closeTimer);
        dom.settingsOverlay.hidden = false;
        document.body.classList.add('modal-open');
        window.requestAnimationFrame(() => {
            dom.settingsOverlay.classList.add('is-open');
            dom.settingsModal.focus();
        });
    };

    const close = ({ save = false } = {}) => {
        if (save) {
            draft.wordWrap = dom.wordWrapToggle.checked;
            draft.minimap = dom.minimapToggle.checked;
            draft.animations = dom.animationsToggle.checked;
            normalizeDraft();
            Object.assign(settingsState, draft);
            editorManager.setWordWrap(settingsState.wordWrap);
            editorManager.setMinimap(settingsState.minimap);
            titleAnimation.setEnabled(settingsState.animations);
        }
        closeDropdowns();
        dom.settingsOverlay.classList.remove('is-open');
        document.body.classList.remove('modal-open');
        closeTimer = setTimeout(() => {
            dom.settingsOverlay.hidden = true;
        }, 190);
        dom.settings.focus();
    };

    const bindDropdown = (dropdown) => {
        dropdown.querySelector('.dropdown-trigger').addEventListener('click', () => toggleDropdown(dropdown));
        dropdown.querySelectorAll('[role="option"]').forEach((option) => {
            option.addEventListener('click', () => {
                if (!option.disabled) selectOption(dropdown, option.dataset.value);
            });
        });
        dropdown.addEventListener('keydown', (event) => {
            const options = [...dropdown.querySelectorAll('[role="option"]:not(:disabled)')];
            const currentIndex = Math.max(0, options.findIndex((option) => option.getAttribute('aria-selected') === 'true'));
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleDropdown(dropdown);
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const direction = event.key === 'ArrowDown' ? 1 : -1;
                const next = options[(currentIndex + direction + options.length) % options.length];
                if (next) selectOption(dropdown, next.dataset.value);
            } else if (event.key === 'Escape') {
                closeDropdowns();
            }
        });
    };

    const bind = () => {
        dom.settings.addEventListener('click', open);
        dom.settingsClose.addEventListener('click', () => close());
        dom.settingsCancel.addEventListener('click', () => close());
        dom.settingsSave.addEventListener('click', () => close({ save: true }));
        dom.settingsOverlay.addEventListener('click', (event) => {
            if (event.target === dom.settingsOverlay) close();
        });
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.custom-dropdown')) closeDropdowns();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !dom.settingsOverlay.hidden) close();
        });
        dom.wordWrapToggle.addEventListener('change', () => { draft.wordWrap = dom.wordWrapToggle.checked; });
        dom.minimapToggle.addEventListener('change', () => { draft.minimap = dom.minimapToggle.checked; });
        dom.animationsToggle.addEventListener('change', () => { draft.animations = dom.animationsToggle.checked; });
        bindDropdown(dom.profileDropdown);
        bindDropdown(dom.vmDropdown);
        syncModal();
    };

    return { bind, syncModal };
})();

const buildInfoRenderer = (() => {
    const labels = {
        version: 'Version',
        profile: 'Profile',
        vmMode: 'VM Mode',
        buildId: 'Build ID',
        originalBytes: 'Original Size',
        outputBytes: 'Output Size',
        expansionRatio: 'Expansion Ratio',
        processingTimeMs: 'Processing Time',
        virtualizedFunctions: 'Virtualized Functions',
        protectedStrings: 'Protected Strings'
    };

    const formatValue = (key, value) => {
        if (value === undefined || value === null || value === '') return '-';
        if (key === 'originalBytes' || key === 'outputBytes') return `${value} bytes`;
        if (key === 'processingTimeMs') return `${value} ms`;
        if (key === 'expansionRatio') return `${value}x`;
        return String(value);
    };

    const render = (build) => {
        if (!build) {
            dom.buildInfo.hidden = true;
            dom.buildInfoGrid.innerHTML = '';
            return;
        }
        dom.buildInfoGrid.innerHTML = Object.entries(labels)
            .map(([key, label]) => {
                const value = key === 'vmMode' && build.vmMode !== 'off' && Number(build.virtualizedFunctions || 0) === 0
                    ? `${build.vmMode} (not applied)`
                    : build[key];
                return `<div><dt>${label}</dt><dd>${formatValue(key, value)}</dd></div>`;
            })
            .join('');
        dom.buildInfo.hidden = false;
    };

    return { render };
})();

const apiClient = (() => {
    const buildErrorDetails = (url, details) => [
        'Unable to connect to the obfuscation API.',
        '',
        `Attempted API URL: ${url}`,
        '',
        `Details: ${details || 'Unknown error'}`
    ].join('\n');

    const obfuscate = async ({ code, profile, vmMode }) => {
        const url = config.apiUrl();
        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, profile, vmMode })
            });
        } catch (networkError) {
            const error = new Error('Network request failed.');
            error.details = buildErrorDetails(url, networkError.message);
            throw error;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(data.error || 'Unable to process the script.');
            error.details = [
                `Attempted API URL: ${url}`,
                '',
                data.details || data.error || response.statusText
            ].join('\n');
            throw error;
        }
        return data;
    };
    return { obfuscate };
})();

const fileHandling = (() => {
    const cleanText = (text) => String(text || '').replace(/^\uFEFF/, '');
    const validFile = (file) => /\.(lua|luau)$/i.test(file.name) || file.type === 'text/plain' || file.type === '';

    const openFile = async (file) => {
        if (!file) return;
        if (!validFile(file)) {
            stateManager.setStatus('Error', 'Only .lua and .luau files are supported.');
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            stateManager.setStatus('Error', 'The file is too large.');
            return;
        }
        const text = await file.text();
        editorManager.setInputCode(cleanText(text));
        dom.fileName.textContent = file.name;
        stateManager.setStatus('Ready');
    };

    const bind = () => {
        dom.openFile.addEventListener('click', () => dom.fileInput.click());
        dom.fileInput.addEventListener('change', () => openFile(dom.fileInput.files[0]));
        dom.dropZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            dom.dropZone.classList.add('drag-over');
        });
        dom.dropZone.addEventListener('dragleave', () => dom.dropZone.classList.remove('drag-over'));
        dom.dropZone.addEventListener('drop', (event) => {
            event.preventDefault();
            dom.dropZone.classList.remove('drag-over');
            openFile(event.dataTransfer.files[0]);
        });
    };

    return { bind };
})();

const actions = (() => {
    const obfuscate = async () => {
        const code = editorManager.getInputCode();
        if (!code.trim()) {
            stateManager.setStatus('Error', 'Input is empty.');
            return;
        }

        stateManager.setProcessing(true);
        stateManager.setStatus('Processing');

        try {
            const data = await apiClient.obfuscate({
                code,
                profile: settingsState.profile,
                vmMode: settingsState.vmMode
            });
            editorManager.setOutputCode(data.obfuscated || '');
            buildInfoRenderer.render(data.build || null);
            stateManager.setStatus('Completed');
        } catch (error) {
            stateManager.setStatus('Error', error.details || error.message);
        } finally {
            stateManager.setProcessing(false);
        }
    };

    const copy = async () => {
        const output = editorManager.getOutputCode();
        if (!output.trim()) return;
        await navigator.clipboard.writeText(output);
        notifications.showToast('Copied to clipboard');
    };

    const download = () => {
        const output = editorManager.getOutputCode();
        if (!output.trim()) return;
        const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sukared-output.lua';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        notifications.showToast('File downloaded');
    };

    const clear = () => {
        editorManager.setInputCode('');
        editorManager.setOutputCode('');
        buildInfoRenderer.render(null);
        dom.fileName.textContent = '';
        stateManager.setStatus('Ready');
    };

    const bind = () => {
        dom.obfuscate.addEventListener('click', obfuscate);
        dom.copy.addEventListener('click', copy);
        dom.download.addEventListener('click', download);
        dom.clear.addEventListener('click', clear);
        dom.errorToggle.addEventListener('click', () => {
            dom.errorText.hidden = !dom.errorText.hidden;
        });
    };

    return { bind };
})();

const init = async () => {
    dom.inputFallback.value = '-- Paste your Luau script here\nprint("Hello SukaRed")';
    dom.outputFallback.value = '';
    titleAnimation.start();
    settingsController.bind();
    fileHandling.bind();
    actions.bind();
    await editorManager.init();
    editorManager.exposeAlignmentTest();
    editorManager.setInputCode(dom.inputFallback.value);
    stateManager.setStatus('Ready');
};

document.addEventListener('DOMContentLoaded', init);
