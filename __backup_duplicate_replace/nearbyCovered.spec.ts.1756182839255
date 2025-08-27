import { it, expect, vi } from 'vitest';

vi.mock('~/utils/internalLinks', () => ({ isServiceCovered: (svc: string, s: string) => svc === 'bathroom-deep-clean' ? s === 'goodna' : true }));
vi.mock('~/data/adjacency.json', () => ({ default: { 'redbank-plains': { adjacent_suburbs: ['Goodna'] } } }));
vi.mock('~/content/areas.clusters.json', () => ({ default: { clusters: [ { slug: 'ipswich', suburbs: ['Goodna','Redbank Plains'] } ] } }));
vi.mock('~/data/cluster_map.json', () => ({ default: { 'goodna': 'ipswich', 'redbank-plains': 'ipswich' } }));

it('returns nearby covered suburb in same cluster', async () => {
  const { nearbyCovered } = await import('~/utils/nearbyCovered');
  const res = await nearbyCovered('bathroom-deep-clean' as any, 'redbank-plains', 1);
  expect(res).toEqual(['goodna']);
});
