#!/usr/bin/env node
/**
 * Verify there are no hard-coded "/blog/" literals in .astro files when BLOG_BASE is changed.
 * Exits non-zero if any are found. No-op when BLOG_BASE normalizes to "/blog/".
 */
import fs from 'node:fs';
import path from 'node:path';

const trimSlashes = (s = '') => String(s).replace(/^\/+/, '').replace(/\/+$/, '');
const squash = (s = '') => String(s).replace(/\/{2,}/g, '/');

function norm(base = '/blog/') {
  const stripped = trimSlashes(String(base).trim());
  return squash('/' + stripped + '/');
}

const BLOG_BASE = norm(process.env.BLOG_BASE ?? '/blog/');
if (BLOG_BASE === '/blog/') {
  console.log('BLOG_BASE is default ("/blog/") — skipping verify.');
  process.exit(0);
}

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const offenders = [];

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    // Skip vendor/build dirs just in case
    if (['node_modules', '.git', '.astro', 'dist', '__ai', '.netlify', '.vercel'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && e.name.endsWith('.astro')) yield full;
  }
}

for (const file of walk(SRC)) {
  const txt = fs.readFileSync(file, 'utf8');
  if (txt.includes('/blog/')) {
    offenders.push(path.relative(ROOT, file));
  }
}

if (offenders.length) {
  console.error('verify-blog-base: Found hard-coded "/blog/" in .astro files while BLOG_BASE=' + BLOG_BASE);
  for (const f of offenders) console.error('  - ' + f);
  console.error('Replace with rel.* or paths.* from "~/lib/paths".');
  process.exit(1);
}

console.log('verify-blog-base: OK — no hard-coded "/blog/" in .astro files.');
