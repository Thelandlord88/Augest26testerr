// Load generated test routes from __ai/test-routes.json with safe fallbacks
import fs from 'node:fs';

export function loadTestRoutes(): string[] {
  const FALLBACK = ['/', '/services/bond-cleaning/', '/areas/', (process.env.BLOG_BASE ?? '/blog/').toString()];
  const p = '__ai/test-routes.json';
  try {
    if (!fs.existsSync(p)) return FALLBACK;
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (Array.isArray(json.routes) && json.routes.length > 0) return json.routes;
    return FALLBACK;
  } catch { return FALLBACK; }
}
