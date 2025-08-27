// scripts/cluster-alias-migrate.mjs
// Migrate alias/label info from scripts/refactor-map.json into src/content/areas.clusters.json
// Usage:
//   node scripts/cluster-alias-migrate.mjs            # dry-run
//   node scripts/cluster-alias-migrate.mjs --write    # apply changes

import fs from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? 'true'];
}));
const WRITE = args.write === 'true' || args.write === '';

const mapPath = 'scripts/refactor-map.json';
const areasPath = 'src/content/areas.clusters.json';

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const areas = JSON.parse(fs.readFileSync(areasPath, 'utf8'));

const bySlug = new Map((areas.clusters||[]).map(c => [c.slug, c]));
let changed = false;

for(const entry of map.clusters || []){
  const { canonical, label, aliases } = entry;
  const node = bySlug.get(canonical);
  if (!node) continue;
  node.name = label || node.name;
  node.aliases = node.aliases || {};
  for(const a of aliases || []){
    if(!node.aliases[a]){ node.aliases[a] = node.name; changed = true; }
  }
}

if (WRITE && changed){
  fs.writeFileSync(areasPath, JSON.stringify(areas, null, 2));
}

console.log(`cluster-alias-migrate ${WRITE ? 'applied' : 'dry-run'} — changed=${changed}`);
