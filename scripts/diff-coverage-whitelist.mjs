#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const areasPath = path.join(root, 'src', 'content', 'areas.clusters.json');
const coveragePath = path.join(root, 'src', 'data', 'serviceCoverage.json');
const slugifyPath = path.join(root, 'src', 'utils', 'slugify.js');

const areas = JSON.parse(fs.readFileSync(areasPath, 'utf-8'));
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
const { default: slugify } = await import(url.pathToFileURL(slugifyPath));

const allowed = new Set(
  (Array.isArray(areas?.clusters) ? areas.clusters : [])
    .flatMap((c) => (c.suburbs || []).map(slugify))
);

const missing = new Map();
for (const [svc, subs] of Object.entries(coverage)) {
  for (const s of subs) {
    if (!allowed.has(s)) {
      if (!missing.has(svc)) missing.set(svc, new Set());
      missing.get(svc).add(s);
    }
  }
}

if (missing.size === 0) {
  console.log('All coverage slugs are present in whitelist.');
  process.exit(0);
}

console.log('Missing slugs by service:');
for (const [svc, set] of missing.entries()) {
  console.log(`- ${svc}: ${Array.from(set).sort().join(', ')}`);
}

console.log(`\nTotal missing unique slugs: ${new Set(Array.from(missing.values()).flatMap(s=>Array.from(s))).size}`);
process.exit(1);
