#!/usr/bin/env node
import { globby } from 'globby';
import path from 'node:path';

const files = await globby(['src/pages/**/*.{astro,ts,tsx}']);
const norm = (f) => path
  .relative('src/pages', f)
  .replace(/index\.(astro|ts|tsx)$/i, '')
  .replace(/\.(astro|ts|tsx)$/i, '')
  .replace(/\[.+?\]/g, ':param')
  .replace(/\/+/g, '/');

const map = new Map();
for (const f of files) {
  const p = norm(f);
  if (!map.has(p)) map.set(p, []);
  map.get(p).push(f);
}

let dup = 0;
for (const [p, arr] of map) {
  if (arr.length > 1) {
    console.log('Route collision:', p, '\n ', arr.join('\n  '), '\n');
    dup++;
  }
}

if (dup) {
  console.error(`Found ${dup} route collisions.`);
  process.exit(1);
}
console.log('No route collisions.');
