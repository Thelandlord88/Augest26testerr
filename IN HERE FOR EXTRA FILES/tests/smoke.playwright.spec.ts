import { test, expect } from '@playwright/test';

test('home page renders and has a title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Bond Clean|One N Done/i);
  await expect(page.getByRole('link', { name: /services/i })).toBeVisible();
});
