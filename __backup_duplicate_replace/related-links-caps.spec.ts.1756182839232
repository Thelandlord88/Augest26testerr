import { test, expect } from '@playwright/test';

test.describe('Related links caps and footer deep-links', () => {
  test('related blocks respect caps', async ({ page }) => {
    await page.goto('/services/bond-cleaning/springfield-lakes/');
    await expect(page.locator('[data-relblock] a')).toHaveCount(3);
  const gridCount = await page.locator('[data-relgrid] a').count();
  expect(gridCount).toBeLessThan(7);
  });

  test('footer popular areas deep-link correctly', async ({ page, request }) => {
    await page.goto('/services/bond-cleaning/brookwater/');
    const links = await page.$$eval('nav[aria-label="Popular Areas"] a', (as) =>
      as.map((a) => ({ href: a.getAttribute('href') || '', text: a.textContent?.trim() || '' }))
    );
    for (const { href } of links) {
      expect(href).toMatch(/^\/services\/bond-cleaning\/[a-z0-9-]+\/$/);
      const url = new URL(href, page.url()).toString();
      const res = await request.get(url);
      expect(res.status()).toBe(200);
    }
  });
});
