import suburbs from '~/data/suburbs.json';
import slugify from '~/utils/slugify.js';

export function listSuburbsForCluster(cluster) {
  if (!cluster || !Array.isArray(suburbs)) return [];
  const key = String(cluster).toLowerCase();
  return suburbs.filter(s => (s.cluster || s.area || '').toLowerCase() === key).map(s => ({ name: s.name, slug: slugify(s.name) }));
}

export function findSuburbBySlug(slug) {
  if (!slug) return null;
  const s = (suburbs || []).find(x => slugify(x.name) === String(slug));
  return s || null;
}

export function getCanonicalCluster(name) {
  if (!name) return '';
  return String(name).toLowerCase();
}

// Resolve alias or slug to canonical cluster slug. Kept small to match expectations
// from TypeScript helpers that import `resolveClusterSlug` from ~/utils/geoHandler
export function resolveClusterSlug(input) {
  if (!input) return '';
  const s = String(input).toLowerCase();
  const map = {
    'ipswich-region': 'ipswich',
    'brisbane-west': 'brisbane',
    'brisbane_west': 'brisbane'
  };
  return map[s] || s;
}
