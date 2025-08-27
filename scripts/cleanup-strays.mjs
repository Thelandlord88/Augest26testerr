#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const victims = [
  'src/pages/blog/[cluster]/[slug].astro.bak',
  'src/middleware.js',
  // legacy alias routes/endpoints that must not exist
  'src/pages/blog/[...alias].ts',
];

let removed = 0;
for (const rel of victims) {
  const p = path.join(ROOT, rel);
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
      console.log('Removed stray file:', rel);
      removed++;
    } catch (e) {
      console.warn('Could not remove', rel, e.message);
    }
  }
}

if (!removed) console.log('No stray files to remove.');
