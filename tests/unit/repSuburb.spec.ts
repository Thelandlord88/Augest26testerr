import { describe, it, expect, vi } from 'vitest';

vi.mock('~/content/areas.clusters.json', () => ({ default: { clusters: [ { slug: 'ipswich', suburbs: ['Goodna','Redbank Plains','Springfield Lakes'] } ] } }));
vi.mock('~/data/adjacency.json', () => ({ default: { 'redbank-plains': { adjacent_suburbs: ['goodna','springfield-lakes'] }, 'goodna': { adjacent_suburbs: ['redbank-plains'] }, 'springfield-lakes': { adjacent_suburbs: ['redbank-plains'] } } }));

it('selects suburb with highest adjacency degree', async () => {
  const { representativeOfCluster } = await import('~/utils/repSuburb');
  await expect(representativeOfCluster('ipswich')).resolves.toBe('redbank-plains');
});
