import { test, expect } from '@playwright/test';

const cases: Array<[from: string, toPath: string]> = [
  ['/bond-cleaners/redbank-plains', '/services/bond-cleaning/redbank-plains'],
  ['/end-of-lease-cleaning/springfield-lakes', '/services/bond-cleaning/springfield-lakes'],
  ['/exit-clean/brookwater', '/services/bond-cleaning/brookwater'],
  ['/house-cleaning/kenmore', '/services/spring-cleaning/kenmore'],
  ['/deep-cleaning/indooroopilly', '/services/spring-cleaning/indooroopilly'],
  ['/bathroom-cleaning/forest-lake', '/services/bathroom-deep-clean/forest-lake'],
  ['/shower-screen-restoration/springwood', '/services/bathroom-deep-clean/springwood'],
];

test.describe('Synonym redirects', () => {
  for (const [from, toPathRaw] of cases) {
    test(`301s ${from} -> ${toPathRaw}`, async ({ request, baseURL }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status(), `Expected 301 for ${from}`).toBe(301);
      const loc = res.headers()['location'];
      expect(loc, 'Location header missing').toBeTruthy();
      const resolved = new URL(loc!, baseURL!);
      // Allow either with or without trailing slash
      const expectedA = toPathRaw.endsWith('/') ? toPathRaw : `${toPathRaw}/`;
      const expectedB = toPathRaw.endsWith('/') ? toPathRaw.slice(0, -1) : toPathRaw;
      expect([expectedA, expectedB]).toContain(resolved.pathname);
    });
  }

  test('Unknown suburb returns 404', async ({ request, baseURL }) => {
    // Try with no auto-follow; if a 301 appears (unlikely now), follow once and expect 404
    const res = await request.get('/bond-cleaners/not-a-real-suburb', { maxRedirects: 0 });
    if (res.status() === 301) {
      const loc = res.headers()['location'];
      const resolved = new URL(loc!, baseURL!);
      const res2 = await request.get(resolved.toString(), { maxRedirects: 0 });
      expect(res2.status()).toBe(404);
    } else {
      expect(res.status()).toBe(404);
    }
  });
});
