# One N Done Bond Clean — Astro + Netlify

Production front-end built with **Astro 5** + **Tailwind**, deployed on **Netlify**. Canonical routing, SSR synonym redirects, consolidated JSON-LD graphs, Playwright tests (a11y/visual/redirects), internal link integrity, optional AI reviewers, and guardrails for consistent SEO and UX.

---

## Table of Contents

<!-- toc:start -->

* [What’s in here](#whats-in-here)
* [Prerequisites & System Requirements](#prerequisites--system-requirements)
* [Quick Start](#quick-start)
* [Environments & Feature Flags](#environments--feature-flags)
* [Routes & Canonicals](#routes--canonicals)
* [Redirects (Edge + Emulator)](#redirects-edge--emulator)
* [Synonym Redirect Endpoints (SSR)](#synonym-redirect-endpoints-ssr)
* [Cross-Service Navigation (Static, Deterministic)](#crossservice-navigation-static-deterministic)
* [JSON-LD Strategy](#jsonld-strategy)
* [Sitemap & Robots](#sitemap--robots)
* [Testing Strategy](#testing-strategy)
* [Build Pipeline & Guardrails](#build-pipeline--guardrails)
* [CI Workflows](#ci-workflows)
* [Git Hooks (Husky v9/v10)](#git-hooks-husky-v9v10)
* [Performance, Caching & Headers](#performance-caching--headers)
* [Security Notes](#security-notes)
* [Data Model](#data-model)
* [Project Map](#project-map)
* [Troubleshooting](#troubleshooting)
* [Conventions](#conventions)
* [Release Checklist](#release-checklist)
* [FAQ](#faq)
* [Appendix: Key Files & Snippets](#appendix-key-files--snippets)

<!-- toc:end -->

---

## What’s in here

* **Astro 5 + Netlify adapter** (Node 20 pinned).
* **Canonical route architecture** (services, areas, blog).
* **SSR endpoints** for synonym routes → 301 to canonical.
* **Redirect emulator** for local tests (Netlify-style `:param` + `:splat`).
* **Cross-service navigation** precomputed at build → stable UI + a11y.
* **Single JSON-LD emitter** with absolute IDs/URLs; guard to de-duplicate.
* **Playwright suites**: a11y (axe), visual, redirects, smoke/structure.
* **Post-build guardrails**: link integrity, related link caps, schema validation.
* **AI reviewers (optional)** → SARIF in PRs.
* **Edge middleware toggle** via `USE_EDGE` (off by default locally/CI).

---

## Prerequisites & System Requirements

* **Node**: v20.x (LTS).
* **npm**: v9+ recommended.
* **OS**: Linux/macOS; Windows via **WSL2** recommended for consistent paths.
* **Playwright Browsers**: installed by CI or locally via `npx playwright install --with-deps chromium`.
* **Netlify CLI**: *optional* for `netlify dev`; not required for local tests because the emulator serves `dist` + redirects.

> Codespaces tip (resource use \~1.4GB): prefer the **static preview** + redirect emulator over `netlify dev`. See [Troubleshooting](#troubleshooting).

---

## Quick Start

```bash
# 1) Install
npm ci

# 2) Run in dev (Edge OFF by default)
npm run dev   # http://localhost:4322

# 3) Build & preview static bundle
npm run build
npm run preview  # serves dist via emulator with redirects

# 4) Test (Playwright starts its own server)
npm test --silent
```

* Print env snapshot (verifies Edge toggle & BLOG\_BASE):

```bash
npm run env:print
```

---

## Environments & Feature Flags

* **`USE_EDGE`**: `true|false`

  * **Default**: `false` in local/CI to avoid Deno.
  * When `true`, guard script checks Deno availability before starting Edge middleware.
* **`BLOG_BASE`**: Defaults to `/blog/`. Verifiers + codemod ensure no hard-coded base.
* **`MIN_REVIEWS_FOR_AGG`**: Gate for adding `AggregateRating` JSON-LD.

`.env.example`:

```bash
USE_EDGE=false
BLOG_BASE=/blog/
MIN_REVIEWS_FOR_AGG=8
```

Edge guard (called by `dev`/`start`):

```bash
node scripts/guard-deno.js   # validates Deno when USE_EDGE=true
```

---

## Routes & Canonicals

* **Services**

  * **Hubs**: `/services/[service]/`
  * **Spokes**: `/services/[service]/[suburb]/` (canonical)
  * Legacy cluster path → 301 to suburb-only
* **Areas**

  * Index: `/areas/`
  * Hubs: `/areas/[cluster]/`
  * Optional suburb entry: `/areas/[cluster]/[suburb]/`
* **Blog**

  * Cluster hub: `/blog/[cluster]/`
  * Category: `/blog/[cluster]/category/[category]/`
  * Posts: `/blog/[cluster]/[slug]/` (alias clusters 301 → canonical)
* Static: `/privacy`, `/terms`, `/gallery`, `/quote`
* **Sitemap**: `/sitemap.xml` (Cache-Control: 300s)

---

## Redirects (Edge + Emulator)

**Production**: Netlify edge redirects from `public/_redirects` and rules in `netlify.toml` (selected):

```
/blog/ipswich-region      /blog/ipswich      301
/areas/ipswich-region/*   /areas/ipswich/:splat 301
/services/:service/:cluster/:suburb/* /services/:service/:suburb 301
```

**Local tests**: `scripts/serve-with-redirects.mjs` serves `dist` and applies Netlify-style rules, including `:param` and `:splat` substitution, so Playwright redirect specs reflect prod.

Start manually:

```bash
npm run serve:redirects   # uses the emulator on port 4322
```

---

## Synonym Redirect Endpoints (SSR)

SSR `*.ts` pages with `prerender = false` returning `301` to canonical service×suburb:

* `src/pages/bond-cleaners/[suburb].ts`
* `src/pages/end-of-lease-cleaning/[suburb].ts`
* `src/pages/exit-clean/[suburb].ts`
* `src/pages/house-cleaning/[suburb].ts` → `spring-cleaning`
* `src/pages/deep-cleaning/[suburb].ts` → `spring-cleaning`
* `src/pages/bathroom-cleaning/[suburb].ts` → `bathroom-deep-clean`
* `src/pages/shower-screen-restoration/[suburb].ts` → `bathroom-deep-clean`

These preserve `?query#hash` and normalize trailing slashes.

---

## Cross-Service Navigation (Static, Deterministic)

### Why

Previously, the cross-service panel was computed at runtime and sometimes duplicated by both layout and page, causing a11y landmark conflicts and flaky tests. The refactor renders **one** panel with **precomputed** data.

### How it works

1. **Build step** (`scripts/build-cross-service-map.mjs`) emits:

   ```
   src/data/crossServiceMap.json
   {
     "[suburbSlug]": {
       "spring-cleaning": [CrossServiceItem, ...],
       "bathroom-deep-clean": [CrossServiceItem, ...]
     },
     ...
   }
   ```
2. **Sync accessor** (`src/lib/crossService.ts`) exposes:

   * `getCrossServiceItems(suburb, currentService)` → deterministic array (same-suburb or `(nearby)` fallback).
   * `getCrossServiceLinks({ suburbSlug, currentService })` → ready for UI.
3. **Adapter** (`src/lib/serviceNav.adapter.ts`) creates UI props (cards / chips).
4. **Component** inserts **one landmark**:

   * `<nav data-relservices aria-label="Other services and guides">…</nav>`
   * Any legacy “related links” blocks are demoted to `<section role="region">` or given distinct `aria-label`.

### A11y Contract

* Exactly **one** `[data-relservices]` landmark per page.
* Header/footer navigations have **unique** `aria-label`s (e.g., `Primary navigation`, `Footer utility`).
* Avoid anonymous `<nav>` (axe rule: `landmark-unique`).

---

## JSON-LD Strategy

* **Pure builders**: `src/lib/seoSchema.js` (`localBusinessNode`, `serviceAndOfferNodes`, `breadcrumbList`, `faqPageNode`, `aggregateRatingNode`, `reviewNodes`, composer `suburbServiceGraph`).
* **Absolute** `@id` & `url` via `absoluteUrl()`. IDs derived from canonical paths (`entityId()` helper).
* **Single emitter**: `src/components/Schema.astro` prints one script with:

  ```json
  { "@context": "https://schema.org", "@graph": [ ... ] }
  ```
* **Service pages** build `@graph` server-side; `ReviewSection.astro` is presentational only.
* **Safety net**: `scripts/consolidate-ld.mjs` merges any accidental multiples post-build (should be a no-op if sources behave).

Audit (after build):

```bash
node scripts/audit-graph.mjs   # or quick one-liner in README earlier
```

---

## Sitemap & Robots

* `src/pages/sitemap.xml.ts` with `Cache-Control: public, max-age=300`.
* Footer links to `/sitemap.xml`, `/privacy`, `/terms`, `/gallery`, `/quote`.
* `robots.txt` disallows alias/legacy paths → crawlers prefer canonicals.

---

## Testing Strategy

### Playwright projects

* **a11y** (`tests/e2e/a11y.spec.ts`)

  * Injects axe; excludes `iframe`, mapbox canvas, quote form.
  * Enforces **unique landmarks**; `landmark-complementary-is-top-level` rule can be temporarily disabled if markup changes are pending.
* **visual** (`tests/e2e/visual.spec.ts`)

  * Deterministic animations (CSS override), font-load wait, `fullPage`.
  * Low `maxDiffPixelRatio` (e.g., 0.015). Update snapshots only after layout stabilizes.
* **redirects** (`tests/e2e/middleware-redirect.spec.ts`, `redirects.canonical.spec.ts`)

  * Asserts alias → canonical 301/302/307/308; uses **maxRedirects=0** to capture `Location`.
* **smoke/structure** (fast regression)

### Running

```bash
# All
npm test --silent

# Focused (e.g., Accessibility)
npm test --silent -- --grep=Accessibility

# Headed debug
npm run test:headed
```

---

## Build Pipeline & Guardrails

Sequence (simplified):

1. **Prebuild**: route audit, coverage expanders, FAQ builders.
2. **Astro build** (Netlify adapter when `USE_NETLIFY=1`).
3. **Postbuild**:

   * Consolidate JSON-LD.
   * Related links audit (caps & whitelist).
   * Schema validation.
   * Internal link integrity (every root-relative anchor maps to a file).
   * Internal link coverage audit (≥1 in-content link in `<main>`).
4. **Artifacts**: `__ai/` and reports for diagnostics.

Commands:

```bash
npm run build
npm run audit:internal-links
npm run check:links
npm run validate:schema
```

---

## CI Workflows

* **qa.yml**

  * Checks out, caches deps, installs Playwright browsers.
  * `npm ci`, **build once**, runs Playwright against **redirect emulator** (`webServer` in `playwright.config.ts`).
  * Uploads artifacts (test results, report).
* **lhci.yml**

  * Lighthouse CI using `staticDistDir`.
  * Whitespace/tab guards (`verify-no-tabs.mjs`), `.editorconfig` enforces YAML spaces.
* **blog-base-guards.yml**

  * Verifies BLOG\_BASE invariants, extended matrix, codemod drift, sitemap canonicals.
* **ai-review\.yml** (optional)

  * Emits SARIF to PRs when `OPENAI_API_KEY` is present.

Make Edge explicit OFF in CI:

```yaml
env:
  USE_EDGE: "false"
```

---

## Git Hooks (Husky v9/v10)

* **pre-commit (fast)**:

  * Runs blog base verify/codemod when relevant files change.
  * Runs unit tests for path builders/config touches.
  * Skips on merge commits; respect `SKIP_HOOKS=1`.
* **pre-push (heavier)**:

  * Extended blog base verify with `BLOG_BASE=/guides/`.
  * Redirect E2E canary (chromium, fail-fast).

Bypass:

```bash
git commit --no-verify
# or
SKIP_HOOKS=1 git push
```

---

## Performance, Caching & Headers

`netlify.toml` example:

```toml
[[headers]]
  for = "/services/*"
  [headers.values]
  Cache-Control = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800"

[[headers]]
  for = "/assets/*"
  [headers.values]
  Cache-Control = "public, max-age=31536000, immutable"
```

* **No client hydration** on most pages (Astro islands only where needed).
* Preload critical fonts in `MainLayout.astro`.
* Minify HTML/JS/CSS (Astro defaults) and compress at the edge.

---

## Security Notes

* Secrets only via Netlify env; never commit secrets.
* Consider CSP, HSTS, Referrer-Policy, Permissions-Policy (tighten progressively).
* Sanitize any user-submitted strings if forms get added (currently presentational only).

---

## Data Model

* **Areas & clusters**: `src/content/areas.clusters.json` (includes aliases).
* **Service coverage**: `src/data/serviceCoverage.json` (suburb coverage per service).
* **Cross-service map**: `src/data/crossServiceMap.json` (generated).
* **Blog topics**: `src/data/topics.json`.
* **FAQs**: `src/content/faq.service-*.json`.

---

## Project Map

Top-level essentials:

* `astro.config.mjs` – site/integrations; honors `USE_EDGE`.
* `netlify.toml` – headers/redirects.
* `public/_redirects` – primary edge redirects.
* `playwright.config.ts` – runs emulator server; port `4322`.
* `.editorconfig` – enforce spaces (YAML), etc.
* `package.json` – scripts for build/test/guards.

`src/` highlights:

* `pages/` – routes (HTML + SSR redirect endpoints).
* `layouts/` – `MainLayout.astro`, `ServiceLayout.astro`.
* `components/` – **`Schema.astro`**, `ServiceNav.astro`, `Footer.astro`.
* `lib/` – `seoSchema.js`, `crossService.ts`, `serviceNav.adapter.ts`, `str.ts`.
* `utils/` – internal link helpers; adapter for quick links; nearby functions.
* `data/` – coverage & generated maps.

`scripts/` highlights:

* `serve-with-redirects.mjs` – static server + Netlify-style redirects.
* `guard-deno.js` / `check-env.js` – Edge toggle & env printer.
* `build-cross-service-map.mjs` – precompute cross-service nav.
* Audits: routes, schema, internal links, blog base verifiers.

---

## Troubleshooting

### A11y: `landmark-unique`

**Symptom**: axe reports duplicate or anonymous `<nav>`.

**Fix**:

* Ensure only **one** `<nav data-relservices ...>` on page.
* Header/footer get unique `aria-label`s (e.g., `Primary navigation`, `Footer utility`).
* Demote legacy “related links” collections to:

  ```html
  <section role="region" aria-label="Related resources"> ... </section>
  ```
* Rebuild fresh: `rm -rf dist && npm run build`, then `npm test -- --grep=Accessibility`.

### Visual snapshot timeouts / large diffs

* Legit layout changes → **update snapshots** once:

  ```bash
  npx playwright test tests/e2e/visual.spec.ts --update-snapshots
  ```
* Keep masks stable; use animation-disabling CSS (already set).

### `net::ERR_CONNECTION_REFUSED` in E2E or CI

* Ensure server is started. The Playwright config auto-starts the **redirect emulator**.
* If you temporarily switch to a custom server, add a `wait-on` step:

  ```yaml
  - run: npm start -- --port=4322 &
  - run: npx wait-on http://localhost:4322
  ```

### “No tests found”

* Verify `tests/**/*.spec.ts` naming.
* Ensure Playwright’s `testDir` matches and `grep` isn’t over-restrictive.

### Edge/Deno crash locally

* Set `USE_EDGE=false` (default) or install Deno.
* `npm run env:print` to confirm.

### Git hook loops or exit code 130 in terminal

* Exit 130 often indicates SIGINT (e.g., canceled task or watch killed).
* If a hook appears stuck:

  * Run `git status` to ensure no long-running child processes.
  * Bypass once with `--no-verify`, then inspect `.husky/` hook for slow steps.
  * Prefer running heavy checks in CI; keep pre-commit small.

### Codespace high RAM/CPU (\~1.4GB)

* Use **static build + emulator** (avoid `netlify dev`).
* Limit Playwright workers:

  ```bash
  npx playwright test --workers=2
  ```
* Headless only; avoid video/tracing unless needed.
* Close extra VS Code terminals/watchers.
* Disable Edge (`USE_EDGE=false`).

---

## Conventions

* Always generate URLs via helpers (e.g., `paths.*`, `rel.*`) — never hard-code `/blog/`.
* Keep `<main id="main">` around primary content for link audits.
* One page → one JSON-LD emitter.
* All internal links are **root-relative** (`/x/y/`), not absolute (except JSON-LD/SEO where absolute is required).

---

## Release Checklist

1. **Build**: `npm run build` (no errors).
2. **Guardrails**: schema validate, internal link checks pass.
3. **Tests**: `npm test` green; update visual snapshots if intended changes.
4. **LHCI**: scores within budget.
5. **PR checks**: blog base guards / AI review (if enabled) pass.
6. **Netlify Deploy Preview** sanity check (redirects, JSON-LD presence).
7. **Promote** to production.

---

## FAQ

**Q: Can we rename `/blog/` to `/guides/` later?**
A: Yes. BLOG\_BASE verifiers + codemod guard against hard-coded paths; sitemap asserts canonicals.

**Q: Why a single JSON-LD script?**
A: Smaller, cleaner DOM; consistent `@id` and deduping; easier validation.

**Q: Why precompute cross-service nav?**
A: Deterministic UI (+) faster, zero runtime races, stable a11y & visual tests.

**Q: Do we need Netlify CLI for local testing?**
A: No. The redirect emulator mirrors the important bits for Playwright.

---

## Appendix: Key Files & Snippets

### `scripts/serve-with-redirects.mjs` (excerpt: param + splat substitution)

```js
// ... load redirects from public/_redirects
function applyRule(path, rule) {
  // rule.from like /areas/:cluster/*  → /areas/ipswich/:splat
  const rx = toRegex(rule.from);         // captures :params and *
  const m = rx.exec(path);
  if (!m) return null;
  let target = rule.to;
  // replace named params:
  for (const [k, v] of Object.entries(m.groups || {})) {
    target = target.replace(`:${k}`, v);
  }
  // replace splat (.*)
  if (m.groups?.splat) target = target.replace(':splat', m.groups.splat);
  return { location: target, status: rule.status || 301 };
}
```

### `src/components/ServiceNav.astro` (landmark contract)

```astro
<nav data-relservices aria-label="Other services and guides" class="related-links mt-10">
  {services.map(card => (
    <a href={card.href} data-nearby={card.nearby ? 'true' : 'false'} class="block p-4 rounded-lg">
      <span class="font-semibold">{card.title}</span>
      {card.nearby && <span class="ml-2 text-sm">(nearby)</span>}
    </a>
  ))}
  <div class="mt-4">
    <a href={localGuides.href} class="underline">Local guides</a>
  </div>
</nav>
```

### A11y: demote legacy related-links container

```astro
<!-- BEFORE (causes duplicate nav landmark) -->
<nav class="related-links mt-6" data-relblock>

<!-- AFTER -->
<section role="region" aria-label="Related resources" class="related-links mt-6" data-relblock>
```

### `playwright.config.ts` (webServer → emulator)

```ts
webServer: {
  command: 'npm run serve:redirects',
  port: 4322,
  timeout: 60_000,
  reuseExistingServer: !process.env.CI,
},
```

### `scripts/guard-deno.js` (Edge toggle)

```js
if (process.env.USE_EDGE === 'true') {
  try { require('child_process').execSync('deno --version', { stdio: 'ignore' }); }
  catch { throw new Error('USE_EDGE=true but Deno is not available. Install Deno or set USE_EDGE=false.'); }
}
```

### `.github/workflows/qa.yml` (snippets)

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium

- name: Run tests
  env:
    USE_EDGE: "false"
  run: npm test --silent
```

---

If you want this README committed as `README.md`, say the word and I’ll output a ready-to-paste version with any repo-specific badges, NPM scripts table, and contribution guidelines folded in.
---

# One N Done Bond Clean — Astro + Netlify

Production front-end built with **Astro 5** + **Tailwind**, deployed on **Netlify**. The project implements canonical routing, SSR synonym redirects, a consolidated single JSON-LD `@graph`, Playwright E2E (a11y/redirect/visual) with a redirect-aware static server, internal link guardrails, and optional AI reviewers. Local and CI workflows are tuned for stability and fast iteration.

---

## Table of Contents

<!-- toc:start -->

* [What’s in here](#whats-in-here)
* [Architecture overview](#architecture-overview)

  * [Routing model](#routing-model)
  * [Data flow at build time](#data-flow-at-build-time)
  * [Structured data (JSON-LD) model](#structured-data-json-ld-model)
* [Environment & configuration](#environment--configuration)

  * [Required env vars](#required-env-vars)
  * [Feature toggles](#feature-toggles)
  * [Ports & paths](#ports--paths)
* [Local development](#local-development)

  * [Quick start](#quick-start)
  * [With/without Edge](#withwithout-edge)
  * [Previewing the built site](#previewing-the-built-site)
* [Routes and canonicals](#routes-and-canonicals)
* [Synonym redirect endpoints (SSR)](#synonym-redirect-endpoints-ssr)
* [Redirect emulation in tests](#redirect-emulation-in-tests)
* [JSON-LD graphs](#json-ld-graphs)

  * [Emit strategy](#emit-strategy)
  * [Validation](#validation)
* [Sitemap and robots](#sitemap-and-robots)
* [Accessibility](#accessibility)

  * [Landmark rules & invariants](#landmark-rules--invariants)
  * [A11y testing approach](#a11y-testing-approach)
* [Cross-service navigation](#cross-service-navigation)

  * [Static map generation](#static-map-generation)
  * [Adapters and UI](#adapters-and-ui)
* [Tests](#tests)

  * [Playwright projects](#playwright-projects)
  * [Visual snapshots](#visual-snapshots)
  * [Useful test invocations](#useful-test-invocations)
* [Build & guardrails](#build--guardrails)

  * [Pre-build audits](#pre-build-audits)
  * [Post-build audits](#post-build-audits)
  * [Internal link coverage audit](#internal-link-coverage-audit)
* [CI / CD](#ci--cd)

  * [Core workflow](#core-workflow)
  * [Blog base guard workflow](#blog-base-guard-workflow)
  * [Lighthouse / LHCI](#lighthouse--lhci)
* [Git hooks (Husky v9/v10)](#git-hooks-husky-v9v10)
* [Data model](#data-model)
* [Performance & caching](#performance--caching)
* [Security headers](#security-headers)
* [Troubleshooting](#troubleshooting)
* [Conventions](#conventions)
* [Project map: where to find things and why](#project-map-where-to-find-things-and-why)
* [Future work / backlog](#future-work--backlog)
* [License](#license)

<!-- toc:end -->

---

## What’s in here

* **Astro 5** app with **Netlify adapter** (Node 20 pinned).
* **Canonical routes** for services, areas, and blog; **SSR synonym endpoints** that 301 to canonicals.
* **Single JSON-LD `@graph`** per page via central emitter and pure builders.
* **Playwright E2E**: accessibility (axe), redirects (alias→canonical), smoke, visual.
* **Redirect-aware static server** for E2E that understands Netlify style `:params` / `:splat`.
* **Guardrails**: internal link integrity, related-links caps, blog base verifiers, schema validation.
* **Optional AI reviewers** emitting SARIF on PRs.

---

## Architecture overview

### Routing model

* **Services**

  * Hubs: `/services/[service]/`
  * Canonical spokes: `/services/[service]/[suburb]/`
  * Legacy cluster paths redirect to suburb-only.
* **Areas**

  * Index: `/areas/`
  * Hubs: `/areas/[cluster]/`
  * Optional suburb: `/areas/[cluster]/[suburb]/`
* **Blog**

  * Cluster hub: `/blog/[cluster]/`
  * Category: `/blog/[cluster]/category/[category]/`
  * Posts: `/blog/[cluster]/[slug]/`
  * Legacy cluster aliases (e.g., `ipswich-region`) → canonical cluster.

### Data flow at build time

1. **Coverage & content expansion** (pre-build scripts) generate the set of pages.
2. **Cross-service map** is precomputed to a static JSON (deterministic fallback for “nearby”).
3. **Astro build** compiles layouts/pages and injects schema using pure builders.
4. **Post-build guardrails**:

   * Consolidate JSON-LD (safety net).
   * Validate schema shape.
   * Enforce related-links limits and whitelist.
   * Check internal anchors resolve to files.
   * Verify sitemap blog canonicals respect `BLOG_BASE`.

### Structured data (JSON-LD) model

* **LocalBusiness** is the anchor entity with stable `@id`.
* **Service** + **Offer** nodes per canonical page (service×suburb).
* **BreadcrumbList** across the site.
* **AggregateRating** + **Review** nodes conditionally included (thresholded).
* All `@id`/`url` **absolute** and **stable**.

---

## Environment & configuration

### Required env vars

* `SITE_URL` – absolute origin for absolute URLs; used by schema and canonical tags.
* `MIN_REVIEWS_FOR_AGG` – integer threshold to emit AggregateRating.
* `BLOG_BASE` – normalized to leading & trailing slash (e.g., `/blog/`); used by link builders and verifiers.

### Feature toggles

* `USE_EDGE` – **off by default** for local/CI. When `true`, the Netlify Edge dev server (Deno) is required.

  * `scripts/guard-deno.js` validates/aborts if Deno is missing when `USE_EDGE=true`.
* `USE_NETLIFY` – enable Netlify adapter during `astro build` if present.

### Ports & paths

* Local dev: `http://localhost:4322`
* Playwright server: same port, auto-managed by `playwright.config.ts`.

---

## Local development

### Quick start

```bash
npm install
npm run dev                 # Astro dev server on http://localhost:4322
```

Helpful:

```bash
npm run env:print           # Snapshot of env toggles (e.g., USE_EDGE) for debugging
```

### With/without Edge

* **Default**: Edge middleware disabled (`USE_EDGE` not set or `false`).
* **Enable**:

  ```bash
  USE_EDGE=true npm run dev
  ```

  Ensure Deno is installed. The guard script will fail fast if not.

### Previewing the built site

```bash
npm run build
npm run preview             # Netlify adapter preview if configured, else Astro preview
```

---

## Routes and canonicals

* Services: `/services/:service/` and `/services/:service/:suburb/`
* Areas: `/areas/:cluster/` and `/areas/:cluster/:suburb/`
* Blog: `/blog/:cluster/`, `/blog/:cluster/category/:category/`, `/blog/:cluster/:slug/`
* Netlify redirects:

  * `/blog/ipswich-region → /blog/ipswich 301`
  * `/areas/ipswich-region/* → /areas/ipswich/:splat 301`
  * `/services/:service/:cluster/:suburb/* → /services/:service/:suburb 301`

---

## Synonym redirect endpoints (SSR)

SSR `.ts` endpoints (prerender=false) map common synonyms to canonical service×suburb, e.g.:

* `/bond-cleaners/[suburb].ts` → `/services/bond-cleaning/[suburb]/`
* `/end-of-lease-cleaning/[suburb].ts` → `/services/bond-cleaning/[suburb]/`
* `/house-cleaning/[suburb].ts` → `/services/spring-cleaning/[suburb]/`
* `/bathroom-cleaning/[suburb].ts` → `/services/bathroom-deep-clean/[suburb]/`

All return `redirect('/services/...', 301)`.

---

## Redirect emulation in tests

Playwright does **not** run Netlify at the edge, so E2E uses a **redirect-aware static server**:

* Emulates Netlify `_redirects` rules.
* Supports `:params` and `:splat` substitution.
* Ensures redirect tests reflect production behavior.

Typical start (auto by Playwright):

```bash
node scripts/serve-with-redirects.mjs --dir dist --port 4322
```

---

## JSON-LD graphs

### Emit strategy

* **Pure builders** (`src/lib/seoSchema.js`): `localBusinessNode`, `serviceAndOfferNodes`, `breadcrumbList`, `aggregateRatingNode`, `reviewNodes`, composer `suburbServiceGraph`.
* **Single emitter** (`src/components/Schema.astro`): renders exactly **one** `<script type="application/ld+json">` with `@graph`.
* **Service pages** compose their page-specific graph server-side; presentational components do **not** inline schema.

### Validation

* Post-build `scripts/validate-schema.js` checks structure, absolute IDs/URLs, array types, and required properties.
* `scripts/consolidate-ld.mjs` merges accidental multiples into one `@graph` (safety net; target is single emitter).

---

## Sitemap and robots

* `src/pages/sitemap.xml.ts`:

  * Emits canonical URLs for core routes.
  * `Cache-Control: public, max-age=300`.
* `robots.txt`:

  * Disallows legacy alias paths to bias crawlers to canonicals.

---

## Accessibility

### Landmark rules & invariants

* Exactly **one primary `<nav>`** landmark (site header) with a unique `aria-label` (e.g., `Primary navigation`).
* **Cross-service** and **related** collections are **regions** (`<section role="region" aria-label="…">`) unless they are the single dedicated service nav landmark.
* **Footer** may have utility navigation but must have a unique label (e.g., `Footer utility`).

### A11y testing approach

* Playwright + axe-core iterates over a curated URL list.
* Excludes volatile widgets (map canvas, iframes, injected forms).
* Fails on **any** violation; a small allowlist exists for rules that are intentionally suppressed (kept short and documented).

---

## Cross-service navigation

### Static map generation

* `scripts/build-cross-service-map.mjs` precomputes `src/data/crossServiceMap.json` keyed by suburb → currentService → list of **CrossServiceItem**:

  * **Always include** `spring-cleaning` and `bathroom-deep-clean`.
  * If not covered in the current suburb, deterministically pick a **nearby** in the same cluster; else global deterministic fallback.
  * Mark non-local links with **“(nearby)”** in visible text and aria-label.

### Adapters and UI

* `src/lib/crossService.ts` – zero-async lookup helpers:

  * `getCrossServiceItems(suburb, currentService)`
  * `getCrossServiceLinks({ suburbSlug, currentService })` (returns `{ crossServices, localGuides }`)
* `src/lib/serviceNav.adapter.ts` – maps items to component props (label, desc, href, icon, `data-nearby`).
* `ServiceNav.astro` – renders a single, accessible panel:

  * `<nav data-relservices aria-label="Other services and guides">` **or** `<section role="region" …>` depending on page invariants.
  * Cards get `data-nearby="true|false"`.

**A11y guarantee**: Only one `[data-relservices]` landmark on a page. Others are demoted to `role="region"` with unique labels.

---

## Tests

### Playwright projects

* **a11y**: axe across selected URLs; strict (0 violations).
* **redirects**: checks alias → canonical, status codes ∈ {301,302,307,308}, query/hash preserved.
* **visual**: deterministic snapshots (animations off, masks for volatile areas).
* **smoke/structure**: basic presence, layout sanity, JSON-LD presence.

Playwright config auto-starts the redirect-aware server on port 4322.

### Visual snapshots

* Snapshots live under `tests/e2e/visual.spec.ts-snapshots/`.
* `maxDiffPixelRatio` tuned low; when content legitimately changes, update snapshots:

  ```bash
  npx playwright test tests/e2e/visual.spec.ts --update-snapshots
  ```

### Useful test invocations

```bash
# Everything
npm test --silent

# Only a11y
npm test --silent -- --grep=Accessibility

# Redirect canary
npx playwright test tests/e2e/middleware-redirect.spec.ts --reporter=line

# Single route a11y
npm test --silent -- --grep="axe @ /services/bond-cleaning/ipswich/"
```

---

## Build & guardrails

### Pre-build audits

* `audit-routes.mjs` – check for route gaps/collisions.
* `build-faqs.mjs` – compile FAQ content.

### Post-build audits

* `consolidate-ld.mjs` – single `@graph` safety.
* `validate-schema.js` – JSON-LD correctness.
* `audit-related-links.mjs` – card caps and whitelist.
* `assert-sitemap-blog-canonicals.mjs` – blog base in sitemap.
* `check-internal-links.mjs` – no broken internal anchors.

### Internal link coverage audit

Ensures every page’s `<main>` has at least one root-relative `<a>`:

```bash
npm run build --silent || true
npm run audit:internal-links
```

Reports:

* `__ai/internal-links-report.json`
* `__ai/internal-links-missing.txt`
* Suggestions under `__ai/internal-link-suggestions/*.html`

---

## CI / CD

### Core workflow

Typical steps (simplified):

1. `actions/setup-node@v4` (Node 20) + `npm ci`
2. `npx playwright install --with-deps chromium`
3. **Build once**
4. **Start server** (or let Playwright manage webServer)
5. **Wait-on** `http://localhost:4322`
6. Run **unit**, **a11y**, **redirect**, **visual** tests
7. Upload **test-results** and **playwright-report** artifacts

### Blog base guard workflow

Prevents hard-coded `/blog/` regressions:

* Matrix runs with `BLOG_BASE=[/blog/, /guides/]`
* Verifies source & built output respect the base
* Codemod drift detector ensures generated rewrites are applied/committed

### Lighthouse / LHCI

* Optional LHCI workflow runs against `dist/` or preview URL
* Budgets can enforce min scores and size regressions
* YAML indentation guards installed (`verify-no-tabs.mjs`, `.editorconfig`)

---

## Git hooks (Husky v9/v10)

* **pre-commit** (fast, path-aware):

  * Blog base strict verify & codemod drift (only when relevant files changed)
  * Unit tests for path helpers/config deltas
* **pre-push** (heavier):

  * Extended blog base verify (`BLOG_BASE=/guides/`)
  * Redirect E2E (chromium, fail-fast)

Bypass:

```bash
SKIP_HOOKS=1 git commit -m "..."   # or: git commit --no-verify
```

---

## Data model

* Areas & clusters (with aliases): `src/content/areas.clusters.json`
* Service coverage by suburb: `src/data/serviceCoverage.json`
* Cross-service precomputed map: `src/data/crossServiceMap.json`
* Blog topics: `src/data/topics.json`
* FAQs / acceptance content: `src/content/faq.service-*.json`, `src/content/acceptance.bond-clean.json`

---

## Performance & caching

Recommended Netlify headers (example):

```toml
[[headers]]
  for = "/services/*"
  [headers.values]
  Cache-Control = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800"
```

* Static assets: long-term cache with content hashing.
* HTML: shorter max-age to account for content edits; rely on CDN.

---

## Security headers

Consider `_headers` or `netlify.toml` entries:

* `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
* `Content-Security-Policy` tuned for Astro output + analytics providers (non-inline where possible)
* `X-Content-Type-Options: nosniff`
* `Referrer-Policy: strict-origin-when-cross-origin`
* `Permissions-Policy` for camera/mic/geolocation as appropriate

---

## Troubleshooting

**A11y “landmark-unique” failures**

* Symptom: axe reports duplicate navs (e.g., header + cross-service + related).
* Fix:

  * Ensure **only one** `<nav>` landmark aside from header/footer; demote others to `<section role="region">`.
  * Give **unique `aria-label`s** to all landmarks/regions.
  * Verify rendered HTML in `dist/` actually reflects changes (do a clean rebuild).

**Edge dev server crash**

* Symptom: `Could not establish a connection to the Netlify Edge Functions local development server`.
* Fix: Keep `USE_EDGE` **false** locally/CI unless you have Deno set up. Guard script aborts early if misconfigured.

**Redirect tests stuck on legacy path**

* Symptom: stays on `/blog/ipswich-region/`.
* Fix: Use the **redirect-aware server** for Playwright; confirm it resolves `:splat`/`:params`.

**Visual diffs too large**

* Symptom: high diff ratio, heights changed.
* Fix: confirm intentional UI/content change → update snapshots; otherwise mask volatile regions or stabilize CSS (disable animations already applied).

---

## Conventions

* Generate links via centralized helpers; avoid hard-coding `/blog/`.
* Keep `@id`/`url` **absolute** in JSON-LD.
* Prefer SSR endpoints for synonyms; always 301 to canonical.
* Demote non-primary navs to **regions** with clear labels.

---

## Project map: where to find things and why

**Top-level**

* `astro.config.mjs` – site URL, integrations, edge toggle
* `netlify.toml` – redirects/headers
* `playwright.config.ts` – E2E server/project config
* `package.json` – scripts & pipelines
* `.editorconfig` – whitespace policy; YAML is spaces-only
* `scripts/` – audits, validators, redirect server, guards

**Source (`src/`)**

* `pages/` – routes & SSR redirects
* `layouts/` – shared shells; JSON-LD emitter included by pages
* `components/` – UI (e.g., `ServiceNav.astro`)
* `lib/` – SEO/schema builders, cross-service adapters
* `utils/` – site/path helpers
* `data/` / `content/` – curated datasets
* `middleware.*` – optional Edge hooks (opt-in)

**Tests**

* `tests/e2e/*.spec.ts` – a11y, redirects, visual, smoke, structure
* `test-results/` – Playwright artifacts
* Optional `cypress/` for legacy specs

---

## Future work / backlog

**Short-term**

1. Fully remove legacy cross-service components after a release cycle.
2. Add Lighthouse budgets to CI (perf, a11y).
3. Automate visual re-baseline with human approval.
4. Weight “nearby” selection by distance/frequency if geo granularity grows.
5. Unit tests for cross-service map builder edge cases.
6. Schema diff test to detect structural drift.

**Mid-term**
7\. Retire Cypress; standardize on Playwright.
8\. Automate coverage staleness detection against business source (if/when available).
9\. Optional client JSON for quick suburb switching powered by the static map.
10\. Retire `consolidate-ld.mjs` once single-emitter confidence is high.
11\. A11y snapshotting (ruleset diff) to highlight net new violations.

**Long-term**
12\. Edge features (headers/geo) gated behind `USE_EDGE=true`.
13\. Reduce JS via no-island pages where possible.
14\. Consider per-link `Service` types in JSON-LD if beneficial.
15\. Inject freshness metadata (`dateModified`) into schema for posts/pages.

---

## License

MIT

---

### Command cheat-sheet

```bash
# Dev
npm run dev
npm run preview

# Build pipeline + guards
npm run build

# E2E (all)
npm test --silent

# E2E (a11y only)
npm test --silent -- --grep=Accessibility

# Redirects canary
npx playwright test tests/e2e/middleware-redirect.spec.ts --reporter=line

# Visual snapshots (update baselines)
npx playwright test tests/e2e/visual.spec.ts --update-snapshots

# Blog base guards
npm run ai:blog:verify
BLOG_BASE=/guides/ npm run ai:blog:verify:ext

# Internal link audit (postbuild)
npm run audit:internal-links
```

If you want this document checked into `README.md` as-is or split into `docs/` with a shorter README and deep-dive pages, I can provide the exact file structure and copy blocks to drop in.
--

Here’s a more complete, production-grade README you can drop into the repo. It’s organized, opinionated, and includes concrete commands, code snippets, and troubleshooting steps for the exact failure modes we’ve seen (redirects, Playwright server, Edge/Deno, a11y landmarks, visual snapshots). It also documents the new cross-service nav pipeline and the Edge toggle.

---

# One N Done Bond Clean — Astro + Netlify

Production front-end built with **Astro 5** + **Tailwind**, deployed on **Netlify**. Canonical routing, SSR synonym redirects, consolidated JSON-LD graphs, Playwright tests (a11y/visual/redirects), internal link integrity guardrails, and optional AI reviewers.

> TL;DR
>
> * Dev: `npm i && npm run dev` → [http://localhost:4322](http://localhost:4322)
> * Test (full): `npm test`
> * Build: `npm run build && npm run preview`
> * Edge middleware is **opt-in** (`USE_EDGE=true`) and guarded.

---

## Table of Contents

<!-- toc:start -->

* [What’s in here](#whats-in-here)
* [Prerequisites & quick start](#prerequisites--quick-start)
* [Environment variables](#environment-variables)
* [Routes and canonicals](#routes-and-canonicals)
* [Redirects (Netlify + local emulator)](#redirects-netlify--local-emulator)
* [Synonym redirect endpoints (SSR)](#synonym-redirect-endpoints-ssr)
* [Cross-service navigation (static, deterministic)](#crossservice-navigation-static-deterministic)
* [Accessibility (landmarks, axe, unique names)](#accessibility-landmarks-axe-unique-names)
* [JSON-LD graphs (single emitter)](#jsonld-graphs-single-emitter)
* [Sitemap and robots](#sitemap-and-robots)
* [Tests (Playwright + Vitest)](#tests-playwright--vitest)
* [Build & guardrails pipeline](#build--guardrails-pipeline)
* [Internal link coverage audit](#internal-link-coverage-audit)
* [CI and AI review](#ci-and-ai-review)
* [Edge middleware toggle (Deno)](#edge-middleware-toggle-deno)
* [Troubleshooting guide](#troubleshooting-guide)
* [Conventions & contributing](#conventions--contributing)
* [Project map: where to find things and why](#project-map-where-to-find-things-and-why)
* [Operational playbook](#operational-playbook)
* [Backlog / future work](#backlog--future-work)
* [License](#license)

<!-- toc:end -->

---

## What’s in here

* **Astro 5** + Netlify adapter (Node 20 pinned)
* Canonical route architecture (services, areas, blog)
* **SSR** endpoints for **synonyms → 301** canonical
* **Single JSON-LD emitter** (centralized `@graph`)
* Playwright **E2E**: a11y (axe), visual, redirects, smoke
* Pre- and post-build **guardrails** (routes, schema, links)
* **Edge middleware** feature-gated (`USE_EDGE`)
* Optional **AI reviewers** (PR SARIF)

---

## Prerequisites & quick start

* **Node 20** (LTS), **npm** 9+
* (Optional) **Deno** if experimenting with Edge (`USE_EDGE=true`)
* **Playwright browsers** (installed automatically in CI; locally: `npx playwright install --with-deps chromium`)

```bash
npm install
npm run dev                 # http://localhost:4322 (Edge OFF)
npm run build && npm run preview
npm test                    # E2E (webServer auto-starts)
```

---

## Environment variables

**.env.example** ships with safe defaults:

```ini
# Edge middleware toggle (OFF by default)
USE_EDGE=false

# Blog base (kept normalized / validated by guards)
BLOG_BASE=/blog/

# Reviews / schema config (example)
MIN_REVIEWS_FOR_AGG=10
```

Helper scripts:

```bash
npm run env:print    # quick snapshot (prints resolved env)
node scripts/check-env.js
```

> Guard: `scripts/guard-deno.js` prevents starting Edge locally/CI unless `USE_EDGE=true` and `deno` is available.

---

## Routes and canonicals

**Services**

* Hubs: `/services/[service]/`
* Spokes (canonical): `/services/[service]/[suburb]/`
* Legacy cluster path 301 → suburb-only (Netlify)

**Areas**

* Index: `/areas/`
* Cluster hub: `/areas/[cluster]/`
* Optional suburb: `/areas/[cluster]/[suburb]/`

**Blog**

* Cluster hub: `/blog/[cluster]/`
* Category: `/blog/[cluster]/category/[category]/`
* Posts: `/blog/[cluster]/[slug]/`

  * Alias clusters 301 → canonical cluster

**Static**: `/privacy`, `/terms`, `/gallery`, `/quote`
**Sitemap**: `/sitemap.xml` (cache: 300s)

---

## Redirects (Netlify + local emulator)

Primary rules live in `public/_redirects` (Edge). Some may also exist in `netlify.toml`.

Examples:

```
# Blog alias clusters
/blog/ipswich-region      /blog/ipswich 301

# Areas cluster rename (preserves tail)
/areas/ipswich-region/*   /areas/ipswich/:splat 301

# Legacy service path with cluster → suburb-only
/services/:service/:cluster/:suburb/*   /services/:service/:suburb 301
```

**Local parity for tests**
Playwright uses a small server that **reads `dist/_redirects`** and supports **`:param`** and **`:splat`** substitutions, so redirect specs match production.

Run manually:

```bash
npm run build
npm run serve:redirects   # serves ./dist with redirects (port 4322)
```

---

## Synonym redirect endpoints (SSR)

TS endpoints under `src/pages/*/[suburb].ts` perform **301** to canonical service×suburb. Each:

* `export const prerender = false;`
* `return redirect('/services/…', 301)`

Examples:

* `bond-cleaners/[suburb].ts` → bond-cleaning
* `end-of-lease-cleaning/[suburb].ts` → bond-cleaning
* `house-cleaning/[suburb].ts` → spring-cleaning
* `bathroom-cleaning/[suburb].ts` → bathroom-deep-clean

---

## Cross-service navigation (static, deterministic)

### Why

Old runtime logic occasionally rendered duplicates / empties and tripped a11y. The new pipeline is **build-time**, **synchronous**, and **deterministic**.

### Pipeline

1. **Build step** produces `src/data/crossServiceMap.json` with:

   ```json
   {
     "ipswich": {
       "bond-cleaning": [
         { "label": "Spring Cleaning", "href": "/services/spring-cleaning/ipswich/", "here": true, "data": { "service":"spring-cleaning","suburb":"ipswich","source":"same-suburb" } },
         { "label": "Bathroom Deep Clean (nearby)", "href": "/services/bathroom-deep-clean/redbank/", "here": false, "data": { "service":"bathroom-deep-clean","suburb":"redbank","source":"nearby" } }
       ]
     }
   }
   ```
2. **Sync accessor** in `src/lib/crossService.ts`:

   * `getCrossServiceItems(suburb, currentService)` → `CrossServiceItem[]`
   * `getCrossServiceLinks({ suburbSlug, currentService })` → `{ crossServices, localGuides }`
3. **Adapter** maps items to UI:

   * `src/lib/serviceNav.adapter.ts` → `toServiceCards`, `toPopularSuburbs`
4. **Component**:

   * `ServiceNav.astro` renders a **single** `<nav data-relservices aria-label="Other services and guides">`
   * Non-primary collections that used to be `<nav>` are now `<section role="region">`

### Test selector

* E2E looks for `[data-relservices]` and validates link semantics (nearby vs here).

---

## Accessibility (landmarks, axe, unique names)

Axe rule failures we fixed/guarded:

* **`landmark-unique`**: all `<nav>` landmarks must be **unique by accessible name**

  * Header: `aria-label="Primary navigation"`
  * Cross-service: `aria-label="Other services and guides"`
  * Footer: `aria-label="Footer utility"`
* Non-navigational blocks demoted: `<section role="region">` with an accessible name (or a heading).

In tests:

* `a11y.spec.ts` runs `page.addScriptTag` with Axe and excludes map/iframes/forms for stability.
* If you **add another nav**, give it an **explicit, unique** `aria-label`.

---

## JSON-LD graphs (single emitter)

* Pure builders: `src/lib/seoSchema.js`
* Absolute `@id`/`url` via `absoluteUrl()` and `entityId()`
* Single emitter component: `src/components/Schema.astro`
* Service spoke pages compose one `@graph` with:

  * LocalBusiness, `Service` + `Offer`, breadcrumbs
  * Optional `AggregateRating` + top `Review` nodes if `MIN_REVIEWS_FOR_AGG` met
* **No component** should inline its own `<script type="application/ld+json">`
  ➜ Presentational components (e.g., ReviewSection) are UI-only.

**Guard:** `scripts/consolidate-ld.mjs` still merges multiple scripts if they ever slip back in (safety net).

Audit:

```bash
npm run build --silent
node -e "const fs=require('fs'),p=require('path');let c=0;function* w(d){for(const f of fs.readdirSync(d)){const fp=p.join(d,f),s=fs.statSync(fp);if(s.isDirectory())yield* w(fp);else if(f.endsWith('.html'))yield fp}};for(const f of w('dist')){const h=fs.readFileSync(f,'utf8');const s=[...h.matchAll(/<script[^>]+type=\"application\\/ld\\+json\"[^>]*>([\\s\\S]*?)<\\/script>/gi)].length;if(s){c++;if(s>1)console.log('multi:',f.replace(/^dist\\//,''),s)}};console.error('pages with JSON-LD:',c)"
```

---

## Sitemap and robots

* `src/pages/sitemap.xml.ts` (cache 300s)
* Footer links include sitemap/legal/gallery/quote
* `robots.txt` **disallows alias paths**, encouraging crawlers to prefer canonical URLs.

---

## Tests (Playwright + Vitest)

**Playwright projects**:

* a11y (Axe): `tests/e2e/a11y.spec.ts`
* redirects: `tests/e2e/middleware-redirect.spec.ts`, `tests/e2e/redirects.canonical.spec.ts`
* visual: `tests/e2e/visual.spec.ts`
* smoke/structure/intent: `tests/e2e/*.spec.ts`

**Server strategy**
Playwright auto-starts a **static server** with Netlify redirect parity:

```ts
// playwright.config.ts (excerpt)
webServer: {
  command: 'npm run serve:redirects',
  port: 4322,
  reuseExistingServer: !process.env.CI,
}
```

**Common commands**

```bash
npx playwright test tests/synonym-redirects.canary.spec.ts --reporter=line
npm test --silent                   # full suite
npm run test:e2e --silent           # e2e only
# Update visual baselines when intended changes land:
npx playwright test tests/e2e/visual.spec.ts --update-snapshots
```

**Vitest**

```bash
npm run test:unit
```

---

## Build & guardrails pipeline

Triggered by `npm run build`:

1. **Prebuild** (routes sanity)
2. **Build FAQs**
3. **Astro build** (Netlify adapter honored when `USE_NETLIFY=1`)
4. **Postbuild guards**

   * `consolidate-ld.mjs` (single `@graph`)
   * `audit-related-links.mjs`
   * `validate-schema.js`
   * `assert-sitemap-blog-canonicals.mjs`
   * `check-internal-links.mjs`
   * `audit-internal-links.mjs` (≥ 1 in-content link per page)

> Build fails hard on broken links / schema errors. This is on purpose.

---

## Internal link coverage audit

Ensures every page has ≥ 1 **meaningful** in-content internal link inside `<main>`:

```bash
npm run build || true
npm run audit:internal-links
```

Artifacts:

* `__ai/internal-links-report.json`
* `__ai/internal-links-missing.txt`
* `__ai/internal-link-suggestions/*.html`

To fix: add contextual links early in copy; ensure `[data-relservices]` renders on service/blog pages as designed.

---

## CI and AI review

* **QA workflow**: installs Playwright, builds once, starts the redirect-aware server, runs e2e
* **Blog base guards**: verify default/alt `BLOG_BASE`, codemod drift, sitemap canonicals
* **AI reviewers** (optional): push SARIF to PRs when `OPENAI_API_KEY` present

Recommended job snippets:

```yaml
# Ensure Edge is OFF in CI
env:
  USE_EDGE: "false"

# Start + wait for server before e2e
- name: Build site
  run: npm run build --silent

- name: Start server (redirect parity)
  run: npm run serve:redirects &

- name: Wait for server
  run: npx wait-on http://localhost:4322

- name: E2E tests
  run: npm run test:e2e --silent
```

---

## Edge middleware toggle (Deno)

* Default **OFF** (`USE_EDGE=false`), so local/CI won’t try to spin Edge/Deno.
* To experiment locally:

  ```bash
  deno --version      # ensure installed
  USE_EDGE=true npm run dev
  ```
* Guard rails:

  * `scripts/guard-deno.js` runs before dev/start to validate Deno presence.
  * `astro.config.mjs` branches integrations using `USE_EDGE`.

---

## Troubleshooting guide

### 1) **Playwright `net::ERR_CONNECTION_REFUSED` / “No tests found”**

* Start server explicitly or ensure Playwright `webServer` is configured.
* Use the redirect-aware server: `npm run serve:redirects`.
* Confirm spec filenames end with `.spec.ts`.

### 2) **Edge/Deno crash**

```
Error: Could not establish a connection to the Netlify Edge Functions local development server
```

* Set `USE_EDGE=false` (default), or install Deno (`brew install deno`) before enabling Edge.

### 3) **Axe: `landmark-unique`**

* You have two `<nav>` with same accessible name or an unlabeled `<nav>`.
* Fix by:

  * Ensuring only one `[data-relservices]` nav.
  * Giving distinct `aria-label`s:

    * Header: `Primary navigation`
    * Cross-service: `Other services and guides`
    * Footer: `Footer utility`
  * Demote non-nav collections to `<section role="region">`.

### 4) **Visual snapshots timing out / huge diffs**

* Intentional layout changes → update baselines:

  ```bash
  npx playwright test tests/e2e/visual.spec.ts --update-snapshots
  ```
* If only content height changed, consider raising `maxDiffPixelRatio` **slightly** or masking dynamic blocks.

### 5) **Redirect tests stick at legacy path**

* Ensure the local server performs `:param` and `:splat` substitution (use `serve:redirects`).
* Check `public/_redirects` ordering (first match wins).

### 6) **Git shows hundreds of changed files unexpectedly**

* Likely CRLF ↔ LF or tab/nbsp issues. We ship:

  * `.editorconfig` (2-space YAML, LF)
  * `scripts/verify-no-tabs.mjs` (CI step).
    Run: `npm run verify:yaml`.

---

## Conventions & contributing

* **Branch names**: `feat/…`, `fix/…`, `chore/…`, `docs/…`
* **Commits**: Conventional commits (`feat:`, `fix:`, `chore:`)
* **Hooks** (Husky):

  * **pre-commit**: blog base guards (only when relevant files change) + targeted unit tests
  * **pre-push**: extended blog base verify with `BLOG_BASE=/guides/` + redirect E2E (chromium)
* **Escape hatches**: `SKIP_HOOKS=1 git commit …`, `git commit --no-verify`

---

## Project map: where to find things and why

**Top-level**

* `astro.config.mjs` — site/integrations (Tailwind, Netlify adapter, Edge gate)
* `netlify.toml` — platform settings, headers, fallback redirects
* `public/_redirects` — authoritative redirect rules (Edge)
* `playwright.config.ts` — e2e config (port 4322, redirect server)
* `tailwind.config.js` — styling
* `package.json` — scripts/deps
* `_headers`, `robots.txt` — headers/robots control

**Source (`src/`)**

* `pages/…` — routes, SSR synonym endpoints
* `layouts/…` — shells (Main, Service)
* `components/…` — e.g. `Schema.astro`, `Footer.astro`, `ServiceNav.astro`
* `lib/…` — **crossService.ts**, **serviceNav.adapter.ts**, schema builders
* `utils/…` — link/path helpers, adapters (legacy adapters remain as pass-throughs where needed)
* `data/…` — `serviceCoverage.json`, `crossServiceMap.json`
* `content/…` — `areas.clusters.json`, FAQs, acceptance copy

**Scripts (`scripts/`)**

* `build-cross-service-map.mjs` — precompute cross-service items
* `serve-with-redirects.mjs` — static server + Netlify-style redirects (tests)
* `consolidate-ld.mjs`, `validate-schema.js`, `audit-related-links.mjs`
* `verify-blog-base*.mjs`, `codemod-blog-base.mjs`
* `check-internal-links.mjs`, `audit-internal-links.mjs`
* `guard-deno.js`, `check-env.js`, `verify-no-tabs.mjs`

**Tests**

* `tests/e2e/*.spec.ts` — a11y, redirects, visual, structure, smoke, intent
* `js/__tests__/…` or `src/**/__tests__/**` — Vitest

---

## Operational playbook

### Deploy

* Netlify deploys from `dist/` + `_redirects` + `netlify.toml`
* Build command: `npm ci && npm run build`

### Rollback

* Re-deploy previous successful build on Netlify
* Or revert PR → branch protection triggers CI → re-deploy

### Caching & headers

* Services:

  ```toml
  [[headers]]
    for = "/services/*"
    [headers.values]
    Cache-Control = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800"
  ```
* Images/static under `public/` inherit Netlify defaults (tune if needed)

### Performance budgets (suggested)

* LCP ≤ 2.5s (P75 mobile)
* CLS ≤ 0.1
* Keep pages **no-JS** by default (Astro islands only where necessary)

---

## Backlog / future work

* Phase out legacy `CrossServiceLinks` entirely (code removal after a release)
* Lighthouse budgets in CI
* Visual snapshot auto-rebaseline workflow (manual approve)
* Richer nearby selection (weighted adjacency)
* Schema diff checks (hash `@graph`)
* Migrate any Cypress remnants → Playwright
* Optional client JSON manifest for instant suburb switchers (powered from the same static map)
* Accessibility snapshot diffs (axe ruleset delta)

---

## License

MIT

---

### Appendix: handy snippets

**Serve with redirects locally (matches Netlify)**

```bash
npm run build
npm run serve:redirects
# open http://localhost:4322 and test a legacy path; verify 301/302/307/308 Location
```

**Run only a11y**

```bash
npm test --silent -- --grep=Accessibility
```

**Fix `landmark-unique` quickly (example)**

```astro
<!-- Header -->
<nav aria-label="Primary navigation" class="container mx-auto ...">…</nav>

<!-- Cross-service (single) -->
<nav data-relservices aria-label="Other services and guides" class="related-links mt-10">…</nav>

<!-- Footer -->
<nav aria-label="Footer utility" class="...">…</nav>

<!-- Related blocks that are not true navigation -->
<section role="region" aria-label="Related content">…</section>
```

**Update visual baselines intentionally**

```bash
npx playwright test tests/e2e/visual.spec.ts --update-snapshots
git add tests/e2e/visual.spec.ts-snapshots
```

**Edge toggle**

```bash
# OFF (default)
npm run dev

# ON (requires Deno)
USE_EDGE=true npm run dev
```

If you want this split into multiple docs (e.g., `docs/architecture.md`, `docs/testing.md`, `docs/ops.md`) I can provide those files with cross-links.
---
# One N Done Bond Clean — Astro + Netlify (Deep-Dive Technical Guide)

Production app built on **Astro 5**, **Tailwind**, and **Netlify** (Node 20). This guide documents routing & redirects, SSR synonym endpoints, consolidated JSON-LD, Playwright test setup (a11y, visual, redirects, smoke), link-integrity guards, Edge/Deno toggle, data contracts, CI, and day-to-day ops.

---

## Quick start

```bash
# prerequisites
node -v          # 20.x
npm ci

# local dev
npm run dev      # http://localhost:4322  (Edge off by default)

# full build with guardrails
npm run build

# preview prod behavior locally (adapter preview)
npm run preview

# test suites
npm test                       # full Playwright
npm run test:unit              # vitest
npx playwright test tests/e2e/synonym-redirects.canary.spec.ts
```

**Environment** (see `.env.example`):

```ini
# Edge functions are OFF locally/CI unless explicitly enabled
USE_EDGE=false

# Optional non-default blog base rehearsal (CI jobs vary this)
BLOG_BASE=/blog/

# Reviews → AggregateRating gate
MIN_REVIEWS_FOR_AGG=12

# Canonical origin (used when building absolute schema URLs)
SITE_URL=https://www.onendone.com.au
```

---

## Routes & canonicals

| Area                         | Path pattern                                                                          | Canonical? | Notes                                   |
| ---------------------------- | ------------------------------------------------------------------------------------- | ---------- | --------------------------------------- |
| **Service hub**              | `/services/[service]/`                                                                | ✅          | Hub landing for a service               |
| **Service spoke**            | `/services/[service]/[suburb]/`                                                       | ✅          | Canonical detail per suburb             |
| **Legacy service w/cluster** | `/services/:service/:cluster/:suburb/*`                                               | ❌          | **301 →** `/services/:service/:suburb/` |
| **Areas**                    | `/areas/`, `/areas/[cluster]/`, `/areas/[cluster]/[suburb]/`                          | ✅          | Suburb entry renders service layout     |
| **Blog**                     | `/blog/[cluster]/`, `/blog/[cluster]/category/[category]/`, `/blog/[cluster]/[slug]/` | ✅          | Cluster aliases **301** to canonical    |
| **Sitemap**                  | `/sitemap.xml`                                                                        | ✅          | Cache-control 300s                      |
| **Utility**                  | `/privacy`, `/terms`, `/gallery`, `/quote`                                            | ✅          | Static pages                            |

**Redirects** live primarily in `public/_redirects` (Edge) and sometimes `netlify.toml`.

### Netlify redirect examples

`public/_redirects`:

```
/blog/ipswich-region      /blog/ipswich      301
/areas/ipswich-region/*   /areas/ipswich/:splat  301
/services/:service/:cluster/:suburb/*   /services/:service/:suburb  301
```

> Local E2E runs use a redirect-aware static server to emulate Netlify behavior (handles `:param` and `:splat`).

---

## Synonym redirect endpoints (SSR)

Each synonym is an **Astro endpoint** (TypeScript) that **301s** to canonical service×suburb. All endpoints include `export const prerender = false;`.

**Pattern**: `src/pages/<synonym>/[suburb].ts`

```ts
// e.g. src/pages/end-of-lease-cleaning/[suburb].ts
import type { APIRoute } from 'astro';
export const prerender = false;

export const GET: APIRoute = ({ params, redirect }) => {
  const suburb = params.suburb!.toLowerCase();
  // canonical: “bond-cleaning”
  return redirect(`/services/bond-cleaning/${suburb}/`, 301);
};
```

Covered synonyms (examples): `bond-cleaners`, `end-of-lease-cleaning`, `exit-clean`, `house-cleaning` → `spring-cleaning`, `deep-cleaning` → `spring-cleaning`, `bathroom-cleaning` → `bathroom-deep-clean`, `shower-screen-restoration` → `bathroom-deep-clean`.

---

## Accessibility landmarks (policy & fixes)

**Policy**:

* Exactly one **primary** page navigation landmark (usually header `<nav aria-label="Primary navigation">`).
* Cross-service section is **not** a second `<nav>`; it’s a **region** with `role="region"` and an accessible name.
* Footer sub-nav uses a unique label (e.g., `aria-label="Footer utility"`).

**Common axe failures & cures**:

* `landmark-unique`: ensure labels are unique (`Primary navigation`, `Other services and guides`, `Footer utility`).
* `landmark-complementary-is-top-level`: `<aside>` must not be nested inside another landmark; or give it a unique `aria-label` and ensure it’s not inside `<nav>`/`main` improperly.

---

## JSON-LD strategy

**Single emitter**: `src/components/Schema.astro` outputs one `<script type="application/ld+json">` per page with a **single `@graph`**.

**Builders** (`src/lib/seoSchema.js`):

* `localBusinessNode()`, `serviceAndOfferNodes()`, `breadcrumbList()`, `faqPageNode()`, `aggregateRatingNode()`, `reviewNodes()`.
* Composer `suburbServiceGraph({ service, suburb, url, … })`.

**Absolute IDs/URLs**:

* All `@id` and `url` built via `absoluteUrl(SITE_URL, path)`.

**Example output (abbreviated)**:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LocalBusiness",
      "@id": "https://…/schema/local-business",
      "name": "One N Done Bond Clean",
      "url": "https://…/services/bond-cleaning/ipswich/"
    },
    {
      "@type": "Service",
      "@id": "https://…/schema/service/bond-cleaning/ipswich",
      "serviceType": "Bond Cleaning",
      "areaServed": "Ipswich, QLD"
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://…/schema/breadcrumbs",
      "itemListElement": [ … ]
    }
  ]
}
```

**Guards**:

* Post-build `scripts/consolidate-ld.mjs` merges accidental multiples into single `@graph`.
* `scripts/validate-schema.js` sanity checks JSON-LD shape.
* Playwright verifies presence of a single script per page.

---

## Internal link integrity

* **Build guard**: `scripts/check-internal-links.mjs` crawls `dist/**/*.html`, normalizes root-relative anchors, ensures the target exists → **fails build** on any dead link.
* **Coverage audit**: `scripts/audit-internal-links.mjs` enforces ≥1 meaningful in-content link per page. Outputs:

  * `__ai/internal-links-report.json`
  * `__ai/internal-links-missing.txt`
  * Suggestions under `__ai/internal-link-suggestions/*.html`

**Run**:

```bash
npm run build || true
npm run audit:internal-links
```

---

## Cross-service navigation (deterministic)

### Data build step

`scripts/build-cross-service-map.mjs` precomputes `src/data/crossServiceMap.json`:

```json
{
  "ipswich": {
    "bond-cleaning": [
      { "label": "Spring Cleaning", "href": "/services/spring-cleaning/ipswich/", "here": true, "data": { "service": "spring-cleaning", "suburb": "ipswich" } },
      { "label": "Bathroom Deep Clean (nearby)", "href": "/services/bathroom-deep-clean/booval/", "here": false, "data": { "service": "bathroom-deep-clean", "suburb": "booval", "source": "nearby" } }
    ]
  }
}
```

**Fallback algorithm**:

1. Prefer **same-suburb** if covered.
2. Else prefer **in-cluster** nearby by deterministic order (adjacency list).
3. Else deterministic global first that’s covered.
4. Mark non-here items with visible suffix **“(nearby)”** and include `here:false` in data for analytics/tests.

### Sync accessors

`src/lib/crossService.ts`:

```ts
export function getCrossServiceItems(suburb: string, currentService: string) {
  return map[suburb]?.[currentService] ?? [];
}
export function getCrossServiceLinks({ suburbSlug, currentService }) {
  const crossServices = getCrossServiceItems(suburbSlug, currentService);
  const localGuides = getLocalBlogLink(suburbSlug); // BLOG_BASE-aware
  return { crossServices, localGuides };
}
```

### Component contract

`ServiceNav.astro` (single landmark or region):

```astro
---
// props: { services: Array<{title, desc, href, nearby?: boolean}>, localGuidesHref: string }
const { services = [], localGuidesHref } = Astro.props;
---
<section role="region" aria-label="Other services and guides" data-relservices>
  <ul class="grid …">
    {services.map(s => (
      <li>
        <a href={s.href} data-nearby={s.nearby ? 'true' : 'false'}>
          <span>{s.title}{s.nearby ? ' (nearby)' : ''}</span>
          <p>{s.desc}</p>
        </a>
      </li>
    ))}
  </ul>
  <p class="mt-6">
    <a class="text-link" href={localGuidesHref}>Local guides</a>
  </p>
</section>
```

> **A11y**: We intentionally use a **region** (not `<nav>`) to avoid duplicate navigation landmarks. The **header** remains the single primary `<nav>`.

---

## Testing (Playwright)

### Config essentials

`playwright.config.ts` (excerpt):

```ts
import { defineConfig } from '@playwright/test';
const PORT = 4322;

export default defineConfig({
  timeout: 30_000,
  retries: 0,
  webServer: {
    command: 'node scripts/serve-with-redirects.mjs dist --port=4322',
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    // optional: visual/a11y separate projects if desired
  ],
});
```

### Redirect-aware static server

`scripts/serve-with-redirects.mjs` (core idea):

```js
#!/usr/bin/env node
// 1) Read public/_redirects → compile rules
// 2) On incoming request, if match: substitute :params and :splat → send 301/302/307/308 with Location
// 3) Else serve static from dist

// Pseudocode for substitution:
function substitute(target, params) {
  return target
    .replace(/:splat/g, params.splat || '')
    .replace(/:([a-zA-Z_]+)/g, (_, k) => params[k] ?? '');
}
```

### A11y tests (axe)

`tests/e2e/a11y.spec.ts` (pattern):

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/areas/ipswich/', '/services/bond-cleaning/ipswich/', '/blog/ipswich/bond-cleaning-checklist/'];

for (const url of pages) {
  test(`Accessibility (axe) @ ${url}`, async ({ page }) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const results = await new AxeBuilder({ page })
      .exclude(['.mapboxgl-map', '#quote-form', 'iframe']) // noisy areas
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toHaveLength(0);
  });
}
```

> If you **temporarily** need to suppress a best-practice rule during a refactor, `.disableRules(['landmark-complementary-is-top-level'])`, but prefer fixing markup.

### Visual tests

`tests/e2e/visual.spec.ts` (guidelines):

* `fullPage: true`, animation-disabling CSS injected.
* Avoid super-long pages in baselines—consider masking variable regions and/or using `maxDiffPixelRatio` conservatively (e.g., `0.015`).
* Re-baseline only after content/layout changes settle.

### Redirect tests

`tests/e2e/redirects.canonical.spec.ts`:

```ts
import { test, expect, request } from '@playwright/test';

test('alias /blog redirects to cluster canonical', async ({ baseURL }) => {
  const r = await request.newContext();
  const res = await r.get(`${baseURL}/blog`, { maxRedirects: 0 });
  expect([301,302,307,308]).toContain(res.status());
  expect(res.headers()['location']).toMatch(/^\/blog\/(brisbane|ipswich|logan)\/?$/);
});
```

---

## CI (GitHub Actions)

Typical workflow outline:

```yaml
name: CI
on:
  push:
    branches: [ main, feat/**, fix/**, chore/** ]
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Prebuild
        run: npm run prebuild --silent
      - name: Unit tests
        run: npm run test:unit --silent
      - name: Build
        run: npm run build --silent
      - name: E2E
        env:
          USE_EDGE: "false"
        run: npm test --silent
      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            test-results/
            playwright-report/
            vitest-report.xml
          if-no-files-found: ignore
```

**Blog-base guard**: a separate workflow varies `BLOG_BASE` to catch hard-coded `/blog/` strings and sitemap drift.

---

## Edge/Deno toggle

* Edge functions **off** by default locally and in CI.
* To opt in:

```bash
export USE_EDGE=true
npm run dev
```

**Guard** `scripts/guard-deno.js` checks for Deno when `USE_EDGE=true` to avoid the “Could not establish a connection to the Netlify Edge Functions local development server” error.

---

## Data contracts

### `src/content/areas.clusters.json` (shape)

```json
{
  "clusters": [
    {
      "slug": "ipswich",
      "name": "Ipswich",
      "adjacent_suburbs": ["booval", "brassall", "collingwood-park"],
      "suburbs": ["ipswich", "booval", "brassall", "collingwood-park", "..."],
      "aliases": ["ipswich-region"]
    }
  ]
}
```

> Ensure the key is `adjacent_suburbs` (not a misspelled variant). Adjacency powers “nearby” selection.

### `src/data/serviceCoverage.json`

```json
{
  "bond-cleaning": ["ipswich", "brisbane", "logan", "..."],
  "spring-cleaning": ["ipswich", "booval", "..."],
  "bathroom-deep-clean": ["booval", "carole-park", "..."]
}
```

### `src/data/crossServiceMap.json`

Generated by `build-cross-service-map.mjs`, keyed by suburb → currentService, as shown earlier.

---

## Caching & headers

`netlify.toml` snippet:

```toml
[build]
  publish = "dist"
  command = "npm run build"

[[headers]]
  for = "/services/*"
  [headers.values]
  Cache-Control = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800"

[[headers]]
  for = "/*.json"
  [headers.values]
  Cache-Control = "public, max-age=300"

# Security (adjust as needed)
[[headers]]
  for = "/*"
  [headers.values]
  X-Frame-Options = "SAMEORIGIN"
  X-Content-Type-Options = "nosniff"
  Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## Troubleshooting playbook

**A11y: `landmark-unique`**

* Two `<nav>`s with identical or missing labels. Fix by:

  * Header: `<nav aria-label="Primary navigation">…`
  * Cross-service block: use `<section role="region" aria-label="Other services and guides">…</section>`
  * Footer: `<nav aria-label="Footer utility">…`
* Rebuild `dist` to avoid stale HTML.

**Redirect specs fail (stuck on legacy URL)**

* Ensure the local server is `serve-with-redirects.mjs` (not a generic static server).
* Verify `_redirects` contains the rule; check `:splat` substitution is correct.

**Visual snapshot mismatch / timeouts**

* Large page height drift → likely content/layout changed significantly.
* Review diffs under `test-results/.../diff.png`.
* After approving changes, re-baseline snapshots.

**`ERR_CONNECTION_REFUSED` during tests**

* Server didn’t start. The Playwright `webServer` must be configured. Use `reuseExistingServer: !CI`.
* Avoid `netlify dev` in CI; prefer static serve to reduce flake.

**Edge/Deno crash**

* Set `USE_EDGE=false` or ensure Deno installed if experimenting with Edge locally.

**YAML parse errors in workflows**

* Ensure **spaces only**, no tabs/non-breaking spaces. Use `.editorconfig` and `verify-no-tabs.mjs` pre-step in CI.

---

## Git hooks (Husky v9/v10)

* **Pre-commit** (fast): gated by changed files; runs blog-base verify & codemod drift when relevant; unit tests on path builders/site config.
* **Pre-push** (heavier): `BLOG_BASE=/guides/` extended verify + redirect canary E2E (chromium).

Tips:

```bash
npm run prepare
git config core.hooksPath .husky
# Bypass (emergency):
SKIP_HOOKS=1 git commit -m "…"  # or git commit --no-verify
```

---

## Performance & SEO guardrails

* Lighthouse budgets (suggested):

  * Perf ≥ 90 (desktop), ≥ 80 (mobile)
  * A11y ≥ 95
  * Best Practices ≥ 95
  * SEO ≥ 95
* CLS mitigations:

  * Precompute panel content (no layout shifts)
  * Set intrinsic sizes for images; reserve slots for map/embed if present.

Optional CI: add `lhci` with budgets and fail-on-regression gates.

---

## Coding conventions

* **Paths**: generate with `rel.*`/`paths.*` helpers. Avoid hard-coding `/blog/…` — use `BLOG_BASE` aware helpers.
* **Strings**: use `trimSlashes`, `squash`, `withTrailingSlash`.
* **Schema**: only pages emit schema; components remain presentational.
* **Tests**: prefer deterministic data & static servers; avoid time-dependent assertions.
* **Types**: export DTO types for components (`CrossServiceItem`, `ServiceCardProps`, …).

---

## Project map (where & why)

* **Top-level**: `astro.config.mjs`, `netlify.toml`, `tailwind.config.js`, `tsconfig.json`, `playwright.config.ts`, `package.json`.
* **Pages**: `src/pages/*` (routes + SSR redirects), `sitemap.xml.ts`.
* **Layouts**: `src/layouts/*` (main/service shells).
* **Components**: `src/components/*` (`Schema.astro`, `ServiceNav.astro`, `Footer.astro`).
* **Lib/Utils**: `src/lib/*` (schema builders, path helpers), `src/utils/*`.
* **Data/Content**: `src/data/*`, `src/content/*`.
* **Scripts**: `scripts/*` (pre/post build audits, redirect server, AI/KB generators).
* **Tests**: `tests/e2e/*`, `js/__tests__/*`.
* **Artifacts**: `__ai/*`, `sarif/*`, `test-results/*`.

---

## Maintenance tasks

* **Regenerate cross-service map** (automatically during build):

  ```bash
  node scripts/build-cross-service-map.mjs
  ```
* **Update knowledge base**:

  ```bash
  node scripts/generate-knowledge-base.mjs
  ```
* **Verify blog base**:

  ```bash
  npm run ai:blog:verify
  BLOG_BASE=/guides/ npm run ai:blog:verify:ext
  ```
* **Audit schema**:

  ```bash
  npm run graph:audit
  ```

---

## Security & privacy

* Reviews ingestion strips PII; only whitelisted fields are used in schema/UI.
* Default security headers set via Netlify.
* Avoid exposing admin/debug routes in `sitemap.xml` and `robots.txt`.

---

## FAQ

**Why is there only one navigation landmark?**
Because multiple `<nav>`s with identical/missing names cause axe to flag `landmark-unique`. We keep the header as the only nav; the cross-service block is a named region.

**Why is `(nearby)` text visible?**
To make fallback semantics explicit to users and tests; it’s also included in `aria-label` for clarity.

**Why a redirect-aware static server in tests?**
It reproduces `public/_redirects` behavior locally, ensuring redirect specs match production without starting full platform emulators.

---

## License

MIT

---

### Appendix A — Example `.env.example`

```ini
# Local dev defaults
USE_EDGE=false
BLOG_BASE=/blog/
MIN_REVIEWS_FOR_AGG=12
SITE_URL=http://localhost:4322
```

### Appendix B — Example `ServiceNav` props typing

```ts
export type ServiceCard = {
  title: string;
  desc?: string;
  href: string;
  nearby?: boolean;   // true → adds "(nearby)" suffix and data-nearby="true"
};
```

### Appendix C — Example Husky hook (pre-push)

```sh
# .husky/pre-push
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "[pre-push] verifying BLOG_BASE drift and redirect canaries…"
BLOG_BASE=/guides/ npm run ai:blog:verify:ext || exit 1
npx playwright test tests/e2e/middleware-redirect.spec.ts --reporter=line || exit 1
```

---

**In short:** canonicals and redirects are deterministic; cross-service navigation is precomputed and a11y-clean; schema is centralized with absolute IDs and one emitter; link integrity and blog-base guards are enforced in build/CI; Edge is opt-in. The test & ops surface is designed to be stable, fast, and production-faithful.
--
# One N Done Bond Clean — Astro + Netlify

Production front-end built with Astro 5 + Tailwind, deployed on Netlify. Canonical routing, SSR synonym redirects, consolidated JSON-LD graphs, Playwright tests (a11y/visual/redirects), internal link integrity, and optional AI reviewers. This doc is a practical, end-to-end handbook: architecture, scripts, env flags, CI, testing, and troubleshooting.

---

## Table of Contents

<!-- toc:start -->

* [What’s in here](#whats-in-here)
* [Environments & flags](#environments--flags)
* [Routes and canonicals](#routes-and-canonicals)
* [Redirects (edge + local emulation)](#redirects-edge--local-emulation)
* [Synonym redirect endpoints (SSR)](#synonym-redirect-endpoints-ssr)
* [Cross-service navigation (static, deterministic)](#crossservice-navigation-static-deterministic)
* [JSON-LD graphs (single emitter)](#jsonld-graphs-single-emitter)
* [Sitemap & robots](#sitemap--robots)
* [Build pipeline & guardrails](#build-pipeline--guardrails)
* [Tests (Playwright + Vitest)](#tests-playwright--vitest)
* [Visual snapshots](#visual-snapshots)
* [Accessibility invariants](#accessibility-invariants)
* [Internal link coverage audit](#internal-link-coverage-audit)
* [Knowledge base generation](#knowledge-base-generation)
* [CI (GitHub Actions) & AI review](#ci-github-actions--ai-review)
* [Git hooks (Husky v9/v10)](#git-hooks-husky-v9v10)
* [Data model & contracts](#data-model--contracts)
* [Local development](#local-development)
* [Conventions](#conventions)
* [Security & caching headers](#security--caching-headers)
* [Troubleshooting playbook](#troubleshooting-playbook)
* [Project map](#project-map)
* [Cheat-sheet (common commands)](#cheatsheet-common-commands)
* [Future Work / Backlog](#future-work--backlog)
* [License](#license)

<!-- toc:end -->

---

## What’s in here

* **Astro 5** + Tailwind; **Netlify adapter** (Node 20 pinned)
* **Canonical route architecture** for services, areas, and blog
* **SSR endpoints** for synonym routes → 301 to canonical
* **Single JSON-LD emitter** + consolidated `@graph`
* **Playwright E2E** (a11y, visual, redirects, smoke, structure)
* **Pre/Post-build guardrails** (routes, schema, internal links)
* **Redirect emulator** for local parity with Netlify rules
* **Optional AI reviewers** outputting SARIF to PRs
* **Edge middleware opt-in** (`USE_EDGE=true`) with guard

---

## Environments & flags

| Variable              | Default       | Where used                    | Notes                                                                                                |
| --------------------- | ------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `NODE_ENV`            | `development` | build/runtime                 | Standard Node/Tools behavior.                                                                        |
| `USE_NETLIFY`         | unset         | build                         | When set, Astro uses Netlify adapter during build/preview.                                           |
| `USE_EDGE`            | `false`       | dev/preview                   | When `true`, attempts to start Netlify Edge (Deno required). Guard script aborts cleanly if missing. |
| `BLOG_BASE`           | `/blog/`      | link builders, sitemap, tests | Can be changed; codemods and verifiers keep source consistent.                                       |
| `MIN_REVIEWS_FOR_AGG` | `5`           | JSON-LD builder               | Minimum review count to emit `AggregateRating`.                                                      |

### Quick env inspect

```bash
npm run env:print      # prints key app envs (including USE_EDGE)
```

`.env.example` contains sane defaults. For CI, explicitly export `USE_EDGE=false` unless exercising Edge.

---

## Routes and canonicals

**Services**

* Hubs: `/services/[service]/`
* Canonical spokes: `/services/[service]/[suburb]/`
* Legacy cluster path → **301 to suburb-only**

**Areas**

* Index: `/areas/`
* Hubs: `/areas/[cluster]/`
* Optional suburb entry: `/areas/[cluster]/[suburb]/` (service layout)

**Blog**

* Cluster hub: `/blog/[cluster]/`
* Category: `/blog/[cluster]/category/[category]/`
* Posts: `/blog/[cluster]/[slug]/`
* Alias clusters → **301 to canonical** (see redirects)

**Utility**

* `/privacy`, `/terms`, `/gallery`, `/quote`
* `/sitemap.xml` → cached (300s)

---

## Redirects (edge + local emulation)

**Production (Netlify)**: primary rules live in `public/_redirects` and may be complemented by `netlify.toml`.

Examples:

```
/blog/ipswich-region     /blog/ipswich     301
/areas/ipswich-region/*  /areas/ipswich/:splat  301
/services/:service/:cluster/:suburb/*  /services/:service/:suburb  301
```

**Local parity**: Playwright uses a lightweight server (`scripts/serve-with-redirects.mjs`) that:

* Serves `dist/`
* Parses `dist/_redirects`
* Substitutes `:params` and `:splat` into targets (mirrors Netlify matching)
* Sends **301/302/307/308** as authored

This keeps local **redirect specs faithful** without booting Netlify dev.

---

## Synonym redirect endpoints (SSR)

Common synonyms map to canonical service×suburb with 301 redirects. Each endpoint:

* Lives under `src/pages/<alias>/[suburb].ts`
* `export const prerender = false;`
* Validates & canonicalizes suburb and service
* `return redirect('/services/<service>/<suburb>/', 301)`

Examples:

* `bond-cleaners`, `end-of-lease-cleaning`, `exit-clean`
* `house-cleaning` → `spring-cleaning`
* `deep-cleaning` → `spring-cleaning`
* `bathroom-cleaning`, `shower-screen-restoration` → `bathroom-deep-clean`

**Why SSR?** Keeps alias knowledge server-side; no client JS; correct SEO signals via 301s.

---

## Cross-service navigation (static, deterministic)

**Goal:** show helpful “other services in your suburb” + local guides, with deterministic nearby fallbacks if a service isn’t offered in that suburb.

### How it works

1. **Build step** precomputes a map (`src/data/crossServiceMap.json`):

   * Keyed by suburb → currentService → array of cross-service items
   * Each item encodes: label (with `(nearby)` when needed), `href`, and whether it’s “here” or a “nearby” fallback.
2. **Runtime accessor** (`src/lib/crossService.ts`) is **sync** and reads the map:

   * `getCrossServiceItems(suburb, currentService)`
   * `getCrossServiceLinks({ suburbSlug, currentService })` → `{ crossServices, localGuides }`
3. **UI** renders a single, accessible landmark:

   * `<nav data-relservices aria-label="Other services and guides">…</nav>`
   * No duplicated landmarks; nearby items are visibly marked `(nearby)` and can include `data-nearby="true"` for styling/tests.

### Deterministic fallback

* Prefer **same cluster** nearby coverage (first by curated adjacency)
* Else fall back to a global deterministic pick (stable order)
* Ensures panel is **never empty** (unless truly none exist)

---

## JSON-LD graphs (single emitter)

* **Pure builders** in `src/lib/seoSchema.js` (no Astro globals), e.g.:

  * `localBusinessNode`, `serviceAndOfferNodes`, `breadcrumbList`, `faqPageNode`
  * `aggregateRatingNode`, `reviewNodes`
  * Composer: `suburbServiceGraph`
* **Absolute IDs** via `absoluteUrl()`; stable `@id` computed from canonical paths
* **Single emitter** component: `src/components/Schema.astro`

  * Pages pass `graph=[...]`; component emits one `<script type="application/ld+json">` with `@graph`
* **Service pages** build one `@graph`, optionally adding `AggregateRating` + top N reviews above a threshold (`MIN_REVIEWS_FOR_AGG`)
* **Defensive post-build**: `scripts/consolidate-ld.mjs` will merge multiple scripts if any slip through (should be no-op in green state)

**Audit tip** (counts JSON-LD scripts per page after build):

```bash
node -e "const fs=require('fs'),p=require('path');let c=0;function* w(d){for(const f of fs.readdirSync(d)){const fp=p.join(d,f),s=fs.statSync(fp);if(s.isDirectory())yield* w(fp);else if(f.endsWith('.html'))yield fp}};for(const f of w('dist')){const h=fs.readFileSync(f,'utf8');const s=[...h.matchAll(/<script[^>]+type=\"application\\/ld\\+json\"[^>]*>([\\s\\S]*?)<\\/script>/gi)].length;if(s){c++;if(s>1)console.log('multi:',f.replace(/^dist\\//,''),s)}};console.error('pages with JSON-LD:',c)"
```

---

## Sitemap & robots

* `src/pages/sitemap.xml.ts` (cache 300s) enumerates canonical URLs
* Footer links include `/sitemap.xml`, `/privacy`, `/terms`, `/gallery`, `/quote`
* `robots.txt` disallows alias paths so crawlers favor canonicals

---

## Build pipeline & guardrails

**Pre-build**

* `scripts/audit-routes.mjs` — route sanity, collisions/gaps
* FAQs compile (`build:faqs`)

**Build**

* `astro build` (Netlify adapter when `USE_NETLIFY=1`)

**Post-build**

* `scripts/consolidate-ld.mjs` — merge JSON-LD to single `@graph`
* `scripts/audit-related-links.mjs` — caps & whitelists for related blocks
* `scripts/validate-schema.js` — structural schema checks
* `scripts/assert-sitemap-blog-canonicals.mjs` — sitemap blog URLs absolute + honor `BLOG_BASE`
* `scripts/check-internal-links.mjs` — fail on broken internal anchors
* `scripts/audit-internal-links.mjs` — every built page must have ≥1 in-content internal link (writes suggestions to `__ai/`)

---

## Tests (Playwright + Vitest)

**Playwright projects**

* `a11y`: Axe scan with targeted excludes; **no violations allowed**
* `visual`: Snapshot diff (deterministic CSS, animations disabled)
* `redirects`: SSR + edge alias → canonical, query/hash preserved
* `smoke/structure`: basic availability, key landmarks, CTAs

**Server strategy**

* Auto-managed via `playwright.config.ts`
* Static server: `scripts/serve-with-redirects.mjs` on port **4322**

  * Applies `dist/_redirects` with `:param`/`:splat` substitution
  * Enables redirect specs without Netlify dev

**Sample commands**

```bash
npm test --silent                  # full suite (recommended before release)
npx playwright test tests/e2e/middleware-redirect.spec.ts
npx playwright test --grep=Accessibility
```

**Vitest**

```bash
npm run test:unit
```

---

## Visual snapshots

* Baselines live alongside spec (e.g., `tests/e2e/visual.spec.ts-snapshots/…`)
* **Full-page screenshots**; animations disabled via test CSS
* **Thresholds** tuned (`maxDiffPixelRatio`), masks for dynamic regions if needed
* **Update** when intentional layout/copy changes land:

```bash
npx playwright test tests/e2e/visual.spec.ts --update-snapshots
```

---

## Accessibility invariants

**Axe rule goals**

* No `landmark-unique` violations:

  * Exactly **one** `<nav>` for cross-service block (`[data-relservices]`) with a specific `aria-label`
  * Header nav has its own unique `aria-label` (e.g., “Primary navigation”)
  * Other link collections **should be `<section role="region">`** or have unique labels
* `landmark-complementary-is-top-level` avoided:

  * Don’t nest `<aside>` inside other landmarks
  * If unavoidable, convert to `<section role="region">` with `aria-label`

**Typical fix pattern**

```astro
<!-- Good: single landmark for cross-service -->
<nav data-relservices aria-label="Other services and guides">
  …
</nav>

<!-- Related link blocks that should not be landmarks -->
<section class="related-links" data-relblock role="region" aria-label="Related links">
  …
</section>

<!-- Header -->
<nav aria-label="Primary navigation" class="container …">…</nav>
```

---

## Internal link coverage audit

**Goal:** every HTML page contains at least one **in-content** internal link to sustain crawl depth and user navigation.

**Script:** `scripts/audit-internal-links.mjs`

* Scans `dist/**/*.html`
* Extracts `<main id="main">…</main>` (falls back to full HTML)
* Counts root-relative anchors (`href^="/"`)
* **Fails build** if any page has **zero**
* Writes:

  * JSON report: `__ai/internal-links-report.json`
  * Summary: `__ai/internal-links-missing.txt`
  * Snippet suggestions: `__ai/internal-link-suggestions/*.html`

Run manually:

```bash
npm run build --silent || true
npm run audit:internal-links
```

---

## Knowledge base generation

**Script:** `scripts/generate-knowledge-base.mjs`

* Lists git-tracked files
* Derives first + latest commit dates
* Heuristics fill **What / Why / Connects To**
* Outputs `REPO_FILES.md` (timestamped header)

```bash
node scripts/generate-knowledge-base.mjs
```

---

## CI (GitHub Actions) & AI review

**QA workflow highlights**

* Cache npm + Playwright browsers
* **Build once**; reuse for a11y/redirect/visual where possible
* Inject `USE_EDGE=false` for stability
* Upload artifacts: `test-results/`, `playwright-report/`, `vitest-report.xml`

**Blog base guards**

* Matrix over `BLOG_BASE` (e.g., `/blog/`, `/guides/`)
* Strict + extended verifiers to prevent hard-coded base regressions
* Codemod drift check (report to `__ai/`)

**AI reviewers (optional)**

* `OPENAI_API_KEY` present → runs `ai-review.yml`, emits SARIF to `sarif/`
* Grant `security-events: write` for PR code scanning annotations

**YAML whitespace guard (recommended)**

* `.editorconfig` enforces **spaces** (2) for YAML
* `verify-no-tabs.mjs` checks tabs/NBSP; add as CI step before build

---

## Git hooks (Husky v9/v10)

* **Pre-commit** (fast; path-aware):

  * `ai:blog:verify`, `ai:blog:codemod:ci` only for relevant changes
  * Unit tests for path builders / site config edits
  * Skips merge commits; `SKIP_HOOKS=1` escape hatch
* **Pre-push** (heavier):

  * `BLOG_BASE=/guides/ npm run ai:blog:verify:ext`
  * Redirect E2E canary (chromium, fail-fast)

If hooks don’t run:

```bash
npm run prepare
git config core.hooksPath .husky
```

Bypass in emergencies: `SKIP_HOOKS=1 git commit …` or `git commit --no-verify`.

---

## Data model & contracts

**Areas & clusters** — `src/content/areas.clusters.json`

* Clusters, aliases, and suburb membership
* Used by coverage expansion & cross-service adjacency

**Service coverage** — `src/data/serviceCoverage.json` (shape)

```json
{
  "spring-cleaning": ["ipswich", "indooroopilly", "loganholme"],
  "bathroom-deep-clean": ["ipswich", "brisbane", "loganholme"]
}
```

**Cross-service map** — generated at build

```json
{
  "ipswich": {
    "bond-cleaning": [
      { "label": "Spring Cleaning", "href": "/services/spring-cleaning/ipswich/", "here": true,
        "data": { "service": "spring-cleaning", "suburb": "ipswich", "source": "same-suburb" } },
      { "label": "Bathroom Deep Clean (nearby)", "href": "/services/bathroom-deep-clean/brisbane/", "here": false,
        "data": { "service": "bathroom-deep-clean", "suburb": "brisbane", "source": "nearby" } }
    ]
  }
}
```

**Accessor API** — `src/lib/crossService.ts`

```ts
type CrossServiceItem = {
  label: string; href: string; here: boolean;
  data: { service: string; suburb: string; source?: 'same-suburb' | 'nearby' }
};

export function getCrossServiceItems(suburb: string, current: string): CrossServiceItem[];
export function getCrossServiceLinks(opts: { suburbSlug: string; currentService: string }):
  { crossServices: CrossServiceItem[]; localGuides: string };
```

**UI contract** — `ServiceNav.astro`

* Props: `services: CrossServiceItem[]`, `currentSuburb: string`
* Renders a **single** `<nav data-relservices aria-label="Other services and guides">…</nav>`
* Adds `(nearby)` text where `here === false`
* Optional `data-nearby="true"` on links/cards for styling/tests

---

## Local development

```bash
npm install
npm run dev      # http://localhost:4322 (Edge off by default)
```

**Preview prod-like**

```bash
USE_NETLIFY=1 npm run build
npm run preview
```

**Toggle Edge locally**

```bash
USE_EDGE=true npm run dev   # will validate Deno; exits cleanly if absent
```

---

## Conventions

* Generate links via builders/utilities; avoid hard-coding `/blog/`
* Keep JSON-LD absolute via `Astro.site` + helper `absoluteUrl()`
* Prefer SSR for synonym/alias redirects (`prerender=false`)
* Keep **one** cross-service `<nav>` landmark; demote collections to `role="region"` with unique `aria-label`s

---

## Security & caching headers

**Netlify headers (example)**

```toml
[[headers]]
  for = "/services/*"
  [headers.values]
  Cache-Control = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800"

[[headers]]
  for = "/*"
  [headers.values]
  X-Content-Type-Options = "nosniff"
  X-Frame-Options = "SAMEORIGIN"
  Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## Troubleshooting playbook

### A. Playwright `net::ERR_CONNECTION_REFUSED` (localhost:4322)

* Cause: server not started or wrong port while tests expect 4322.
* Fixes:

  * Ensure `playwright.config.ts` uses `scripts/serve-with-redirects.mjs`.
  * No parallel server on the port; kill stale process.
  * Verify `dist/` exists (run `npm run build` if serving static).

### B. A11y `landmark-unique`

* Cause: multiple `<nav>` landmarks with identical/absent labels.
* Fixes:

  * Keep **one** `[data-relservices]` nav.
  * Header nav: `aria-label="Primary navigation"`.
  * Related blocks: prefer `<section role="region" aria-label="Related links">`.

### C. Redirect specs stuck on legacy path

* Cause: local server not substituting `:splat` / `:params`.
* Fix:

  * Use enhanced `serve-with-redirects.mjs`.
  * Verify your `_redirects` targets don’t contain literal `:splat` in the response.

### D. Edge dev crashes: “Could not establish a connection to the Netlify Edge Functions local development server”

* Cause: Deno/Edge dev not present.
* Fix:

  * Default **off**; ensure `USE_EDGE=false` for local/CI.
  * To try Edge: install Netlify CLI + Deno, then set `USE_EDGE=true`.

### E. YAML “Nested mappings” parse errors

* Cause: stray tabs or non-breaking spaces.
* Fix:

  * `.editorconfig` to enforce spaces.
  * Run `npm run verify:yaml` (tab/NBSP guard).
  * Recreate the YAML file clean with spaces only.

### F. Exit code 130 / terminal loop on `git status`

* Cause: interrupted process or hook shells echoing in loops.
* Fix:

  * `SKIP_HOOKS=1 git commit` temporarily.
  * Inspect `.husky/` scripts; ensure no recursive `git` calls.

### G. Visual diffs keep timing out

* Cause: large layout changes vs baselines.
* Fix:

  * Stabilize markup, then `--update-snapshots`.
  * Use `mask` for dynamic regions; confirm animations are disabled.

---

## Project map

**Top-level**

* `astro.config.mjs`: site config + integrations
* `netlify.toml`: platform config & headers (optional)
* `public/_redirects`: edge redirects
* `playwright.config.ts`: E2E config (port 4322)
* `package.json`: scripts & deps
* `.editorconfig`, `verify-no-tabs.mjs`: whitespace safety

**`src/`**

* `pages/`: routes & SSR redirects (synonyms)
* `layouts/`: shared shells (main/service)
* `components/`: UI + `Schema.astro` (single emitter)
* `lib/`: SEO/schema builders, crossService accessor
* `utils/`: common helpers
* `data/`: curated JSON (coverage, topics)
* `content/`: clusters/FAQs/acceptance JSON

**`scripts/`**

* audits (`audit-routes.mjs`, `audit-related-links.mjs`)
* schema (`validate-schema.js`, `consolidate-ld.mjs`)
* internal links (`check-internal-links.mjs`, `audit-internal-links.mjs`)
* cross-service build (`build-cross-service-map.mjs`)
* redirect server (`serve-with-redirects.mjs`)
* env guards (`guard-deno.js`, `check-env.js`)

**`tests/`**

* `a11y.spec.ts`, `visual.spec.ts`, `middleware-redirect.spec.ts`, etc.
* snapshots & artifacts under `test-results/`

---

## Cheat-sheet (common commands)

```bash
# Dev
npm run dev                      # http://localhost:4322

# Build & preview
npm run build
npm run preview                  # Netlify adapter preview (if USE_NETLIFY=1)

# E2E
npm test --silent                # all Playwright projects
npx playwright test --grep=Accessibility
npx playwright test tests/e2e/middleware-redirect.spec.ts

# Visual snapshots
npx playwright test tests/e2e/visual.spec.ts --update-snapshots

# Unit tests
npm run test:unit

# Guards
npm run ai:blog:verify           # strict blog base
BLOG_BASE=/guides/ npm run ai:blog:verify:ext
npm run ai:blog:codemod:dry
npm run verify:yaml

# Internal links (post-build)
npm run audit:internal-links
```

---

## Future Work / Backlog

* Remove legacy `CrossServiceLinks` after one release
* Add Lighthouse budgets to CI and gated PR check
* Visual baseline approval workflow
* Weighted nearby selection (geo distance/affinity)
* Unit tests around cross-service map builder (edge cases)
* Schema diff test to detect structural drift
* Complete Cypress → Playwright migration
* Optional client manifest for instant suburb switching
* Retire `consolidate-ld.mjs` once stable (keep initially)
* Edge middleware experiments (`USE_EDGE=true`) for select headers/geo
* Partial-hydration-free islands for even lower JS
* JSON-LD “last updated” for posts & services

---

## License

MIT

---
