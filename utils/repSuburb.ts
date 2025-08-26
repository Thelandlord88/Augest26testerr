import areas from '~/content/areas.clusters.json' assert { type: 'json' };
import { normSlug } from '~/utils/clusterMap';

// Lazy adjacency loader (so tests can vi.mock before first await)
type Adj = Record<string, { adjacent_suburbs: string[]; nearest_nonsiblings?: string[] }>;
let ADJ_PROMISE: Promise<Adj | null> | null = null;
async function loadAdj(): Promise<Adj | null> {
  if (ADJ_PROMISE) return ADJ_PROMISE;
  ADJ_PROMISE = (async () => {
    try {
      const mod = await import('~/data/adjacency.json', { assert: { type: 'json' } });
      return (mod as any).default as Adj;
    } catch {
      return null; // optional
    }
  })();
  return ADJ_PROMISE;
}

export async function representativeOfCluster(cluster: string): Promise<string | null> {
  const clusters = Array.isArray((areas as any)?.clusters) ? (areas as any).clusters : [];
  const canon = normSlug(cluster);
  const entry = clusters.find((c: any) => normSlug(c.slug) === canon || normSlug(c.name) === canon);
  const suburbs: string[] = (entry?.suburbs || []).map((s: string) => normSlug(s));
  if (!suburbs.length) return null;
  const ADJ = await loadAdj();
  const scored = suburbs
    .map(s => [s, ADJ?.[s]?.adjacent_suburbs?.length || 0] as const)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return scored[0][0];
}
