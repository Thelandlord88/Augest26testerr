#!/usr/bin/env node
// Basic blog canonical / alias audit script (simplified)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const OUT_DIR = path.join(ROOT, '__ai');
const OUT = path.join(OUT_DIR, 'blog-alias-audit.txt');
const DEFAULT_ALIASES = ['ipswich-region','brisbane-west','brisbane_west','brisbane%20west'];
const CANON_MAP = new Map([['ipswich-region','ipswich'],['brisbane-west','brisbane'],['brisbane_west','brisbane'],['brisbane%20west','brisbane']]);

function* walk(dir) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) yield* walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) yield full;
    }
  } catch (e) {}
}

function read(p) { try { return fs.readFileSync(p,'utf8'); } catch { return ''; } }

function findCanonicalHref(html){
  const linkRe = /<link\b[^>]*rel=["']canonical["'][^>]*>/ig;
  const hrefRe = /href=["']([^"']+)["']/i;
  let m;
  while ((m = linkRe.exec(html))) {
    const tag = m[0];
    const h = tag.match(hrefRe);
    if (h && h[1]) return h[1];
  }
  return null;
}

(async function main(){
  if (!fs.existsSync(DIST)) { console.error('dist/ not found, build first'); process.exit(0); }
  const files = [...walk(DIST)];
  const aliasRx = new RegExp(`/blog/(?:${DEFAULT_ALIASES.map(a=>a.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')).join('|')})(?:/|$)`, 'ig');
  const issues = { badCanonical: [], aliasAnchors: [] };
  for (const f of files) {
    const html = read(f);
    const canonical = findCanonicalHref(html);
    if (canonical && aliasRx.test(canonical)) issues.badCanonical.push({ file: path.relative(ROOT,f), canonical });
    if (aliasRx.test(html)) issues.aliasAnchors.push({ file: path.relative(ROOT,f) });
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR,{recursive:true});
  const lines = [];
  lines.push(`# Blog alias audit - ${new Date().toISOString()}`);
  lines.push(`Checked ${files.length} HTML files`);
  lines.push(`Bad canonical count: ${issues.badCanonical.length}`);
  lines.push(`Alias occurrences: ${issues.aliasAnchors.length}`);
  issues.badCanonical.slice(0,50).forEach(b=>lines.push(`bad canonical: ${b.file} -> ${b.canonical}`));
  issues.aliasAnchors.slice(0,50).forEach(a=>lines.push(`alias found in: ${a.file}`));
  fs.writeFileSync(OUT, lines.join('\n')+'\n','utf8');
  console.log(`Wrote ${OUT}`);
  if (issues.badCanonical.length || issues.aliasAnchors.length) process.exit(1);
})();
