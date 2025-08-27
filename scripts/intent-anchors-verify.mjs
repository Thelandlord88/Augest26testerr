#!/usr/bin/env node
/**
 * Intent Anchor Verifier
 * - Scans src (Astro) or dist (HTML) for links to /services/:service/:suburb/
 * - Checks that anchor text (or aria-label/title) matches "Service in Suburb"
 * - Uses src/data/suburbs.json if available for correct casing; else humanizes slug
 * - Exits 1 on mismatches; prints a short report to __ai/intent-anchors-report.txt
 *
 * Usage:
 *   node scripts/intent-anchors-verify.mjs --mode=src   # scan source .astro
 *   node scripts/intent-anchors-verify.mjs --mode=dist  # scan built HTML
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const arg = (name, dflt=null) => {
  const m = process.argv.find(a => a.startsWith(name+'='));
  return m ? m.split('=')[1] : dflt;
};

const MODE = (arg('--mode','src') || 'src').toLowerCase();
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, '__ai');
const OUT = path.join(OUT_DIR, 'intent-anchors-report.txt');

const SRC_EXTS = new Set(['.astro', '.md', '.mdx']);
const DIST_EXTS = new Set(['.html']);

const SCAN_DIR = MODE === 'dist' ? path.join(ROOT, 'dist') : path.join(ROOT, 'src');

// Optional suburb casing map
let suburbMap = new Map();
try {
  const p = path.join(ROOT, 'src', 'data', 'suburbs.json');
  if (fs.existsSync(p)) {
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const s of arr) {
      const slug = (s.slug || String(s.name || '')).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
      if (s.name) suburbMap.set(slug, String(s.name));
    }
  }
} catch {}

const titleCase = s => String(s).replace(/\b[a-z]/g, m => m.toUpperCase());
const humanizeSuburb = s => titleCase(String(s).replace(/-/g,' '));

function serviceLabel(service) {
  switch (service) {
    case 'spring-cleaning': return 'Spring cleaning';
    case 'bathroom-deep-clean': return 'Bathroom deep clean';
    default: return 'Bond cleaning';
  }
}

function expectedText(service, suburbSlug) {
  const suburbName = suburbMap.get(suburbSlug) || humanizeSuburb(suburbSlug);
  return `${serviceLabel(service)} in ${suburbName}`;
}

const FILE_SKIP_DIRS = new Set(['node_modules','.git','.astro','.vercel','.netlify','coverage','__ai']);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (FILE_SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else {
      const ext = path.extname(e.name).toLowerCase();
      if ((MODE === 'dist' && DIST_EXTS.has(ext)) || (MODE === 'src' && SRC_EXTS.has(ext))) {
        yield full;
      }
    }
  }
}

// Rough anchor matcher; tolerant enough for both .astro and .html
const A_RX = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
// Extract aria-label/title from the tag open portion
function extractAttrs(tagOpen) {
  const attrs = {};
  const lab = tagOpen.match(/\baria-label\s*=\s*["']([^"']+)["']/i);
  const ttl = tagOpen.match(/\btitle\s*=\s*["']([^"']+)["']/i);
  if (lab) attrs['aria-label'] = lab[1];
  if (ttl) attrs['title'] = ttl[1];
  return attrs;
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

const mismatches = [];
let scanned = 0;
let checked = 0;

for (const file of walk(SCAN_DIR)) {
  const text = fs.readFileSync(file, 'utf8');
  scanned++;
  let m;
  while ((m = A_RX.exec(text)) !== null) {
    const href = m[1];
    // Only consider service/suburb links
    const u = href.replace(/^https?:\/\/[^/]+/i,''); // strip origin if any
    const mm = u.match(/^\/services\/([^/]+)\/([^/]+)\/?(?:[#?].*)?$/i);
    if (!mm) continue;

    const service = mm[1].toLowerCase();
    const suburbSlug = mm[2].toLowerCase();
    const expected = expectedText(service, suburbSlug);

    // Try inner text first
    const anchorHtml = m[0];
    const innerHtml = m[2];
    const innerText = stripTags(innerHtml);

    // If inner text is empty or complex (contained elements), fall back to aria-label/title
    let actual = innerText;
    if (!actual || /<\w+/.test(innerHtml)) {
      // Reconstruct tag open to read attributes
      const tagOpenMatch = anchorHtml.match(/^<a\b([^>]*)>/i);
      const tagOpen = tagOpenMatch ? tagOpenMatch[0] : '';
      const attrs = extractAttrs(tagOpen);
      actual = attrs['aria-label'] || attrs['title'] || innerText;
    }

    checked++;

    if (actual !== expected) {
      mismatches.push({
        file,
        href,
        expected,
        actual: actual || '(empty)',
      });
    }
  }
}

await fsp.mkdir(OUT_DIR, { recursive: true });
const lines = [];
lines.push(`# Intent anchor verify — mode=${MODE}`);
lines.push(`Scanned files: ${scanned}`);
lines.push(`Checked anchors: ${checked}`);
lines.push(`Mismatches: ${mismatches.length}`);
if (mismatches.length) {
  lines.push('');
  for (const mm of mismatches.slice(0, 100)) {
    lines.push(`- ${path.relative(ROOT, mm.file)}`);
    lines.push(`  href:     ${mm.href}`);
    lines.push(`  expected: ${mm.expected}`);
    lines.push(`  actual:   ${mm.actual}`);
  }
}
await fsp.writeFile(OUT, lines.join('\n')+'\n', 'utf8');

console.log(`Wrote ${path.relative(ROOT, OUT)}`);
if (mismatches.length) process.exit(1);
