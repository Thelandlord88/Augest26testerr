import { test, expect } from '@playwright/test';

test('Article schema includes image when featuredImage is set', async ({ page }) => {
  await page.goto('/blog/ipswich/bond-cleaning-checklist', { waitUntil: 'domcontentloaded' });
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const text = scripts.join('\n');
  // Fallback: include full page content if no script captured.
  // This is necessary in rare cases (e.g., when a dev overlay or error prevents script tags from rendering),
  // to ensure the test still checks for the Article schema. Using page.content() here may be expensive,
  // but is only triggered when no relevant script tags are found.
  const html = text || await page.content();
  expect(html).toContain('"@type":"Article"');
  expect(html).toContain('"ImageObject"');
});
