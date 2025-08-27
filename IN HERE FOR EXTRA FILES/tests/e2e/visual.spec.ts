// @ts-nocheck
/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import { loadTestRoutes } from './helpers/routes';

const BLOG_BASE = (process.env.BLOG_BASE ?? '/blog/').toString();
const routes = loadTestRoutes();

test.describe('Visual baselines', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Visual baselines only on Chromium');
  const opts = { fullPage: false, maxDiffPixelRatio: 0.035, timeout: 15000, mask: [] as any[] } as const;
  const safeName = (p: string) => (p === '/' ? 'home' : p.replace(/^\/+|\/+$/g, '').replace(/\W+/g, '_'));
  for (const path of routes) {
  test(`${path} – mobile`, async ({ page }) => {
      await page.setViewportSize({ width: 430, height: 932 });
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      // Freeze animations and transitions for stable screenshots
      await page.addStyleTag({ content: `*{animation: none !important; transition: none !important}` });
      // Mask volatile elements like review dates or dynamic counters if present
  const masks = [page.locator('.review-date, [data-relative-time], time, [data-badge-random]')];
      await expect(page).toHaveScreenshot(`${safeName(path)}_mobile.png`, { ...opts, mask: masks });
    });

  test(`${path} – desktop`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await page.addStyleTag({ content: `*{animation: none !important; transition: none !important}` });
  const masks = [page.locator('.review-date, [data-relative-time], time, [data-badge-random]')];
      await expect(page).toHaveScreenshot(`${safeName(path)}_desktop.png`, { ...opts, mask: masks });
    });
  }
});
