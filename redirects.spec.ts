import { test, expect } from '@playwright/test';

const redirects: [string, string][] = [
  ['/bond-cleaners/redbank-plains/', '/services/bond-cleaning/redbank-plains/'],
  ['/end-of-lease-cleaning/kenmore/', '/services/bond-cleaning/kenmore/'],
  ['/house-cleaning/indooroopilly/', '/services/spring-cleaning/indooroopilly/'],
  ['/shower-screen-restoration/brookwater/', '/services/bathroom-deep-clean/brookwater/'],
];

for (const [from, to] of redirects) {
  test(`301 ${from} -> ${to}`, async ({ request, baseURL }) => {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status()).toBe(301);
  const loc = res.headers()['location'];
  expect(loc).toBeTruthy();
  const resolved = new URL(loc!, baseURL ?? 'http://localhost:4322');
  expect(resolved.pathname).toBe(to);
  });
}
