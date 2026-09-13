(function () {
    'use strict';

    const SESSION_KEY = 'sukared.boot.seen';
    const INFO_SESSION_KEY = 'luavex.landing.info.seen';
    const TYPE_INTERVAL_MS = 12;
    const INFO_COPY = Object.freeze({
        heading: 'What happens to your code?',
        first: 'Luavex transforms your Luau code so it is harder to read, analyze and reverse engineer while keeping the script working as intended.',
        second: 'Control flow, constants and runtime state are transformed during the build process.',
        closing: 'Not impossible to reverse. More expensive to understand.'
    });
    const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || !window.SukaRedSettings.load().animations;

    const mount = (outlet) => {
        const seen = sessionStorage.getItem(SESSION_KEY) === '1';
        const skipIntro = seen || reducedMotion();
        const page = document.createElement('section');
        page.className = `boot-page${skipIntro ? ' is-ready' : ' is-intro'}`;
        page.setAttribute('aria-labelledby', 'bootTitle');

        const center = document.createElement('div');
        center.className = 'boot-center';
        const hero = document.createElement('div');
        hero.className = 'boot-hero';
        const logoFrame = document.createElement('div');
        logoFrame.className = 'boot-logo-frame';
        const logo = document.createElement('img');
        logo.className = 'boot-logo';
        logo.src = '/assets/luavex-brand.png';
        logo.alt = 'Luavex';
        logo.decoding = 'async';
        logoFrame.append(logo);

        const title = document.createElement('h1');
        title.id = 'bootTitle';
        title.className = 'sr-only';
        title.textContent = 'Luavex 1.4 Beta';
        const edition = document.createElement('span');
        edition.className = 'boot-edition';
        edition.textContent = 'PUBLIC BETA';
        const start = document.createElement('button');
        start.className = 'boot-start';
        start.type = 'button';
        start.textContent = 'START';
        start.hidden = !skipIntro;
        const infoAction = document.createElement('button');
        infoAction.className = 'boot-info-action';
        infoAction.type = 'button';
        infoAction.textContent = INFO_COPY.heading;
        infoAction.hidden = !skipIntro;
        infoAction.setAttribute('aria-controls', 'landingInfo');
        infoAction.setAttribute('aria-expanded', 'false');
        const status = document.createElement('p');
        status.className = 'sr-only';
        status.setAttribute('aria-live', 'polite');
        status.textContent = skipIntro ? 'Luavex ready' : 'Luavex is loading';

        center.append(logoFrame, edition, start, infoAction, title, status);
        hero.append(center);

        const info = document.createElement('section');
        info.className = 'landing-info';
        info.id = 'landingInfo';
        info.hidden = true;
        info.setAttribute('aria-labelledby', 'landingInfoTitle');
        const infoInner = document.createElement('div');
        infoInner.className = 'landing-info-inner';
        const infoTitle = document.createElement('h2');
        infoTitle.id = 'landingInfoTitle';
        infoTitle.textContent = INFO_COPY.heading;
        const first = document.createElement('p');
        const second = document.createElement('p');
        const closing = document.createElement('p');
        closing.className = 'landing-info-closing';
        infoInner.append(infoTitle, first, second, closing);
        info.append(infoInner);
        page.append(hero, info);
        outlet.replaceChildren(page);

        let timer = null;
        let typeTimer = null;
        let typing = false;
        let completed = sessionStorage.getItem(INFO_SESSION_KEY) === '1';
        const textNodes = [[first, INFO_COPY.first], [second, INFO_COPY.second], [closing, INFO_COPY.closing]];
        const showCompleteInfo = () => {
            if (typeTimer) clearTimeout(typeTimer);
            typeTimer = null; typing = false;
            textNodes.forEach(([node, copy]) => { node.textContent = copy; node.classList.remove('is-typing'); });
        };
        const typeInfo = () => {
            if (typing) { completed = true; sessionStorage.setItem(INFO_SESSION_KEY, '1'); showCompleteInfo(); return; }
            if (completed) { showCompleteInfo(); return; }
            typing = true;
            let nodeIndex = 0; let characterIndex = 0;
            const step = () => {
                const [node, copy] = textNodes[nodeIndex];
                textNodes.forEach(([candidate]) => candidate.classList.remove('is-typing'));
                node.classList.add('is-typing');
                characterIndex++;
                node.textContent = copy.slice(0, characterIndex);
                if (characterIndex >= copy.length) {
                    node.classList.remove('is-typing'); nodeIndex++; characterIndex = 0;
                    if (nodeIndex >= textNodes.length) {
                        typing = false; completed = true; sessionStorage.setItem(INFO_SESSION_KEY, '1'); showCompleteInfo(); return;
                    }
                }
                typeTimer = setTimeout(step, TYPE_INTERVAL_MS);
            };
            step();
        };
        if (!skipIntro) {
            timer = setTimeout(() => {
                timer = null;
                page.classList.remove('is-intro');
                page.classList.add('is-ready');
                start.hidden = false;
                infoAction.hidden = false;
                status.textContent = 'Luavex ready';
                start.focus({ preventScroll: true });
            }, window.SukaRedMotion.TIMING.bootTotal);
        }

        start.addEventListener('click', () => {
            sessionStorage.setItem(SESSION_KEY, '1');
            page.classList.add('is-leaving');
            const delay = reducedMotion() ? 0 : window.SukaRedMotion.TIMING.landingExit;
            setTimeout(() => window.sukaredApp.router.navigate('/workspace'), delay);
        });
        infoAction.addEventListener('click', () => {
            info.hidden = false;
            infoAction.setAttribute('aria-expanded', 'true');
            if (completed || reducedMotion()) {
                completed = true; sessionStorage.setItem(INFO_SESSION_KEY, '1'); showCompleteInfo();
            } else typeInfo();
            requestAnimationFrame(() => info.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }));
        });
        return () => { if (timer) clearTimeout(timer); if (typeTimer) clearTimeout(typeTimer); };
    };

    window.SukaRedLanding = { mount, SESSION_KEY, INFO_SESSION_KEY, INFO_COPY, TYPE_INTERVAL_MS };
})();
