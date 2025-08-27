export const prerender = false;
import type { APIRoute } from 'astro';
import slugify from '~/utils/slugify.js';
import { findSuburbBySlug } from '~/utils/geoHandler';

export const GET: APIRoute = ({ params, redirect }) => {
  const canon = slugify(params.suburb ?? '');
  const match = findSuburbBySlug(canon);
  if (!match) return new Response('Unknown suburb', { status: 404 });
  return redirect(`/services/bathroom-deep-clean/${match.slug}`, 301);
};
