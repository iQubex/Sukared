'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || process.env.FRONTEND_PORT) || 8080;
const host = process.env.HOST || '0.0.0.0';
const productionBackend = 'https://backend-luavex.up.railway.app';
const mime = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon'
};

const send = (res, file) => {
    fs.readFile(file, (error, data) => {
        if (error) { res.writeHead(500); res.end('Unable to read frontend asset.'); return; }
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
    });
};

const proxyHeaders = headers => {
    const output = { ...headers };
    for (const name of ['host', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
        'te', 'trailer', 'transfer-encoding', 'upgrade', 'forwarded', 'x-forwarded-for',
        'x-forwarded-host', 'x-forwarded-port', 'x-forwarded-proto']) delete output[name];
    return output;
};

const proxyResponseHeaders = headers => {
    const output = { ...headers };
    for (const name of ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
        'te', 'trailer', 'transfer-encoding', 'upgrade']) delete output[name];
    return output;
};

const proxy = (req, res, upstream, pathname, search) => {
    const transport = upstream.protocol === 'https:' ? https : http;
    const request = transport.request({
        protocol: upstream.protocol,
        hostname: upstream.hostname,
        port: upstream.port || undefined,
        method: req.method,
        path: `${pathname}${search}`,
        headers: proxyHeaders(req.headers)
    }, response => {
        res.writeHead(response.statusCode || 502, proxyResponseHeaders(response.headers));
        response.pipe(res);
    });
    request.setTimeout(40_000, () => request.destroy(new Error('Upstream timeout')));
    request.on('error', () => {
        if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'error', code: 'UPSTREAM_UNAVAILABLE', message: 'Service unavailable.' }));
    });
    req.pipe(request);
};

const createFrontendServer = ({ apiUpstream } = {}) => http.createServer((req, res) => {
    let parsed, pathname;
    try { parsed = new URL(req.url, 'http://localhost'); pathname = decodeURIComponent(parsed.pathname); }
    catch { res.writeHead(400); res.end('Invalid request.'); return; }
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(p => p === '..' || p.startsWith('.'))) {
        res.writeHead(404); res.end('Not found.'); return;
    }
    const upstream = new URL(apiUpstream || process.env.LUAVEX_API_BASE || productionBackend);
    if (pathname === '/auth' || pathname.startsWith('/auth/')) {
        proxy(req, res, upstream, pathname, parsed.search); return;
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
        const target = pathname.slice(4) || '/';
        proxy(req, res, upstream, target, parsed.search); return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    if (pathname === '/app/runtime-config.js') {
        const local = process.env.NODE_ENV !== 'production';
        const apiBase = local ? String(process.env.LUAVEX_API_BASE || '').replace(/\/+$/, '') : '';
        res.writeHead(200, { 'Content-Type': mime['.js'], 'Cache-Control': 'no-store' });
        res.end(`window.LUAVEX_CONFIG=Object.freeze({apiBase:${JSON.stringify(apiBase)},sameOriginProxy:${local ? 'false' : 'true'}});`);
        return;
    }
    // This repository also contains backend state and server fixtures. Only
    // frontend assets may be served, even in local development.
    const publicRoot = pathname.startsWith('/app/') ? path.join(root, 'app')
        : pathname.startsWith('/assets/') ? path.join(root, 'assets') : null;
    if (publicRoot || ['/index.html', '/style.css'].includes(pathname)) {
        const candidate = path.resolve(root, `.${pathname}`);
        if (mime[path.extname(candidate)] && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            const real = fs.realpathSync(candidate);
            const relative = path.relative(publicRoot || root, real);
            if (relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep)) {
                send(res, real); return;
            }
        }
        res.writeHead(404); res.end('Not found.'); return;
    }
    if (['/', '/workspace', '/dashboard', '/history', '/changelog', '/settings', '/credits'].includes(pathname)) {
        send(res, path.join(root, 'index.html')); return;
    }
    res.writeHead(404); res.end('Not found.');
});
if (require.main === module) createFrontendServer().listen(port, host, () => console.log(`Luavex frontend listening on ${host}:${port}`));
module.exports = { createFrontendServer };
