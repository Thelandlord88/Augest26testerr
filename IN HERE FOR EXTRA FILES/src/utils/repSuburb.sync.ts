// src/utils/repSuburb.sync.ts
import rawAreas from '../content/areas.clusters.json' assert { type: 'json' };
import rawCoverage from '../data/serviceCoverage.json' assert { type: 'json' };
import { normalizeClusters } from './_shape/normalizeClusters';
import { coverageToMap } from './_shape/coverageToMap';

/** Pick a representative suburb for a cluster: adjacency degree > service coverage > alphabetical. */
export function repSuburbSync(clusterSlug: string, service?: string): string | null {
  const clusters = normalizeClusters(rawAreas as any);
  const cluster = clusters[clusterSlug];
  if (!cluster) return null;

  // (1) Highest adjacency degree
  const degrees = Object.entries(cluster.adjacency ?? {}).map(([s, adj]) => [s, Array.isArray(adj) ? adj.length : 0] as const);
  degrees.sort((a, b) => b[1] - a[1]);
  const byAdjacency = degrees.length ? degrees[0][0] : null;

  // (2) First suburb with coverage for the given service
  if (service) {
    const map = coverageToMap(rawCoverage as any, service);
    const hit = cluster.suburbs.find(s => !!map[s]);
    if (hit) return hit;
  }

  // (3) Fallback: adjacency pick else alphabetical
  if (byAdjacency) return byAdjacency;
  const sorted = [...cluster.suburbs].sort((a, b) => a.localeCompare(b));
  return sorted[0] ?? null;
}
