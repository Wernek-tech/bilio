// ponytail: prod static + /api reverse-proxy. serves dist/ with SPA fallback, forwards /api/* to the auth-server.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve('dist');
const PORT = Number(process.env.PORT || 8080);
const API = Number(process.env.BILIO_API_PORT || 8787);
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2', '.woff':'font/woff' };

const proxy = (req, res) => {
  const p = http.request({ host: '127.0.0.1', port: API, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${API}` } }, up => {
    res.writeHead(up.statusCode || 502, up.headers);
    up.pipe(res);
  });
  p.on('error', () => { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"error":"API erişilemiyor."}'); });
  req.pipe(p);
};

http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) return proxy(req, res);
  try {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel === '/' || rel.endsWith('/')) rel = '/index.html';
    let file = path.join(DIST, rel);
    if (!file.startsWith(DIST)) throw 0;
    let s = await stat(file).catch(() => null);
    if (!s || !s.isFile()) { file = path.join(DIST, 'index.html'); s = await stat(file); } // SPA fallback
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(PORT, '0.0.0.0', () => console.log(`Bilio site :${PORT} → api :${API}`));
