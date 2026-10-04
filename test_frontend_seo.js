'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { render } = require('./generate_public_pages');
const { createFrontendServer } = require('./frontend-server');
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const publicPaths = ['/', '/releases.html'];
const entities = value => value.replace(/&amp;/g, '&');
const meta = (html, key) => [...html.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)"/g)].filter(m => m[1] === key).map(m => entities(m[2]));
const canonical = html => [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(m => m[1]);
const generated = render();
for (const [file, expected] of Object.entries(generated)) assert.equal(read(file), expected, `run node generate_public_pages.js to refresh ${file}`);
for (const [index, file] of ['index.html', 'releases.html'].entries()) {
    const html = read(file), url = 'https://luavex.pntr.dev' + publicPaths[index];
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
    assert(!html.includes('<noscript>'), 'essential copy must be ordinary initial HTML');
    assert(html.includes('<html lang="en">'));
    assert.equal((html.match(/<title>/g) || []).length, 1);
    assert.deepEqual(canonical(html), [url]);
    assert.deepEqual(meta(html, 'robots'), ['index, follow']);
    for (const key of ['description', 'og:title', 'og:description', 'og:type', 'og:url', 'og:site_name', 'og:image', 'og:image:alt', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt', 'twitter:url']) assert.equal(meta(html, key).length, 1, `${file}: ${key}`);
    assert.deepEqual(meta(html, 'og:url'), [url]);
    assert.deepEqual(meta(html, 'twitter:url'), [url]);
    assert.equal(meta(html, 'description')[0], meta(html, 'og:description')[0]);
    assert.equal(meta(html, 'description')[0], meta(html, 'twitter:description')[0]);
    const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(json['@context'], 'https://schema.org');
    assert(!/aggregateRating|reviewCount|offers|price|customerCount/.test(JSON.stringify(json)));
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        const link = entities(match[1]);
        if (link.startsWith('#web')) assert(html.includes(`id="${link.slice(1)}"`));
        else if (link.startsWith('/#/')) assert(/^\/#\/(?:workspace|changelog|history)?$/.test(link));
        else if (link.startsWith('/')) {
            const filePath = link.split('?')[0];
            assert(fs.existsSync(path.join(__dirname, filePath === '/' ? 'index.html' : filePath.slice(1))), `${file}: broken ${link}`);
        }
    }
}
const index = read('index.html');
const graph = JSON.parse(index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
assert.equal(graph.find(item => item['@type'] === 'SoftwareApplication').softwareVersion, '2.1');
assert(graph.some(item => item['@type'] === 'WebSite'));
assert.equal(meta(index, 'google-site-verification')[0], 'jdwDQHtgTv7ZyJTNiJOhPpqojRgJwW1cVGncECwZ8dI');
assert(index.includes('Values can still be observed at runtime'));
for (const script of index.matchAll(/<script([^>]*)src=/g)) assert(script[1].includes('defer'), 'avoid parser-blocking frontend scripts');
const releases = read('releases.html');
assert(releases.includes('Luavex 2.1 — Runtime Execution Diversity') && releases.includes('Luavex 2.0 — VM Architecture Redesign') && releases.includes('Version 1.9'));
assert(!releases.includes('<script defer src='), 'static releases must not require app/auth scripts');
const robots = read('robots.txt');
for (const route of ['workspace', 'dashboard', 'history', 'settings', 'auth', 'callback', 'api', 'v2/']) assert(robots.includes('Disallow: /' + route));
assert(!robots.includes('Disallow: /releases') && !robots.includes('Disallow: /assets') && !robots.includes('Disallow: /app'));
assert(robots.includes('Sitemap: https://luavex.pntr.dev/sitemap.xml'));
const sitemap = read('sitemap.xml');
assert(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]), publicPaths.map(p => 'https://luavex.pntr.dev' + p));
assert(!sitemap.includes('#') && !sitemap.includes('<lastmod>'));
for (const route of ['workspace', 'dashboard', 'history', 'settings', 'credits', 'changelog']) {
    const html = read(`${route}/index.html`);
    assert.deepEqual(meta(html, 'robots'), ['noindex, follow']);
    assert(html.includes("location.replace('/#'"), 'legacy navigation behavior must stay intact');
}
(async () => {
    const server = createFrontendServer().listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
        const origin = `http://127.0.0.1:${server.address().port}`;
        for (const [route, mime] of [['/', 'text/html'], ['/releases.html', 'text/html'], ['/robots.txt', 'text/plain'], ['/sitemap.xml', 'application/xml'], ['/assets/luavex-icon-blue.png', 'image/png']]) {
            const response = await fetch(origin + route);
            assert.equal(response.status, 200);
            assert(response.headers.get('content-type').startsWith(mime));
            await response.arrayBuffer();
        }
        for (const route of ['/workspace', '/history', '/settings', '/changelog']) {
            const response = await fetch(origin + route);
            assert.equal(response.status, 200);
            assert.deepEqual(meta(await response.text(), 'robots'), ['noindex, follow']);
        }
        const missing = await fetch(origin + '/does-not-exist');
        assert.equal(missing.status, 404);
        assert((await missing.text()).includes('Page not found'));
        assert.equal((await fetch(origin + '/generate_public_pages.js')).status, 404);
    } finally { await new Promise(resolve => server.close(resolve)); }
    console.log('Metadata, JSON-LD, initial HTML, public links, robots/sitemap, private fallbacks and HTTP hygiene: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
