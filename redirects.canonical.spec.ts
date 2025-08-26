import { test, expect, request } from '@playwright/test';

test('alias /blog redirects to cluster canonical', async ({ baseURL }) => {
  const r = await request.newContext({ baseURL });
  const res = await r.get('/blog', { maxRedirects: 0 });

  expect([301, 302, 307, 308]).toContain(res.status());
  const to = res.headers()['location'] || '';
  expect(to).toMatch(/^\/blog\/(brisbane|ipswich|logan)\/?$/);
});

test('service path without trailing slash redirects to slash', async ({ baseURL }) => {
  const r = await request.newContext({ baseURL });
  const res = await r.get('/services/bond-cleaning', { maxRedirects: 0 });

  expect([301, 302, 307, 308]).toContain(res.status());
  expect(res.headers()['location']).toBe('/services/bond-cleaning/');
});
