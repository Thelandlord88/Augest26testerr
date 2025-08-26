#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Simple geo data audit: ensure each suburb in serviceCoverage has a cluster, and cluster has at least one service coverage.
const root = process.cwd();
const svcPath = path.join(root, 'linking and suburbs aug16', 'serviceCoverage.json');
const clusterMapPath = path.join(root, 'src', 'data', 'areas.clusters.json');

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const svc = readJson(svcPath) || {};
const clusters = readJson(clusterMapPath) || {};

const suburbSet = new Set(Object.keys(svc.suburbs || {}));
const clusterSet = new Set(Object.keys(clusters));

const missingCluster = [];
for (const suburb of suburbSet) {
  let found = false;
  for (const [cluster, subs] of Object.entries(clusters)) {
    if (Array.isArray(subs) && subs.includes(suburb)) { found = true; break; }
  }
  if (!found) missingCluster.push(suburb);
}

const clusterNoSubs = [];
for (const [cluster, subs] of Object.entries(clusters)) {
  if (!Array.isArray(subs) || subs.length === 0) clusterNoSubs.push(cluster);
}

let failures = 0;
if (missingCluster.length) {
  console.error('[geo-audit] Suburbs missing cluster assignment:', missingCluster.slice(0,50).join(', '), missingCluster.length > 50 ? `(+${missingCluster.length-50} more)` : '');
  failures++;
}
if (clusterNoSubs.length) {
  console.error('[geo-audit] Clusters with no suburbs:', clusterNoSubs.join(', '));
  failures++;
}

if (failures) {
  console.error(`[geo-audit] FAILED with ${failures} issue group(s).`);
  process.exit(1);
} else {
  console.log('[geo-audit] OK');
}
