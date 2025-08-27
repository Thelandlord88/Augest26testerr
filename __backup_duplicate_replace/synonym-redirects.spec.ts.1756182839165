import { test, expect } from '@playwright/test';

const cases: Array<{ from: string; to: string }> = [
  { from: '/bond-cleaners/ipswich/', to: '/services/bond-cleaning/ipswich/' },
  { from: '/end-of-lease-cleaning/ipswich/', to: '/services/bond-cleaning/ipswich/' },
  { from: '/exit-clean/ipswich/', to: '/services/bond-cleaning/ipswich/' },
  { from: '/house-cleaning/indooroopilly/', to: '/services/spring-cleaning/indooroopilly/' },
  { from: '/deep-cleaning/indooroopilly/', to: '/services/spring-cleaning/indooroopilly/' },
  { from: '/bathroom-cleaning/springfield/', to: '/services/bathroom-deep-clean/springfield/' },
  { from: '/shower-screen-restoration/springfield/', to: '/services/bathroom-deep-clean/springfield/' },
];

test.describe('Synonym redirects → canonical', () => {
  for (const { from, to } of cases) {
    test(`301: ${from} → ${to}`, async ({ page, context, baseURL }) => {
      const base = baseURL || 'http://localhost:4322';
      const src = new URL(from, base).toString();
      const tgt = new URL(to, base).toString();

      const r = await context.request.get(src, { maxRedirects: 0 }).catch(e => e);
      expect(r.status()).toBe(301);
      expect(r.headers()['location']).toContain(to);

      const final = await context.request.get(tgt);
      expect(final.ok()).toBeTruthy();

      const resp = await page.goto(from + '?q=1#frag');
      expect(resp?.status()).toBeGreaterThanOrEqual(200);
      const url = new URL(page.url());
      expect(url.pathname.endsWith(new URL(to, base).pathname)).toBeTruthy();
      expect(url.search).toContain('q=1');
      expect(url.hash).toBe('#frag');
    });
  }
});
