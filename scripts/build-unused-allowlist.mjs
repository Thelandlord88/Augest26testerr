#!/usr/bin/env node
/**
 * build-unused-allowlist.mjs
 * Creates a curated allowlist from __reports/unused-js.json.
 * Supports --min <n>, --include <glob> (repeatable), --exclude <glob> (repeatable).
 *
 * Usage:
 *   node scripts/build-unused-allowlist.mjs --min 3 \
 *     --include "src/utils/**" --include "src/legacy/**" \
 *     --exclude "cypress/**" > __reports/unused-allowlist.txt
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArgVals = (name) => {
  const vals = [];
  for (let i=0;i<args.length;i++) {
    if (args[i] === `--${name}`) {
      const v = args[i+1];
      if (v && !v.startsWith('--')) { vals.push(v); i++; }
    }
  }
  return vals;
};
const getArgNum = (name, def) => {
  const v = getArgVals(name)[0];
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const MIN = getArgNum('min', 3);
const includes = getArgVals('include');
const excludes = getArgVals('exclude');

function globToRegExp(glob) {
  // very small glob -> regex converter: **, *, ?
  let s = String(glob).replace(/[.+^${}()|[\]\\]/g, '\\$&');
  s = s.replace(/\\\*\\\*/g, '.*');
  s = s.replace(/\\\*/g, '[^/]*');
  s = s.replace(/\\\?/g, '.');
  return new RegExp('^' + s + '$', 'i');
}
const incRes = includes.map(globToRegExp);
const excRes = excludes.map(globToRegExp);

function matchAny(res, rel) { return res.length ? res.some(r => r.test(rel)) : true; }
function matchNone(res, rel) { return res.length ? !res.some(r => r.test(rel)) : true; }

const reportPath = path.resolve('__reports/unused-js.json');
if (!fs.existsSync(reportPath)) {
  console.error('Missing __reports/unused-js.json. Run scan-unused-js.mjs first.');
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const items = Array.isArray(report.items) ? report.items : [];

const picked = items
  .filter(it => (it.confidence ?? 0) >= MIN)
  .filter(it => matchAny(incRes, it.file))
  .filter(it => matchNone(excRes, it.file))
  .map(it => it.file);

for (const rel of picked) console.log(rel);
