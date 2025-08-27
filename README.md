# One N Done Bond Clean — Astro + Netlify

Production front‑end built with Astro 5 + Tailwind, deployed on Netlify. Canonical routing, SSR synonym redirects, consolidated JSON‑LD graphs, Playwright tests, internal link integrity, and optional AI reviewers.

## Table of Contents
<!-- toc:start -->
- [Table of Contents](#table-of-contents)
- [What’s in here](#whats-in-here)
- [Routes and canonicals](#routes-and-canonicals)
- [Synonym redirect endpoints (SSR)](#synonym-redirect-endpoints-ssr)
- [JSON‑LD graphs](#jsonld-graphs)
- [Sitemap and robots](#sitemap-and-robots)
- [Tests](#tests)
- [Build and routes audit](#build-and-routes-audit)
- [Internal link coverage audit](#internal-link-coverage-audit)
- [Knowledge base generation](#knowledge-base-generation)
- [CI and AI review](#ci-and-ai-review)
- [Git hooks (Husky v9/v10)](#git-hooks-husky-v9v10)
- [Data model](#data-model)
- [Recently added/updated](#recently-addedupdated)
  - [Guardrails (UX/SEO)](#guardrails-uxseo)
  - [Link integrity](#link-integrity)
   - [Evolution (Before vs Now)](#evolution-before-vs-now)
   - [Recent Architecture Changes (Aug 2025)](#recent-architecture-changes-aug-2025)
   - [Future Work / Backlog](#future-work--backlog)
- [Local development](#local-development)
- [Conventions](#conventions)
- [License](#license)
- [Project map: where to find things and why](#project-map-where-to-find-things-and-why)
  - [Top-level](#top-level)
  - [Source code (`src/`)](#source-code-src)
  - [Scripts and guardrails (`scripts/`)](#scripts-and-guardrails-scripts)
  - [Tests](#tests-2)
  - [AI, reports, and artifacts](#ai-reports-and-artifacts)
  - [Data and linking utilities](#data-and-linking-utilities)
  - [Vanilla helpers](#vanilla-helpers)
  - [Redirects](#redirects)
  - [Temporary/build outputs](#temporarybuild-outputs)
- [How to locate information quickly](#how-to-locate-information-quickly)
<!-- toc:end -->

## What’s in here

- Astro 5 + Netlify adapter (Node 20 pinned)
- Canonical route architecture for services, areas, and blog
- SSR endpoints for synonym routes (301 to canonical)
- JSON‑LD strategy with stable @id, a reusable graph builder, and a post‑build consolidator to a single @graph
- Sitemap endpoint with cache‑control and footer links to key pages
- Playwright E2E (a11y, visual, smoke, redirects) + prebuild route audit
- Post‑build guards: related‑links audit, schema validation, and internal link checker
- Optional AI reviewers that emit SARIF to PRs

## Routes and canonicals

- Services
   - Hubs: `/services/[service]/`
   - Canonical spokes: `/services/[service]/[suburb]/`
   - Legacy cluster path → 301 to suburb‑only (see `netlify.toml`)
- Areas
   - Index: `/areas/`
   - Hubs: `/areas/[cluster]/`
   - Optional suburb entry: `/areas/[cluster]/[suburb]/` (renders service layout)
- Blog
   - Cluster hub: `/blog/[cluster]/`
   - Category: `/blog/[cluster]/category/[category]/`
   - Posts: `/blog/[cluster]/[slug]/` (alias cluster slugs 301 to canonical)
- Static utility pages: `/privacy`, `/terms`, `/gallery`, `/quote`
- Sitemap: `/sitemap.xml` via `src/pages/sitemap.xml.ts` (Cache‑Control: 300s)

 Netlify redirects (selected) are in `public/_redirects` (edge redirects) and sometimes `netlify.toml`:

- Blog alias clusters → canonical (e.g., `/blog/ipswich-region → /blog/ipswich 301`)
- Areas cluster rename (e.g., `/areas/ipswich-region/* → /areas/ipswich/:splat 301`)
- Legacy service path with cluster → canonical suburb-only (`/services/:service/:cluster/:suburb/* → /services/:service/:suburb 301`)

## Synonym redirect endpoints (SSR)

SSR TypeScript endpoints map common synonyms to canonical service × suburb with 301s. Examples:

- `src/pages/bond-cleaners/[suburb].ts`
- `src/pages/end-of-lease-cleaning/[suburb].ts`
- `src/pages/exit-clean/[suburb].ts`
- `src/pages/house-cleaning/[suburb].ts` → spring‑cleaning
- `src/pages/deep-cleaning/[suburb].ts` → spring‑cleaning
- `src/pages/bathroom-cleaning/[suburb].ts` → bathroom‑deep‑clean
- `src/pages/shower-screen-restoration/[suburb].ts` → bathroom‑deep‑clean

> All have `export const prerender = false;` and `return redirect('/services/...', 301)`.

## JSON‑LD graphs

- Pure builders: `src/lib/seoSchema.js` exposes small, SSR‑safe builders (no `<script>` tags, no Astro globals), e.g., `localBusinessNode`, `serviceAndOfferNodes`, `breadcrumbList`, `faqPageNode`, `aggregateRatingNode`, `reviewNodes`, and a composer `suburbServiceGraph`.
- Absolute IDs: Every `@id` and `url` is absolute via `absoluteUrl()`; IDs are derived from canonical paths using an `entityId()` helper inside `seoSchema.js`.
- Single emitter: `src/components/Schema.astro` is the one JSON‑LD emitter. Pass `graph=[...]` to output `{ "@context": "https://schema.org", "@graph": [...] }`.
- Service pages: `src/pages/services/[service]/[suburb].astro` composes one `@graph` per page server‑side: core nodes via `suburbServiceGraph`, optional `AggregateRating` plus top `Review` nodes when review count meets the threshold (env: `MIN_REVIEWS_FOR_AGG`).
- Reviews loader: `src/server/reviews.js` fetches and sanitizes reviews (seed/live/merge), dedupes, and gates AggregateRating. PII is stripped; only the fields used by schema/UI are returned.
- Presentational reviews: `src/components/ReviewSection.astro` is UI‑only (its inline JSON‑LD was removed); the page emits schema centrally.
- Safety net: `scripts/consolidate-ld.mjs` remains as a guard to merge any accidental multiples into one `@graph` post‑build, but the target is one emitter per page at source.

Quick audit after build:

```bash
npm run build --silent
node -e "const fs=require('fs'),p=require('path');let c=0;function* w(d){for(const f of fs.readdirSync(d)){const fp=p.join(d,f),s=fs.statSync(fp);if(s.isDirectory())yield* w(fp);else if(f.endsWith('.html'))yield fp}};for(const f of w('dist')){const h=fs.readFileSync(f,'utf8');const s=[...h.matchAll(/<script[^>]+type=\"application\\/ld\\+json\"[^>]*>([\s\S]*?)<\\/script>/gi)].length;if(s){c++;if(s>1)console.log('multi:',f.replace(/^dist\\//,''),s)}};console.error('pages with JSON-LD:',c)"
```

## Sitemap and robots

- `src/pages/sitemap.xml.ts` emits an XML sitemap of core pages and sets `Cache-Control: public, max-age=300`.
- Footer links to `/sitemap.xml`, `/privacy`, `/terms`, `/gallery`, `/quote` are present in `src/components/Footer.astro`.
- `robots.txt` disallows alias paths so crawlers prefer canonicals.

## Tests

- Runner: Playwright (`@playwright/test`)
- Suites (see `tests/`): a11y, smoke, visual, redirects, structure, geometry, intent
- Web server is auto‑managed from `playwright.config.ts` (port 4322 by default)

Common commands:

```bash
# Fast canary for synonym redirects
npx playwright test tests/synonym-redirects.canary.spec.ts --reporter=line

# Full suite
npm test --silent
```

## Build and routes audit

Build runs pre‑ and post‑build guardrails:

- Pre‑build: `scripts/audit-routes.mjs` (invoked via `prebuild`)
- Build pipeline: `npm run build` →
   - `build:faqs`
   - `astro build` (Netlify adapter when `USE_NETLIFY=1`)
   - `scripts/consolidate-ld.mjs` (merge JSON‑LD, safe URL rewrites)
   - `scripts/audit-related-links.mjs` (related‑links guardrails)
   - `scripts/validate-schema.js` (schema validation)
   - `scripts/assert-sitemap-blog-canonicals.mjs` (verifies sitemap blog URLs are absolute and respect BLOG_BASE)
   - `scripts/check-internal-links.mjs` (internal anchor integrity; fails build on dead links)
    - `scripts/audit-internal-links.mjs` (ensures every built page contains ≥1 in‑content internal link; suggestions emitted under `__ai/internal-link-suggestions/`)

## Internal link coverage audit

Purpose: guarantee every HTML page has at least one meaningful internal link in its main content area to sustain crawl depth and user navigation.

Script: `scripts/audit-internal-links.mjs`

How it works:

- Scans `dist/**/*.html` after build.
- Extracts `<main id="main">…</main>` (falls back to whole HTML if missing) and counts root‑relative `<a>` hrefs.
- Treats zero in‑content links as a failure; writes:
   - JSON report: `__ai/internal-links-report.json` (details + suggestions)
   - Text summary: `__ai/internal-links-missing.txt`
   - Per‑route HTML suggestion snippets: `__ai/internal-link-suggestions/*.html`
- Fails (exit 1) if any page lacks links (build/CI guardrail).

Run manually:

```bash
npm run build --silent || true   # build first (ignore failure to allow audit to run separately if needed)
npm run audit:internal-links
```

Add links:

- Service pages: ensure `CrossServiceLinks` + related links components are mounted above the fold.
- Blog posts: add contextual links early in copy; `CrossServiceLinks` provides service CTAs + local guides.
- Area pages: include service CTAs and a local guides link.

If a page is intentionally exempt (rare), adapt the script's IGNORE set.

## Knowledge base generation

Purpose: single, regenerable inventory (`REPO_FILES.md`) with creation date, last edit, What, Why, and connectivity for each tracked file to accelerate onboarding and audits.

Script: `scripts/generate-knowledge-base.mjs`

Features:

- Enumerates git‑tracked files (`git ls-files`).
- Derives first (creation) and latest commit dates per file.
- Applies regex heuristics to populate concise What / Why and a “Connects To” column (relationships/consumers).
- Writes/refreshes `REPO_FILES.md` with a timestamped header.

Run:

```bash
node scripts/generate-knowledge-base.mjs
```

Extending heuristics: edit the H array in the script (regex, what, why, connects). Unknowns remain `n/a`—treat as candidates for cleanup or future classification.

## CI and AI review

- `.github/workflows/ai-review.yml` runs optional AI reviewers on PRs if `OPENAI_API_KEY` is present. Reviewers write SARIF under `sarif/` and are uploaded to Code Scanning.
- Tip: grant `security-events: write` in workflow permissions to ensure SARIF uploads appear in PR checks.

Blog base guard workflow:

- `.github/workflows/blog-base-guards.yml` mirrors local guardrails in CI:
   - Caches npm and Playwright browsers to speed runs; restores `__ai/` artifacts.
   - Builds the site, runs base verifier, extended verifier with a matrix of BLOG_BASE values (e.g., `/blog/`, `/guides/`), codemod drift check, and the sitemap canonical guard.
   - Prevents hard‑coded `/blog/` regressions and sitemap base drift from landing.

## Data model

- Areas/clusters and aliases: `src/content/areas.clusters.json`
- Service coverage per suburb: `src/data/serviceCoverage.json`
- Blog topics: `src/data/topics.json`
- FAQs and acceptance content: `src/content/faq.service-*.json`, `src/content/acceptance.bond-clean.json`

## Recently added/updated

- Static pages: `src/pages/privacy.astro`, `src/pages/terms.astro`, `src/pages/gallery.astro`, `src/pages/quote.astro`
- Sitemap endpoint: `src/pages/sitemap.xml.ts` (single handler)
- Blog routing: category consolidated under `/blog/[cluster]/category/[category].astro`; canonical cluster redirects in page handlers
- Synonym SSR endpoints for service aliases (see list above)
- Netlify: Node 20 pinned; legacy service path canonicalization in `netlify.toml`

### Recent changes (Aug 2025)

- Introduced pure SEO builders in `src/lib/seoSchema.js` with absolute `@id`/`url` via `absoluteUrl()`.
- Added single schema emitter `src/components/Schema.astro`.
- Updated service page `src/pages/services/[service]/[suburb].astro` to compose and emit one `@graph` (LocalBusiness, Service/Offer, Breadcrumbs, conditional AggregateRating + Review nodes).
- Made `ReviewSection.astro` presentational‑only; removed inline JSON‑LD.
- Fixed build instability by ensuring all JSON‑LD scripts render inside layouts and by avoiding stray tags that could upset the Astro HTML parser.

### Evolution (Before vs Now)

| Aspect | Before (legacy state) | Now (current state) | Impact |
|--------|-----------------------|----------------------|--------|
| Cross‑service navigation | Runtime async computation (legacy `CrossServiceLinks`), duplicated in layout + page; multiple `<nav>` landmarks; sometimes missing or racey in tests | Fully precomputed at build via `scripts/build-cross-service-map.mjs` → static `crossServiceMap.json`; synchronous accessor in `src/lib/crossService.ts`; single `ServiceNav.astro` inserted via named slot | Deterministic output, zero runtime latency, stable Playwright runs, improved a11y (single landmark) |
| Nearby service logic | Missing for suburbs with zero coverage in cross services (empty panels) | Deterministic fallback picks first in-cluster or global earliest service; labels mark remote links as `(nearby)`; added visible `(nearby)` text and aria-label | Ensures panel never empty; semantics explicit to users & tests |
| Accessibility landmarks | Duplicate and unlabeled `<nav>` elements (header, legacy cross-service, related links) → axe landmark violations | Non-primary collections converted to `<section role="region">`; unique `aria-label`s (e.g. `Primary navigation`, `Other services and guides`, `Footer utility`); nav landmark test added | Axe a11y suite passes; regression test coverage |
| Redirect emulator | Basic static file server lacked `:param` / `:splat` substitution parity with Netlify | Enhanced `scripts/serve-with-redirects.mjs` to substitute dynamic segments (`:service`, `:suburb`, `:splat`) | Local E2E redirect tests now faithful to production |
| Edge middleware | Always enabled → local dev / CI attempted to start Netlify Edge (Deno) causing crashes if Deno absent | Opt‑in with `USE_EDGE` env; guard script validates Deno presence; default off in dev & CI | Eliminated environment friction; easy toggle for experimentation |
| JSON‑LD strategy | Mixed inline emitters (components injecting their own `<script>`s) leading to risk of accidental multiples | Central single emitter `Schema.astro`; defensive post‑build consolidator retained; pure builders | Cleaner graph, simpler reasoning, safer evolution |
| Cross‑service tests | Basic presence assertions; brittle due to duplication/empties | `cross-service-links.spec.ts` asserts semantics (nearby vs same-suburb) + presence of blog/local guides; `nav-landmarks.spec.ts` enforces landmark uniqueness | Higher confidence, earlier detection of regressions |
| Internal link audits | Already present but cross-service panel randomness sometimes produced intermittent counts | Deterministic panel ensures stable link counts; audit passes consistently | Less flakiness in CI |

### Recent Architecture Changes (Aug 2025)

Key refactors & hardening steps applied during this iteration:

1. Cross-Service Navigation Refactor
   - New build step (`build-cross-service-map.mjs`) creates a static JSON lookup keyed by suburb → currentService → cross service items.
   - Added fallback selection algorithm with adjacency preference; if no same-cluster coverage exists, picks deterministic global first entry.
   - Introduced visible `(nearby)` suffix in link text (and aria-label) for non-here services.
2. Accessibility Normalization
   - Replaced duplicate `<nav>` instances with a single `ServiceNav` landmark; legacy `CrossServiceLinks` & related blocks demoted to regions.
   - Added unique `aria-label` across header/footer/cross-service.
   - Added Playwright spec `nav-landmarks.spec.ts` to guarantee invariants.
3. Redirect Parity & Emulation
   - `serve-with-redirects.mjs` upgraded to handle `:params` and `:splat` substitutions mirroring Netlify behavior; ensures redirect specs are meaningful locally.
4. Edge Middleware Toggle
   - Added `USE_EDGE` env gate in `astro.config.mjs` (Edge off by default locally & in CI).
   - Added `scripts/guard-deno.js` (Deno presence check) + `.env.example` documenting toggle.
5. Schema Consolidation
   - Single emitter pattern adopted; removed inline JSON‑LD from presentational components (e.g., review section).
6. Deterministic Testing Surface
   - All cross-service logic now static → eliminated prior race / hydration timing issues causing flaky link counts and landmark duplication.
7. Added Coverage & A11y Tests
   - `nav-landmarks.spec.ts` ensures only one `[data-relservices]` nav and unique names.
   - Updated cross-service spec to validate nearby semantics and local guides presence.

### Future Work / Backlog

Short-term (high confidence / low risk):
1. Remove legacy `CrossServiceLinks` component entirely after one release cycle (currently demoted to region) to reduce dead code.
2. Add Lighthouse performance & a11y budget assertions to CI (fail if scores drop > configured delta).
3. Automate visual snapshot re-baselining workflow (manual approval gate) now that layout stabilized.
4. Extend `pickNearby` algorithm to weight adjacency frequency / distance (if more granular geo data added) instead of first alphabetical fallback.
5. Add unit tests around `build-cross-service-map.mjs` logic (edge cases: suburb with no adjacency, multi-cluster anomalies, empty coverage list).
6. Introduce a schema diff test (serialize & hash each page's `@graph` sorted keys to detect accidental structural drift).

Mid-term (moderate scope):
7. Migrate any remaining Cypress specs fully to Playwright and retire Cypress dependency to streamline CI image.
8. Implement automated stale data detection for `serviceCoverage.json` vs live business coverage source (if/when API introduced).
9. Consider generating a lightweight client JSON manifest for dynamic enhancement (e.g., quick suburb switching without full reload) fed by the same static map.
10. Evaluate pruning of `scripts/consolidate-ld.mjs` once confident that only a single emitter exists (retain initially as safety net).
11. Integrate accessibility snapshot (axe ruleset diff) to highlight newly introduced violations beyond allowed suppressions.

Long-term (strategic):
12. Edge middleware feature parity: experiment with selective header injection / geo personalization when `USE_EDGE=true` before enabling in production.
13. Potential transition of service pages to partial hydration-free islands (Astro no-JS by default) to further improve FCP/LCP metrics.
14. Expand structured data to add `Service` `@type` per cross-service panel link (if beneficial) wrapped inside existing `@graph` while keeping size lean.
15. Introduce content freshness metadata (last updated ISO date) into JSON-LD for blog posts & service pages for improved rich result eligibility.

Tracking & Governance:
- Create a `docs/backlog.md` tying each backlog item to an owner / expected quarter once prioritized.
- Add a simple script to surface un-owned legacy components (grep for `// legacy` tags) to drive deletion tasks.


Open follow‑ups:

- ServiceLayout no longer injects a `Service` JSON‑LD block; service pages own the single `@graph` via `Schema.astro`. This consolidates the source of truth and prevents duplication.

## Health & guardrails (how to validate locally)

Fast checks that should always pass locally before pushing:

```bash
# 1) Build + base verifier (skips when BLOG_BASE is default)
npm run build
npm run ai:blog:verify

# 2) Extended verifier with a non-default base (rename rehearsal)
BLOG_BASE=/guides/ npm run ai:blog:verify:ext

# 3) Codemod drift guard (ensures no hard-coded blog paths in .astro)
npm run ai:blog:codemod:dry
npm run ai:blog:codemod:ci

# 4) Redirect E2E canary (alias → canonical, preserves ?query#hash)
npx playwright test tests/e2e/middleware-redirect.spec.ts

# 5) Project health (quick)
npm run health
```

Expected “good” outputs:

- Build completes; schema health passes; internal links: OK
- Base verify: `BLOG_BASE is default ("/blog/") — skipping verify.`
- Extended verify: `[verify-blog-base-extended] PASS — no offenders.` and `__ai/blog-base-violations.txt` shows “No non-allowlisted hard-coded "/blog/" strings found.”
- Codemod drift: “Codemod drift: none” with `__ai/codemod-blog-base.txt` showing `{ touched: 0 }`
- Redirect e2e: all alias cases pass; query/hash preserved

Reminder

- Run the full Playwright suite (all specs) periodically and before releases to catch regressions beyond the fast canaries.
   - Command: `npm test` (or `npm run test:e2e`) — web server auto-managed by Playwright config.

Quick git hook self‑check:

- Commit an unrelated file (e.g., README/CSS) → pre‑commit prints “skipped blog‑base guard (no relevant changes)”.
- Touch `src/lib/paths.ts` → pre‑commit runs `ai:blog:verify`, `ai:blog:codemod:ci`, and unit tests.
- `git push` → pre‑push runs extended verify with `BLOG_BASE=/guides/` and the redirect E2E (chromium, fail‑fast).

### BLOG_BASE rename safety

- Configuration lives in `src/config/siteConfig.ts` and is normalized to leading/trailing slash.
- Always generate links via `rel.*` / `paths.*` (`src/lib/paths.ts`).
- Verifiers:
   - `scripts/verify-blog-base.mjs` (strict .astro) — runs prebuild.
   - `scripts/verify-blog-base-extended.mjs` (allow-list; scans content) — run on demand with different bases.
- Codemod: `scripts/codemod-blog-base.mjs` rewrites hard-coded `/blog/...` to `rel.*`/`paths.*`. Reports to `__ai/codemod-blog-base.txt`.

Sitemap safety:

- `scripts/assert-sitemap-blog-canonicals.mjs` asserts that every blog entry in `dist/sitemap.xml` is absolute (`https://…`) and starts with the current BLOG_BASE. Runs in postbuild and CI.

### Shared string helpers

Use these instead of ad-hoc regexes:

```ts
// src/lib/str.ts
export const trimSlashes = (s = '') => String(s).replace(/^\/+/, '').replace(/\/+$/, '');
export const squash = (s = '') => String(s).replace(/\/{2,}/g, '/');
export const withTrailingSlash = (p = '/') => /\.([a-z0-9]+)$/i.test(p) ? String(p) : String(p).replace(/\/+$/, '') + '/';
```

Adopted in Footer curated links; recommended for scripts and tests to avoid fragile slash regexes.

### Guardrails (UX/SEO)

- Suburb ticker renders only on service pages (not on home/legal/blog).
- Footer “Popular Areas” only on service pages; each link is `/services/{service}/{suburb}/`, capped to 3, and targets statically built pages.
- Related links: `[data-relblock]` ≤ 3 and `[data-relgrid]` ≤ 6; restricted to same‑cluster, whitelisted suburbs that are actually built.
- Schema: hubs include LocalBusiness and BreadcrumbList; spokes include Service; BreadcrumbList present where expected and consolidated into a single `@graph` per page.
- Routing: aliases 301 → canonicals; unknown suburbs 404; robots disallow alias paths; sitemaps present.

### Link integrity

`scripts/check-internal-links.mjs` crawls built HTML in `dist/`, normalizes hrefs (strips hash/query), and ensures every internal anchor maps to a file. The build fails on any missing target, preventing broken links from shipping.

## Local development

```bash
npm install
npm run dev   # http://localhost:4322

# Build & preview
npm run build
npm run preview
```

## Conventions

- Add a suburb: update `src/content/areas.clusters.json` and include it in `src/data/serviceCoverage.json` for relevant services.
- Keep JSON‑LD URLs canonical; prefer `Astro.site` when computing absolute URLs.
- Prefer SSR endpoints (prerender=false) for alias/synonym routes that 301 to canonical pages.

## Git hooks (Husky v9/v10)

Husky hooks enforce fast, contextual checks locally. Hooks are plain shell (no shebang/loader), future‑proof for v9/v10.

- Pre‑commit (fast, gated by changed files):
   - Runs `ai:blog:verify` and `ai:blog:codemod:ci` only when relevant source/scripts/config or curated JSON change.
   - Runs unit tests when path builders or site config change (e.g., `src/lib/paths.ts`, `src/config/siteConfig.ts`).
   - Skips on merge commits; respects `SKIP_HOOKS=1` escape hatch.
- Pre‑push (heavier):
   - `BLOG_BASE=/guides/ npm run ai:blog:verify:ext` to simulate a rename.
   - Redirect E2E (chromium, fail‑fast): alias → canonical and preserves `?query#hash`.

Tips:

- If hooks don’t run on a new machine, `npm run prepare` and ensure `git config core.hooksPath .husky`.
- Emergency bypass: `SKIP_HOOKS=1 git commit …` or `git commit --no-verify`.

## License

MIT

## Project map: where to find things and why

This section gives a fast, practical map of the codebase with “why it exists” so you can jump to the right place quickly.

### Top-level

- `astro.config.mjs` — Astro app configuration (site URL, integrations like Tailwind and Netlify adapter). Why: central place to set site metadata and build/runtime behavior.
- `netlify.toml` — Redirects and platform config for Netlify. Why: enforces legacy→canonical paths and response headers at the edge.
- `tailwind.config.js` — Tailwind setup (theme, safelist). Why: deterministic CSS generation for Astro components.
- `tsconfig.json` — TypeScript path aliases and strictness. Why: editor/types support across TS/JS.
- `vitest.config.mts` — Unit test runner config. Why: run fast logic tests without a browser.
- `playwright.config.ts` — E2E runner config (port 4322, auto web server). Why: one-command smoke/a11y/redirect testing.
- `cypress.config.js` — Legacy/optional E2E runner. Why: kept for historical tests during migration to Playwright.
- `package.json` — Scripts and deps. Why: orchestrates the build pipeline and guardrails described below.
- `_headers` — Netlify headers override (if needed). Why: control caching/security headers per path.
- `robots.txt` — Robots rules. Why: disallow alias paths so crawlers prefer canonicals.
- `public/` — Static files served as-is (e.g., `_redirects`, images). Why: deploy-time assets that don’t go through bundling.

### Source code (`src/`)

- `src/pages/` — Routes and SSR endpoints.
   - `sitemap.xml.ts` — Sitemap endpoint with cache-control. Why: dynamic list of canonical pages for crawlers.
   - `privacy.astro`, `terms.astro`, `gallery.astro`, `quote.astro` — Static pages. Why: legal, gallery, and quote entry.
   - `[...]/*.ts` under alias folders (e.g., `bond-cleaners/[suburb].ts`) — SSR 301 synonym redirects. Why: map common search terms to canonical service×suburb.
- `src/layouts/` — Page shells (e.g., `MainLayout.astro`, `ServiceLayout.astro`). Why: unify head/meta, JSON‑LD emit, and shared UI regions.
- `src/components/` — Reusable UI (e.g., `Footer.astro` with sitemap/legal links). Why: single source for shared visuals and navigation.
- `src/utils/` — App utilities (e.g., `schemaGraph.js`). Why: build a single stable JSON‑LD `@graph` across pages.
- `src/lib/` — SEO/schema helpers (`schema.js`, `seoSchema.js`). Why: shared logic to compose metadata/structured data.
- `src/config/` — Site settings (`siteConfig.ts`) and local tsconfig. Why: central knobs for site metadata and TS pathing under `src/`.
- `src/data/` — Structured data used by pages (e.g., `serviceCoverage.json`, `topics.json`). Why: drives static generation and UI content.
- `src/content/` — CMS‑like JSON for areas, FAQs, acceptance copy (e.g., `areas.clusters.json`, `faq.*.json`). Why: editable content that feeds build and pages.
- `src/assets/`, `src/styles/`, `src/public/` — Local images/fonts/styles and importable static assets. Why: assets that should be processed/bundled.
- `src/middleware.(ts|js)` — Optional edge middleware. Why: hook into requests for headers/guards if needed.

### Scripts and guardrails (`scripts/`)

These run before/after the Astro build to enforce UX/SEO quality and data integrity.

- `expand-coverage.mjs` (prebuild) — Expands service/suburb coverage from seeds. Why: ensure expected pages are generated.
- `audit-routes.mjs` (prebuild) — Sanity check for route collisions/missing. Why: fail early if routing changes break assumptions.
- `build-faqs.mjs` — Generates compiled FAQs for pages. Why: precompute structured content for speed and consistency.
- `consolidate-ld.mjs` — Post-build merge of multiple JSON‑LD scripts into a single `@graph`. Why: cleaner schema, consistent IDs/URLs.
- `audit-related-links.mjs` — Enforces related links caps and whitelist. Why: avoid link farms and keep relevance.
- `validate-schema.js` — Validates generated schema. Why: catch invalid JSON‑LD before deploy.
- `check-internal-links.mjs` — Verifies every internal anchor resolves to a file in `dist/`. Why: block broken links.
- `validate-faqs.js`, `validate-footer-links.js`, `validate-data.js`, `validate-suburb-pages.js` — Data/content validators. Why: detect regressions in curated content.
- `audit-graph.mjs`, `ai-*.mjs|js`, `sarif.js` — Optional AI reviews (copy, intent, enrichment) that emit SARIF to `sarif/`. Why: automated content QA in PRs.
- `crawl-audit.mjs`, `diff-coverage-whitelist.mjs`, `health.sh` — Operational checks and coverage diffs. Why: quick environment and content health probes.

Key npm scripts (see `package.json`):

- `dev` — Start Astro dev server (port 4322). Why: local development.
- `build` — Full pipeline: `build:faqs` → `astro build` (Netlify adapter) → `consolidate-ld` → `audit-related-links` → `validate:schema` → `check:links`. Why: produce a static site that passes all guardrails.
- `preview` — Serve built site with Netlify adapter. Why: reproduce prod behavior locally.
- `routes:audit` / `prebuild` — Route/coverage audits. Why: early failure on routing gaps.
- `test`, `test:e2e`, `test:ui`, `test:headed` — Playwright suites. Why: a11y/redirect/smoke/structure checks.
- `test:unit` — Vitest. Why: fast unit coverage for utilities.
- `cypress:run` — Legacy E2E. Why: run older specs during migration if needed.
- `ai:*`, `graph:audit`, `ci:verify-graph` — Optional content/graph QA. Why: enforce semantic quality signals.

### Tests

- `tests/` — Playwright specs (a11y, redirects, structure, geometry, smoke, intent, etc.). Why: protect critical UX/SEO behaviors.
- `cypress/` — Cypress specs and support utilities. Why: historical/optional E2E examples.
- `js/__tests__/` — JS unit tests (if present). Why: validate small utilities without a browser.
- `test-results/` — Playwright output. Why: artifacts for CI review.

### AI, reports, and artifacts

- `__ai/` — Local build artifacts and baselines (e.g., `all-pages.txt`, `build.log`, `redirects.txt`, `preview.url`). Why: quick diagnostics and reproducible baselines.
- `ai-reports/` — JSON reports from enrichment/audits. Why: human‑readable outputs to inform edits.
- `sarif/` — Machine‑readable SARIF from AI reviewers. Why: surfaces issues directly in PR checks.
- `ai-rules.json`, `ai-comment.md` — Configuration and notes for AI reviewers. Why: control prompts and document reviewer behavior.

### Data and linking utilities

- `linking and suburbs aug16/` — Research/one‑off scripts for internal linking and coverage curation (e.g., `prioritiseByGrid.js`, `internalLinks.js`, `audit-related-links.mjs`). Why: iterate on linking strategy without touching core build.
- `public/data/` — Static data served to the client (if present). Why: fetchable JSON without bundling.

### Vanilla helpers

- `js/` — Small progressive enhancement scripts and unit tests (`js/__tests__`). Why: ship minimal JS where needed.
- `css/` — Built or hand-authored CSS like `output.css`. Why: quick overrides or debugging styles outside Tailwind when necessary.

### Redirects

- `public/_redirects` — Netlify edge redirects for cluster renames and canonicalization, e.g.:
   - `/blog/ipswich-region → /blog/ipswich 301`
   - `/areas/ipswich-region/* → /areas/ipswich/:splat 301`
   - `/services/:service/:cluster/:suburb/* → /services/:service/:suburb 301`
   Why: enforce canonical URLs and preserve SEO during structure changes.

### Temporary/build outputs

- `dist/` (created by build) — Final static output deployed to Netlify. Why: what ships.
- `tmp/`, `build.log` — Transient logs and scratch space. Why: debugging local runs.

## How to locate information quickly

- Canonical routes and redirects: `src/pages/`, `netlify.toml`, tests in `tests/redirects.spec.ts` and `tests/routing.spec.ts`.
 - Redirect rules: `public/_redirects` (primary), plus `netlify.toml` for any config-based rules.
- JSON‑LD behavior: `src/utils/schemaGraph.js`, layouts in `src/layouts/`, and post‑build `scripts/consolidate-ld.mjs`.
- Footer and sitemap links: `src/components/Footer.astro`, `src/pages/sitemap.xml.ts`.
- Coverage and suburbs: `src/content/areas.clusters.json`, `src/data/serviceCoverage.json`, prebuild `scripts/expand-coverage.mjs`.
- Related links rules: `scripts/audit-related-links.mjs`, tests in `tests/related-links-caps.spec.ts`.
- Internal link integrity: `scripts/check-internal-links.mjs` (runs in `npm run build`).
- Quote flow and form UX: `src/pages/quote.astro`, related components, tests in `tests/quote-flow.spec.ts`.

If something isn’t covered here, search the scripts folder first for a validator/audit, then the `tests/` folder for a spec guarding the behavior.

## Codemod for intent link rewrites

After running the build, you can rewrite intent links in the built HTML to point to the new canonical URLs. This is a safety net to ensure no old links remain.

- Make `rewrite-intent-anchors.mjs` executable:
  ```bash
  chmod +x scripts/rewrite-intent-anchors.mjs
  ```

- Dry run on source files:
  ```bash
  npm run ai:intent:rewrite:src
  ```

- Apply to source (creates .bak backups):
  ```bash
  npm run ai:intent:rewrite:src:write
  ```

- Safety belt after build (rewrite built HTML):
  ```bash
  npm run build
  npm run ai:intent:rewrite:dist
  ```
