// Minimal schema graph builder used by MainLayout to emit a stable JSON-LD @graph
// Keeps IDs stable and small; intentionally conservative to avoid depending on
// other project internals. Expand later for Article/Image/Service nodes.

export function buildGraph({ path = '/', page = {} } = {}) {
  const origin = (import.meta.env.SITE || 'https://onendonebondclean.com.au').replace(/\/+$/,'');
  let pageUrl;
  try {
    pageUrl = new URL(path, origin).toString();
  } catch (e) {
    // Fallback: ensure we have an origin-prefixed path
    pageUrl = origin + (path.startsWith('/') ? path : '/' + path);
  }

  // Helpers for stable @id anchors
  const id = (u, anchor) => `${u.replace(/#.*$/,'')}${anchor ? `#${anchor}` : ''}`;

  const org = {
    '@type': 'Organization',
    '@id': id(origin, 'organization'),
    name: 'One N Done Bond Clean',
    url: origin
  };

  const website = {
    '@type': 'WebSite',
    '@id': id(origin, 'website'),
    url: origin,
    publisher: { '@id': id(origin, 'organization') }
  };

  const webpage = {
    '@type': 'WebPage',
    '@id': id(pageUrl, 'webpage'),
    url: pageUrl,
    isPartOf: { '@id': id(origin, 'website') }
  };

  const graph = [org, website, webpage];

  // Optional breadcrumb list: expects page.breadcrumb to be an array of
  // { name, url } or similar. Build simple ListItem entries.
  try {
    const bc = page?.breadcrumb || page?.breadcrumbs || null;
    if (Array.isArray(bc) && bc.length) {
      const items = bc.map((item, i) => {
        const name = item?.name || item?.label || String(item || '');
        const itemUrl = item?.url ? new URL(item.url, origin).toString() : `${pageUrl}`;
        return {
          '@type': 'ListItem',
          position: i + 1,
          name,
          item: { '@id': itemUrl }
        };
      });
      graph.push({
        '@type': 'BreadcrumbList',
        '@id': id(pageUrl, 'breadcrumb'),
        itemListElement: items
      });
    }
  } catch (e) {
    // Non-fatal: ignore breadcrumb building errors
  }

  return graph;
}

export default buildGraph;
