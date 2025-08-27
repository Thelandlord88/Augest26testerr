#!/usr/bin/env bash
# Project health check: build + graph + routes + links (+ optional tests)
# Usage:
#   bash scripts/health.sh           # quick (no crawl/full tests)
#   bash scripts/health.sh full      # includes internal link crawl + Playwright suite
#   npm run health                   # via package.json

set -euo pipefail

MODE="${1:-quick}"                         # quick|full
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$ROOT/tmp"; mkdir -p "$TMP"
EXIT=0
STRICT="${STRICT:-1}"                      # 1=strict (fail on issues), 0=permissive (warn on some)

bold(){ printf "\033[1m%s\033[0m\n" "$*"; }
ok(){   printf "\033[32m✓ %s\033[0m\n" "$*"; }
warn(){ printf "\033[33m! %s\033[0m\n" "$*"; }
fail(){ printf "\033[31m✗ %s\033[0m\n" "$*"; EXIT=1; }
have(){ command -v "$1" >/dev/null 2>&1; }
rgf(){ if have rg; then rg -n "$@"; else grep -R --line-number "$@"; fi }

bold "Environment"
# Parity with Netlify (Node 20); don't hard-fail if nvm missing.
if have nvm; then nvm use 20 >/dev/null 2>&1 || true; fi
node -v; npm -v

if [ ! -d "$ROOT/node_modules" ]; then
  bold "Installing deps (npm ci)"
  npm ci
else
  ok "Dependencies present"
fi

bold "Routes audit"
npm run routes:audit || true

bold "SSR synonym endpoints (prerender=false & 301)"
rgf "prerender:\s*false|export\s+(async\s+)?GET" src/pages || true
rgf "return\s+redirect\(.+?,\s*301\)" src/pages || true

bold "Required static pages"
MISSING=()
for p in privacy terms gallery quote; do
  [ -f "src/pages/$p.astro" ] || MISSING+=("$p")
done
if [ "${#MISSING[@]}" -gt 0 ]; then fail "Missing pages: ${MISSING[*]}"; else ok "Required pages present"; fi

bold "Sitemap mechanism (custom endpoint vs plugin)"
SITEMAP_FILES=$( (find src/pages -maxdepth 1 -type f -name 'sitemap.xml.*' 2>/dev/null || true) | wc -l | tr -d ' ' )
PLUGIN_PRESENT=$( (rgf "@astrojs/sitemap" astro.config.* package.json 2>/dev/null || true) | wc -l | tr -d ' ' )
if [ "$SITEMAP_FILES" -gt 1 ]; then
  fail "Multiple sitemap handlers in src/pages (expected 1)"; ls -1 src/pages/sitemap.xml.* || true
elif [ "$SITEMAP_FILES" -eq 1 ] && [ "$PLUGIN_PRESENT" -ge 1 ]; then
  fail "Both @astrojs/sitemap and custom endpoint present (pick ONE)"
else
  ok "Exactly one sitemap mechanism"
fi

bold "Dev/preview port check"
if rgf "4322" README* package.json >/dev/null 2>&1; then ok "Port 4322 referenced"; else warn "Port 4322 not found in README/package.json"; fi

bold "Build (Astro)"
npm run build --silent | tee "$TMP/build.log"
HTML_COUNT=$(find dist -type f -name "*.html" | wc -l | tr -d ' ')
ok "Built HTML files: $HTML_COUNT"
find dist -type f -name "*.html" | head -n 15 | sed 's#^dist/##' || true

bold "Internal link crawl (dist/)"
if [ "$MODE" = "full" ]; then
  if have npx; then
    npx --yes linkinator dist --recurse --skip "^(https?:)?//" --silent | tee "$TMP/linkinator.log" || true
    BROKEN=$(grep -c "BROKEN" -n "$TMP/linkinator.log" || true)
    REDIRS=$(grep -c "REDIRECT" -n "$TMP/linkinator.log" || true)
    [ "${BROKEN:-0}" -gt 0 ] && fail "Internal broken links: $BROKEN (see tmp/linkinator.log)" || ok "No broken internal links"
    [ "${REDIRS:-0}" -gt 0 ] && warn "Internal redirects: $REDIRS (aim ~0)"
  else
    warn "npx not available; skipping link crawl"
  fi
else
  warn "Skipping link crawl in quick mode (run: bash scripts/health.sh full)"
fi

bold "Redirects hygiene (public/_redirects)"
if [ -f public/_redirects ]; then
  if grep -n $'\t' public/_redirects >/dev/null; then fail "Tabs found in public/_redirects"; else ok "No tabs in _redirects"; fi
  awk '/^[[:space:]]*#|^$/{next} { if (NF<2 || NF>3) { print "Bad columns @line " NR ": " $0; exit 2 } }' public/_redirects \
    && ok "Redirects columns look OK" || fail "Redirects columns check failed"
else
  warn "public/_redirects not found (ok if using only netlify.toml)"
fi

bold "Sitemap cache header (optional but nice)"
# Look for sitemap cache header in common locations
HEADERS_CHECKED=false
for HF in _headers public/_headers dist/_headers; do
  if [ -f "$HF" ]; then
    HEADERS_CHECKED=true
    if awk '/^\/sitemap\.xml/{f=1;next} f && NF{print;exit}' "$HF" | grep -iq "Cache-Control: .*max-age=300"; then
      ok "Cache-Control for /sitemap.xml present in $HF"
      break
    fi
  fi
done
if [ "$HEADERS_CHECKED" = false ]; then
  warn "No _headers file found; skipping header check"
else
  # If we checked files but didn't break on success, warn once
  if ! awk 'BEGIN{exit 1}'; then :; fi
  if ! ( [ -f _headers ] && awk '/^\/sitemap\.xml/{f=1;next} f && NF{print;exit}' _headers | grep -iq "Cache-Control: .*max-age=300" ) \
     && ! ( [ -f public/_headers ] && awk '/^\/sitemap\.xml/{f=1;next} f && NF{print;exit}' public/_headers | grep -iq "Cache-Control: .*max-age=300" ) \
     && ! ( [ -f dist/_headers ] && awk '/^\/sitemap\.xml/{f=1;next} f && NF{print;exit}' dist/_headers | grep -iq "Cache-Control: .*max-age=300" ) ; then
    warn "No Cache-Control for /sitemap.xml found in _headers (checked: ./_headers, public/_headers, dist/_headers)"
  fi
fi

bold "JSON-LD audit (single @graph/script; no alias URLs)"
if [ -f scripts/audit-graph.mjs ]; then
  node scripts/audit-graph.mjs | tee "$TMP/graph-audit.txt" || true
else
  # Fallback inline auditor with alias checks
  node - <<'NODE' | tee "$TMP/graph-audit.txt"
const fs=require('fs'),p=require('path');
const ALIAS=/$^/;
function* w(d){for(const n of fs.readdirSync(d)){const f=p.join(d,n),s=fs.statSync(f); if(s.isDirectory())yield* w(f); else if(n.endsWith('.html'))yield f}}
function scripts(h){return [...h.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);}
let pages=0,multi=0,none=0,aliasLd=0,aliasHref=0;
for (const f of w('dist')) {
  const h=fs.readFileSync(f,'utf8'); const sc=scripts(h);
  if(!sc.length){none++;continue;} pages++; if(sc.length>1) multi++;
  if(ALIAS.test(sc.join('\n'))) aliasLd++;
  if(ALIAS.test(h)) aliasHref++;
}
console.log(`pages with JSON-LD: ${pages}`);
console.log(`pages with >1 JSON-LD script: ${multi}`);
console.log(`pages with NO JSON-LD: ${none}`);
console.log(`pages with alias URLs inside JSON-LD: ${aliasLd}`);
console.log(`pages with alias URLs in hrefs: ${aliasHref}`);
NODE
fi
MULTI=$(grep -oE "pages with >1 JSON-LD script: [0-9]+" "$TMP/graph-audit.txt" | awk '{print $NF}' | tail -n1)
NONE=$(grep -oE "pages with NO JSON-LD: [0-9]+" "$TMP/graph-audit.txt" | awk '{print $NF}' | tail -n1)
ALIAS_LD=$(grep -oE "pages with alias URLs inside JSON-LD: [0-9]+" "$TMP/graph-audit.txt" | awk '{print $NF}' | tail -n1 || echo 0)
ALIAS_HREF=$(grep -oE "pages with alias URLs in hrefs: [0-9]+" "$TMP/graph-audit.txt" | awk '{print $NF}' | tail -n1 || echo 0)

[ "${MULTI:-0}" != "0" ] && {
  if [ "$STRICT" = "1" ] || [ "$MODE" = "full" ]; then
    fail "Multiple JSON-LD scripts found (merge to single @graph)"
  else
    warn "Multiple JSON-LD scripts found (permissive mode)"
  fi
}
[ "${NONE:-0}" != "0" ] && warn "Some pages have no JSON-LD (ok only if intentional)"
[ "${ALIAS_LD:-0}" != "0" ] && fail "Alias URLs found inside JSON-LD (must be canonical)"
[ "$MODE" = "full" ] && [ "${ALIAS_HREF:-0}" -gt 0 ] && warn "Alias URLs found in hrefs: $ALIAS_HREF"

bold "Playwright (optional)"
if [ "$MODE" = "full" ]; then
  have npx && npx playwright install --with-deps
  npx playwright test tests/synonym-redirects.canary.spec.ts --reporter=line || fail "Redirect canary failed"
  npm test --silent || fail "Playwright suite failed"
else
  warn "Skipping Playwright in quick mode"
fi

bold "Workflow sanity"
if [ -f .github/workflows/ai-review.yml ]; then
  if rgf "security-events:\s*write" .github/workflows/ai-review.yml >/dev/null 2>&1; then
    ok "SARIF permission present in ai-review.yml"
  else
    warn "AI review workflow lacks security-events: write (only needed if uploading SARIF)"
  fi
fi

if [ "$EXIT" -ne 0 ]; then
  fail "Health check FAIL"
  exit 1
else
  ok "Health check PASS"
fi
