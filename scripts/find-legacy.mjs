#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = 'src';
const patterns = [/\.notusing\./i, /CrossServiceLinks\.astro$/i, /legacy/i];

function* files(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else yield p;
  }
}

const suspects = [];
for (const f of files(root)) {
  if (patterns.some(rx => rx.test(f))) suspects.push(f);
}
if (suspects.length) {
  console.log('Legacy suspects:\n' + suspects.map(s => ' - ' + s).join('\n'));
  process.exit(0);
}
console.log('No legacy suspects found.');
