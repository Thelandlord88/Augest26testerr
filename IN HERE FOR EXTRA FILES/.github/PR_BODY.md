## Summary
Tightens our Playwright setup so visual + geometry checks are stable and useful, and uploads artifacts on failure.

### What changed
- **Snapshots/Artifacts**
  - Pruned legacy/non-Chromium baselines and old naming variants.
  - `.gitignore`: ignore `playwright-report/`, `blob-report/`, `test-results/`, `trace.zip`.
- **Config**
  - Locked projects to **Chromium** (Firefox/WebKit commented for later).
  - Increased visual stability (timeouts, animation freeze).
- **Tests**
  - `visual.spec.ts`: freeze animations, wait for `networkidle`, add masks (`.review-date`, `time`, `[data-relative-time]`, `[data-badge-random]`), viewport screenshots, normalized names.
  - `layout-geometry.spec.ts`: pre-assert **stabilize poll** to avoid font/CLP jitter; asserts equal stepper heights and footer tap targets ≥44px.
  - `smoke.spec.ts`: target unique footer landmark (`role="contentinfo"` / `#site-footer`).
- **CI**
  - `qa.yml`: run Chromium E2E on push/PR; upload report/trace artifacts on failure.

### Why
- Reduce flakiness, make diffs meaningful, and ensure CRO/A11y-critical UI (stepper/footer) stays consistent.

### How to review
1. **Local**
   ```bash
   npm run build && npm run preview
   npx playwright test
   # To update snapshots later:
   npx playwright test --grep "Visual baselines" --update-snapshots
   ```

2. **CI**

   * Confirm the `QA` workflow runs and passes on this PR.
   * If it fails, download the **playwright-artifacts** to inspect HTML/trace.

### Acceptance criteria

* [ ] Visual baselines pass on Chromium (mobile + desktop) for `/`, `/services/bond-cleaning/`, `/areas/`, `/blog/`.
* [ ] Stepper items equal height on mobile (no line-wrap drift).
* [ ] Footer links meet tap target ≥44px across tested breakpoints.
* [ ] Smoke test reliably targets the unique footer landmark.
* [ ] CI uploads artifacts on failures.

### Follow-ups (separate PRs)

* Enable `@axe-core/playwright` a11y sweep on home + one service page.
* Consider re-enabling WebKit/Firefox visuals once UI is fully stable.
* Optional: add `retries: 1` for visual tests **in CI only**.
* Schema @graph already wired; next is acceptance-criteria JSON slices into suburb/service pages.
