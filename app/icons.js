(function () {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';
    const paths = Object.freeze({
        settings: ['circle:12,12,3', 'path:M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20.3h-3v-.08a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.04H5.3v-3h.14A1.7 1.7 0 0 0 7 9.92a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.7 4.7v-.08h3v.08a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.04h.14v3h-.14A1.7 1.7 0 0 0 19.4 15Z'],
        upload: ['path:M12 16V4', 'path:m7 9 5-5 5 5', 'path:M5 20h14'],
        trash: ['path:M4 7h16', 'path:M9 7V4h6v3', 'path:M7 7l1 13h8l1-13', 'path:M10 11v5', 'path:M14 11v5'],
        copy: ['rect:9,9,11,11,2', 'path:M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3'],
        download: ['path:M12 4v11', 'path:m8 11 4 4 4-4', 'path:M5 20h14'],
        play: ['path:M8 5v14l11-7Z'],
        close: ['path:m6 6 12 12', 'path:m18 6-12 12'],
        menu: ['path:M4 7h16', 'path:M4 12h16', 'path:M4 17h16'],
        check: ['path:m5 12 4 4L19 6'],
        chevron: ['path:m8 10 4 4 4-4'],
        arrow: ['path:M5 12h14', 'path:m13 6 6 6-6 6']
    });

    const icon = (name, options = {}) => {
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', String(options.size || 18));
        svg.setAttribute('height', String(options.size || 18));
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '1.7');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        svg.classList.add('ui-icon');
        (paths[name] || []).forEach(definition => {
            const [kind, value] = definition.split(/:(.+)/);
            let node;
            if (kind === 'path') {
                node = document.createElementNS(NS, 'path');
                node.setAttribute('d', value);
            } else if (kind === 'circle') {
                const [cx, cy, r] = value.split(',');
                node = document.createElementNS(NS, 'circle');
                node.setAttribute('cx', cx); node.setAttribute('cy', cy); node.setAttribute('r', r);
            } else if (kind === 'rect') {
                const [x, y, width, height, rx] = value.split(',');
                node = document.createElementNS(NS, 'rect');
                node.setAttribute('x', x); node.setAttribute('y', y); node.setAttribute('width', width); node.setAttribute('height', height); node.setAttribute('rx', rx);
            }
            if (node) svg.append(node);
        });
        return svg;
    };

    window.SukaRedIcons = { icon };
})();
