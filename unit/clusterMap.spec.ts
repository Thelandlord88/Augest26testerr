import { describe, it, expect } from 'vitest';

import { loadClusterMap, getClusterForSuburb, isSameCluster } from '~/utils/clusterMap';

describe('clusterMap', () => {
  it('loads a map and resolves clusters', async () => {
    const map = await loadClusterMap();
    // pick a couple known suburbs if present
    const sample = ['goodna','indooroopilly','springwood'].filter(s => s in map);
    for (const s of sample) {
      const c = await getClusterForSuburb(s);
      expect(c).toBeTruthy();
      expect(typeof c).toBe('string');
    }
    if (sample.length >= 2) {
      expect(typeof (await isSameCluster(sample[0], sample[1]))).toBe('boolean');
    }
  });
});
