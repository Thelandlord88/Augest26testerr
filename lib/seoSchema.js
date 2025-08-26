// src/lib/seoSchema.js
import { absoluteUrl } from '~/lib/url';

// --- Small utils ------------------------------------------------------------
export const slugify = (s = '') =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const titleCase = (s = '') =>
  String(s).replace(/\b[a-z]/g, (m) => m.toUpperCase());

const entityId = (path, fragment) => {
  const url = absoluteUrl(path);
  return fragment ? `${url}#${fragment}` : url;
};

const humanizeSuburb = (s = '') =>
  titleCase(String(s).replace(/-/g, ' '));

// --- Core nodes -------------------------------------------------------------
export function localBusinessNode({
  suburb,                 // human-friendly: "Redbank Plains" (or slug; we humanize)
  region = 'QLD',
  country = 'AU',
  postcode,
  name = 'One N Done Bond Clean',
  urlPath = '/',          // canonical page URL for @id base
} = {}) {
  const suburbName = humanizeSuburb(suburb);
  return {
    '@type': 'LocalBusiness',
    '@id': entityId(urlPath, 'localBusiness'),
    name: `${name} — ${suburbName}`,
    url: absoluteUrl(urlPath),
    address: {
      '@type': 'PostalAddress',
      addressLocality: suburbName,
      addressRegion: region,
      postalCode: postcode || undefined,
      addressCountry: country,
    },
    areaServed: { '@type': 'City', name: suburbName },
  };
}

export function serviceAndOfferNodes({
  service = 'bond-cleaning',
  suburb,                 // human-friendly or slug
  priceFrom,              // e.g. 299
  currency = 'AUD',
  availability = 'https://schema.org/InStock',
} = {}) {
  const slug = slugify(suburb);
  const basePath = `/services/${service}/${slug}/`;
  const serviceId = entityId(basePath, 'service');

  const serviceNode = {
    '@type': 'Service',
    '@id': serviceId,
    name: titleCase(service),
    areaServed: { '@type': 'City', name: humanizeSuburb(suburb) },
    url: absoluteUrl(basePath),
  };

  const offerNode = {
    '@type': 'Offer',
    '@id': entityId(basePath, 'offer'),
    url: absoluteUrl(basePath),
    priceCurrency: currency,
    price: typeof priceFrom === 'number' ? String(priceFrom) : undefined,
    availability,
    itemOffered: { '@id': serviceId },
  };

  return [serviceNode, offerNode];
}

export function faqPageNode({ faq = [], urlPath = '/' } = {}) {
  if (!faq.length) return null;
  return {
    '@type': 'FAQPage',
    '@id': entityId(urlPath, 'faq'),
    mainEntity: faq.map((q, i) => ({
      '@type': 'Question',
      name: q?.question || `Q${i + 1}`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q?.answer || '',
      },
    })),
  };
}

export function breadcrumbList({
  crumbs = [],           // [{ name, path }]
  urlPath = '/',
} = {}) {
  if (!crumbs.length) return null;
  return {
    '@type': 'BreadcrumbList',
    '@id': entityId(urlPath, 'breadcrumbs'),
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function collectionPageNode({
  name,
  urlPath = '/',
} = {}) {
  return {
    '@type': ['CollectionPage'],
    '@id': entityId(urlPath, 'collection'),
    name: name || undefined,
    url: absoluteUrl(urlPath),
  };
}

// --- Reviews (pure builders; page decides when to include) ------------------
export function aggregateRatingNode({
  service,
  suburb,
  reviews = [],
  minReviews = Number(process.env.MIN_REVIEWS_FOR_AGG || 5),
} = {}) {
  const valid = (reviews || []).filter(r => Number.isFinite(Number(r?.stars)));
  if (valid.length < minReviews) return null;

  const avg =
    Math.round(
      (valid.reduce((a, r) => a + Number(r.stars), 0) / valid.length) * 10
    ) / 10;

  const slug = slugify(suburb);
  const basePath = `/services/${service}/${slug}/`;

  return {
    '@type': 'AggregateRating',
    '@id': entityId(basePath, 'aggregateRating'),
    ratingValue: String(avg),
    reviewCount: String(valid.length),
  };
}

export function reviewNodes({
  service,
  suburb,
  reviews = [],
  limit = 5,
} = {}) {
  const slug = slugify(suburb);
  const basePath = `/services/${service}/${slug}/`;
  return (reviews || []).slice(0, limit).map((r, i) => ({
    '@type': 'Review',
    '@id': entityId(basePath, `review-${i + 1}`),
    datePublished: r?.date || undefined,
    author: r?.author ? { '@type': 'Person', name: r.author } : undefined,
    name: r?.title || undefined,
    reviewBody: r?.body || undefined,
    reviewRating: Number.isFinite(Number(r?.stars))
      ? { '@type': 'Rating', ratingValue: Number(r.stars) }
      : undefined,
  }));
}

// --- One-call graph for /services/:service/:suburb --------------------------
export function suburbServiceGraph({
  service = 'bond-cleaning',
  suburb,                  // human-friendly or slug
  faq = [],
  priceFrom,               // optional
  crumbs = [
    { name: 'Home', path: '/' },
    { name: titleCase(service), path: `/services/${service}/` },
    { name: humanizeSuburb(suburb), path: `/services/${service}/${slugify(suburb)}/` },
  ],
} = {}) {
  const slug = slugify(suburb);
  const basePath = `/services/${service}/${slug}/`;

  const nodes = [
    localBusinessNode({ suburb, urlPath: basePath }),
    ...serviceAndOfferNodes({ service, suburb, priceFrom }),
    breadcrumbList({ crumbs, urlPath: basePath }),
  ];

  const faqNode = faqPageNode({ faq, urlPath: basePath });
  if (faqNode) nodes.push(faqNode);

  return nodes;
}
