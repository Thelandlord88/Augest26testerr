#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const getArg = (flag, def) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : def;
};

const ROOT = path.resolve(getArg('-d', 'dist'));
const PORT = Number(getArg('-p', process.env.PORT || 4322));
const REDIRECTS = path.join(ROOT, '_redirects');

const TYPE = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
};

function parseRedirects(txt) {
  const rules = [];
  for (const raw of txt.split(/\r?\n/g)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const [from, to, statusRaw] = parts;
    const code = Number(statusRaw) || 301;
    // Build regex with capture groups for named params and splat
    const paramNames = [];
    let pattern = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Named params :name
    pattern = pattern.replace(/:(\w+)/g, (_, name) => { paramNames.push(name); return '([^/]+)'; });
    // Splat * (greedy)
    let splatIndex = -1;
    pattern = pattern.replace(/\\\*/g, () => { splatIndex = paramNames.push('splat') - 1; return '(.*)'; });
    const rx = new RegExp('^' + pattern + '$');
    rules.push({ from, to, code, rx, paramNames });
  }
  return rules;
}

const redirectRules = fs.existsSync(REDIRECTS)
  ? parseRedirects(fs.readFileSync(REDIRECTS, 'utf8'))
  : [];

function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  const dir = path.join(ROOT, decodeURIComponent(urlPath.split('?')[0]));
  const idx = path.join(dir, 'index.html');
  if (fs.existsSync(idx) && fs.statSync(idx).isFile()) return idx;
  return null;
}

function send(res, code, body, headers = {}) {
  res.writeHead(code, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  try {
    const url = req.url || '/';
    for (const r of redirectRules) {
      const m = r.rx.exec(url.split('?')[0]);
      if (m) {
        const params = {};
        r.paramNames?.forEach((n, i) => { params[n] = m[i + 1]; });
        // Substitute :name and :splat in target
        let target = r.to.replace(/:(\w+)/g, (_, name) => params[name] || '');
        // If target still contains :splat and we had a splat capture
        if (params.splat) target = target.replace(/:splat/g, params.splat);
        const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
        const location = target.includes('?') || !q ? target : `${target}?${q}`;
        return send(res, r.code, `Redirecting to ${location}`, { Location: location });
      }
    }
    const file = resolveFile(url);
    if (!file) return send(res, 404, 'Not Found\n', { 'Content-Type': 'text/plain; charset=utf-8' });
    const ext = path.extname(file).toLowerCase();
    const mime = TYPE[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(file).once('error', () => send(res, 500, 'Server Error\n')).pipe(res);
  } catch (err) {
    send(res, 500, String(err));
  }
});

server.listen(PORT, () => {
  console.log(`[serve-with-redirects] Serving ${ROOT} on http://localhost:${PORT}`);
  console.log(`[serve-with-redirects] Rules: ${redirectRules.length}`);
});
