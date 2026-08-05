(function () {
    'use strict';

    const outlet = document.getElementById('routeView');
    const shell = document.getElementById('appShell');
    const store = new window.SukaRedHistoryStore();
    const views = window.SukaRedViews;
    const route = (path, title, render) => ({ path, title, render });
    const wrap = renderer => context => renderer({ ...context, outlet, store });
    const routes = [
        route('/', 'Welcome', () => window.SukaRedLanding.mount(outlet)),
        route('/workspace', 'Workspace', () => window.SukaRedDashboard.mount(outlet, store)),
        route('/dashboard', 'Workspace', () => { history.replaceState({}, '', '/workspace'); return window.SukaRedDashboard.mount(outlet, store); }),
        route('/history/:id', 'Build Details', wrap(({ params, ...context }) => views.historyDetail({ ...context, id: params.id }))),
        route('/history', 'Build History', wrap(views.history)),
        route('/changelog', 'Changelog', wrap(views.changelog)),
        route('/credits', 'Credits', wrap(views.credits)),
        route('/settings', 'Settings', wrap(views.settings)),
        route('*', 'Page Not Found', wrap(views.notFound))
    ];

    const nav = document.getElementById('siteNav');
    const navToggle = document.getElementById('navToggle');
    const globalSettings = document.getElementById('globalSettings');
    navToggle.append(window.SukaRedIcons.icon('menu'));
    globalSettings.append(window.SukaRedIcons.icon('settings'));
    const closeNavigation = () => { nav.classList.remove('is-open'); navToggle.setAttribute('aria-expanded', 'false'); };
    navToggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(open));
    });
    globalSettings.addEventListener('click', () => window.SukaRedUI.openSettingsModal(globalSettings));

    const router = new window.SukaRedRouter(routes, {
        outlet,
        beforeRender(match) {
            window.SukaRedUI.closeModal();
            closeNavigation();
            const landing = match.path === '/';
            shell.classList.toggle('is-landing', landing);
            document.body.classList.toggle('route-landing', landing);
            const section = match.path.split('/')[1] || '';
            document.querySelectorAll('[data-nav]').forEach(link => {
                const active = link.dataset.nav === section;
                link.classList.toggle('is-active', active);
                if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
            });
            document.title = `${match.route.title || 'Luavex'} | Luavex Beta`;
        },
        afterRender(match) {
            if (match.path !== '/') outlet.focus({ preventScroll: true });
            scrollTo({ top: 0, behavior: 'auto' });
        }
    });

    const applySettings = value => document.body.classList.toggle('animations-off', !value.animations);
    window.addEventListener('sukared:settings', event => applySettings(event.detail));
    window.sukaredApp = { router, store };
    applySettings(window.SukaRedSettings.load());
    store.ready.then(() => {
        if (store.mode === 'localStorage') window.SukaRedUI.toast('IndexedDB unavailable. Using minimal local history.', 'warning');
        store.prune().catch(() => {});
    });
    router.start();
})();
