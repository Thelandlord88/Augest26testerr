import { test, expect } from "@playwright/test";

const BLOG_BASE = (process.env.BLOG_BASE ?? '/blog/').toString();
const baseSeg = BLOG_BASE.replace(/^\/+|\/+$/g, ''); // 'blog' or 'guides'
const aliases = [
  { from: "ipswich-region", to: "ipswich" },
  { from: "brisbane-west", to: "brisbane" },
  { from: "brisbane_west", to: "brisbane" },
];

const strict = process.env.CI === 'true';
const rx = (to: string) =>
  strict
    ? new RegExp(`/${baseSeg}/${to}/\\?utm_source=spec$`)
    : new RegExp(`/${baseSeg}/${to}/(?:\\?utm_source=spec)?$`);

for (const { from, to } of aliases) {
  test(`legacy /blog/${from}/ → /${baseSeg}/${to}/ (query preserved in CI)`, async ({ page }) => {
    await page.goto(`/blog/${from}/?utm_source=spec`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(rx(to));
  });
}
