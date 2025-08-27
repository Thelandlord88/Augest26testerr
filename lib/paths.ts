import { absoluteUrl } from "~/lib/url";
import { BLOG_BASE } from "~/config/siteConfig";
import { toCanonicalCluster } from "~/lib/clusters";

// Ensure trailing slash for site paths (not for files like .xml)
export const withSlash = (p = "/"): string => (/\.([a-z0-9]+)$/i.test(p) ? p : p.replace(/\/?$/, "/"));
const squash = (s: string) => s.replace(/\/{2,}/g, "/");

const join = (...parts: string[]) =>
  squash(
    withSlash(
      "/" + parts.map((p) => String(p).replace(/(^\/+|\/+$)/g, "")).join("/")
    )
  );

// Relative path builders (for hrefs or canonical path segments)
export const rel = {
  home: (): string => "/",
  blogRoot: (): string => join(BLOG_BASE || '/blog/'),
  blogCluster: (cluster: string): string => join(BLOG_BASE || '/blog/', toCanonicalCluster(cluster)),
  blogCategory: (cluster: string, cat: string): string => join(BLOG_BASE || '/blog/', toCanonicalCluster(cluster), 'category', cat),
  blogPost: (cluster: string, slug: string): string => join(BLOG_BASE || '/blog/', toCanonicalCluster(cluster), slug),
  serviceRoot: (): string => "/services/",
  service: (slug: string): string => withSlash(`/services/${slug}`),
  suburbService: (service: string, suburb: string): string => withSlash(`/services/${service}/${suburb}`),
  areasRoot: (): string => "/areas/",
  areaCluster: (cluster: string): string => withSlash(`/areas/${toCanonicalCluster(cluster)}`),
  areaSuburb: (cluster: string, suburb: string): string => withSlash(`/areas/${toCanonicalCluster(cluster)}/${suburb}`),
  privacy: (): string => withSlash("/privacy"),
  terms: (): string => withSlash("/terms"),
  gallery: (): string => withSlash("/gallery"),
  quote: (): string => withSlash("/quote"),
  sitemap: (): string => "/sitemap.xml",
};

// Central URL builders (absolute, using SITE)
export const paths = {
  home: (): string => absoluteUrl(rel.home()),
  blogRoot: (): string => absoluteUrl(rel.blogRoot()),

  service: (slug: string): string => absoluteUrl(rel.service(slug)),

  suburbService: (service: string, suburb: string): string => absoluteUrl(rel.suburbService(service, suburb)),

  blogCluster: (cluster: string): string => absoluteUrl(rel.blogCluster(cluster)),

  blogCategory: (cluster: string, cat: string): string => absoluteUrl(rel.blogCategory(cluster, cat)),

  blogPost: (cluster: string, slug: string): string => absoluteUrl(rel.blogPost(cluster, slug)),

  areaCluster: (cluster: string): string => absoluteUrl(rel.areaCluster(cluster)),

  areaSuburb: (cluster: string, suburb: string): string => absoluteUrl(rel.areaSuburb(cluster, suburb)),

  legal: {
    privacy: absoluteUrl(rel.privacy()),
    terms: absoluteUrl(rel.terms()),
    gallery: absoluteUrl(rel.gallery()),
    quote: absoluteUrl(rel.quote()),
    sitemap: absoluteUrl(rel.sitemap()),
  },
};
