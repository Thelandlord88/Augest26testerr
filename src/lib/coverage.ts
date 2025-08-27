/* Typed service coverage helpers */
import coverageJson from '~/data/serviceCoverage.json' with { type: 'json' };
import { listSuburbsForCluster } from '~/utils/geoHandler';

type CoverageMap = Record<string, string[]>;
const COVERAGE: CoverageMap = (() => {
  const raw = coverageJson as unknown;
  if (raw && typeof raw === 'object') {
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([svc, val]) => {
        const arr = Array.isArray(val) ? val.map(v => String(v).toLowerCase()) : [];
        return [svc.toLowerCase(), arr];
      })
    );
  }
  return {};
})();

export function coveredSuburbs(serviceId: string): string[] {
  return COVERAGE[serviceId.toLowerCase()] || [];
}
export function isCovered(serviceId: string, suburbSlug: string): boolean {
  return coveredSuburbs(serviceId).includes(suburbSlug.toLowerCase());
}
export function coveredInCluster(serviceId: string, clusterSlug: string): string[] {
  const all = new Set(coveredSuburbs(serviceId));
  return listSuburbsForCluster(clusterSlug).filter(s => all.has(s));
}

// Backwards compat: some pages import this from coverage (wrapper over geoHandler)
export function getSuburbsForCluster(clusterSlug: string): string[] {
  return listSuburbsForCluster(clusterSlug);
}
