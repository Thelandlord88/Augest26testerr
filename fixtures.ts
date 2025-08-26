import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function disableAnimations(page: Page) {
  await page.addStyleTag({ path: 'public/test-disable-animations.css' }).catch(() => {});
  await page.addStyleTag({ content: `@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}` });
}

async function awaitReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(50);
  const rel = page.locator('[data-relservices]');
  if (await rel.count()) {
    await rel.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }
  const main = page.locator('main').first();
  if (await main.count()) {
    await main.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }
}

export const test = base.extend<{ awaitPageReady: () => Promise<void> }>({
  awaitPageReady: async ({ page }, use) => {
    await disableAnimations(page);
    await use(async () => { await awaitReady(page); });
  },
});

export { expect };
