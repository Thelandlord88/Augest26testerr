import fs from 'fs';

const srcPath = 'src/data/serviceCoverage.source.json';
const outPath = 'src/data/serviceCoverage.json';

const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
const groups = src._groups || {};
const out = {};

const slug = s => String(s).trim().toLowerCase();

const expand = (arr=[]) => {
  const list = [];
  for (const item of arr) {
    if (String(item).startsWith('@')) {
      const gname = item.slice(1);
      const g = groups[gname] || [];
      list.push(...g);
    } else {
      list.push(item);
    }
  }
  // dedupe + sort
  return Array.from(new Set(list.map(slug))).sort();
};

for (const [svc, arr] of Object.entries(src)) {
  if (svc === '_groups') continue;
  out[svc] = expand(arr);
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${outPath} with ${Object.values(out).reduce((n,a)=>n+a.length,0)} total entries.`);
