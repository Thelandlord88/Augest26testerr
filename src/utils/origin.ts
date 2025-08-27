export function resolveOrigin(Astro?: any) {
  const site = (import.meta as any)?.env?.SITE || Astro?.site?.toString?.();
  const env = process.env.SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL;
  return String(site || env || '').replace(/\/$/, '');
}
