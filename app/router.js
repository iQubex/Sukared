(function () {
    'use strict';

    class Router {
        constructor(routes, options = {}) {
            this.routes = routes;
            this.outlet = options.outlet;
            this.beforeRender = options.beforeRender || (() => {});
            this.afterRender = options.afterRender || (() => {});
            this.currentCleanup = null;
        }

        normalize(pathname) {
            const value = String(pathname || '/').replace(/\/+$/, '') || '/';
            return value === '/' ? '/dashboard' : value;
        }

        match(pathname) {
            const path = this.normalize(pathname);
            for (const route of this.routes) {
                if (route.path === '*') continue;
                const names = [];
                const pattern = route.path.replace(/:([A-Za-z0-9_]+)/g, (_, name) => {
                    names.push(name);
                    return '([^/]+)';
                });
                const match = path.match(new RegExp(`^${pattern}$`));
                if (match) {
                    const params = Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
                    return { route, path, params };
                }
            }
            return { route: this.routes.find(route => route.path === '*'), path, params: {} };
        }

        async render() {
            const match = this.match(location.pathname);
            if (this.currentCleanup) await this.currentCleanup();
            this.currentCleanup = null;
            this.beforeRender(match);
            this.outlet.classList.remove('route-enter');
            const cleanup = await match.route.render({ ...match, query: new URLSearchParams(location.search) });
            if (typeof cleanup === 'function') this.currentCleanup = cleanup;
            requestAnimationFrame(() => this.outlet.classList.add('route-enter'));
            this.afterRender(match);
        }

        navigate(target, options = {}) {
            const url = new URL(target, location.origin);
            const method = options.replace ? 'replaceState' : 'pushState';
            history[method]({}, '', `${url.pathname}${url.search}${url.hash}`);
            this.render();
        }

        start() {
            if (location.pathname === '/') history.replaceState({}, '', `/dashboard${location.search}${location.hash}`);
            document.addEventListener('click', event => {
                const link = event.target.closest('a[data-route]');
                if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || link.target) return;
                const url = new URL(link.href, location.origin);
                if (url.origin !== location.origin) return;
                event.preventDefault();
                this.navigate(`${url.pathname}${url.search}${url.hash}`);
            });
            addEventListener('popstate', () => this.render());
            return this.render();
        }
    }

    window.SukaRedRouter = Router;
})();
