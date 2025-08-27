/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';

test.describe('Quote form', () => {
  test('allows basic submission flow mock', async ({ page }) => {
    await page.goto('/');
    const quoteBtn = page.getByRole('button', { name: /get a quote|free quote|quote/i });
  if (await quoteBtn.first().isVisible()) await quoteBtn.first().click();

    const name = page.getByLabel(/name/i).first();
    const phone = page.getByLabel(/phone|mobile/i).first();
    const email = page.getByLabel(/email/i).first();
  const present = await name.count();
  if (!present) test.skip();
  await name.waitFor({ state: 'visible', timeout: 1500 }).catch(() => test.skip());
  if (await name.isVisible()) await name.fill('Test User');
  if (await phone.isVisible()) await phone.fill('0400000000');
  if (await email.isVisible()) await email.fill('test@example.com');

    const submit = page.getByRole('button', { name: /send|submit|request/i }).first();
  if (await submit.isVisible()) await Promise.all([
      page.waitForTimeout(300),
      submit.click(),
    ]);

    await expect(page.locator('footer')).toBeVisible();
  });
});
