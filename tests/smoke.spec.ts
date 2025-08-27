/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';

test.describe('Smoke', () => {
  test('home loads and has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Bond Clean|One N Done/i);
  await expect(page.locator('header#main-header')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('schema graph present', async ({ page }) => {
    await page.goto('/');
    const ld = page.locator('script[type="application/ld+json"]');
  const count = await ld.count();
  expect(count).toBeGreaterThan(0);
    let foundGraph = false;
    for (let i = 0; i < count; i++) {
      const txt = await ld.nth(i).textContent();
      if (!txt) continue;
      try {
        const json = JSON.parse(txt);
        if (json['@graph'] && Array.isArray(json['@graph'])) { foundGraph = true; break; }
      } catch {}
    }
    expect(foundGraph).toBeTruthy();
  });

  test('schema sanity – hubs include LocalBusiness and BreadcrumbList', async ({ page }) => {
    await page.goto('/services/bond-cleaning/');
    const ld = await page.$$eval('script[type="application/ld+json"]', els => els.map(e => e.textContent || ''));
    const parsed = ld.map(txt => {
      try { return JSON.parse(txt); } catch { return null; }
    }).filter(Boolean) as any[];

    // Walk all nodes (top-level and @graph) and collect all @type values (string or array)
    const nodes: any[] = [];
    for (const block of parsed) {
      nodes.push(block);
      if (Array.isArray(block?.['@graph'])) nodes.push(...block['@graph']);
    }
    const types = new Set<string>();
    for (const n of nodes) {
      const t = n?.['@type'];
      if (!t) continue;
      if (Array.isArray(t)) t.forEach((x: string) => types.add(x));
      else types.add(t);
    }

    expect(types.has('LocalBusiness')).toBeTruthy();
    expect(types.has('BreadcrumbList')).toBeTruthy();
  });

  test('schema sanity – spokes include at least one Service', async ({ page }) => {
    await page.goto('/services/bond-cleaning/springfield-lakes/');
    const ld = await page.$$eval('script[type="application/ld+json"]', els => els.map(e => e.textContent || ''));
    const joined = ld.join('\n');
    const matches = joined.match(/"@type":"Service"/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
