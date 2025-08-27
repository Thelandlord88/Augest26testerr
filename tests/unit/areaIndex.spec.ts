import { describe, it, expect } from 'vitest';

import { getAllClusters, getAreaSuburbPaths } from '~/utils/areaIndex';

describe('areaIndex', () => {
  it('lists clusters and suburb paths', () => {
    const clusters = getAllClusters();
    expect(Array.isArray(clusters)).toBe(true);
    const pairs = getAreaSuburbPaths();
    expect(pairs.every(p => typeof p.cluster === 'string' && typeof p.suburb === 'string')).toBe(true);
  });
});
