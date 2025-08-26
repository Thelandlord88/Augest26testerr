import { test, expect } from './fixtures';

const samples = [
  '/services/bond-cleaning/ipswich/',
  '/services/bond-cleaning/indooroopilly/',
  '/services/bond-cleaning/loganholme/',
];

function lastSlug(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

test.describe('Cross-service links', () => {
  for (const url of samples) {
    test(`renders + has correct nearby semantics @ ${url}`, async ({ page, awaitPageReady }) => {
      await page.goto(url, { waitUntil: 'networkidle' });
      await awaitPageReady();
      const region = page.locator('[data-relservices]');
      await expect(region).toBeVisible();
      const links = region.locator('a[href]');
  // Ensure links have rendered (poll a little just in case)
  let attempts = 0; while (attempts < 10 && await links.count() === 0) { attempts++; await page.waitForTimeout(100); }
  expect(await links.count()).toBeGreaterThan(0);
      const texts = await links.allTextContents();
      expect(texts.some(t => /Spring Cleaning|Bathroom Deep Clean/i.test(t))).toBeTruthy();

      const currentSuburb = lastSlug(new URL(await page.url()).pathname);
      const spring = region.getByRole('link', { name: /Spring Cleaning/i }).first();
      const bath = region.getByRole('link', { name: /Bathroom Deep Clean/i }).first();
      const svc = (await spring.count()) ? spring : bath;
      if (await svc.count()) {
        const label = (await svc.textContent()) || '';
        const href = await svc.getAttribute('href');
        expect(href).toBeTruthy();
        if (/\(nearby\)/i.test(label)) {
          expect(href!).not.toContain(`/${currentSuburb}/`);
        } else {
          expect(href!).toContain(`/${currentSuburb}/`);
        }
      }
      const local = region.getByRole('link', { name: /guides|blog/i });
      await expect(local.first()).toBeVisible();
    });
  }
});
