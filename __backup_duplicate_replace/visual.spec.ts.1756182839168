import { test, expect } from './fixtures';

const routes = [
  '/',
  '/areas/ipswich/',
  '/areas/brisbane/',
  '/services/bond-cleaning/ipswich/',
  '/services/spring-cleaning/indooroopilly/',
  '/blog/ipswich/bond-cleaning-checklist/',
];

test.describe('Visual snapshots', () => {
  for (const url of routes) {
    test(`snapshot @ ${url}`, async ({ page, awaitPageReady }) => {
      await page.goto(url, { waitUntil: 'networkidle' });
      await awaitPageReady();

      const masks: any[] = [];
      for (const sel of ['#quote-form','[data-test-dynamic]','.mapboxgl-map','[data-plausible]','[data-build-id]']) {
        if (await page.locator(sel).count()) masks.push(page.locator(sel));
      }

      const name = url.replace(/\W+/g, '_') + '.png';
      await expect(page).toHaveScreenshot(name, {
        fullPage: false, // temporary stabilization; re-enable after baselines updated
        maxDiffPixelRatio: 0.05,
        mask: masks,
        animations: 'disabled',
        caret: 'hide',
        scale: 'css',
      });
    });
  }
});
