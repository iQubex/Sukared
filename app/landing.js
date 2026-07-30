(function () {
    'use strict';

    const SESSION_KEY = 'sukared.boot.seen';
    const finalWord = 'SUKARED';
    const symbols = '#$%&*+?@';
    const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || !window.SukaRedSettings.load().animations;

    const mount = (outlet) => {
        const seen = sessionStorage.getItem(SESSION_KEY) === '1';
        const page = document.createElement('section');
        page.className = 'boot-page';
        page.setAttribute('aria-labelledby', 'bootWordmark');
        const center = document.createElement('div'); center.className = 'boot-center';
        const wordmark = document.createElement('h1'); wordmark.id = 'bootWordmark'; wordmark.className = 'boot-wordmark'; wordmark.textContent = finalWord;
        const status = document.createElement('p'); status.className = 'sr-only'; status.setAttribute('aria-live', 'polite'); status.textContent = 'SukaRed ready';
        const start = document.createElement('button'); start.className = 'boot-start'; start.type = 'button'; start.textContent = 'START'; start.hidden = !seen && !reducedMotion();
        center.append(wordmark, start, status); page.append(center); outlet.replaceChildren(page);

        let timer = null;
        if (!seen && !reducedMotion()) {
            wordmark.textContent = symbols.slice(0, finalWord.length);
            const started = performance.now();
            timer = setInterval(() => {
                const progress = Math.min(1, (performance.now() - started) / window.SukaRedMotion.TIMING.bootTotal);
                const locked = Math.floor(progress * (finalWord.length + 1));
                wordmark.textContent = Array.from(finalWord, (letter, index) => index < locked ? letter : symbols[Math.floor(Math.random() * symbols.length)]).join('');
                if (progress >= 1) {
                    clearInterval(timer); timer = null; wordmark.textContent = finalWord; start.hidden = false; start.focus({ preventScroll: true });
                }
            }, window.SukaRedMotion.TIMING.bootFrame);
        }

        start.addEventListener('click', () => {
            sessionStorage.setItem(SESSION_KEY, '1');
            page.classList.add('is-leaving');
            const delay = reducedMotion() ? 0 : window.SukaRedMotion.TIMING.landingExit;
            setTimeout(() => window.sukaredApp.router.navigate('/workspace'), delay);
        });
        return () => { if (timer) clearInterval(timer); };
    };

    window.SukaRedLanding = { mount, SESSION_KEY };
})();
