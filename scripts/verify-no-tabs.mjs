#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['.github/workflows'];
const EXTS = new Set(['.yml', '.yaml']);

function list(dir) {
  const out = [];
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, dirent.name);
    if (dirent.isDirectory()) out.push(...list(p));
    else out.push(p);
  }
  return out;
}

const targets = ROOTS
  .filter(fs.existsSync)
  .flatMap(list)
  .filter(f => EXTS.has(path.extname(f).toLowerCase()));

let bad = false;
for (const f of targets) {
  const txt = fs.readFileSync(f, 'utf8');
  const hasTab = /\t/.test(txt);
  const hasNbsp = /\u00A0/.test(txt);
  if (hasTab || hasNbsp) {
    console.error(`❌ Disallowed whitespace in ${f}: ${[
      hasTab ? 'TAB' : null,
      hasNbsp ? 'NBSP' : null,
    ].filter(Boolean).join(', ')}`);
    bad = true;
  }
}

if (bad) process.exit(1);
console.log('✅ No tabs/NBSP detected in workflow YAML.');