import slugify from '~/utils/slugify.js';
import { BLOG_BASE } from '~/config/siteConfig.js';

export function rel(href) {
  if (!href) return '/';
  return href.startsWith('/') ? href : `/${href}`;
}

// Attach common rel helpers for convenience (rel.privacy(), rel.terms(), etc.)
rel.privacy = () => '/privacy-policy/';
rel.terms = () => '/terms/';
rel.gallery = () => '/gallery/';
rel.quote = () => '/get-a-quote/';


export function toCanonicalCluster(cluster) {
  if (!cluster) return '';
  return slugify(String(cluster));
}

// Provide a backward-compatible `paths` helper object used across components
export const paths = {
  home: () => '/',
  service: (service) => `/services/${slugify(service)}/`,
  suburbService: (service, suburb) => `/services/${slugify(service)}/${slugify(suburb)}/`,
  blogRoot: () => `${BLOG_BASE}`,
  blogCluster: (cluster) => `${BLOG_BASE}${slugify(cluster)}/`,
  blogPost: (cluster, slug) => `${BLOG_BASE}${slugify(cluster)}/${slugify(slug)}/`,
  blogCategory: (cluster, category) => `${BLOG_BASE}${slugify(cluster)}/category/${slugify(category)}/`,
  areaCluster: (cluster) => `/areas/${toCanonicalCluster(cluster)}/`,
  privacy: () => '/privacy-policy/',
  terms: () => '/terms/',
  gallery: () => '/gallery/',
  quote: () => '/get-a-quote/',
  legal: {
    privacy: '/privacy-policy/',
    terms: '/terms/',
    gallery: '/gallery/',
    quote: '/get-a-quote/',
    sitemap: '/sitemap.xml'
  },
  sitemap: () => '/sitemap.xml'
};

export default paths;

// Backwards-compatible rel.* helpers that map to paths
rel.service = (service) => paths.service(service);
rel.suburbService = (service, suburb) => paths.suburbService(service, suburb);
rel.blogRoot = () => paths.blogRoot();
rel.blogCluster = (cluster) => paths.blogCluster(cluster);
rel.blogPost = (cluster, slug) => paths.blogPost(cluster, slug);
rel.areaCluster = (cluster) => paths.areaCluster(cluster);
rel.sitemap = () => paths.sitemap();
