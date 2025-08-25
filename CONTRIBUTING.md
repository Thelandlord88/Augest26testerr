# Contributing

## Editorial base and routing

- Do not hard-code `/blog/` in templates. Use central helpers:
  - `paths.blog*` for absolute URLs
  - `rel.blog*` for relative hrefs
- If you plan to change BLOG_BASE (e.g., to `/guides/`):
  1. Run a rehearsal verify:
     - `BLOG_BASE=/guides/ npm run ai:blog:verify:ext`
  2. Apply codemod if needed:
     - `node scripts/codemod-blog-base.mjs --dry` (review)
     - `node scripts/codemod-blog-base.mjs --write`
- CI will fail on:
  - Codemod drift (`npm run ai:blog:codemod:ci`)
  - Verifier violations in `.astro` files

## Middleware redirects

- Redirects must preserve query string and hash.
- Tests exist to guard this behavior (`tests/routing/middleware-redirect.spec.ts`).

## QA artifacts

- Scripts write reports to `__ai/` (checked into CI artifacts). Keep it consistent and deterministic.

## Git hooks (Husky v9/v10)

- Pre-commit (fast, gated):
  - Runs `ai:blog:verify` and `ai:blog:codemod:ci` only when relevant source/scripts/config or curated JSON changed.
  - Runs unit tests when `src/lib/paths.ts` or `src/config/siteConfig.ts` changed.
  - Skips on merge commits; bypass with `SKIP_HOOKS=1 git commit …` or `--no-verify`.
- Pre-push (heavier):
  - `BLOG_BASE=/guides/ npm run ai:blog:verify:ext` (rename rehearsal).
  - Redirect E2E (Chromium, fail-fast) asserting alias → canonical and preserves `?query#hash`.

If hooks don’t fire locally, run `npm run prepare` (installs Husky) and ensure `git config core.hooksPath .husky`.

## BLOG_BASE rename checklist

1) Rehearsal verify (allow-list scan):

```bash
BLOG_BASE=/guides/ npm run ai:blog:verify:ext
```

2) Codemod (review then apply if needed):

```bash
npm run ai:blog:codemod:dry
npm run ai:blog:codemod:write
```

3) Build and guards:

```bash
npm run build
npm run ai:blog:verify
```

4) Redirect E2E canary:

```bash
npx playwright test tests/e2e/middleware-redirect.spec.ts
```

5) Push — pre-push will re-run extended verify and redirect E2E.

## Sitemap guard

- Postbuild runs `scripts/assert-sitemap-blog-canonicals.mjs`, which asserts:
  - All blog URLs in `dist/sitemap.xml` are absolute (https://…).
  - Paths start with the current `BLOG_BASE` (normalized).
- Same guard also runs in CI after `npm run build`.

## CI guardrails

- `.github/workflows/blog-base-guards.yml` mirrors local checks with a BLOG_BASE matrix (`/blog/`, `/guides/`), codemod drift, and the sitemap guard. Caches npm, Playwright, and `__ai/` artifacts for speed.

## Troubleshooting

- Playwright browsers: run `npx playwright install --with-deps` once if E2E fails due to missing browsers.
- Hooks on Windows/WSL: ensure files are executable (`chmod +x .husky/*`) and re-run `npm run prepare` if needed.

## URL helper quick reference

- Use `rel.blog*` for hrefs, nav, and breadcrumbs (relative URLs).
- Use `paths.blog*` for canonicals, sitemap, and JSON-LD (absolute URLs via `absoluteUrl`).
- Use `toCanonicalCluster` to normalize any cluster before building blog links.
- Don’t hand-join URL strings — helpers squash slashes and add trailing `/`.

## New blog post mini runbook

1) Update `src/data/topics.json` for the cluster/category/post.
2) Implement content page as needed and ensure routes use `rel.*`/`paths.*`.
3) Build and preview:

```bash
npm run build && npm run preview
```

4) Spot-check:
- Page at `/blog/:cluster/:slug/` loads, trailing slash present.
- Canonical URL and sitemap entry are absolute and start with BLOG_BASE.
- JSON-LD is a single `@graph` and includes expected Article/FAQ nodes.
