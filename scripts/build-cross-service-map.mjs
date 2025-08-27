#!/usr/bin/env node
/**
 * Precompute cross-service items per suburb (static lookup used at runtime).
 *
 * Inputs (existing repo data):
 *  - src/data/serviceCoverage.json
 *  - src/data/adjacency.json (optional, improves nearby choice)
 *  - src/data/cluster_map.json (optional fast map)
 *  - src/content/areas.clusters.json (fallback for cluster mapping)
 *
 * Output:
 *  - src/data/crossServiceMap.json
 *      { [suburbSlug]: { [currentService]: CrossServiceItem[] } }
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const DATA = path.join(SRC, 'data');

const COVERAGE_FILE = path.join(DATA, 'serviceCoverage.json');
const ADJACENCY_FILE = path.join(DATA, 'adjacency.json');
const CLUSTER_MAP_FILE = path.join(DATA, 'cluster_map.json');
const AREAS_CLUSTERS_FILE = path.join(SRC, 'content', 'areas.clusters.json');
const OUTPUT_FILE = path.join(DATA, 'crossServiceMap.json');

// Only these appear as "cross" links (exclude bond-cleaning current service by design)
const CROSS_SERVICES = /** @type {const} */(['spring-cleaning', 'bathroom-deep-clean']);
const labelFor = (s) => s === 'spring-cleaning' ? 'Spring Cleaning' : s === 'bathroom-deep-clean' ? 'Bathroom Deep Clean' : s;
const norm = (s) => String(s || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9\-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

async function readMaybe(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; }
}

async function build() {
  const coverage = await readMaybe(COVERAGE_FILE);
  if (!coverage) {
    console.error('[crossMap] Missing serviceCoverage.json');
    process.exit(1);
  }
  const adjacency = (await readMaybe(ADJACENCY_FILE)) || {};
  let clusterMap = await readMaybe(CLUSTER_MAP_FILE);
  if (!clusterMap) {
    const areas = await readMaybe(AREAS_CLUSTERS_FILE);
    if (areas && Array.isArray(areas.clusters)) {
      clusterMap = {};
      for (const c of areas.clusters) {
        const cSlug = norm(c.slug);
        for (const raw of (c.suburbs || [])) clusterMap[norm(raw)] = cSlug;
      }
    } else {
      clusterMap = {};
    }
  }

  // All suburbs from coverage union cluster map keys
  const allSuburbs = new Set();
  for (const svc of Object.keys(coverage)) {
    for (const s of coverage[svc]) allSuburbs.add(norm(s));
  }
  for (const s of Object.keys(clusterMap)) allSuburbs.add(norm(s));
  const isCovered = (service, suburb) => (coverage[service] || []).includes(suburb);
  const clusterOf = (suburb) => clusterMap[suburb] || null;

  const neighbors = (suburb) => {
    const node = adjacency[suburb];
    if (!node) return [];
    const list = [ ...(node.adjacent_suburbs || []), ...(node.nearest_nonsiblings || []) ].map(norm);
    const c = clusterOf(suburb);
    return c ? list.filter(n => clusterOf(n) === c) : list;
  };

  const pickNearby = (service, suburb) => {
    // Prefer adjacent covered in same cluster
    for (const n of neighbors(suburb)) if (isCovered(service, n)) return n;
    // Else any covered in same cluster (sorted deterministic)
    const c = clusterOf(suburb);
    if (c) {
      const inCluster = (coverage[service] || []).filter(s => clusterOf(s) === c).sort();
      if (inCluster.length) return inCluster[0];
    }
    // Global deterministic fallback (cross-cluster) so pages in
    // uncovered clusters still surface a cross-service option marked as (nearby) instead of none.
    const all = (coverage[service] || []).slice().sort();
    return all[0] || null;
  };

  /** @type {Record<string, Record<string, any[]>>} */
  const out = {};
  const currentServices = Object.keys(coverage); // ensure future-proof
  for (const suburb of allSuburbs) {
    const perService = {};
    for (const curSvc of currentServices) {
      const items = [];
      for (const svc of CROSS_SERVICES) {
        if (svc === curSvc) continue; // don't link to self when same cross-service page
        let here = isCovered(svc, suburb);
        let target = suburb;
        if (!here) {
            const fb = pickNearby(svc, suburb);
            if (!fb) continue;
            here = false;
            target = fb;
        }
        items.push({
          label: here ? labelFor(svc) : `${labelFor(svc)} (nearby)`,
          href: `/services/${svc}/${target}/`,
          here,
          data: { service: svc, suburb: target, source: here ? 'same-suburb' : 'nearby' }
        });
      }
      perService[curSvc] = items;
    }
    out[suburb] = perService;
  }

  await fs.mkdir(DATA, { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(out, null, 2) + '\n');
  console.log(`[crossMap] Wrote ${path.relative(ROOT, OUTPUT_FILE)} with ${Object.keys(out).length} suburbs.`);
}

build().catch(err => { console.error('[crossMap] Failed:', err); process.exit(1); });
