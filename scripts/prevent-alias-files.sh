#!/usr/bin/env bash
set -euo pipefail
# Fast guard: prevent alias route files under src/pages/(blog|guides)
if rg -n '^(src/pages/(blog|guides)/(ipswich-region|brisbane-west|brisbane_west)/)' -g '!**/node_modules/**' >/dev/null 2>&1; then
  echo "❌ Alias route files found under src/pages. Handle via middleware/_redirects only."
  exit 1
else
  echo "✅ No alias route files under src/pages."
fi
