'use strict';
// Refresh static public HTML after changing landing copy or release history.
// No backend, credentials or network access is involved.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, text) => fs.writeFileSync(path.join(root, file), text);
function render() {
    const page = { innerHTML: '', addEventListener() {}, removeEventListener() {} };
    const context = { window: {}, document: { querySelectorAll: () => [], createElement: () => page } };
    for (const file of ['app/release.js', 'app/landing.js', 'app/changelog-data.js']) vm.runInNewContext(read(file), context, { filename: file });
    context.window.SukaRedLanding.mount({ replaceChildren() {} });
    let index = read('index.html');
    index = index.replace(/\s*<noscript>[\s\S]*?<\/noscript>/, '');
    index = index.replace('<body>', '<body class="route-landing">').replace('class="app-shell" id="appShell"', 'class="app-shell is-landing" id="appShell"');
    index = index.replace(/<main id="routeView"[\s\S]*?<\/main>/, `<main id="routeView" class="route-view" tabindex="-1"><div class="web-landing">${page.innerHTML}</div></main>`);
    const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const brand = page.innerHTML.match(/<a class="web-brand"[\s\S]*?<\/a>/)[0].replace('href="/#/" data-route', 'href="/"');
    const nav = `<header class="web-nav web-wrap">${brand}<a class="web-nav-entry" href="/#/workspace">Open workspace ↗</a></header>`;
    let head = index.slice(index.indexOf('<head>'), index.indexOf('</head>') + 7);
    const releaseTitle = 'Luavex 2.0 Release Notes — Luavex';
    const releaseDescription = 'Read what changed in Luavex 2.0 and explore the release history for Lua and Luau script protection.';
    head = head.replace(/<title>.*?<\/title>/, `<title>${releaseTitle}</title>`)
        .replace(/(name="description" content=")[^"]+/, '$1' + releaseDescription)
        .replace(/((?:property="og:title"|name="twitter:title") content=")[^"]+/g, '$1' + releaseTitle)
        .replace(/((?:property="og:description"|name="twitter:description") content=")[^"]+/g, '$1' + releaseDescription)
        .replace(/https:\/\/luavex\.pntr\.dev\/("(?=>)|"(?=\s*\/?>))/g, 'https://luavex.pntr.dev/releases.html$1');
    // Keep the shared WebSite identity; this document is a public release-history page.
    head = head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: releaseTitle, description: releaseDescription, url: 'https://luavex.pntr.dev/releases.html', inLanguage: 'en', isPartOf: { '@id': 'https://luavex.pntr.dev/#website' } })}</script>`);
    const cards = context.window.SukaRedChangelog.map(entry => `<article class="changelog-entry" data-release="${escape(entry.status)}"><header class="changelog-top"><h2>${escape(entry.version)}</h2><span class="status-badge">${escape(entry.status)}</span></header>${Object.entries(entry.groups).map(([group, items]) => `<section class="change-group"><h3>${escape(group)}</h3><ul>${items.map(text => `<li>${escape(text)}</li>`).join('')}</ul></section>`).join('')}</article>`).join('\n');
    const releases = `<!DOCTYPE html>\n<html lang="en">\n${head}\n<body class="route-landing"><div>${nav}<main class="web-wrap web-section changelog-page"><span class="web-eyebrow">Release history</span><h1>Luavex release notes</h1><p>Luavex 2.0 is the current release.</p><div class="changelog-list">${cards}</div></main><footer class="web-footer web-wrap"><a href="/">Luavex home</a><a href="/#/workspace">Open workspace</a></footer></div></body>\n</html>\n`;
    const notFound = '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, follow"><title>Page not found — Luavex</title><link rel="icon" type="image/png" href="/assets/luavex-icon-blue.png"><link rel="stylesheet" href="/style.css?v=luavex-web-2.0"></head><body><main class="web-wrap web-section"><h1>Page not found</h1><p>This page is unavailable.</p><a href="/">Luavex home</a> · <a href="/releases.html">Release notes</a></main></body></html>\n';
    return { 'index.html': index, 'releases.html': releases, '404.html': notFound };
}
if (require.main === module) for (const [file, text] of Object.entries(render())) write(file, text);
module.exports = { render };
