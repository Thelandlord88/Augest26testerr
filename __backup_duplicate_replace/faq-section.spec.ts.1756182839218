/// <reference types="@playwright/test" />
// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('FAQ Section Navigation and Accordion', () => {
  const springfieldSlug = 'springfield-lakes';
  const springfieldUrl = `/services/bond-cleaning/${springfieldSlug}/`;

  test('navigates to Springfield Lakes and interacts with FAQ', async ({ page }) => {
    await page.goto('/');

  // Click the Springfield Lakes link/button (first match, like Cypress contains)
  await page.getByRole('link', { name: 'Springfield Lakes' }).first().click();

  // Wait for navigation
  await page.waitForURL(`**${springfieldUrl}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Bond Cleaning in Springfield Lakes/i);

    // Ensure FAQ section is present (current component markup)
    await expect(page.getByRole('heading', { level: 2, name: /Frequently Asked Questions/i })).toBeVisible();
    const faqs = page.locator('details.faq-polish');
    expect(await faqs.count()).toBeGreaterThan(0);

    // Expand the first FAQ item
    const firstFaq = faqs.first();
    expect(await firstFaq.getAttribute('open')).toBeNull();
    await firstFaq.locator('summary').click();
    await expect(firstFaq).toHaveAttribute('open', /.*/);
  });
});
