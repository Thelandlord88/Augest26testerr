import type { ServiceId } from '~/utils/internalLinks';
import { isServiceCovered } from '~/utils/internalLinks';
import { loadClusterMap, normSlug } from '~/utils/clusterMap';

type Adj = Record<string, { adjacent_suburbs: string[]; nearest_nonsiblings?: string[] }>;
let ADJ_PROMISE: Promise<Adj | null> | null = null;
async function loadAdj(): Promise<Adj | null> {
  if (ADJ_PROMISE) return ADJ_PROMISE;
  ADJ_PROMISE = (async () => {
    try {
      const mod = await import('~/data/adjacency.json', { assert: { type: 'json' } });
      return (mod as any).default as Adj;
    } catch {
      return null;
    }
  })();
  return ADJ_PROMISE;
}

const uniq = <T,>(xs: T[]) => Array.from(new Set(xs));

export async function nearbyCovered(service: ServiceId, suburb: string, limit = 2): Promise<string[]> {
  const cmap = await loadClusterMap();
  const sub = normSlug(suburb);
  const cluster = cmap[sub];
  if (!cluster) return [];
  const ADJ = await loadAdj();
  const node = ADJ?.[sub] || { adjacent_suburbs: [], nearest_nonsiblings: [] };
  const candidates = uniq([...(node.adjacent_suburbs || []), ...(node.nearest_nonsiblings || [])])
    .map(normSlug)
    .filter(s => cmap[s] === cluster)
    .filter(s => isServiceCovered(service, s));
  return candidates.slice(0, Math.max(0, limit));
}
