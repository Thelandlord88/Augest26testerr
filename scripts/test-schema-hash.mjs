#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '__schema');
const BASELINE = path.join(OUT, 'hashes.json');

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && p.endsWith('.html')) yield p;
  }
}

function normalize(obj) {
  if (Array.isArray(obj)) return obj.map(normalize);
  if (obj && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, k) => { acc[k] = normalize(obj[k]); return acc; }, {});
  }
  return obj;
}

function extractGraphs(html) {
  const matches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  if (!matches.length) return [];
  return matches.map(m => { try { const j = JSON.parse(m[1]); return j?.['@graph'] ? j['@graph'] : j; } catch { return null; } }).filter(Boolean);
}

const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

const hashes = {};
if (!fs.existsSync(DIST)) {
  console.error('Schema guard: dist/ missing. Run build first.');
  process.exit(1);
}
for (const file of walk(DIST)) {
  const rel = file.replace(DIST + path.sep, '');
  const html = fs.readFileSync(file, 'utf8');
  const graphs = extractGraphs(html);
  if (graphs.length > 1) {
    console.error(`Schema guard: multiple JSON-LD scripts on ${rel}`);
    process.exitCode = 1;
  }
  if (graphs.length === 1) {
    const canon = JSON.stringify(normalize(graphs[0]));
    hashes[rel] = hash(canon);
  }
}

fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(BASELINE)) {
  fs.writeFileSync(BASELINE, JSON.stringify(hashes, null, 2));
  console.log('Schema guard: baseline created');
} else {
  const prev = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const diffs = Object.keys(hashes).filter(k => prev[k] && prev[k] !== hashes[k]);
  if (diffs.length) {
    console.error('Schema guard: drift detected:\n' + diffs.map(d => ' - ' + d).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Schema guard: OK (no drift)');
  }
}
