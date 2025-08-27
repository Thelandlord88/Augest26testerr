import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/content/areas.clusters.json', () => ({
  default: { clusters: { ipswich: { suburbs: ['ipswich', 'a'] } } }
}));

vi.mock('../../src/data/serviceCoverage.json', () => ({ default: {} }));

import { chooseSuburbForPostSync } from '../../src/utils/chooseSuburbForPost.sync';

describe('chooseSuburbForPostSync', () => {
  it('uses front-matter when provided', () => {
    const r = chooseSuburbForPostSync({ frontMatterSuburb: 'ipswich' });
    expect(r).toBe('ipswich');
  });
  it('uses first from suburbs[]', () => {
    const r = chooseSuburbForPostSync({ suburbs: ['a', 'b'] });
    expect(r).toBe('a');
  });
  it('uses slug tail token when plausible', () => {
    const r = chooseSuburbForPostSync({ slug: 'post-about-ipswich' });
    expect(r).toBe('ipswich');
  });
  it('falls back to representative suburb for cluster', () => {
    const r = chooseSuburbForPostSync({ cluster: 'ipswich' });
    expect(['ipswich','a']).toContain(r);
  });
});
