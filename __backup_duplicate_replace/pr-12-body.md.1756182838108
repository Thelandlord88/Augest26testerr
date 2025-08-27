- **a11y: fix Axe color-contrast violations (polaroid labels, DifferenceSection CTA, ServiceLayout heading) and verify green**
- **ci(lhci): add Lighthouse CI with budgets; install Chrome on CI; a11y: add skip link + main landmark; tests: add structure + skip-link**
- **feat(content-seo): Acceptance slice, Related links, and Article image JSON-LD\n\n- Add AcceptanceSlice component and JSON-driven content\n- Add RelatedLinks with internal service link builder\n- Enhance schemaGraph with ImageObject + primaryImageOfPage\n- Blog article page injects consolidated @graph + Article JSON-LD image\n- Service pages render acceptance + related links\n- Tests: acceptance slice render + article image schema\n- Fix Astro syntax and ESM import extensions\n- Tune hero CTA contrast and LCP image sizes\n- Respect reduced motion in global styles**

## How to verify (reviewer checklist)

### Build & CI

✅ CI shows two green checks: QA (Playwright) and Lighthouse.

✅ Netlify Deploy Preview loads.

### Service/Suburb page

Open `/services/bond-cleaning/springfield-lakes`

- See “What’s included (agent-ready)” section with grouped tasks, tools & pitfalls.
- See “Also available nearby” cards (≥2 links).
- Page has one `<main id="main" tabindex="-1">` and a visible "Skip to content" link on first Tab.

### Blog post

Open `/blog/ipswich-region/bond-cleaning-checklist`

- Featured image renders above the article (if present in `topics.json`).
- In Elements → `<head>`, a single JSON-LD `@graph` contains:
  - `"@type": "Article"` with an `ImageObject`
  - `"@type": "WebPage"` with `primaryImageOfPage` referencing the same image.

### Performance/a11y spot check (Preview)

- Hero/LCP image has `loading="eager"` and `fetchpriority="high"`.
- Keyboard focus ring visible on buttons/links.
- Footer links are ≥44px tap targets (no cramped rows).
- Lighthouse scores meet budgets (Perf ≥ 0.90; LCP ≤ 2.5s; TBT ≤ 200ms; CLS ≤ 0.10; image ≤ 350 KB; font ≤ 120 KB; script ≤ 150 KB).

### If CI wobbles (tiny stabilisers to apply only if needed)

Article image schema test — wait for JSON-LD to attach

```ts
await page.waitForSelector('script[type="application/ld+json"]', { state: 'attached' });
```

Acceptance slice links — poll until we have links

```ts
await expect.poll(async () =>
  page.locator('section:has-text("Also available nearby") a').count()
).toBeGreaterThan(1);
```

LHCI Chrome path already set via:

```yaml
- run: npx playwright install --with-deps chromium
- run: echo "LHCI_CHROME_PATH=$(node -e \"console.log(require('playwright').chromium.executablePath())\")" >> $GITHUB_ENV
```

### Merge criteria (squash when all true)

✅ QA (Playwright) = green

✅ Lighthouse = green

✅ Manual preview spot check OK (hero priority, skip link, one `<main>`, acceptance slice visible)

After merge:

- Protect `main` to require both checks (QA + Lighthouse).
- Optional: add `featuredImage` to 2–3 more posts and drop the `AcceptanceSlice` onto one more high-volume suburb.
