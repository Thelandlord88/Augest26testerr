// src/utils/_shape/normalizeClusters.ts
// Normalises cluster data into a consistent map: { [clusterSlug]: { suburbs: string[], adjacency?: Record<string,string[]> } }
// Accepts any of:
//  A) { clusters: { [clusterSlug]: { suburbs: string[], adjacency?: Record<string,string[]> } } }
//  B) { clusters: Array<{ slug: string; suburbs: string[]; adjacency?: Record<string,string[]> }> }
//  C) Array<{ slug: string; suburbs: string[]; adjacency?: Record<string,string[]> }>

export type ClusterEntry = { suburbs: string[]; adjacency?: Record<string, string[]> };
export type ClusterData = Record<string, ClusterEntry>;

function toSlug(v: any): string | null {
  if (!v) return null;
  const raw = typeof v.slug === 'string' ? v.slug : (typeof v.name === 'string' ? v.name : '');
  const slug = String(raw).trim();
  return slug || null;
}

export function normalizeClusters(raw: any): ClusterData {
  if (!raw) return {};

  // Shape C: Array at root
  if (Array.isArray(raw)) {
    const out: ClusterData = {};
    for (const c of raw) {
      const slug = toSlug(c);
      if (!slug) continue;
      const suburbs: string[] = Array.isArray(c?.suburbs) ? c.suburbs.map(String) : [];
      const adjacency = c?.adjacency && typeof c.adjacency === 'object' ? c.adjacency as Record<string,string[]> : undefined;
      out[slug] = { suburbs, adjacency };
    }
    return out;
  }

  // Shape B: raw.clusters is an array
  if (Array.isArray(raw.clusters)) {
    return normalizeClusters(raw.clusters);
  }

  // Shape A: raw.clusters is an object map
  if (raw.clusters && typeof raw.clusters === 'object') {
    const clustersObj = raw.clusters as Record<string, any>;
    const out: ClusterData = {};
    for (const [key, v] of Object.entries(clustersObj)) {
      // Allow map value to carry its own slug; fall back to key
      const slug = toSlug(v) || key;
      const suburbs: string[] = Array.isArray(v?.suburbs) ? v.suburbs.map(String) : [];
      const adjacency = v?.adjacency && typeof v.adjacency === 'object' ? v.adjacency as Record<string,string[]> : undefined;
      out[slug] = { suburbs, adjacency };
    }
    return out;
  }
  return {};
}

export function findClusterOfSuburb(clusters: ClusterData, suburb: string): { slug: string; entry: ClusterEntry } | null {
  for (const [slug, entry] of Object.entries(clusters)) {
    if (entry.suburbs.includes(suburb)) return { slug, entry };
  }
  return null;
}
