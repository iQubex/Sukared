(function () {
    'use strict';

    const outlet = document.getElementById('routeView');
    const store = new window.SukaRedHistoryStore();
    const views = window.SukaRedViews;
    const route = (path, title, render) => ({ path, title, render });
    const wrap = renderer => context => renderer({ ...context, outlet, store });
    const routes = [
        route('/dashboard', 'Obfuscate', () => window.SukaRedDashboard.mount(outlet, store)),
        route('/history/:id', 'Build Details', wrap(({ params, ...context }) => views.historyDetail({ ...context, id: params.id }))),
        route('/history', 'Build History', wrap(views.history)),
        route('/pricing', 'Pricing', wrap(views.pricing)),
        route('/changelog', 'Changelog', wrap(views.changelog)),
        route('/credits', 'Credits', wrap(views.credits)),
        route('/profile', 'Profile', wrap(views.profile)),
        route('/settings', 'Settings', wrap(views.settings)),
        route('*', 'Page Not Found', wrap(views.notFound))
    ];

    const nav = document.getElementById('siteNav');
    const navToggle = document.getElementById('navToggle');
    const closeNavigation = () => { nav.classList.remove('is-open'); navToggle.setAttribute('aria-expanded', 'false'); };
    navToggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(open));
    });

    const router = new window.SukaRedRouter(routes, {
        outlet,
        beforeRender(match) {
            window.SukaRedUI.closeModal();
            closeNavigation();
            const section = match.path.split('/')[1] || 'dashboard';
            document.querySelectorAll('[data-nav]').forEach(link => {
                const active = link.dataset.nav === section;
                link.classList.toggle('is-active', active);
                if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
            });
            document.title = `${match.route.title || 'SukaRed'} · SukaRed 1.0 Beta`;
        },
        afterRender() {
            outlet.focus({ preventScroll: true });
            scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
    });

    const animateBrand = () => {
        const title = document.getElementById('mainTitle');
        const settings = window.SukaRedSettings.load();
        document.body.classList.toggle('animations-off', !settings.animations);
        if (!settings.animations || matchMedia('(prefers-reduced-motion: reduce)').matches || sessionStorage.getItem('sukared.intro.seen')) return;
        sessionStorage.setItem('sukared.intro.seen', '1');
        const final = 'SukaRed'; const symbols = '#$%&*+?@[]'; const started = Date.now();
        const timer = setInterval(() => {
            const progress = Math.min(1, (Date.now() - started) / 1300);
            const locked = Math.floor(progress * (final.length + 1));
            title.textContent = [...final].map((letter, index) => index < locked ? letter : symbols[Math.floor(Math.random() * symbols.length)]).join('');
            if (progress >= 1) { clearInterval(timer); title.textContent = final; }
        }, 45);
    };

    window.addEventListener('sukared:settings', event => document.body.classList.toggle('animations-off', !event.detail.animations));
    window.sukaredApp = { router, store };
    animateBrand();
    store.ready.then(() => {
        if (store.mode === 'localStorage') window.SukaRedUI.toast('IndexedDB unavailable. Using minimal local history.', 'warning');
        store.prune().catch(() => {});
    });
    router.start();
})();
