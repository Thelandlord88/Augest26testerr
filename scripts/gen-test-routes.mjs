#!/usr/bin/env node
// Generate a curated and controlled list of routes for Playwright tests from __ai/all-pages.json
// - Caps the number of pages per section to avoid long/flaky runs
// - Tracks a baseline of routes and their last-seen hashes; NEW vs CHANGED surfaced
// - Output: __ai/test-routes.json { routes, pending, changed }
import fs from 'node:fs';

const IN = '__ai/all-pages.json';
const OUT = '__ai/test-routes.json';
const BASELINE = '__ai/test-routes.baseline.json';

const MAX_SERVICE_SUBURBS = Number(process.env.MAX_SERVICE_SUBURBS || 2);
const MAX_AREA_CLUSTERS   = Number(process.env.MAX_AREA_CLUSTERS || 3);
const MAX_AREA_DETAILS    = Number(process.env.MAX_AREA_DETAILS || 3);
const MAX_BLOG_CLUSTERS   = Number(process.env.MAX_BLOG_CLUSTERS || 3);

function ensureArray(x) { return Array.isArray(x) ? x : []; }

function curate(routes) {
  const hubs = new Set(['/', '/areas/', '/services/bond-cleaning/', '/services/spring-cleaning/', '/services/bathroom-deep-clean/', '/blog/', '/quote/', '/gallery/']);

  // Group service suburb pages by service
  const serviceGroups = { 'bond-cleaning': [], 'spring-cleaning': [], 'bathroom-deep-clean': [] };
  const areaClusters = [];
  const areaDetails = [];
  const blogClusters = [];

  for (const r of routes) {
    const mSvc = r.match(/^\/services\/(bond-cleaning|spring-cleaning|bathroom-deep-clean)\/([a-z0-9-]+)\/$/i);
    if (mSvc) { serviceGroups[mSvc[1]].push(r); continue; }
    const mAreaCluster = r.match(/^\/areas\/([a-z0-9-_]+)\/$/i);
    if (mAreaCluster) { areaClusters.push(r); continue; }
    const mAreaDetail = r.match(/^\/areas\/([a-z0-9-_]+)\/([a-z0-9-]+)\/$/i);
    if (mAreaDetail) { areaDetails.push(r); continue; }
    const mBlogCluster = r.match(/^\/blog\/([a-z0-9-_]+)\/$/i);
    if (mBlogCluster) { blogClusters.push(r); continue; }
  }

  const keep = new Set(hubs);

  // Keep capped samples per service
  for (const svc of Object.keys(serviceGroups)) {
    const arr = serviceGroups[svc].sort();
    for (const r of arr.slice(0, MAX_SERVICE_SUBURBS)) keep.add(r);
  }
  // Keep capped area clusters and details
  for (const r of areaClusters.sort().slice(0, MAX_AREA_CLUSTERS)) keep.add(r);
  for (const r of areaDetails.sort().slice(0, MAX_AREA_DETAILS)) keep.add(r);
  // Keep capped blog clusters
  for (const r of blogClusters.sort().slice(0, MAX_BLOG_CLUSTERS)) keep.add(r);

  return Array.from(keep).sort();
}

function readJson(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } }

function main() {
  if (!fs.existsSync(IN)) {
    console.error('[gen-test-routes] Missing __ai/all-pages.json; run npm run pages:discover first.');
    process.exit(1);
  }
  const data = readJson(IN, { items: [] });
  const pool = ensureArray(data.items);
  const discovered = pool.map(x => x.route);
  const curated = curate(discovered);

  // Baseline handling with hashes
  const baseline = readJson(BASELINE, { routes: [], hashes: {} });
  const baselineRoutes = new Set(ensureArray(baseline.routes));
  const baselineHashes = baseline.hashes || {};

  const curatedSet = new Set(curated);
  const stable = Array.from(baselineRoutes).filter(r => curatedSet.has(r)).sort();
  const pending = curated.filter(r => !baselineRoutes.has(r));

  // Detect changed among curated pool relative to baseline hashes
  const hashByRoute = Object.fromEntries(pool.map(x => [x.route, x.hash]));
  const changed = curated.filter(r => baselineHashes[r] && hashByRoute[r] && baselineHashes[r] !== hashByRoute[r]);

  const out = { routes: stable, pending, changed };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`[gen-test-routes] Stable: ${stable.length}, Pending: ${pending.length}, Changed: ${changed.length} → ${OUT}`);

  // Initialize or update baseline hashes for all stable routes
  const nextHashes = { ...baselineHashes };
  for (const r of stable) {
    if (hashByRoute[r]) nextHashes[r] = hashByRoute[r];
  }
  if (!fs.existsSync(BASELINE)) {
    fs.writeFileSync(BASELINE, JSON.stringify({ routes: stable, hashes: nextHashes }, null, 2) + '\n');
    console.log(`[gen-test-routes] Initialized baseline → ${BASELINE}`);
  } else {
    fs.writeFileSync(BASELINE, JSON.stringify({ routes: stable, hashes: nextHashes }, null, 2) + '\n');
  }
}

main();
