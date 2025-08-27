// src/lib/url.ts
// Standard absolute URL builder for SSR/client-safe usage.
// Uses Astro's `site` (exposed as import.meta.env.SITE) to absolutize paths.
// Cast import.meta to any to avoid ambient env typing mismatches.
// SITE is provided by Astro at build time.
export const absoluteUrl = (p = '/', origin = (import.meta as any).env?.SITE) => {
  const base = String(origin || '').replace(/\/+$/, '');
  try { return new URL(p, base + '/').toString(); }
  catch { return String(p || '/'); }
};
