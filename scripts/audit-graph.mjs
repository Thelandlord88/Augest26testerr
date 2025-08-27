#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const DIST = 'dist';
const aliasRe = /$^/;
const SCRIPT_CAPTURE_RE = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function* walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) yield* walk(fp);
    else if (name.endsWith('.html')) yield fp;
  }
}

function findLdScripts(html) {
  const out = [];
  let m;
  while ((m = SCRIPT_CAPTURE_RE.exec(html))) out.push(m[1]);
  return out;
}

let withLd = 0, multi = 0, none = 0, aliasLd = 0, aliasHref = 0;
for (const file of walk(DIST)) {
  const html = fs.readFileSync(file, 'utf8');
  const ldBlocks = findLdScripts(html);
  if (ldBlocks.length === 0) none++; else { withLd++; if (ldBlocks.length > 1) multi++; }
  // search alias in href-level HTML
  if (aliasRe.test(html)) aliasHref++;
  // check inside JSON-LD only
  for (const block of ldBlocks) {
    if (aliasRe.test(block)) { aliasLd++; break; }
  }
}
console.log(`pages with JSON-LD: ${withLd}`);
console.log(`pages with >1 JSON-LD script: ${multi}`);
console.log(`pages with NO JSON-LD: ${none}`);
console.log(`pages with alias URLs inside JSON-LD: ${aliasLd}`);
console.log(`pages with alias URLs in hrefs: ${aliasHref}`);
