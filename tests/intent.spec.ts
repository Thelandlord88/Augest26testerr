import { test, expect } from '@playwright/test';

// Basic intent guards to prevent cross-service leakage
test.describe('Service intent guards', () => {
  test('Spring cleaning page does not mention bond terms', async ({ page }) => {
    await page.goto('/services/spring-cleaning/');
    const main = await page.locator('#main').innerText();
    expect(main.toLowerCase()).not.toMatch(/bond\s?clean|exit\s?clean|end\s?of\s?lease/i);
    expect(main.toLowerCase()).toContain('spring');
  });

  test('Bathroom deep clean includes bathroom-specific terms and excludes bond', async ({ page }) => {
    await page.goto('/services/bathroom-deep-clean/');
    const main = await page.locator('#main').innerText();
    expect(main.toLowerCase()).toMatch(/tile|tiles|grout|shower|glass/);
    expect(main.toLowerCase()).not.toMatch(/bond\s?clean|exit\s?clean|end\s?of\s?lease/i);
  });
});
