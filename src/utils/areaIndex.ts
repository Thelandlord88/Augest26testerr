// src/utils/areaIndex.ts
// Generates normalized, deduped [cluster, suburb] pairs for area pages.

import areas from '~/content/areas.clusters.json' assert { type: 'json' };
import slugify from '~/utils/slugify.js';

// Normalise cluster slugs (already slug-like in source) and suburb names → slugified form used in URLs.
const normCluster = (s: unknown) => slugify(decodeURIComponent(String(s ?? '').trim()));
const normSuburb = (s: unknown) => slugify(decodeURIComponent(String(s ?? '').trim()));

export type AreaPath = { cluster: string; suburb: string };

function listClusters(): string[] {
  const arr = Array.isArray((areas as any)?.clusters) ? (areas as any).clusters : [];
  return Array.from(new Set<string>(arr.map((c: any) => normCluster(c.slug)) as string[])).filter(Boolean).sort();
}

function suburbsForCluster(cluster: string): string[] {
  const arr = Array.isArray((areas as any)?.clusters) ? (areas as any).clusters : [];
  const cfg = arr.find((c: any) => normCluster(c.slug) === normCluster(cluster));
  const subs = ((cfg?.suburbs || []) as any[]).map((s: any) => normSuburb(s as string)).filter(Boolean) as string[];
  return Array.from(new Set<string>(subs)).sort();
}

export function getAllClusters(): string[] {
  return listClusters();
}

export function getAreaSuburbPaths(): AreaPath[] {
  const out: AreaPath[] = [];
  for (const c of listClusters()) {
    for (const s of suburbsForCluster(c)) out.push({ cluster: c, suburb: s });
  }
  return out;
}
