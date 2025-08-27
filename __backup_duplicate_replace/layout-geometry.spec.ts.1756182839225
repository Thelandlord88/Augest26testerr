// @ts-nocheck
/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';

test.describe('Layout geometry', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Geometry checks only on Chromium');
  test('Stepper uniform @ mobile', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: `*{animation:none !important; transition:none !important}` });
    // Stabilize before measuring in case of late font/layout settles
    await expect.poll(async () => {
      const dims = await page.locator('[data-test="stepper"] .q-stepper-item')
        .evaluateAll(els => els.map(e => Math.round((e as HTMLElement).getBoundingClientRect().height)));
      return Math.max(...dims) - Math.min(...dims);
    }, { timeout: 1500 }).toBeLessThanOrEqual(4);
    const items = page.locator('ol#q-steps li.q-stepper-item');
    const count = await items.count();
    if (count < 3) test.skip();
  const dims = await items.evaluateAll((els: Element[]) => els.map((e: Element) => (e as HTMLElement).getBoundingClientRect()));
    const H = Math.round(dims[0].height), W = Math.round(dims[0].width);
  dims.forEach((d: DOMRect, i: number) => {
      if (Math.abs(Math.round(d.height) - H) > 6) throw new Error(`Item ${i + 1} height mismatch`);
      if (Math.abs(Math.round(d.width) - W) > 10) throw new Error(`Item ${i + 1} width mismatch`);
    });
  });

  test('Footer no horizontal overflow; tap targets ≥44px', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: `*{animation:none !important; transition:none !important}` });
    const overflowX = await page.evaluate(() =>
      document.scrollingElement!.scrollWidth > document.scrollingElement!.clientWidth
    );
    expect(overflowX).toBeFalsy();
    const links = page.locator('footer a');
  const heights = await links.evaluateAll((els: Element[]) => (els.slice(0, 12) as HTMLElement[]).map((e) => e.getBoundingClientRect().height));
  const tooSmall = heights.filter((h: number | undefined) => h && h < 44);
  if (tooSmall.length > 0) throw new Error(`Tap targets under 44px: ${tooSmall.length}`);
  });
});
