(function () {
    'use strict';

    const outlet = document.getElementById('routeView');
    const shell = document.getElementById('appShell');
    const store = new window.SukaRedHistoryStore();
    const views = window.SukaRedViews;
    const route = (path, title, render) => ({ path, title, render });
    const wrap = renderer => context => renderer({ ...context, outlet, store });
    const withSession = renderer => wrap(async context => {
        const { pathname } = router.locationState();
        await initialSession;
        if (router.locationState().pathname === pathname) return renderer(context);
    });
    const routes = [
        route('/', 'Welcome', () => window.SukaRedLanding.mount(outlet)),
        route('/workspace', 'Workspace', () => window.SukaRedDashboard.mount(outlet, store)),
        route('/dashboard', 'Workspace', () => { history.replaceState({}, '', '/#/workspace'); return window.SukaRedDashboard.mount(outlet, store); }),
        route('/history/:id', 'Build Details', withSession(({ params, ...context }) => views.historyDetail({ ...context, id: params.id }))),
        route('/history', 'My Scripts', withSession(views.storage)),
        route('/storage/:id', 'Script Details', withSession(views.scriptDetails)),
        route('/storage', 'My Scripts', withSession(views.storage)),
        route('/account', 'Account', withSession(views.account)),
        route('/changelog', 'Changelog', wrap(views.changelog)),
        route('/credits', 'Credits', wrap(views.credits)),
        route('/settings', 'Settings', wrap(views.settings)),
        route('*', 'Page Not Found', wrap(views.notFound))
    ];

    const nav = document.getElementById('siteNav');
    const navToggle = document.getElementById('navToggle');
    const dockSettings = document.getElementById('dockSettings');
    const accountSlot = document.getElementById('accountSlot');
    navToggle.append(window.SukaRedIcons.icon('menu'));
    const closeNavigation = () => { nav.classList.remove('is-open'); navToggle.setAttribute('aria-expanded', 'false'); };
    navToggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(open));
    });
    dockSettings?.addEventListener('click', () => window.SukaRedUI.openSettingsModal(dockSettings));

    let removeAccountDismiss = () => {};
    const renderAccount = auth => {
        removeAccountDismiss();
        accountSlot.replaceChildren();
        if (!auth.loaded) {
            const loading = window.SukaRedUI.el('span', 'account-loading', 'Account');
            loading.setAttribute('aria-busy', 'true');
            accountSlot.append(loading);
            return;
        }
        if (!auth.authenticated) {
            const connect = window.SukaRedUI.el('button', 'button account-connect', 'Connect Discord');
            connect.type = 'button';
            connect.addEventListener('click', window.LuavexAuth.login);
            accountSlot.append(connect);
            return;
        }
        const menu = window.SukaRedUI.el('div', 'account-menu');
        const trigger = window.SukaRedUI.el('button', 'account-trigger');
        trigger.type = 'button'; trigger.setAttribute('aria-expanded', 'false');
        if (auth.account.avatarUrl) {
            const avatar = document.createElement('img');
            avatar.src = auth.account.avatarUrl; avatar.alt = ''; avatar.referrerPolicy = 'no-referrer';
            trigger.append(avatar);
        } else trigger.append(window.SukaRedUI.el('span', 'account-avatar-fallback', (auth.account.displayName || 'L').slice(0, 1).toUpperCase()));
        trigger.append(window.SukaRedUI.el('span', 'account-name', auth.account.displayName || auth.account.username));
        const panel = window.SukaRedUI.el('div', 'account-popover'); panel.hidden = true;
        panel.append(
            window.SukaRedUI.el('strong', '', auth.account.displayName || auth.account.username),
            window.SukaRedUI.el('small', '', `@${auth.account.username}`)
        );
        const historyLink = window.SukaRedUI.el('a', 'account-action', 'My Scripts');
        historyLink.href = '/#/history'; historyLink.dataset.route = '';
        const logout = window.SukaRedUI.el('button', 'account-action', 'Log out'); logout.type = 'button';
        logout.addEventListener('click', () => window.LuavexAuth.logout().catch(() => window.SukaRedUI.toast('Logout failed.', 'error')));
        const accountLink = window.SukaRedUI.el('a', 'account-action', 'Account');
        accountLink.href = '/#/account'; accountLink.dataset.route = '';
        panel.append(accountLink, historyLink);

        panel.append(logout); menu.append(trigger, panel); accountSlot.append(menu);
        const close = () => { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); };
        trigger.addEventListener('click', () => {
            panel.hidden = !panel.hidden;
            trigger.setAttribute('aria-expanded', String(!panel.hidden));
        });
        const dismiss = event => { if (!menu.contains(event.target)) close(); };
        document.addEventListener('click', dismiss, true);
        removeAccountDismiss = () => document.removeEventListener('click', dismiss, true);
    };
    window.LuavexAuth.subscribe(renderAccount);

    const router = new window.SukaRedRouter(routes, {
        outlet,
        beforeRender(match) {
            window.SukaRedUI.closeModal();
            closeNavigation();
            const landing = match.path === '/';
            shell.classList.toggle('is-landing', landing);
            document.body.classList.toggle('route-landing', landing);
            const section = match.path.split('/')[1] || '';
            const activity = section === 'history' && new URLSearchParams(router.locationState().search).get('view') === 'activity';
            shell.classList.toggle('v0-app', !landing);
            document.querySelectorAll('[data-nav]').forEach(link => {
                const active = activity ? link.dataset.nav === 'activity' : link.dataset.nav === section || (section === 'storage' && link.dataset.nav === 'history');
                link.classList.toggle('is-active', active);
                if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
            });
            document.title = landing ? window.LuavexRelease.title : `${match.route.title || 'Luavex'} | ${window.LuavexRelease.name}`;
            // Hash application routes are not separate public indexing targets.
            document.querySelector('meta[name="robots"]').content = landing ? 'index, follow' : 'noindex, follow';
        },
        afterRender(match) {
            if (match.path !== '/') outlet.focus({ preventScroll: true });
            const chart = match.path === '/history' && new URLSearchParams(router.locationState().search).get('view') === 'activity'
                ? outlet.querySelector('.library-dashboard-chart') : null;
            if (chart) chart.scrollIntoView({ block: 'center' });
            else scrollTo({ top: 0, behavior: 'auto' });
        }
    });

    const applySettings = value => document.body.classList.toggle('animations-off', !value.animations);
    window.addEventListener('sukared:settings', event => applySettings(event.detail));
    window.sukaredApp = { router, store };
    applySettings(window.SukaRedSettings.load());
    store.ready.then(() => store.prune().catch(() => {}));
    const initialSession = window.LuavexAuth.refresh().then(auth => {
        const hashQuery = location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?') + 1) : '';
        const authResult = new URLSearchParams(hashQuery || location.search).get('auth');
        if (authResult === 'success' && auth.authenticated) window.SukaRedUI.toast('Discord connected', 'success');
        else if (authResult && authResult !== 'success') window.SukaRedUI.toast('Discord login could not be completed.', 'error');
        if (authResult) history.replaceState({}, '', `/#${location.hash.slice(1).split('?')[0] || '/workspace'}`);
    });
    router.start();
})();
