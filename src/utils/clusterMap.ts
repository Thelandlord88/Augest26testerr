// Resilient suburb→cluster loader with caching.
// - Prefers ~/data/cluster_map.json (suburb -> cluster)
// - Falls back to inverting areas.clusters.json structure
// - Uses glob/dynamic import so missing optional files never break builds.
import areas from '~/content/areas.clusters.json' assert { type: 'json' };

export type ClusterSlug = string;       // e.g. 'ipswich'
export type SuburbSlug  = string;       // e.g. 'redbank-plains'
export type ClusterMap  = Record<SuburbSlug, ClusterSlug>;

let CACHE: ClusterMap | null = null;

// Normalise to slug form (lowercase, spaces -> hyphens). Exported so allies (repSuburb, nearbyCovered etc) share identical logic.
export const normSlug = (s: unknown): string =>
  decodeURIComponent(String(s ?? ''))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

function invertAreas(): ClusterMap {
  const inv: ClusterMap = {};
  const arr = Array.isArray((areas as any)?.clusters) ? (areas as any).clusters : [];
  for (const c of arr) {
    const canon = normSlug(c.slug);
    for (const s of (c.suburbs || [])) {
      const sub = normSlug(s);
      if (sub) inv[sub] = canon;
    }
  }
  return inv;
}

function normalizeMap(raw: Record<string, string> | undefined): ClusterMap {
  const out: ClusterMap = {};
  for (const [k, v] of Object.entries(raw || {})) {
  const sub = normSlug(k);
  const clu = normSlug(v);
    if (sub && clu) out[sub] = clu;
  }
  return out;
}

async function tryLoadClusterMapJson(): Promise<ClusterMap | null> { return null; }

// Optional clusters.json (several possible shapes). We accept:
// 1. { [clusterSlug]: string[] }
// 2. { clusters: [{ slug, suburbs: [] }, ...] }
// 3. [{ slug, suburbs: [] }]
async function tryLoadClustersJson(): Promise<ClusterMap | null> {
  try {
    const raw: any = null; // no optional file present in repo
    const map: ClusterMap = {};
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      if (Array.isArray((raw as any).clusters)) {
        for (const c of (raw as any).clusters) {
          const clu = normSlug(c.slug || c.name);
            for (const s of (c.suburbs || [])) {
              const sub = normSlug(s);
              if (sub) map[sub] = clu;
            }
        }
      } else {
        for (const [cluKey, subs] of Object.entries(raw)) {
          if (Array.isArray(subs)) {
            const clu = normSlug(cluKey);
            for (const s of subs) {
              const sub = normSlug(s);
              if (sub) map[sub] = clu;
            }
          }
        }
      }
    } else if (Array.isArray(raw)) {
      for (const c of raw) {
        const clu = normSlug(c.slug || c.name);
        for (const s of (c.suburbs || [])) {
          const sub = normSlug(s);
          if (sub) map[sub] = clu;
        }
      }
    }
    return Object.keys(map).length ? map : null;
  } catch { return null; }
}

export async function loadClusterMap(): Promise<ClusterMap> {
  if (CACHE) return CACHE;
  // Priority: cluster_map.json (suburb->cluster), clusters.json (cluster->suburbs), areas.clusters.json inversion
  const fromFile = await tryLoadClusterMapJson();
  if (fromFile && Object.keys(fromFile).length) { CACHE = fromFile; return fromFile; }
  const fromClusters = await tryLoadClustersJson();
  if (fromClusters && Object.keys(fromClusters).length) { CACHE = fromClusters; return fromClusters; }
  const fallback = invertAreas();
  CACHE = fallback; return fallback;
}

export async function getClusterForSuburb(suburb: string): Promise<ClusterSlug | null> {
  const map = await loadClusterMap();
  return map[normSlug(suburb)] ?? null;
}

export async function isSameCluster(a: string, b: string): Promise<boolean> {
  const map = await loadClusterMap();
  const A = map[normSlug(a)];
  const B = map[normSlug(b)];
  return !!A && A === B;
}

export function getSuburbsForCluster(cluster: string): SuburbSlug[] {
  const arr = Array.isArray((areas as any)?.clusters) ? (areas as any).clusters : [];
  const cfg = arr.find((c: any) => normSlug(c.slug) === normSlug(cluster));
  const list = ((cfg?.suburbs || []) as any[]).map(s => normSlug(s as string)).filter(Boolean) as string[];
  return Array.from(new Set<string>(list)).sort((x, y) => x.localeCompare(y));
}

export function preloadClusterMap(): Promise<ClusterMap> {
  return loadClusterMap();
}

export function getLoadedClusterForSuburb(suburb: string): ClusterSlug | null {
  if (!CACHE) return null;
  return CACHE[normSlug(suburb)] ?? null;
}
