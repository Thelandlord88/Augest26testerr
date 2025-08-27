/* Canonical geo helpers
 * - resolveClusterSlug: alias → canonical cluster
 * - listSuburbsForCluster: cluster → suburb slug list
 * - findSuburbBySlug: suburb slug → { slug, cluster }
 * Prefers fast suburb->cluster map when available.
 */
import areas from '~/content/areas.clusters.json' with { type: 'json' };
let CLUSTER_MAP: Record<string, string> | null = null;

const norm = (s: unknown) => decodeURIComponent(String(s ?? '').trim()).toLowerCase();

const ALIAS_TO_CANONICAL: Record<string, string> = {
	'ipswich-region': 'ipswich',
	'brisbane-west': 'brisbane',
	'brisbane_west': 'brisbane'
};

export function resolveClusterSlug(input: string): string {
	const s = norm(input);
	return ALIAS_TO_CANONICAL[s] || s;
}

function loadClusterMap(): Record<string, string> {
	if (CLUSTER_MAP) return CLUSTER_MAP;
		const inv: Record<string, string> = {};
		const arr = Array.isArray((areas as any)?.clusters) ? (areas as any).clusters : [];
		for (const c of arr) {
			for (const s of (c.suburbs || [])) inv[norm(s)] = resolveClusterSlug(c.slug);
		}
	CLUSTER_MAP = inv; return CLUSTER_MAP;
}

export function listSuburbsForCluster(clusterSlug: string): string[] {
	const c = resolveClusterSlug(clusterSlug);
		const arr = Array.isArray((areas as any)?.clusters) ? (areas as any).clusters : [];
		const cfg = arr.find((cc: any) => cc.slug === c);
		const raw = cfg?.suburbs || [];
		return raw.map((s: string) => norm(s));
}

export function findSuburbBySlug(suburbSlug: string): { slug: string; cluster: string } | null {
	const sub = norm(suburbSlug);
	const cmap = loadClusterMap();
	const cluster = cmap[sub];
	return cluster ? { slug: sub, cluster } : null;
}
