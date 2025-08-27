#!/usr/bin/env node
// Discover built HTML pages and emit route list with content hashes for test curation
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { normRoute } from './routes-util.mjs';

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.html')) out.push(p);
  }
  return out;
}

function sha1(buf) {
  return createHash('sha1').update(buf).digest('hex').slice(0, 12);
}

function main() {
  if (!fs.existsSync('dist')) {
    console.error('[discover-pages] dist/ not found. Build first (npm run build).');
    process.exit(1);
  }
  const files = walk('dist');
  const SKIP = new Set(['404.html', '500.html', '200.html']);
  const items = [];
  for (const f of files) {
    const base = path.basename(f);
    if (SKIP.has(base)) continue;
    const html = fs.readFileSync(f);
    const route = normRoute(f);
    items.push({ route, file: f, hash: sha1(html) });
  }
  items.sort((a, b) => a.route.localeCompare(b.route));

  fs.mkdirSync('__ai', { recursive: true });
  const json = { generatedAt: new Date().toISOString(), count: items.length, items };
  fs.writeFileSync('__ai/all-pages.json', JSON.stringify(json, null, 2) + '\n');
  fs.writeFileSync('__ai/all-pages.txt', items.map(x => x.route).join('\n') + '\n');
  console.log(`[discover-pages] Found ${items.length} routes → __ai/all-pages.{json,txt}`);
}

main();
