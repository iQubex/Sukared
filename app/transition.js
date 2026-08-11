(function () {
    'use strict';

    let active = null;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || !window.SukaRedSettings.load().animations;
    const stages = [
        ['queued', 'Queued'], ['analyzing', 'Analyzing'], ['preparing', 'Preparing Protection'],
        ['virtualizing', 'Virtualizing'], ['protecting', 'Protecting Strings'],
        ['integrity', 'Applying Integrity'], ['finalizing', 'Finalizing']
    ];

    const begin = source => {
        if (active) return null;
        const snippet = window.SukaRedMotion.selectSourceSnippet(source, 7, 96) || 'local protected = {}';
        const sourceLines = snippet.split('\n').slice(0, 7);
        const overlay = document.createElement('div'); overlay.className = 'build-transition';
        const panel = document.createElement('section'); panel.className = 'transition-panel pipeline-panel'; panel.setAttribute('role', 'status');
        const header = document.createElement('header');
        const title = document.createElement('span'); title.className = 'transition-title'; title.textContent = 'LUAVEX / BUILD';
        const current = document.createElement('span'); current.className = 'transition-state'; current.textContent = 'QUEUED';
        header.append(title, current);

        const body = document.createElement('div'); body.className = 'pipeline-body';
        const codeFrame = document.createElement('div'); codeFrame.className = 'pipeline-code';
        const scan = document.createElement('span'); scan.className = 'pipeline-scan'; scan.setAttribute('aria-hidden', 'true');
        const code = document.createElement('pre');
        const blocks = sourceLines.map((line, index) => {
            const row = document.createElement('span'); row.className = 'pipeline-line'; row.dataset.line = String(index + 1);
            const number = document.createElement('i'); number.textContent = String(index + 1).padStart(2, '0');
            const text = document.createElement('b'); text.textContent = line;
            row.append(number, text); code.append(row); return { row, text, original: line };
        });
        codeFrame.append(code, scan);
        const stageList = document.createElement('ol'); stageList.className = 'pipeline-stages';
        const stageNodes = new Map(stages.map(([id, label]) => {
            const item = document.createElement('li'); item.dataset.stage = id;
            item.append(document.createElement('span'), document.createTextNode(label)); stageList.append(item); return [id, item];
        }));
        body.append(codeFrame, stageList);
        const footer = document.createElement('footer');
        const detail = document.createElement('span'); detail.textContent = `${sourceLines.length} SOURCE REGIONS`;
        const privacy = document.createElement('span'); privacy.textContent = 'SOURCE IS NOT STORED';
        footer.append(detail, privacy); panel.append(header, body, footer); overlay.append(panel); document.body.append(overlay);

        let stageIndex = 0;
        let stopped = false;
        let accelerated = false;
        let releaseFinalLine;
        const finalLineReady = new Promise(resolve => { releaseFinalLine = resolve; });
        const pacedDelay = async milliseconds => {
            let remaining = milliseconds;
            while (remaining > 0 && !stopped && !accelerated) {
                const slice = Math.min(16, remaining);
                await delay(slice);
                remaining -= slice;
            }
            if (accelerated && !stopped) await delay(Math.min(6, milliseconds));
        };
        const protectedText = block => {
            const tokens = window.SukaRedMotion.tokenizePreview(block.original);
            const plan = window.SukaRedMotion.createProtectedPreviewPlan(tokens, Math.random, 8);
            return tokens.map((token, index) => plan.steps.find(step => step.tokenIndex === index)?.replacement || token.value).join('');
        };
        const morph = async () => {
            if (reduced()) {
                blocks.forEach(block => {
                    block.text.textContent = protectedText(block);
                    block.row.classList.add('is-morphed');
                });
                scan.classList.add('is-finished');
                return;
            }
            for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
                const block = blocks[blockIndex];
                if (stopped) break;
                const transformed = protectedText(block);
                const characterCount = Math.max(Array.from(block.original).length, Array.from(transformed).length);
                const characterStep = Math.max(1, Math.ceil(characterCount / 42));
                scan.style.top = `${block.row.offsetTop + block.row.offsetHeight - 30}px`;
                block.row.classList.add('is-scanned');
                if (blockIndex === blocks.length - 1 && !accelerated) {
                    block.row.classList.add('is-awaiting-result');
                    await finalLineReady;
                    block.row.classList.remove('is-awaiting-result');
                }
                await pacedDelay(260);
                for (let character = 0; character < characterCount && !stopped; character += characterStep) {
                    if (accelerated) {
                        block.text.textContent = transformed;
                        break;
                    }
                    block.text.textContent = window.SukaRedMotion.createCharacterMorphFrame(
                        block.original,
                        transformed,
                        Math.min(characterCount, character + characterStep),
                        Math.random
                    );
                    await pacedDelay(24);
                }
                if (stopped) break;
                block.text.textContent = transformed;
                block.row.classList.add('is-morphed');
                block.row.classList.remove('is-scanned');
                await pacedDelay(110);
            }
            if (!stopped) {
                scan.style.top = '100%';
                scan.classList.add('is-finished');
            }
        };
        const setStage = (stage, payload = {}) => {
            const found = stages.findIndex(([id]) => id === stage);
            if (found >= 0) stageIndex = Math.max(stageIndex, found);
            stageNodes.forEach((node, id) => {
                const index = stages.findIndex(([value]) => value === id);
                node.classList.toggle('is-current', index === stageIndex);
                node.classList.toggle('is-complete', index < stageIndex);
            });
            const label = stages[stageIndex]?.[1] || 'Processing';
            current.textContent = stage === 'queued' && payload.queuePosition
                ? `QUEUED / ${payload.queuePosition}` : label.toUpperCase();
        };
        setStage('queued'); requestAnimationFrame(() => overlay.classList.add('is-open'));
        const minimumReady = Promise.resolve();
        const animationDone = morph();
        const close = async outcome => {
            accelerated = true;
            releaseFinalLine();
            if (outcome === 'success') await animationDone;
            else stopped = true;
            stopped = true;
            if (outcome === 'success') {
                stageNodes.forEach(node => node.classList.add('is-complete'));
                current.textContent = 'COMPLETE'; panel.classList.add('is-complete');
            } else current.textContent = 'STOPPED';
            await delay(reduced() ? 0 : accelerated ? 45 : 220);
            overlay.classList.remove('is-open');
            await delay(reduced() ? 0 : accelerated ? 45 : 180);
            overlay.remove(); active = null;
        };
        active = { minimumReady, close, setStage, overlay };
        return active;
    };

    window.SukaRedTransition = { begin, get active() { return active; } };
})();
