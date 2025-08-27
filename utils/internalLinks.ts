/* Cross-service & local-guides link helpers (TypeScript)
 * - Normalizes slugs (decode + lowercase)
 * - Caches coverage/known sets (union of multiple sources)
 * - Prefers cluster_map.json (O(1)) with areas.clusters.json fallback
 * - Prefers adjacency.json for neighbors; curated tables as safety net
 * - BLOG_BASE-aware local blog link by cluster
 * - Stable, duplicate-free lists; includeSelf = “others stay at count”
 */

import { BLOG_BASE } from '~/config/siteConfig';
import areas from '~/content/areas.clusters.json' assert { type: 'json' };
import coverage from '~/data/serviceCoverage.json' assert { type: 'json' };
import staticSuburbs from '~/data/suburbs.json' assert { type: 'json' };
import slugify from '~/utils/slugify';
import { resolveClusterSlug } from '~/utils/geoHandler';
import nIpswich from '~/data/geo.neighbors.ipswich.json' assert { type: 'json' };
import nBrisbane from '~/data/geo.neighbors.brisbane.json' assert { type: 'json' };
import nLogan from '~/data/geo.neighbors.logan.json' assert { type: 'json' };

export type ServiceId =
  | 'bond-cleaning'
  | 'spring-cleaning'
  | 'bathroom-deep-clean'
  | (string & {});

export interface RelatedLink {
  label: string;
  href: string;
  ariaLabel?: string;
}

const baseSeg = (BLOG_BASE || '/blog/').replace(/^\/+|\/+$/g, '') || 'blog';

// Optional: suburb → cluster map (fast path)
let CLUSTER_MAP: Record<string, string> | null = null;
try {
  const p = '~/data/' + 'cluster_map.json';
  // @ts-ignore - optional module, resolved at runtime or via test mocks
  const mod: any = await import(/* @vite-ignore */ p);
  CLUSTER_MAP = (mod && (mod.default || mod)) as Record<string, string>;
} catch {
  CLUSTER_MAP = null;
}

// Optional: adjacency map (preferred neighbors)
type Adjacency = Record<string, { adjacent_suburbs: string[]; nearest_nonsiblings?: string[]; derived?: string[] }>;
let ADJ: Adjacency | null = null;
try {
  const p = '~/data/' + 'adjacency.json';
  // @ts-ignore - optional module, resolved at runtime or via test mocks
  const mod: any = await import(/* @vite-ignore */ p);
  ADJ = (mod && (mod.default || mod)) as Adjacency;
} catch {
  ADJ = null;
}

// ---------------- Utilities ----------------

const norm = (s: unknown): string => {
  const raw = String(s ?? '').trim();
  try {
    return decodeURIComponent(raw).toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
};

export function unslugToName(slug: string): string {
  const sub = norm(slug);
  return sub
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

function serviceLabel(svc: ServiceId) {
  switch (svc) {
    case 'bond-cleaning':
      return 'Bond Cleaning';
    case 'spring-cleaning':
      return 'Spring Cleaning';
    case 'bathroom-deep-clean':
      return 'Bathroom Deep Clean';
    default:
      return unslugToName(String(svc));
  }
}

function uniqStable<T>(arr: readonly T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const x of arr) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

// ---------------- Cached data ----------------

// Cluster → suburb[] (lowercased)
const CLUSTER_TO_SUBURBS: Record<string, string[]> = (() => {
  const clusters = Array.isArray((areas as any)?.clusters)
    ? (areas as any).clusters
    : [];
  const out: Record<string, string[]> = {};
  for (const c of clusters) {
    const canonical = resolveClusterSlug(c.slug);
    out[canonical] = (c.suburbs || []).map((n: string) => slugify(n));
  }
  return out;
})();

// Known suburbs = union of suburbs.json + areas.clusters + cluster_map.json
const KNOWN_SUBURBS: Set<string> = (() => {
  const set = new Set<string>();
  for (const s of ((staticSuburbs as any) || [])) {
    const slug = s && s.slug ? String(s.slug).toLowerCase() : '';
    if (slug) set.add(slug);
  }
  for (const list of Object.values(CLUSTER_TO_SUBURBS)) {
    for (const s of list) set.add(s);
  }
  if (CLUSTER_MAP) {
    for (const s of Object.keys(CLUSTER_MAP)) set.add(s.toLowerCase());
  }
  return set;
})();

// Allowed suburbs per service (lowercased)
const ALLOWED_BY_SVC: Record<string, Set<string>> = (() => {
  const out: Record<string, Set<string>> = {};
  const cov = (coverage || {}) as Record<string, string[]>;
  for (const [svc, list] of Object.entries(cov)) {
    out[svc.toLowerCase()] = new Set((list || []).map((s) => String(s).toLowerCase()));
  }
  return out;
})();

// Curated neighbor tables by canonical cluster (readonly)
const NEIGHBORS = {
  ipswich: (nIpswich as any) || {},
  brisbane: (nBrisbane as any) || {},
  logan: (nLogan as any) || {},
} as const satisfies Record<string, Record<string, readonly string[]>>;

// ---------------- Public API ----------------

/** Fast: suburb→cluster via CLUSTER_MAP; fallback: scan CLUSTER_TO_SUBURBS */
export function findClusterSlugForSuburb(suburbSlug: string): string | null {
  const sub = norm(suburbSlug);
  if (!sub) return null;

  if (CLUSTER_MAP && CLUSTER_MAP[sub]) return resolveClusterSlug(CLUSTER_MAP[sub]);

  for (const [cluster, suburbs] of Object.entries(CLUSTER_TO_SUBURBS)) {
    if (suburbs.includes(sub)) return cluster;
  }
  return null;
}

/** True if service is offered and page exists for suburb */
export function isServiceCovered(service: ServiceId, suburbSlug: string): boolean {
  const sub = norm(suburbSlug);
  const svc = String(service || '').toLowerCase();
  if (!KNOWN_SUBURBS.has(sub)) return false;
  const allowed = ALLOWED_BY_SVC[svc];
  return allowed ? allowed.has(sub) : true; // if service not listed, treat as open
}

/** BLOG_BASE-aware local blog/guides cluster URL */
export function getLocalBlogLink(suburbSlug: string): string {
  const cluster = findClusterSlugForSuburb(suburbSlug);
  return cluster ? `/${baseSeg}/${cluster}/` : `/${baseSeg}/`;
}

/** Related links for same service anchored to a suburb (includeSelf = self + N others) */
export function getRelatedServiceLinks(opts: {
  service?: ServiceId;
  suburbSlug: string;
  includeSelf?: boolean; // default true
  count?: number; // number of OTHER links besides self (default 4)
  prioritiseByGrid?: null | ((subs: string[]) => string[]);
}): RelatedLink[] {
  const service = String(opts.service || 'bond-cleaning').toLowerCase() as ServiceId;
  const suburb = norm(opts.suburbSlug);
  const includeSelf = opts.includeSelf !== false; // default true
  const count = typeof opts.count === 'number' ? Math.max(0, opts.count) : 4;
  const prioritiseByGrid = opts.prioritiseByGrid ?? null;

  const cluster = findClusterSlugForSuburb(suburb);
  const allowed = ALLOWED_BY_SVC[service];
  const curated = cluster ? (NEIGHBORS as any)[cluster] || {} : {};

  // Pool preference: adjacency → curated neighbor table → cluster list
  let pool: string[] = [];
  if (ADJ?.[suburb]?.adjacent_suburbs?.length) {
    pool = ADJ[suburb].adjacent_suburbs.map(norm);
  } else if (cluster) {
    if (curated[suburb]?.length) {
      pool = (curated[suburb] as string[]).map((s) => norm(s));
    } else {
      pool = (CLUSTER_TO_SUBURBS[cluster] || []).filter((s) => s !== suburb);
    }
  }

  // If tiny, augment from any curated tables across clusters
  if (pool.length < 3) {
    const extras: string[] = [];
    const tables = Object.values(NEIGHBORS) as Array<Record<string, readonly string[]>>;
    for (const table of tables) {
      const list = table[suburb];
      if (Array.isArray(list)) {
        for (const s of list) {
          const n = norm(s);
          if (n && n !== suburb) extras.push(n);
        }
      }
    }
    pool = uniqStable([...pool, ...extras]);
  }

  // Filter to built pages & coverage, stable-dedupe, optional reprioritisation
  let candidates = uniqStable(
    pool.filter((s) => KNOWN_SUBURBS.has(s) && (!allowed || allowed.has(s)))
  );
  if (typeof prioritiseByGrid === 'function' && candidates.length) {
    candidates = uniqStable(prioritiseByGrid(candidates));
  }

  // Build links
  const links: RelatedLink[] = [];
  let cap = count;

  if (includeSelf && isServiceCovered(service, suburb)) {
    links.push({
      label: serviceLabel(service),
      href: `/services/${service}/${suburb}/`,
      ariaLabel: `${serviceLabel(service)} in ${unslugToName(suburb)}`
    });
    cap += 1; // keep “count” as “others”
  }

  for (const s of candidates) {
    if (links.length >= cap) break;
    links.push({ label: unslugToName(s), href: `/services/${service}/${s}/` });
  }

  return links.slice(0, cap);
}

/** Cross-service links required by spec (same suburb) + local guides */
export function getSuburbCrossLinks(suburbSlug: string): RelatedLink[] {
  const sub = norm(suburbSlug);
  const out: RelatedLink[] = [];

  if (isServiceCovered('spring-cleaning', sub)) {
    out.push({
      label: 'Spring Cleaning',
      href: `/services/spring-cleaning/${sub}/`,
      ariaLabel: `Spring Cleaning in ${unslugToName(sub)}`
    });
  }
  if (isServiceCovered('bathroom-deep-clean', sub)) {
    out.push({
      label: 'Bathroom Deep Clean',
      href: `/services/bathroom-deep-clean/${sub}/`,
      ariaLabel: `Bathroom Deep Clean in ${unslugToName(sub)}`
    });
  }

  out.push({ label: 'Local guides', href: getLocalBlogLink(sub) });
  return out;
}
