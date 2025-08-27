const SITE = (import.meta && import.meta.env && import.meta.env.SITE) ? String(import.meta.env.SITE).replace(/\/$/, '') : '';
const BASE = SITE || 'https://onendonebondclean.com.au';
import { getAggregate, getReviews } from "../server/reviews.js";
const id = {
  org: `${BASE}/#org`,
  site: `${BASE}/#website`,
  web: (path) => `${BASE}${path}#webpage`,
  service: `${BASE}/#service-bond-cleaning`,
  area: (slug) => `${BASE}/#area-${slug}`,
  place: (slug) => `${BASE}/#place-${slug}`,
  article: (slug) => `${BASE}/#article-${slug}`,
  breadcrumb: (path) => `${BASE}${path}#breadcrumb`,
  image: (slug) => `${BASE}/#image-${slug}`,
};

function abs(u) {
  if (!u) return undefined;
  if (u.startsWith('http')) return u;
  return `${BASE}${u.startsWith('/') ? '' : '/'}${u}`;
}

function toImageObject(image, slugHint = 'article') {
  if (!image) return undefined;
  if (typeof image === 'string') {
    return { '@type': 'ImageObject', '@id': id.image(slugHint), url: abs(image), width: undefined, height: undefined };
  }
  if (typeof image === 'object' && image.src) {
    return {
      '@type': 'ImageObject',
      '@id': id.image(slugHint),
      url: abs(image.src),
      width: image.width,
      height: image.height,
    };
  }
  return undefined;
}

/**
 * Build a single JSON-LD @graph for the page.
 * @param {{ path?: string, page?: { breadcrumb?: object }, article?: { slug:string,title:string,description?:string,date?:string }, area?: { slug:string,name:string }, place?: { slug:string,name:string,address?:any }, reviews?: Array<{ title?:string, body?:string, rating?:number, author?:string }> }} p
 */
export function buildGraph({ path = '/', page = {}, article, area, place, reviews = [] } = {}) {
  const g = [];

  g.push({
    '@type': ['Organization', 'LocalBusiness', 'CleaningService'],
    '@id': id.org,
    name: 'One N Done Bond Clean',
    url: BASE,
    areaServed: area ? { '@id': id.area(area.slug) } : undefined,
  });

  g.push({ '@type': 'WebSite', '@id': id.site, url: BASE, publisher: { '@id': id.org } });

  g.push({
    '@type': 'Service',
    '@id': id.service,
    serviceType: 'Bond cleaning',
    provider: { '@id': id.org },
    areaServed: area ? { '@id': id.area(area.slug) } : undefined,
  });

  if (area) g.push({ '@type': 'AdministrativeArea', '@id': id.area(area.slug), name: area.name });
  if (place) g.push({ '@type': 'Place', '@id': id.place(place.slug), name: place.name, address: place.address });

  let imageObj;
  if (article) {
    imageObj = toImageObject(article.image, article.slug);
    g.push({
      '@type': 'Article',
      '@id': id.article(article.slug),
      headline: article.title,
      description: article.description || undefined,
      datePublished: article.date || undefined,
      image: imageObj ? [imageObj] : undefined,
      about: [{ '@id': id.service }],
      mentions: [area && { '@id': id.area(area.slug) }, place && { '@id': id.place(place.slug) }].filter(Boolean),
      author: { '@id': id.org },
      publisher: { '@id': id.org },
      mainEntityOfPage: { '@id': id.web(path) },
    });
  }

  if (page.breadcrumb) g.push({ '@type': 'BreadcrumbList', '@id': id.breadcrumb(path), ...page.breadcrumb });

  reviews.slice(0, 3).forEach((r, i) =>
    g.push({
      '@type': 'Review',
      name: r.title || `Customer review ${i + 1}`,
      reviewBody: r.body,
      reviewRating: r.rating ? { '@type': 'Rating', ratingValue: String(r.rating), bestRating: '5' } : undefined,
      author: r.author ? { '@type': 'Person', name: r.author } : undefined,
      itemReviewed: { '@id': id.service },
    }),
  );

  g.push({
    '@type': 'WebPage',
    '@id': id.web(path),
    url: `${BASE}${path}`,
    isPartOf: { '@id': id.site },
    about: [{ '@id': id.service }],
    breadcrumb: page.breadcrumb ? { '@id': id.breadcrumb(path) } : undefined,
    primaryImageOfPage: imageObj ? { '@id': id.image((article && article.slug) || 'page') } : undefined,
  });

  // Minimal Offer on the bond-cleaning service hub page to satisfy strict LD requirements
  if (path === '/services/bond-cleaning/' || path === '/services/bond-cleaning') {
    g.push({
      '@type': 'Offer',
      name: 'Bond Cleaning Offer',
      url: `${BASE}/services/bond-cleaning/`,
      itemOffered: { '@id': id.service },
    });
  }

  // Attach AggregateRating + limited Review nodes for service suburb pages
  const svcMatch = path.match(/^\/services\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/i);
  if (svcMatch) {
    const serviceSlug = svcMatch[1];
    const suburbSlug = svcMatch[2];
    try {
      const agg = getAggregate({ service: serviceSlug, suburb: suburbSlug });
      if (agg) {
        // Add AggregateRating to Service
        const svcNode = g.find((n) => n['@type'] === 'Service' && n['@id'] === id.service);
        if (svcNode) {
          svcNode.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: String(agg.ratingValue),
            reviewCount: String(agg.reviewCount),
          };
        }
        // Add up to 5 Review nodes targeting the Service
        const vis = getReviews({ service: serviceSlug, suburb: suburbSlug, limit: 5 });
        for (const r of vis) {
          g.push({
            '@type': 'Review',
            name: r.title || undefined,
            reviewBody: r.body || undefined,
            reviewRating: Number.isFinite(r.stars) ? { '@type': 'Rating', ratingValue: String(r.stars), bestRating: '5' } : undefined,
            author: r.author ? { '@type': 'Person', name: r.author } : undefined,
            itemReviewed: { '@id': id.service },
          });
        }
      }
    } catch {}
  }

  return { '@context': 'https://schema.org', '@graph': g };
}

export const schemaIds = id;
