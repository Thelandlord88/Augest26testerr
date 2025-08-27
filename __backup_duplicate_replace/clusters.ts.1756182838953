// Canonical/alias helpers for clusters.
// Requires each canonical cluster to carry `aliases` in areas.clusters.json.

import raw from "~/content/areas.clusters.json";

type Node =
  | { slug?: string; id?: string; key?: string; aliases?: Record<string, string> | string[] }
  | Record<string, any>;

function norm(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/%20/g, "-")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-");
}

function toArrayAliases(val: Record<string, string> | string[] | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.keys(val);
}

function entriesFromStruct(struct: any): { canonical: string; aliases: string[] }[] {
  const out: { canonical: string; aliases: string[] }[] = [];
  const nodes: Node[] = Array.isArray(struct) ? struct : (struct?.clusters ?? []);
  for (const n of nodes as Node[]) {
    if (!n) continue;
    // our JSON has `slug`, and `aliases` may be an object-map
    const slug = (n as any).slug ?? (n as any).id ?? (n as any).key;
    if (!slug) continue;
    out.push({
      canonical: norm(String(slug)),
      aliases: toArrayAliases((n as any).aliases).map((a: string) => norm(a)),
    });
  }
  return out;
}

const ENTRIES = entriesFromStruct(raw as any);

export const CANONICAL_CLUSTERS: string[] = ENTRIES.map((e) => e.canonical);

const aliasToCanonical = new Map<string, string>();
for (const { canonical, aliases } of ENTRIES) {
  for (const a of aliases) aliasToCanonical.set(a, canonical);
}

export function toCanonicalCluster(input: string): string {
  const s = norm(input);
  if (CANONICAL_CLUSTERS.includes(s)) return s;
  return aliasToCanonical.get(s) ?? s;
}

export function isAliasCluster(input: string): boolean {
  return aliasToCanonical.has(norm(input));
}
