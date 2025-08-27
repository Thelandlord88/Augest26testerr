import { describe, it, expect, afterEach, vi } from 'vitest';

// We'll isolate the module for each test to pick up a different BLOG_BASE.
vi.mock('~/config/siteConfig', async (orig) => {
  // Default BLOG_BASE for the initial import; tests will reset modules and re-mock
  const actual = await (orig() as any);
  return {
    ...actual,
    BLOG_BASE: '/blog/',
  };
});

// Helper to load fresh instances after changing the mock
async function loadPaths() {
  const mod = await import('../../src/lib/paths');
  return mod;
}

describe('rel.* respects BLOG_BASE variants', () => {
  afterEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('uses /blog/ base by default', async () => {
    const { rel } = await loadPaths();
    expect(rel.blogRoot()).toBe('/blog/');
    expect(rel.blogCluster('ipswich')).toBe('/blog/ipswich/');
    expect(rel.blogCategory('ipswich', 'checklist')).toBe('/blog/ipswich/category/checklist/');
    expect(rel.blogPost('ipswich', 'what-agents-want')).toBe('/blog/ipswich/what-agents-want/');
  });

  it('switches to /guides/ base when BLOG_BASE mocked', async () => {
    vi.doMock('~/config/siteConfig', async (orig) => {
      const actual = await (orig() as any);
      return { ...actual, BLOG_BASE: '/guides/' };
    });
    const { rel } = await loadPaths();
    expect(rel.blogRoot()).toBe('/guides/');
    expect(rel.blogCluster('ipswich')).toBe('/guides/ipswich/');
    expect(rel.blogCategory('ipswich', 'checklist')).toBe('/guides/ipswich/category/checklist/');
    expect(rel.blogPost('ipswich', 'what-agents-want')).toBe('/guides/ipswich/what-agents-want/');
  });

  it('normalizes double slashes and missing trailing slash', async () => {
    vi.doMock('~/config/siteConfig', async (orig) => {
      const actual = await (orig() as any);
      return { ...actual, BLOG_BASE: '//guides' };
    });
    const { rel } = await loadPaths();
    expect(rel.blogRoot()).toBe('/guides/');
    expect(rel.blogPost('ipswich', 'eco-bond-cleaning')).toBe('/guides/ipswich/eco-bond-cleaning/');
  });
});
