/* Global ambients for JSON and common project virtuals — remove scattered @ts-ignore usage. */

declare module '*.json' {
  const value: unknown;
  export default value;
}

declare module '~/content/areas.clusters.json' {
  export interface ClusterEntry { slug?: string; suburbs?: string[]; adjacency?: Record<string, string[]> }
  const clusters: { clusters?: ClusterEntry[] } | ClusterEntry[] | any;
  export default clusters;
}

declare module '~/data/serviceCoverage.json' {
  const coverage: Record<string, string[] | Record<string, boolean>>;
  export default coverage;
}

declare module '~/data/crossServiceMap.json' {
  export interface CrossServiceItem { label: string; href: string; here: boolean; data?: Record<string, unknown> }
  const map: Record<string, Record<string, CrossServiceItem[]>>;
  export default map;
}

// Vite / Astro env
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly BLOG_BASE?: string;
  readonly USE_EDGE?: string;
  readonly MIN_REVIEWS_FOR_AGG?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
