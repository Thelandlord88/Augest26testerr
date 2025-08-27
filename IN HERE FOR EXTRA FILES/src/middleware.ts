import type { APIContext, MiddlewareNext } from 'astro';
import { resolveClusterSlug, findSuburbBySlug } from '~/utils/geoHandler';
import { BLOG_BASE, BLOG_BASE_NO_TRAIL } from '~/config/siteConfig';
import { aliasToCanonical } from '~/config/aliases';

// 301 builder that preserves query; fragments are browser-only and not relied on here
function redirect(url: URL, toPath: string, status: number = 301) {
  const base = toPath.startsWith('/') ? toPath : `/${toPath}`;
  const qs = url.searchParams.toString();
  const location = `${base}${qs ? `?${qs}` : ''}`
    .replace(/\/+$/, '/')
    .replace(/\/+/, '/');
  return new Response(null, { status, headers: { Location: location } });
}

// Service synonyms handled at root, e.g. /bond-cleaners/<suburb>/
const serviceSynonyms: Record<string, string> = {
  'bond-cleaners': 'bond-cleaning',
  'end-of-lease-cleaning': 'bond-cleaning',
  'end-of-lease-cleaners': 'bond-cleaning',
  'house-cleaning': 'spring-cleaning',
  'shower-screen-restoration': 'bathroom-deep-clean',
};

// aliasToCanonical is now sourced from '~/config/aliases'

export async function onRequest(context: APIContext, next: MiddlewareNext) {
  const url = new URL(context.request.url);
  const segs = url.pathname.split('/').filter(Boolean);

  // 1) /areas/<alias>/... → /areas/<canonical>/...
  if (segs[0] === 'areas' && segs[1]) {
    const canonical = resolveClusterSlug(segs[1]);
    if (canonical && canonical !== segs[1]) {
      const rest = segs.slice(2).join('/');
      return redirect(url, `/areas/${canonical}/${rest ? rest + '/' : ''}`);
    }
  }

  // 2) Legacy /blog → BLOG_BASE (only if base changed to e.g. /guides)
  if (segs[0] === 'blog' && BLOG_BASE_NO_TRAIL !== '/blog') {
    const rest = segs.slice(1).join('/');
    const to = `${BLOG_BASE_NO_TRAIL}/${rest}`.replace(/\/+$/, '/').replace(/\/+/, '/');
    return redirect(url, to);
  }

  // 3) Canonicalize cluster inside BLOG_BASE (works for /blog or /guides)
  const baseSeg = BLOG_BASE.replace(/^\/+|\/+$/g, ''); // 'blog' or 'guides'
  if (segs[0] === baseSeg && segs[1]) {
    const s1 = segs[1];
    const canonicalByMap = aliasToCanonical[s1];
    const canonical = canonicalByMap ?? resolveClusterSlug(s1);
    if (canonical && canonical !== s1) {
      const rest = segs.slice(2).join('/');
      return redirect(url, `/${baseSeg}/${canonical}/${rest ? rest + '/' : ''}`);
    }
  }

  // 4) Root service synonyms: /bond-cleaners/<suburb>/ → /services/bond-cleaning/<suburb>/
  if (segs.length >= 2 && serviceSynonyms[segs[0]]) {
    const service = serviceSynonyms[segs[0]];
    const suburb = segs[1];
    if (findSuburbBySlug(suburb)) {
      return redirect(url, `/services/${service}/${suburb}/`);
    }
  }

  // 5) Strip cluster from service URLs: /services/<svc>/<cluster>/<suburb>/ → /services/<svc>/<suburb>/
  if (segs[0] === 'services' && segs.length >= 4) {
    const [_, service, maybeCluster, suburb] = segs;
    if (resolveClusterSlug(maybeCluster) && findSuburbBySlug(suburb)) {
      return redirect(url, `/services/${service}/${suburb}/`);
    }
  }

  return next();
}
