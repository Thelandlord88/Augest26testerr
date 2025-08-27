// src/utils/_shape/coverageToMap.ts
// Accepts service coverage as either:
//  A) { [service]: string[] }           -> convert to { [suburb]: true }
//  B) { [service]: { [suburb]: true } } -> convert (truthy values only)
export type CoverageMap = Record<string, boolean>;

export function coverageToMap(rawCoverage: any, service: string): CoverageMap {
  if (!rawCoverage || !service) return {};
  const perService = rawCoverage[service];
  if (!perService) return {};

  if (Array.isArray(perService)) {
    const out: CoverageMap = {};
    for (const s of perService) out[String(s)] = true;
    return out;
  }
  if (typeof perService === 'object') {
    const out: CoverageMap = {};
    for (const [suburb, val] of Object.entries(perService)) {
      if (val) out[suburb] = true;
    }
    return out;
  }
  return {};
}
