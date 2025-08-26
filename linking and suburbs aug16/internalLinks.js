import areas from '~/content/areas.clusters.json';
import coverage from '~/data/serviceCoverage.json';
import slugify from '~/utils/slugify.js';
import { resolveClusterSlug } from '~/utils/geoHandler.js';
import nIpswich from '~/data/geo.neighbors.ipswich.json';
import nBrisWest from '~/data/geo.neighbors.brisbane-west.json';
import nLogan from '~/data/geo.neighbors.logan.json';

const CLUSTERS = Array.isArray(areas?.clusters) ? areas.clusters : [];

// Build maps
const SUBURB_TO_CLUSTER = new Map();
const SUBURB_DISPLAY = new Map();
for (const c of CLUSTERS) {
  const canon = resolveClusterSlug(c.slug);
  for (const name of (c.suburbs || [])) {
    const s = slugify(name);
    SUBURB_TO_CLUSTER.set(s, canon);
    SUBURB_DISPLAY.set(s, name);
  }
}

const SERVICE_LABEL = {
  'bond-cleaning': 'Bond Cleaning',
  'spring-cleaning': 'Spring Cleaning',
  'bathroom-deep-clean': 'Bathroom Deep Clean',
};

const NEIGHBORS_BY_CLUSTER = {
  ipswich: nIpswich,
  brisbane: nBrisWest, // "Brisbane West" group within BCC
  logan: nLogan,
};

function serviceLabel(svc) {
  return SERVICE_LABEL[svc] || unslugToName(svc);
}
function displayNameForSuburb(slug) {
  return SUBURB_DISPLAY.get(slug) || unslugToName(slug);
}
function dedupeByHref(list) {
  const seen = new Set();
  return list.filter(x => (seen.has(x.href) ? false : (seen.add(x.href), true)));
}

export function getRelatedServiceLinks({
  service = 'bond-cleaning',
  suburbSlug,
  count = 3,
  includeSelf = false,
  prioritiseByGrid = null,
} = {}) {
  const links = [];
  const labelBase = serviceLabel(service);
  const covered = new Set((coverage?.[service] || []).map(s => s.toLowerCase()));

  // 1) Optional self link
  if (includeSelf && suburbSlug) {
    links.push({
      label: `${labelBase} in ${displayNameForSuburb(suburbSlug)}`,
      href: `/services/${service}/${suburbSlug}/`,
    });
  }

  // 2) Neighbors in same cluster
  const clusterSlug = suburbSlug ? SUBURB_TO_CLUSTER.get(suburbSlug) : null;
  let neighbors = [];
  let cluster = null;
  if (clusterSlug) {
    cluster = CLUSTERS.find(c => resolveClusterSlug(c.slug) === clusterSlug);
    const curated = NEIGHBORS_BY_CLUSTER[clusterSlug];
    if (curated && curated[suburbSlug]) {
      neighbors = curated[suburbSlug].filter(s => covered.has(s));
    } else if (cluster) {
      neighbors = (cluster.suburbs || [])
        .map(n => slugify(n))
        .filter(s => s !== suburbSlug && covered.has(s));
    }
  }

  if (typeof prioritiseByGrid === 'function' && neighbors.length) {
    neighbors = prioritiseByGrid(neighbors);
  }

  for (const s of neighbors) {
    if (links.length >= count) break;
    links.push({
      label: `${labelBase} ${displayNameForSuburb(s)}`,
      href: `/services/${service}/${s}/`,
    });
  }

  // 3) Fallbacks
  if (links.length < count) {
    links.push({ label: `All ${labelBase}`, href: `/services/${service}/` });
  }
  if (clusterSlug && links.length < count) {
    links.push({ label: `Areas — ${unslugToName(clusterSlug)}`, href: `/areas/${clusterSlug}/` });
  }

  return dedupeByHref(links).slice(0, count);
}

// Fallback prettifier; prefer SUBURB_DISPLAY for official names
export function unslugToName(slug) {
  if (!slug) return '';
  const spaced = String(slug).replace(/-/g, ' ');
  return spaced.replace(/\b\w/g, c => c.toUpperCase());
}