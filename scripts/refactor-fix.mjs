// scripts/refactor-fix.mjs
// Safe, targeted text replacements to prepare for URL refactors.
// Usage:
//   node scripts/refactor-fix.mjs --base=blog:articles --service=bond-cleaning:end-of-lease-cleaning --page=quote:get-quote
//   node scripts/refactor-fix.mjs --write ...   # apply changes (default is dry-run)

import fs from 'node:fs';
import path from 'node:path';
import { globby } from 'globby';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'];
}));
const WRITE = args.write === 'true' || args.write === '';

function parsePairs(flag){
  return []
    .concat([args[flag]].flat())
    .filter(Boolean)
    .flatMap(v => String(v).split(','))
    .map(s => s.split(':').map(x => x.trim()))
    .filter(([a,b]) => a && b)
    .map(([from,to]) => ({ from, to }));
}

// Mappings from flags
const basePairs    = parsePairs('base');    // e.g. blog:articles
const servicePairs = parsePairs('service'); // e.g. bond-cleaning:end-of-lease-cleaning
const pagePairs    = parsePairs('page');    // e.g. quote:get-quote

const targetFiles = await globby([
  'src/**/*.{astro,js,ts,mjs,jsx,tsx,md,mdx,html,css}',
  'public/_redirects',
  'robots.txt',
], { gitignore: true, dot: false });

function applyReplacements(input){
  let changed = false;
  let out = input;

  // base segment renames: replace '/blog/' → '/articles/' etc.
  for(const {from,to} of basePairs){
    const re = new RegExp(`(/)${from}(/)`, 'g');
    out = out.replace(re, (_, a, b) => { changed = true; return `${a}${to}${b}`; });
    // edge: paths without trailing slash at end of string
    const re2 = new RegExp(`(/)${from}($)`, 'g');
    out = out.replace(re2, (_, a, b) => { changed = true; return `${a}${to}${b}`; });
  }

  // service slug renames under /services/{service}/...
  for(const {from,to} of servicePairs){
    const re = new RegExp(`(/services/)${from}(/)`, 'g');
    out = out.replace(re, (_, a, b) => { changed = true; return `${a}${to}${b}`; });
    const re2 = new RegExp(`(/services/)${from}($)`, 'g');
    out = out.replace(re2, (_, a, b) => { changed = true; return `${a}${to}${b}`; });
  }

  // one-off page slug renames: '/quote' → '/get-quote'
  for(const {from,to} of pagePairs){
    // at path boundaries; keep query/fragments unchanged
    const re = new RegExp(`(/)${from}(/|\\?|#|\"|\'|\)|\s|$)`, 'g');
    out = out.replace(re, (m, a, b) => { changed = true; return `${a}${to}${b}`; });
  }

  return { out, changed };
}

let filesChanged = 0;
let bytesWritten = 0;
let report = `# refactor-fix report — ${new Date().toISOString()}\nwrite=${WRITE}\nbase=${JSON.stringify(basePairs)}\nservice=${JSON.stringify(servicePairs)}\npage=${JSON.stringify(pagePairs)}\n\n`;

for(const f of targetFiles){
  const src = fs.readFileSync(f, 'utf8');
  const { out, changed } = applyReplacements(src);
  if (!changed) continue;
  filesChanged++;
  if (WRITE){ fs.writeFileSync(f, out); bytesWritten += Buffer.byteLength(out, 'utf8'); }
  report += `changed: ${f}\n`;
}

fs.mkdirSync('__ai', { recursive: true });
fs.writeFileSync('__ai/refactor-fix-report.txt', report + `\nfilesChanged=${filesChanged}\nbytesWritten=${bytesWritten}\n`);
console.log(`refactor-fix ${WRITE ? 'applied' : 'dry-run'} — files changed: ${filesChanged}`);
if (!WRITE && filesChanged > 0) process.exit(0);
