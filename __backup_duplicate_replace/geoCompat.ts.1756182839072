// Compatibility wrappers to help migrate old sync callsites.
// Prefer using the native async utilities (representativeOfCluster, getSuburbsForCluster, chooseSuburbForPost)
// everywhere new. Where refactors would be invasive, call primeGeoCompat() once (e.g. app entry or test
// setup) then use the *Sync variants below.

import { loadClusterMap, getSuburbsForCluster, normSlug } from '~/utils/clusterMap';
import { representativeOfCluster as representativeOfClusterAsync } from '~/utils/repSuburb';

let _primed = false;
let _suburbToCluster: Record<string, string> = Object.create(null);
let _clusterToSuburbs: Record<string, string[]> = Object.create(null);
let _repCache: Map<string, string | null> = new Map();

/** Prime caches so the *Sync helpers can be used safely later. Call once at startup or in test setup. */
export async function primeGeoCompat(): Promise<void> {
  if (_primed) return;
  _suburbToCluster = await loadClusterMap();
  const c2s: Record<string, string[]> = Object.create(null);
  for (const [sub, clusterRaw] of Object.entries(_suburbToCluster)) {
    const cluster = normSlug(clusterRaw);
    (c2s[cluster] ||= []).push(sub);
  }
  for (const k of Object.keys(c2s)) c2s[k].sort();
  _clusterToSuburbs = c2s;
  _repCache = new Map();
  _primed = true;
}

// Async preferred
export async function representativeOfCluster(cluster: string): Promise<string | null> {
  return representativeOfClusterAsync(cluster);
}

// Sync fallback: only valid after priming; picks cached representative (first suburb alphabetically)
export function representativeOfClusterSync(cluster: string): string | null {
  if (!_primed) return null;
  const c = normSlug(cluster);
  if (_repCache.has(c)) return _repCache.get(c)!;
  const subs = _clusterToSuburbs[c] || [];
  const pick = subs.length ? subs[0] : null;
  _repCache.set(c, pick);
  return pick;
}

// Async preferred
export async function getSuburbsForClusterAsync(cluster: string): Promise<string[]> {
  return getSuburbsForCluster(cluster);
}

// Sync fallback: only valid after priming
export function getSuburbsForClusterSync(cluster: string): string[] {
  if (!_primed) return [];
  return _clusterToSuburbs[normSlug(cluster)] || [];
}

export function isGeoCompatPrimed(): boolean { return _primed; }
