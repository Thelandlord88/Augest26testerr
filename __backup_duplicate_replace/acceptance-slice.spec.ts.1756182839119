import { test, expect } from '@playwright/test';

test('service page shows acceptance slice and related links', async ({ page }) => {
  await page.goto('/services/bond-cleaning/springfield-lakes', { waitUntil: 'networkidle' });
  await expect(page.locator('#acceptance-title')).toBeVisible();
  await expect(page.locator('#related-links-title')).toBeVisible();
  const links = page.locator('#related-links-title').locator('..').locator('a');
  // Cap increased to 3 to match layout and audit
  await expect(links).toHaveCount(3, { timeout: 10000 });
  const count = await links.count();
});
