// Aggregates suburb lists per canonical cluster from serviceCoverage.json.
import { toCanonicalCluster } from "~/lib/clusters";
import { listSuburbsForCluster } from "~/utils/geoHandler.js";

function dedupe<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

export function getSuburbsForCluster(cluster: string): string[] {
  const canon = toCanonicalCluster(cluster);
  // Use geoHandler’s list (source of truth) and return slugs only
  const subs = listSuburbsForCluster(canon) || [];
  return dedupe(subs.map((s: { slug: string }) => s.slug)).sort();
}

export function getClusterSuburbPairs(): { cluster: string; suburb: string }[] {
  const clusters = ["ipswich", "brisbane", "logan"];
  const out: { cluster: string; suburb: string }[] = [];
  for (const c of clusters) {
    for (const s of getSuburbsForCluster(c)) out.push({ cluster: c, suburb: s });
  }
  return out;
}
