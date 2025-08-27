import { test, expect } from '@playwright/test';

// These tests assume the dev server is configured in playwright.config.ts via webServer or baseURL.

const BLOG_BASE = (process.env.BLOG_BASE ?? '/blog/').toString();
const baseSeg = BLOG_BASE.replace(/^\/+|\/+$/g, '');

test('alias cluster keeps query (fragment is browser-only)', async ({ page }) => {
  const src = '/blog/ipswich-region/?utm=abc#top';
  const res = await page.goto(src, { waitUntil: 'domcontentloaded' });
  expect(res?.status()).toBe(200);
  // Ignore any fragment on the final URL; only assert path + search
  const current = new URL(page.url());
  expect(current.pathname + (current.search || ''))
    .toBe(`/${baseSeg}/ipswich/?utm=abc`);
});
