export function absoluteUrl(p) {
  try {
    const site = import.meta.env.SITE || process.env.SITE || 'http://localhost:4322';
    if (!p) return site.replace(/\/$/, '');
    // If p looks like an absolute URL, return as-is
    try { new URL(p); return p; } catch {}
    return new URL(p, site).toString();
  } catch (e) {
    return p || '';
  }
}

export function withTrailingSlash(u) {
  if (!u) return u;
  try {
    const url = new URL(u, import.meta.env.SITE || 'http://localhost:4322');
    if (/\.[a-z0-9]+$/i.test(url.pathname)) return url.toString();
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url.toString();
  } catch {
    if (/\.[a-z0-9]+$/i.test(u) || u.endsWith('/') || u.includes('?') || u.includes('#')) return u;
    return u + '/';
  }
}

export default absoluteUrl;
