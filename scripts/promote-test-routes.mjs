#!/usr/bin/env node
// Promote pending test routes into the stable baseline; preserve baseline hashes
// Usage: node scripts/promote-test-routes.mjs [--all] [--match \/services\/spring-cleaning\/]
import fs from 'node:fs';

const OUT = '__ai/test-routes.json';
const BASELINE = '__ai/test-routes.baseline.json';

function readJson(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } }

function main() {
  const state = readJson(OUT, { routes: [], pending: [] });
  const base  = readJson(BASELINE, { routes: [], hashes: {} });

  const pending = Array.isArray(state.pending) ? state.pending : [];
  const stable = new Set(Array.isArray(base.routes) ? base.routes : []);

  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const i = args.indexOf('--match');
  const pattern = i !== -1 ? args[i+1] : '';
  const re = all ? /[\s\S]*/ : (pattern ? new RegExp(pattern) : /^$/);

  const selected = pending.filter(r => re.test(r));
  if (selected.length === 0) {
    console.log('[promote-test-routes] Nothing to promote. Use --all or --match <regex>.');
    return;
  }

  const before = Array.from(stable).sort();
  for (const r of selected) stable.add(r);
  const after = Array.from(stable).sort();
  const added = after.filter(r => !before.includes(r));

  fs.writeFileSync(BASELINE, JSON.stringify({ routes: after, hashes: base.hashes || {} }, null, 2) + '\n');
  console.log(`[promote-test-routes] Promoted ${added.length} routes → ${BASELINE}`);
  if (added.length) console.log(added.join('\n'));
}

main();
