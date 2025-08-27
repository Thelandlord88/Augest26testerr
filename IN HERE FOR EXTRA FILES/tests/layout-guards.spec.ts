import { test, expect } from '@playwright/test';

test.describe('Layout guards: ticker, popular areas, and grids', () => {
  test('home has no suburb ticker or Popular Areas', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-suburb-ticker]')).toHaveCount(0);
    await expect(page.locator('nav[aria-label="Popular Areas"]')).toHaveCount(0);
    await expect(page.locator('[data-relgrid]')).toHaveCount(0);
  });

  test('service×suburb shows ticker/grid and Popular Areas with caps', async ({ page }) => {
    await page.goto('/services/bond-cleaning/springfield-lakes/');
  const tickerCount = await page.locator('[data-suburb-ticker]').count();
  expect(tickerCount).toBeGreaterThan(0);
    const gridCount = await page.locator('[data-relgrid] a').count();
    expect(gridCount).toBeLessThanOrEqual(6);
    const popularCount = await page.locator('nav[aria-label="Popular Areas"] a').count();
    expect(popularCount).toBeLessThanOrEqual(3);
  });
});
