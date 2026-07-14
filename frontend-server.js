'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.FRONTEND_PORT) || 8080;
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

http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
    const candidate = path.resolve(root, `.${pathname}`);
    if (candidate.startsWith(root) && path.extname(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        send(res, candidate);
        return;
    }
    send(res, path.join(root, 'index.html'));
}).listen(port, '127.0.0.1', () => console.log(`SukaRed frontend listening on ${port}`));
