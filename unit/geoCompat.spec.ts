import { describe, it, expect, vi } from 'vitest';

vi.mock('~/data/cluster_map.json', () => ({
  default: { 'goodna': 'ipswich', 'redbank-plains': 'ipswich' }
}));

vi.mock('~/data/adjacency.json', () => ({
  default: {
    'goodna': { adjacent_suburbs: ['redbank-plains'] },
    'redbank-plains': { adjacent_suburbs: ['goodna'] },
  }
}));

vi.mock('~/data/clusters.json', () => ({
  default: { ipswich: ['goodna', 'redbank-plains'] }
}));

describe('geoCompat', () => {
  it('priming enables sync wrappers', async () => {
    vi.resetModules();
  const compat = await import('~/utils/geoCompat');
    await compat.primeGeoCompat();
  const subs = compat.getSuburbsForClusterSync('ipswich');
  expect(subs).toContain('goodna');
  expect(subs).toContain('redbank-plains');
  expect(compat.representativeOfClusterSync('ipswich')).toBeTruthy();
  });
});
