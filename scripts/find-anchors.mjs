#!/usr/bin/env node
/**
 * Find exact <a> anchors pointing at target URLs inside built HTML.
 *
 * Usage:
 *   node scripts/find-anchors.mjs --targets="/blog/ipswich/bond-cleaning-checklist/,/blog/ipswich/what-agents-want/" [--origin=https://onendonebondclean.com.au]
 *
 * Output:
 *   __ai/anchor-locations.json
 *   __ai/anchor-locations.csv
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const OUT_DIR = path.join(ROOT, '__ai');
await fsp.mkdir(OUT_DIR, { recursive: true });

const arg = (k, d = null) => {
  const hit = process.argv.find(a => a.startsWith(k + '='));
  return hit ? hit.split('=').slice(1).join('=') : d;
};

const ORIGIN = arg('--origin', 'https://onendonebondclean.com.au');
const targets = (arg('--targets', '') || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (!targets.length) {
  console.error('ERR: Provide --targets="/path1,/path2"');
  process.exit(1);
}

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(full);
    else if (full.endsWith('.html')) yield full;
  }
}

function normalizeHref(href) {
  try {
    // Accept absolute-to-site or relative; normalize to pathname + trailing slash where appropriate
    const u = new URL(href, ORIGIN);
    const p = u.pathname || '/';
    if (/\.[a-z0-9]+$/i.test(p)) return p; // e.g. sitemap.xml
    return p.replace(/\/?$/, '/');
  } catch {
    return href;
  }
}

const A_RX = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

const rows = [];
for (const file of walk(DIST)) {
  const html = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = A_RX.exec(html))) {
    const rawHref = m[1];
    const text = (m[2] || '').replace(/\s+/g, ' ').trim();
    const href = normalizeHref(rawHref);
    if (targets.includes(href)) {
      rows.push({
        page: path.relative(DIST, file).replace(/\\/g, '/'),
        href,
        text,
      });
    }
  }
}

// Write JSON
await fsp.writeFile(path.join(OUT_DIR, 'anchor-locations.json'), JSON.stringify(rows, null, 2), 'utf8');

// Write CSV
const csv = ['page,href,text']
  .concat(rows.map(r =>
    [r.page, r.href, JSON.stringify(r.text).slice(1, -1)].join(',')
  ))
  .join('\n');

await fsp.writeFile(path.join(OUT_DIR, 'anchor-locations.csv'), csv, 'utf8');

console.log(`Found ${rows.length} matching anchors across ${new Set(rows.map(r => r.page)).size} pages.`);
console.log(`Wrote __ai/anchor-locations.json and __ai/anchor-locations.csv`);
