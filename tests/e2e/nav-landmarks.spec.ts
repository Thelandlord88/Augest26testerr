import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const servicePages = [
  '/services/bond-cleaning/ipswich/',
  '/services/bond-cleaning/loganholme/'
];

async function getNavInfo(page: Page) {
  return await page.evaluate(() => {
    const toName = (nav: any) => {
      if (nav.getAttribute('aria-label')) return nav.getAttribute('aria-label')!.trim();
      const labelled = nav.getAttribute('aria-labelledby');
      if (labelled) {
        const el = document.getElementById(labelled);
        if (el) return el.textContent?.trim() || '';
      }
      const h = nav.querySelector('h1,h2,h3,h4,h5,h6');
      if (h) return h.textContent?.trim() || '';
      return '';
    };
  return Array.from(document.querySelectorAll('nav')).map((nav: HTMLElement) => ({
      html: nav.outerHTML.slice(0, 120),
      name: toName(nav),
      relservices: nav.hasAttribute('data-relservices')
    }));
  });
}

for (const url of servicePages) {
  test(`nav landmark integrity @ ${url}`, async ({ page, awaitPageReady }) => {
    await page.goto(url, { waitUntil: 'networkidle' });
    await awaitPageReady();
    const navs = await getNavInfo(page);
    expect(navs.length).toBeGreaterThan(0);
    // Exactly one cross-service nav on service pages.
    const cross = navs.filter(n => n.relservices);
    expect(cross.length).toBe(1);
    // Accessible names must be unique (no duplicate landmark names).
    const names = navs.map(n => n.name || '(unnamed)');
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes, `Duplicate nav names: ${JSON.stringify(navs, null, 2)}`).toEqual([]);
  });
}
