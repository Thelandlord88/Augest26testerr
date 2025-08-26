import { describe, it, expect, vi } from 'vitest';

vi.mock('~/content/areas.clusters.json', () => ({ default: { clusters: [ { slug: 'ipswich', suburbs: ['Goodna','Redbank Plains','Springfield Lakes'] } ] } }));
vi.mock('~/utils/repSuburb', () => ({ representativeOfCluster: () => 'redbank-plains' }));
vi.mock('~/utils/slugify', () => ({ default: (s: string) => String(s||'').toLowerCase().replace(/\s+/g,'-') }));

describe('chooseSuburbForPost', () => {
  it('uses explicit suburbSlug', async () => {
    const { chooseSuburbForPost } = await import('~/utils/chooseSuburbForPost');
    await expect(chooseSuburbForPost({ suburbSlug: 'Goodna' }, 'ipswich', 'post')).resolves.toBe('goodna');
  });
  it('uses first suburbs[] entry', async () => {
    const { chooseSuburbForPost } = await import('~/utils/chooseSuburbForPost');
    await expect(chooseSuburbForPost({ suburbs: ['Springfield Lakes'] }, 'ipswich', 'post')).resolves.toBe('springfield-lakes');
  });
  it('infers from slug tokens', async () => {
    const { chooseSuburbForPost } = await import('~/utils/chooseSuburbForPost');
    await expect(chooseSuburbForPost({}, 'ipswich', 'bond-cleaning-in-redbank-plains')).resolves.toBe('redbank-plains');
  });
  it('falls back to representative', async () => {
    const { chooseSuburbForPost } = await import('~/utils/chooseSuburbForPost');
    await expect(chooseSuburbForPost({}, 'ipswich', 'generic-post')).resolves.toBe('redbank-plains');
  });
});
