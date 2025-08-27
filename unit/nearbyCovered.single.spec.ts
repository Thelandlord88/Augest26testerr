import { describe, it, expect, vi } from 'vitest';

// Mock cluster + coverage datasets (independent of real repo data)
vi.mock('~/content/areas.clusters.json', () => ({
  default: {
    clusters: {
      ipswich: {
        suburbs: ['ipswich', 'a', 'b', 'c'],
        adjacency: { ipswich: ['a', 'b'], a: ['ipswich'] }
      },
      brisbane: { suburbs: ['x', 'y'] }
    }
  }
}));

vi.mock('~/data/serviceCoverage.json', () => ({
  default: {
    'spring-cleaning': ['a', 'y'],
    'bathroom-deep-clean': { b: true }
  }
}));

import { nearbyCoveredSingle } from '~/utils/nearbyCovered.single';

describe('nearbyCoveredSingle', () => {
  it('returns the same suburb when covered', () => {
    const res = nearbyCoveredSingle('a', 'spring-cleaning');
    expect(res).toEqual({ suburb: 'a', nearby: false });
  });

  it('prefers adjacent covered suburb within cluster', () => {
    const res = nearbyCoveredSingle('ipswich', 'spring-cleaning');
    expect(res).toEqual({ suburb: 'a', nearby: true });
  });

  it('falls back to any covered suburb in the same cluster', () => {
    const res = nearbyCoveredSingle('c', 'bathroom-deep-clean');
    expect(res).toEqual({ suburb: 'b', nearby: true });
  });

  it('falls back globally when cluster has none', () => {
    const res = nearbyCoveredSingle('x', 'bathroom-deep-clean');
    expect(res).toEqual({ suburb: 'b', nearby: true });
  });

  it('returns null when no coverage exists anywhere', () => {
    const res = nearbyCoveredSingle('ipswich', 'non-existent-service');
    expect(res).toBeNull();
  });
});
