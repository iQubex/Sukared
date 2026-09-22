'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { createFrontendServer } = require('./frontend-server');

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => server.close(resolve));

(async () => {
    const seen = [];
    const upstream = http.createServer((req, res) => {
        seen.push({ method: req.method, url: req.url, cookie: req.headers.cookie || null,
            forwarded: req.headers.forwarded || null, forwardedHost: req.headers['x-forwarded-host'] || null });
        if (req.url === '/auth/discord') {
            res.writeHead(302, {
                location: 'https://discord.com/oauth2/authorize?client_id=fixture',
                'set-cookie': '__Host-luavex_oauth_state=state; Max-Age=600; Path=/; HttpOnly; SameSite=Lax; Secure'
            }); res.end(); return;
        }
        if (req.url === '/auth/discord/callback?code=ok&state=state') {
            assert.equal(req.headers.cookie, '__Host-luavex_oauth_state=state');
            res.writeHead(302, {
                location: 'https://luavex.pntr.dev/#/workspace?auth=success',
                'set-cookie': [
                    '__Host-luavex_oauth_state=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure',
                    '__Host-luavex_session=session; Max-Age=43200; Path=/; HttpOnly; SameSite=Lax; Secure'
                ]
            }); res.end(); return;
        }
        if (req.url === '/auth/session') {
            const authenticated = req.headers.cookie === '__Host-luavex_session=session';
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ authenticated })); return;
        }
        if (req.url === '/auth/logout') {
            res.writeHead(200, { 'content-type': 'application/json',
                'set-cookie': '__Host-luavex_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure' });
            res.end('{"status":"ok"}'); return;
        }
        if (req.url === '/obfuscate' && req.method === 'POST') {
            let body = ''; req.on('data', chunk => { body += chunk; });
            req.on('end', () => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(body); }); return;
        }
        res.writeHead(404); res.end();
    });
    await listen(upstream);
    const frontend = createFrontendServer({ apiUpstream: `http://127.0.0.1:${upstream.address().port}` });
    await listen(frontend);
    const base = `http://127.0.0.1:${frontend.address().port}`;
    try {
        const start = await fetch(`${base}/auth/discord`, { redirect: 'manual',
            headers: { forwarded: 'host=attacker.invalid', 'x-forwarded-host': 'attacker.invalid' } });
        assert.equal(start.status, 302); assert.match(start.headers.get('location'), /^https:\/\/discord\.com\//);
        assert.match(start.headers.get('set-cookie'), /SameSite=Lax; Secure/);
        const callback = await fetch(`${base}/auth/discord/callback?code=ok&state=state`, {
            redirect: 'manual', headers: { cookie: '__Host-luavex_oauth_state=state' }
        });
        assert.equal(callback.status, 302);
        assert.equal(callback.headers.get('location'), 'https://luavex.pntr.dev/#/workspace?auth=success');
        const cookies = callback.headers.getSetCookie();
        assert.equal(cookies.length, 2); assert(cookies.every(value => /SameSite=Lax; Secure/.test(value)));
        assert(cookies.every(value => !/Domain=/i.test(value)), 'host-only cookies required');
        const session = await fetch(`${base}/auth/session`, { headers: { cookie: '__Host-luavex_session=session' } });
        assert.equal((await session.json()).authenticated, true);
        const refresh = await fetch(`${base}/auth/session`, { headers: { cookie: '__Host-luavex_session=session' } });
        assert.equal((await refresh.json()).authenticated, true);
        const invalid = await fetch(`${base}/auth/session`); assert.equal((await invalid.json()).authenticated, false);
        const logout = await fetch(`${base}/auth/logout`, { method: 'POST', headers: { cookie: '__Host-luavex_session=session' } });
        assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
        const build = await fetch(`${base}/api/obfuscate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"code":"return 1"}' });
        assert.equal((await build.json()).code, 'return 1');
        const spa = await fetch(`${base}/workspace`); assert.equal(spa.status, 200);
        assert(seen.some(item => item.url === '/auth/discord') && seen.some(item => item.url === '/obfuscate'));
        assert(seen.every(item => item.forwarded === null && item.forwardedHost === null));
        console.log(JSON.stringify({ passed: true, transparentProxy: true, authStart: 'PASS', callback: 'PASS',
            setCookie: 'PRESERVED', browserCookieHost: 'luavex.pntr.dev', sessionReuse: 'PASS', logout: 'PASS',
            apiPrefix: 'PASS', spaPrecedence: 'PASS' }));
    } finally { await close(frontend); await close(upstream); }
})().catch(error => { console.error(error); process.exitCode = 1; });
