import { test, expect } from '@playwright/test';

test('no duplicate primary header on spokes', async ({ page }) => {
  await page.goto('/services/bond-cleaning/springfield-lakes/');
  const count = await page.locator('header#main-header').count();
  expect(count).toBe(1);
});
