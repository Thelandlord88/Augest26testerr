export const prerender = true;
import type { APIRoute } from 'astro';

import { paths } from '~/lib/paths';

export const GET: APIRoute = async () => {
  const urls = [
    paths.home(),
    paths.service('bond-cleaning'),
    paths.service('spring-cleaning'),
    paths.service('bathroom-deep-clean'),
    paths.blogRoot(),
    paths.legal.privacy,
    paths.legal.terms,
    paths.legal.gallery,
    paths.legal.quote,
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls.map(u => `<url><loc>${u}</loc></url>`).join('') +
    `</urlset>`;
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
