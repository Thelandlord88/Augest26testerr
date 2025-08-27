import { test, expect } from '@playwright/test';

test('footer Popular Areas deep-links to real spokes', async ({ page, request }) => {
  await page.goto('/services/bond-cleaning/brookwater/');
  const hrefs = await page.$$eval('nav[aria-label="Popular Areas"] a', as => as.map(a => a.getAttribute('href') || ''));
  for (const href of hrefs) {
    expect(href).toMatch(/^\/services\/bond-cleaning\/[a-z0-9-]+\/$/);
    const url = new URL(href, page.url()).toString();
    const res = await request.get(url);
    expect(res.status(), href).toBe(200);
  }
});
