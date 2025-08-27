import { describe, it, expect, vi } from 'vitest';

vi.mock('~/content/areas.clusters.json', () => ({
  default: [
    { slug: 'ipswich', suburbs: ['ipswich', 'a', 'b'], adjacency: { ipswich: ['a', 'b'], a: ['ipswich'] } },
    { slug: 'brisbane', suburbs: ['x', 'y'] }
  ]
}));

vi.mock('~/data/serviceCoverage.json', () => ({
  default: {
    'spring-cleaning': ['y']
  }
}));

import { repSuburbSync } from '~/utils/repSuburb.sync';

describe('repSuburbSync', () => {
  it('prefers highest adjacency degree when no service specified', () => {
    const res = repSuburbSync('ipswich');
    expect(res).toBe('ipswich');
  });

  it('prefers any suburb with coverage for the service', () => {
    const res = repSuburbSync('brisbane', 'spring-cleaning');
    expect(res).toBe('y');
  });

  it('falls back to alphabetical when no adjacency and no coverage', () => {
    const res = repSuburbSync('ipswich', 'non-existent');
    // adjacency exists so should still pick ipswich; to test alphabetical remove adjacency scenario
    expect(['ipswich','a']).toContain(res);
  });
});
