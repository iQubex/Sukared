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
            return value;
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

        locationState() {
            const hash = String(location.hash || '');
            if (hash.startsWith('#/')) {
                const [pathname, query = ''] = hash.slice(1).split('?');
                return { pathname, search: query ? `?${query}` : '' };
            }
            return { pathname: location.pathname, search: location.search };
        }

        async render() {
            const current = this.locationState();
            const match = this.match(current.pathname);
            if (this.currentCleanup) await this.currentCleanup();
            this.currentCleanup = null;
            this.beforeRender(match);
            this.outlet.classList.remove('route-enter');
            const cleanup = await match.route.render({ ...match, query: new URLSearchParams(current.search) });
            if (typeof cleanup === 'function') this.currentCleanup = cleanup;
            requestAnimationFrame(() => this.outlet.classList.add('route-enter'));
            this.afterRender(match);
        }

        navigate(target, options = {}) {
            const url = new URL(target, location.origin);
            const hashTarget = url.hash.startsWith('#/') ? url.hash.slice(1) : `${url.pathname}${url.search}`;
            const method = options.replace ? 'replaceState' : 'pushState';
            history[method]({}, '', `/#${hashTarget}`);
            this.render();
        }

        start() {
            document.addEventListener('click', event => {
                const link = event.target.closest('a[data-route]');
                if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || link.target) return;
                const url = new URL(link.href, location.origin);
                if (url.origin !== location.origin) return;
                event.preventDefault();
                this.navigate(url.hash.startsWith('#/') ? url.hash.slice(1) : `${url.pathname}${url.search}`);
            });
            addEventListener('popstate', () => this.render());
            return this.render();
        }
    }

    window.SukaRedRouter = Router;
    if (typeof module === 'object' && module.exports) module.exports = Router;
})();
