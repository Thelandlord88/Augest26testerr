import { test, expect } from '@playwright/test';

test.describe('Routing basics', () => {
  test('alias area redirects to canonical', async ({ page, request }) => {
    // Playwright follows redirects on page.goto; validate final URL and also raw status via API request
    const resFollow = await page.goto('/areas/brisbane-west/');
    expect(resFollow?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/areas/brisbane/');
    const res = await request.get('/areas/brisbane-west/', { maxRedirects: 0 }).catch(e => e);
    const status = res.status ? res.status() : res.response?.status();
    expect([301, 308]).toContain(status);
  });

  test('unknown suburb returns 404', async ({ page }) => {
    const res = await page.goto('/services/bond-cleaning/not-a-suburb/');
    expect([404, 451]).toContain(res?.status());
  });
});
