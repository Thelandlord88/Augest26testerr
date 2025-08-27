import { describe, it, expect } from 'vitest';
import areas from '../content/areas.clusters.json';
import coverage from '../src/data/serviceCoverage.json';
import slugify from '../src/utils/slugify.js';

describe('coverage suburbs exist in whitelist', () => {
  it('every coverage slug must be present in the cluster suburb whitelist', () => {
    const allowed = new Set(
      (Array.isArray(areas?.clusters) ? areas.clusters : [])
        .flatMap(c => (c.suburbs || []).map(slugify))
    );
    for (const [svc, subs] of Object.entries(coverage)) {
      for (const s of subs) {
        expect(allowed.has(s)).toBe(true);
      }
    }
  });
});