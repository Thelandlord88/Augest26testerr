import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

const urls = [
  '/',
  '/areas/ipswich/',
  '/services/bond-cleaning/ipswich/',
  '/blog/ipswich/bond-cleaning-checklist/',
];

test.describe('Accessibility (axe)', () => {
  for (const url of urls) {
    test(`axe @ ${url}`, async ({ page, awaitPageReady }) => {
      await page.goto(url, { waitUntil: 'networkidle' });
      await awaitPageReady();
      const results = await new AxeBuilder({ page })
        .disableRules([
          'region',
          'landmark-one-main',
          'skip-link',
          'duplicate-id',
          'landmark-complementary-is-top-level' // temporary until layout refactor
        ])
        .exclude(['.mapboxgl-map','#quote-form','iframe'])
        .analyze();
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toHaveLength(0);
    });
  }
});
