(function () {
    'use strict';

    const SESSION_KEY = 'sukared.boot.seen';
    const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || !window.SukaRedSettings.load().animations;

    const mount = (outlet) => {
        const seen = sessionStorage.getItem(SESSION_KEY) === '1';
        const skipIntro = seen || reducedMotion();
        const page = document.createElement('section');
        page.className = `boot-page${skipIntro ? ' is-ready' : ' is-intro'}`;
        page.setAttribute('aria-labelledby', 'bootTitle');

        const center = document.createElement('div');
        center.className = 'boot-center';
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
        title.textContent = 'Luavex 1.2';
        const edition = document.createElement('span');
        edition.className = 'boot-edition';
        edition.textContent = 'PUBLIC BETA';
        const start = document.createElement('button');
        start.className = 'boot-start';
        start.type = 'button';
        start.textContent = 'START';
        start.hidden = !skipIntro;
        const status = document.createElement('p');
        status.className = 'sr-only';
        status.setAttribute('aria-live', 'polite');
        status.textContent = skipIntro ? 'Luavex ready' : 'Luavex is loading';

        center.append(logoFrame, edition, start, title, status);
        page.append(center);
        outlet.replaceChildren(page);

        let timer = null;
        if (!skipIntro) {
            timer = setTimeout(() => {
                timer = null;
                page.classList.remove('is-intro');
                page.classList.add('is-ready');
                start.hidden = false;
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
        return () => { if (timer) clearTimeout(timer); };
    };

    window.SukaRedLanding = { mount, SESSION_KEY };
})();
