(function () {
    'use strict';

    let active = null;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || !window.SukaRedSettings.load().animations;

    const createTokenRenderer = (pre, tokens) => {
        const nodes = tokens.map(token => {
            if (token.type === 'whitespace' || token.type === 'newline') {
                const node = document.createTextNode(token.value);
                pre.append(node);
                return node;
            }
            const node = document.createElement('span');
            node.className = `transition-token token-${token.type}`;
            node.textContent = token.value;
            pre.append(node);
            return node;
        });

        const updateToken = (index, value, className) => {
            const node = nodes[index];
            if (!node?.classList) return;
            node.textContent = value;
            node.classList.toggle('is-active', className === 'active');
            node.classList.toggle('is-transformed', className === 'transformed');
        };
        return { nodes, updateToken };
    };

    const begin = source => {
        if (active) return null;

        const snippet = window.SukaRedMotion.selectSourceSnippet(source) || 'local protected = {}';
        const tokens = window.SukaRedMotion.tokenizePreview(snippet);
        const plan = window.SukaRedMotion.createProtectedPreviewPlan(tokens);
        const totalCharacters = plan.steps.reduce((sum, step) => sum + Math.max(1, step.characterCount), 0);
        const overlay = document.createElement('div');
        overlay.className = 'build-transition';
        const panel = document.createElement('section');
        panel.className = 'transition-panel';
        panel.setAttribute('role', 'status');
        panel.setAttribute('aria-live', 'polite');

        const header = document.createElement('header');
        const title = document.createElement('span');
        title.className = 'transition-title';
        title.textContent = 'LUAVEX / BUILD';
        const state = document.createElement('span');
        state.className = 'transition-state';
        state.textContent = 'PREPARING';
        header.append(title, state);

        const codeFrame = document.createElement('div');
        codeFrame.className = 'transition-code-frame';
        const lineNumbers = document.createElement('div');
        lineNumbers.className = 'transition-line-numbers';
        lineNumbers.setAttribute('aria-hidden', 'true');
        const lineCount = Math.max(1, snippet.split('\n').length);
        for (let line = 1; line <= lineCount; line++) {
            const value = document.createElement('span');
            value.textContent = String(line).padStart(2, '0');
            lineNumbers.append(value);
        }
        const pre = document.createElement('pre');
        pre.setAttribute('aria-hidden', 'true');
        const renderer = createTokenRenderer(pre, tokens);
        codeFrame.append(lineNumbers, pre);

        const progress = document.createElement('div');
        progress.className = 'transition-progress';
        progress.setAttribute('aria-hidden', 'true');
        const progressValue = document.createElement('span');
        progress.append(progressValue);
        const footer = document.createElement('footer');
        const queueLabel = document.createElement('span');
        queueLabel.textContent = `${lineCount} LINE${lineCount === 1 ? '' : 'S'} QUEUED`;
        const progressLabel = document.createElement('span');
        progressLabel.textContent = '0%';
        footer.append(queueLabel, progressLabel);
        const announcement = document.createElement('p');
        announcement.className = 'sr-only';
        announcement.textContent = 'Obfuscation build started';
        panel.append(header, codeFrame, progress, footer, announcement);
        overlay.append(panel);
        document.body.append(overlay);

        const setProgress = completed => {
            const value = Math.max(0, Math.min(100, Math.round((completed / Math.max(1, totalCharacters)) * 100)));
            progressValue.style.width = `${value}%`;
            progressLabel.textContent = `${value}%`;
        };

        requestAnimationFrame(() => overlay.classList.add('is-open'));
        const minimumReady = (async () => {
            const timing = window.SukaRedMotion.TIMING;
            if (reducedMotion()) {
                await delay(timing.reducedPreview);
                state.textContent = 'TRANSFORMING';
                plan.steps.forEach(step => renderer.updateToken(step.tokenIndex, step.replacement, 'transformed'));
                setProgress(totalCharacters);
                await delay(timing.reducedTransform);
                state.textContent = 'PROCESSING';
                return;
            }

            await delay(timing.transitionOpen + timing.transitionPreview);
            state.textContent = 'TRANSFORMING';
            let completedCharacters = 0;
            const characterDelay = Math.max(5, Math.min(timing.characterStep, Math.floor(1800 / Math.max(1, totalCharacters))));
            const corruptDelay = Math.max(8, Math.min(Math.floor(timing.tokenCorrupt / 2), Math.floor(650 / Math.max(1, plan.steps.length))));
            const settleDelay = Math.max(6, Math.min(timing.tokenSettle, Math.floor(600 / Math.max(1, plan.steps.length))));
            for (const step of plan.steps) {
                renderer.updateToken(step.tokenIndex, window.SukaRedMotion.createTokenGlitchFrame(step.source, .38), 'active');
                await delay(corruptDelay);
                renderer.updateToken(step.tokenIndex, window.SukaRedMotion.createTokenGlitchFrame(step.source, .62), 'active');
                await delay(corruptDelay);
                for (let character = 0; character < step.characterCount; character++) {
                    renderer.updateToken(step.tokenIndex, window.SukaRedMotion.createCharacterMorphFrame(step.source, step.replacement, character), 'active');
                    setProgress(completedCharacters + character + 1);
                    await delay(characterDelay);
                }
                renderer.updateToken(step.tokenIndex, step.replacement, 'transformed');
                completedCharacters += Math.max(1, step.characterCount);
                await delay(settleDelay);
            }
            setProgress(totalCharacters);
            await delay(timing.transitionFinal);
            state.textContent = 'PROCESSING';
        })();

        const close = async outcome => {
            await minimumReady;
            state.textContent = outcome === 'success' ? 'COMPLETE' : 'STOPPED';
            announcement.textContent = outcome === 'success' ? 'Obfuscation build completed' : 'Obfuscation build failed';
            await delay(reducedMotion() ? 0 : window.SukaRedMotion.TIMING.transitionSuccess);
            overlay.classList.remove('is-open');
            overlay.classList.add('is-closing');
            await delay(reducedMotion() ? 0 : window.SukaRedMotion.TIMING.transitionClose);
            plan.mapping.clear();
            plan.steps.length = 0;
            tokens.length = 0;
            renderer.nodes.length = 0;
            pre.replaceChildren();
            overlay.remove();
            active = null;
        };

        active = { minimumReady, close, overlay };
        return active;
    };

    window.SukaRedTransition = { begin, get active() { return Boolean(active); } };
})();
