# Project Health & Backlog Checklist

Legend: Priority (P0=Critical / immediate, P1=High, P2=Medium, P3=Nice-to-have). Check boxes are initially unchecked.

## P0 – Critical / Immediate
- [ ] (P0) Resolve ESLint config warning (choose flat config re-harden or stay classic and suppress): unify ignore handling; no warnings on clean run.
- [ ] (P0) Create initial JSON-LD schema hash baseline commit (if not yet committed) and document update procedure in README.
- [ ] (P0) Add CI enforcement for new redirect & schema hash tests (ensure included in primary workflow, not just locally).
- [ ] (P0) Verify all synonym redirect endpoints are covered in `synonym-redirects.spec.ts`; add any missing suburb/service combos.

## P1 – High Priority Quality & Guardrails
- [ ] (P1) Lint hardening phase 2: auto-fix & convert `unused-imports` + `no-unused-vars` from warn to error after cleanup.
- [ ] (P1) Add visual regression workflow (baseline management policy + diff artifact) beyond placeholder plan.
- [ ] (P1) Consolidate CI workflows (build once, reuse for unit, e2e, schema hash, LHCI in matrix or follow-up job using build artifact).
- [ ] (P1) Legacy cleanup: remove `.notusing.*` components & `CrossServiceLinks.astro` after one stable production deploy.
- [ ] (P1) Remove Cypress dependency if no critical specs remain; adjust scripts & README.
- [ ] (P1) Introduce perf budget checks inside Playwright (measure LCP proxy, TTFB for key pages) for faster signal than Lighthouse.
- [ ] (P1) Add README badges (CI, CodeQL, Lighthouse, License) for quick status visibility.
- [ ] (P1) Dependabot grouping / labeling strategy to reduce PR noise (e.g., weekly rollup script or config groups).

## P2 – Medium Priority Enhancements
- [ ] (P2) Expand ambient type declarations with concrete interfaces (coverage, clusters, cross-service map) to enable strict TypeScript rules later.
- [ ] (P2) Elevate `@typescript-eslint/no-floating-promises` and add promise handling utilities (wrap fire-and-forget with explicit ignore comment pattern).
- [ ] (P2) Create `codeql-config.yml` if noise appears (scopes & excludes) after initial CodeQL runs.
- [ ] (P2) Add bundle size / client JS drift check (simple `npx source-map-explorer` or `astro build --verbose` artifact diff) gating PRs over threshold.
- [ ] (P2) Implement route example slash validator script (`validate-readme-routes.mjs`) and wire to CI (docs integrity).
- [ ] (P2) Add script to enforce single `<nav>` landmark & unique aria-label outside existing test (lint-style structural check as fallback).
- [ ] (P2) Add adjacency weighting refinement (distance / cluster frequency) for fallback service selection (currently first-match deterministic only).
- [ ] (P2) Add schema diff allowlist (e.g., tolerating added Review nodes without failing baseline when within configured limit).
- [ ] (P2) Introduce accessibility snapshot diff (axe violations count hash) to detect newly introduced a11y issues.
- [ ] (P2) Create docs/backlog.md with ownership & target release/quarter for these tasks.

## P3 – Nice to Have / Strategic
- [ ] (P3) Edge middleware experimentation tasks (headers personalization / geo). Document test plan.
- [ ] (P3) Partial hydration reduction: audit components for possible static extraction to decrease JS payload.
- [ ] (P3) Generate lightweight client manifest for dynamic suburb switching (performance research spike first).
- [ ] (P3) Integrate structured data enrichment (e.g., `Service` nodes for cross-service panel) gated behind bundle size / HTML size budget.
- [ ] (P3) Add freshness metadata (`dateModified`) into blog & service JSON-LD nodes.
- [ ] (P3) Implement automatic stale data detection for `serviceCoverage.json` (future external API integration placeholder).
- [ ] (P3) Automated issue creation from `legacy:find` output when legacy files persist beyond N days.

## Observability / Metrics (Future)
- [ ] (P2) Add basic runtime performance logging (server timing headers or build-time size report) archived in artifacts.
- [ ] (P3) Track number of internal link audit failures over time (trend report) to catch creeping regressions.

## Documentation
- [ ] (P1) README updates: add section describing schema hash guard & how to update baseline intentionally.
- [ ] (P2) Add CONTRIBUTING note about preferred path helpers & prohibition of hard-coded `/blog/` (point to codemod & verify scripts).
- [ ] (P2) Document lint escalation plan and timeline in `docs/engineering-standards.md` (create file).

## Security / Maintenance
- [ ] (P1) Review CodeQL results after first successful run; triage or suppress FP with precise `# noqa` style patterns (if necessary).
- [ ] (P2) Add secret scanning or commit policy (GitHub push protection or a lightweight pre-commit regex scan script) for credentials.
- [ ] (P3) Evaluate SCA tool (e.g., OSS Review Toolkit) if dependency surface grows.

## Data & Content
- [ ] (P2) Add test cases for cluster/suburb edge cases (unknown suburb, alias cluster mapping) at unit level (fast feedback separate from E2E).
- [ ] (P2) Write unit tests for `build-cross-service-map.mjs` fallback logic (adjacency missing, cluster absent, global fallback).
- [ ] (P3) Add drift detection for `serviceCoverage.json` vs generated pages (ensure no orphan coverage entries or missing page builds).

## Risk Mitigation Policies
- [ ] (P1) Create baseline update PR template requiring justification for schema hash changes.
- [ ] (P2) Add GitHub issue template for "Guardrail Failure" with reproduction steps fields.

---
Generated: 2025-08-24
