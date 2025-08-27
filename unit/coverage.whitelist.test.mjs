import { describe, it, expect } from 'vitest';
import areas from '~/content/areas.clusters.json' assert { type: 'json' };
import coverage from '~/data/serviceCoverage.json' assert { type: 'json' };
import slugify from '~/utils/slugify.js';

const dumpOnFail = process.env.DUMP_WHITELIST_DIFF === '1';

// Contract: Every suburb slug in expanded serviceCoverage.json must exist in the
// canonical suburb whitelist from areas.clusters.json. This guards against
// typos or unmapped suburbs slipping into coverage.
describe('coverage suburbs exist in whitelist', () => {
  it('every coverage slug must be present in the cluster suburb whitelist', () => {
    const allowed = new Set(
      (Array.isArray(areas?.clusters) ? areas.clusters : [])
        .flatMap((c) => (c.suburbs || []).map(slugify))
    );
    const missing = new Set();
    for (const subs of Object.values(coverage)) {
      for (const s of subs) {
        if (!allowed.has(s)) missing.add(s);
      }
    }
    if (dumpOnFail && missing.size) {
      console.error('[whitelist diff] Missing slugs:', Array.from(missing).sort());
    }
    expect(missing.size).toBe(0);
  });
});
