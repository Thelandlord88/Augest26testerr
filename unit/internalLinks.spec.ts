import { describe, it, expect, vi, beforeEach } from 'vitest';

// BLOG_BASE to guides to verify base-awareness
vi.mock('~/config/siteConfig', () => ({ BLOG_BASE: '/guides/' }));

// Minimal data mocks to exercise logic
vi.mock('~/data/serviceCoverage.json', () => ({
  default: {
    'bond-cleaning': ['redbank-plains', 'oxley', 'ashgrove'],
  'spring-cleaning': ['redbank-plains', 'oxley', 'ashgrove', 'goodna'],
    'bathroom-deep-clean': ['redbank-plains', 'springfield-lakes', 'goodna']
  }
}));

vi.mock('~/content/areas.clusters.json', () => ({
  default: {
    clusters: [
      { slug: 'ipswich-region', suburbs: ['Redbank Plains', 'Springfield Lakes', 'Goodna'] },
      { slug: 'brisbane-west', suburbs: ['Oxley', 'Ashgrove'] },
      { slug: 'logan', suburbs: ['Loganholme'] }
    ]
  }
}));

vi.mock('~/data/suburbs.json', () => ({ default: [
  { slug: 'redbank-plains' },
  { slug: 'springfield-lakes' },
  { slug: 'goodna' },
  { slug: 'oxley' },
  { slug: 'ashgrove' },
  { slug: 'loganholme' }
] }));

vi.mock('~/utils/slugify', () => ({ default: (s: string) => String(s).trim().toLowerCase().replace(/\s+/g, '-') }));
vi.mock('~/utils/geoHandler', () => ({ resolveClusterSlug: (s: string) => (s === 'ipswich-region' ? 'ipswich' : (s === 'brisbane-west' || s === 'brisbane_west') ? 'brisbane' : s) }));

vi.mock('~/data/geo.neighbors.ipswich.json', () => ({ default: { 'redbank-plains': ['springfield-lakes', 'goodna'] } }));
vi.mock('~/data/geo.neighbors.brisbane-west.json', () => ({ default: { 'oxley': ['sherwood', 'corinda'] } }));
vi.mock('~/data/geo.neighbors.logan.json', () => ({ default: {} }));

async function fresh() {
  vi.resetModules();
  return await import('~/utils/internalLinks');
}

describe('internalLinks helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getLocalBlogLink returns BLOG_BASE-aware cluster URL', async () => {
    const { getLocalBlogLink } = await fresh();
    expect(getLocalBlogLink('redbank-plains')).toBe('/guides/ipswich/');
    expect(getLocalBlogLink('oxley')).toBe('/guides/brisbane/');
  });

  it('includeSelf defaults to true (self + N others even when not passed)', async () => {
    const { getRelatedServiceLinks } = await fresh();
    const links = getRelatedServiceLinks({ service: 'spring-cleaning', suburbSlug: 'redbank-plains', count: 1 });
    expect(links[0].href).toBe('/services/spring-cleaning/redbank-plains/');
    expect(links).toHaveLength(2);
  });

  it('treats unlisted services in coverage as open (allowed)', async () => {
    const { getRelatedServiceLinks } = await fresh();
    const links = getRelatedServiceLinks({ service: 'oven-cleaning' as any, suburbSlug: 'redbank-plains', includeSelf: true, count: 0 });
    expect(links[0].href).toBe('/services/oven-cleaning/redbank-plains/');
  });

  it('uses cluster_map.json when present (even if areas list omits it)', async () => {
  vi.resetModules();
  vi.doMock('~/data/cluster_map.json', () => ({ default: { 'new-suburb': 'ipswich' } }));
  vi.doMock('~/content/areas.clusters.json', () => ({ default: { clusters: [{ slug: 'ipswich-region', suburbs: [] }] } }));
  const mod = await import('~/utils/internalLinks');
    expect(mod.getLocalBlogLink('new-suburb')).toBe('/guides/ipswich/');
  });

  it('prefers adjacency over curated neighbors when both exist', async () => {
  vi.resetModules();
  vi.doMock('~/data/adjacency.json', () => ({ default: { 'redbank-plains': { adjacent_suburbs: ['goodna'] } } }));
  vi.doMock('~/data/geo.neighbors.ipswich.json', () => ({ default: { 'redbank-plains': ['springfield-lakes'] } }));
  const mod = await import('~/utils/internalLinks');
    const links = mod.getRelatedServiceLinks({ service: 'spring-cleaning', suburbSlug: 'redbank-plains', includeSelf: false, count: 2 });
    const hrefs = links.map((l: any) => l.href);
    expect(hrefs).toContain('/services/spring-cleaning/goodna/');
    expect(hrefs).not.toContain('/services/spring-cleaning/springfield-lakes/');
  });
});
