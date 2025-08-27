import { test, expect } from '@playwright/test';

test.describe('Routing basics', () => {
  test('unknown suburb returns 404', async ({ page }) => {
    const res = await page.goto('/services/bond-cleaning/not-a-suburb/');
    expect([404, 451]).toContain(res?.status());
  });
});
