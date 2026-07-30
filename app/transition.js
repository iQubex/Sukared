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

        const updateIdentifier = (identifier, value, className) => {
            tokens.forEach((token, index) => {
                if (token.value !== identifier) return;
                nodes[index].textContent = value;
                if (nodes[index].classList) {
                    nodes[index].classList.toggle('is-active', className === 'active');
                    nodes[index].classList.toggle('is-transformed', className === 'transformed');
                }
            });
        };
        return { nodes, updateIdentifier };
    };

    const begin = source => {
        if (active) return null;

        const snippet = window.SukaRedMotion.selectSourceSnippet(source);
        const tokens = window.SukaRedMotion.tokenizePreview(snippet);
        const plan = window.SukaRedMotion.createIdentifierPlan(tokens);
        const overlay = document.createElement('div');
        overlay.className = 'build-transition';
        const panel = document.createElement('section');
        panel.className = 'transition-panel';
        panel.setAttribute('role', 'status');
        panel.setAttribute('aria-live', 'polite');
        const header = document.createElement('header');
        const title = document.createElement('span');
        title.textContent = 'BUILDING';
        const state = document.createElement('span');
        state.className = 'transition-state';
        state.textContent = 'PREPARING';
        header.append(title, state);
        const pre = document.createElement('pre');
        pre.setAttribute('aria-hidden', 'true');
        const renderer = createTokenRenderer(pre, tokens);
        const announcement = document.createElement('p');
        announcement.className = 'sr-only';
        announcement.textContent = 'Obfuscation build started';
        panel.append(header, pre, announcement);
        overlay.append(panel);
        document.body.append(overlay);

        requestAnimationFrame(() => overlay.classList.add('is-open'));
        const minimumReady = (async () => {
            const timing = window.SukaRedMotion.TIMING;
            if (reducedMotion()) {
                await delay(timing.reducedPreview);
                state.textContent = 'TRANSFORMING';
                plan.steps.forEach(step => renderer.updateIdentifier(step.identifier, step.replacement, 'transformed'));
                await delay(timing.reducedTransform);
                state.textContent = 'PROCESSING';
                return;
            }

            await delay(timing.transitionOpen + timing.transitionPreview);
            state.textContent = 'TRANSFORMING';
            for (const step of plan.steps) {
                renderer.updateIdentifier(step.identifier, window.SukaRedMotion.createTokenGlitchFrame(step.identifier, .45), 'active');
                await delay(Math.floor(timing.tokenCorrupt / 2));
                renderer.updateIdentifier(step.identifier, window.SukaRedMotion.createTokenGlitchFrame(step.identifier, .9), 'active');
                await delay(Math.ceil(timing.tokenCorrupt / 2));
                renderer.updateIdentifier(step.identifier, step.replacement, 'transformed');
                await delay(timing.tokenSettle);
            }
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
