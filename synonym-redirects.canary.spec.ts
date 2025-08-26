import { test, expect } from '@playwright/test';

const cases: Array<[string, string]> = [
  ['/bond-cleaners/forest-lake', '/services/bond-cleaning/forest-lake/'],
  ['/end-of-lease-cleaning/springfield-lakes', '/services/bond-cleaning/springfield-lakes/'],
  ['/house-cleaning/kenmore', '/services/spring-cleaning/kenmore/'],
  ['/shower-screen-restoration/springwood', '/services/bathroom-deep-clean/springwood/'],
];

for (const [from, to] of cases) {
  test(`301 ${from} -> ${to}`, async ({ request, baseURL }) => {
    const res = await request.get(new URL(from, baseURL).toString(), { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()['location']).toBe(to);
  });
}
