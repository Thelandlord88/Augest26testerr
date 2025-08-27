import { test, expect } from '@playwright/test';

test('skip to content focuses main', async ({ page }) => {
  await page.goto('/');
  // Tab to reveal the skip link (it should be the first focusable element)
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: /skip to content/i });
  await expect(skip).toBeVisible();
  await expect(skip).toBeFocused();
  // Activate skip via click to ensure our JS handler runs
  await skip.click();
  // Main should receive focus
  await expect(page.locator('#main')).toBeFocused();
});
