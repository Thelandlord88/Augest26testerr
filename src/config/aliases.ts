// Canonical clusters used across the site.
// If you ever add a new region, add it here *first*.
export const canonicalClusters = ['ipswich', 'brisbane', 'logan'] as const;
export type CanonicalCluster = (typeof canonicalClusters)[number];

// All alias → canonical mappings live here.
// Edit deliberately; unit tests will enforce invariants.
export const aliasToCanonical: Record<string, CanonicalCluster> = {
  'ipswich-region': 'ipswich',
  'brisbane-west': 'brisbane',
  'brisbane_west': 'brisbane',
};

// Convenience guard: quick check at runtime (dev) if needed.
export function isCanonicalCluster(s: string): s is CanonicalCluster {
  return (canonicalClusters as readonly string[]).includes(s);
}
