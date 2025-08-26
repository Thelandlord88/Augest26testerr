// Reports lines where async geo helpers might be missing an 'await' prior to the call.
// Heuristic only; exits non‑zero if potential offenders found.
import fs from 'node:fs/promises';
import { globby } from 'globby';

const NEED_AWAIT = [
  'representativeOfCluster(',
  'getSuburbsForCluster(',
  'chooseSuburbForPost(',
];

const files = await globby([
  'src/**/*.{ts,tsx,js,mjs,astro}',
  '!**/node_modules/**'
]);

const offenders = [];
for (const file of files) {
  const src = await fs.readFile(file, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    for (const token of NEED_AWAIT) {
      const idx = line.indexOf(token);
      if (idx !== -1) {
        const before = line.slice(0, idx);
        if (!/\bawait\b/.test(before)) {
          offenders.push([file, i + 1, token.trim(), line.trim()]);
        }
      }
    }
  });
}

if (!offenders.length) {
  console.log('✅ No obvious missing awaits on geo helpers.');
  process.exit(0);
}

console.log('⚠️ Potential missing awaits (manual review needed):\n');
for (const [file, line, token, snippet] of offenders) {
  console.log(`${file}:${line} :: ${token}`);
  console.log(`  ${snippet}\n`);
}
process.exit(1);
