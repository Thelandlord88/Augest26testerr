// src/utils/nearbyCovered.single.ts
import rawAreas from '../content/areas.clusters.json' assert { type: 'json' };
import rawCoverage from '../data/serviceCoverage.json' assert { type: 'json' };
import { normalizeClusters, findClusterOfSuburb } from './_shape/normalizeClusters';
import { coverageToMap } from './_shape/coverageToMap';

/**
 * Single-choice nearby suburb resolution.
 * Returns the same suburb when covered. Otherwise: adjacent in cluster > any in cluster > global alphabetical.
 */
export function nearbyCoveredSingle(currentSuburb: string, service: string): { suburb: string; nearby: boolean } | null {
  const map = coverageToMap(rawCoverage as any, service);
  if (map[currentSuburb]) return { suburb: currentSuburb, nearby: false };

  const clusters = normalizeClusters(rawAreas as any);
  const located = findClusterOfSuburb(clusters, currentSuburb);

  // Adjacent within cluster
  if (located?.entry?.adjacency) {
    const adjList = located.entry.adjacency[currentSuburb] || [];
    const hit = adjList.find(s => !!map[s]);
    if (hit) return { suburb: hit, nearby: true };
  }

  // Any covered in same cluster
  if (located?.entry?.suburbs) {
    const hit = located.entry.suburbs.find(s => !!map[s]);
    if (hit) return { suburb: hit, nearby: true };
  }

  // Global deterministic
  const all = Object.keys(map).sort((a, b) => a.localeCompare(b));
  if (all.length) return { suburb: all[0], nearby: true };
  return null;
}
