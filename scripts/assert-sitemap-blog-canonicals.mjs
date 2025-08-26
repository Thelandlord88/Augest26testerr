#!/usr/bin/env node
/**
 * Assert blog URLs in sitemap.xml use the current BLOG_BASE and are absolute.
 * Reads dist/sitemap.xml and checks for expected base and absolute URLs.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const FILE = path.join(DIST, 'sitemap.xml');

// Helpers
const squash = (s = '') => String(s).replace(/\/{2,}/g, '/');
const withTrailingSlash = (p = '/') => (/\.[a-z0-9]+$/i.test(p) ? String(p) : String(p).replace(/\/+$/, '') + '/');
const trimSlashes = (s = '') => String(s).replace(/^\/+/, '').replace(/\/+$/, '');
const normalizePath = (p = '/') => withTrailingSlash(squash('/' + trimSlashes(p)));
const isHttp = (u = '') => /^https?:\/\//i.test(u);

const BLOG_BASE = process.env.BLOG_BASE || '/blog/';
const base = normalizePath(BLOG_BASE);

if (!fs.existsSync(FILE)) {
  console.log('[assert-sitemap-blog-canonicals] sitemap.xml not found; skipping');
  process.exit(0);
}

const xml = fs.readFileSync(FILE, 'utf8');
const locRx = /<loc>([^<]+)<\/loc>/g;
let m;
let bad = 0;
while ((m = locRx.exec(xml))) {
  const url = m[1];
  // Must be absolute HTTP(S)
  if (!isHttp(url)) {
    console.error('Non-absolute URL in sitemap:', url);
    bad++;
    continue;
  }
  // If it contains the blog base segment, ensure it matches current base
  try {
    const u = new URL(url);
    const p = normalizePath(u.pathname);
    if (p.startsWith('/blog/') || p.startsWith('/guides/')) {
      if (!p.startsWith(base)) {
        console.error(`Sitemap blog path base mismatch: ${p} (expected to start with ${base})`);
        bad++;
      }
    }
  } catch {}
}

if (bad) {
  console.error(`[assert-sitemap-blog-canonicals] FAIL: ${bad} issue(s) found.`);
  process.exit(1);
}
console.log('[assert-sitemap-blog-canonicals] PASS');
