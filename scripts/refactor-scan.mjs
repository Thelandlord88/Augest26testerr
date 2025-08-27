// scripts/refactor-scan.mjs
// Static scan to catch brittle hard-coded slugs before a rename.
// Writes __ai/refactor-scan.txt and exits nonzero on findings.

import fs from "node:fs";
import path from "node:path";

const ROOT = "src";
const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "__ai", ".astro", ".vercel", ".netlify",
  "coverage", "test-results",
  // remove "content" if you want to scan raw posts/markdown too:
  "content",
]);
const IGNORE_FILES = [
  /\/public\/_redirects$/i,
  /\/robots\.txt$/i,
  /package-lock\.json$/i,
];

const PATTERNS = [
  // base path literal (don’t hard-code /blog/)
  { name: "blog_base_literal", rx: /(^|["'`(\s])\/blog\/(?=[^/]|$)/i },

  // cluster aliases (none expected)
  { name: "alias_cluster_1", rx: /$^/i },
  { name: "alias_cluster_2", rx: /$^/i },

  // legacy service URL shape with a cluster segment present
  { name: "legacy_service_with_cluster", rx: /\/services\/[^/]+\/(ipswich|brisbane|logan)\/[^/]+/i },
];

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(p);
    } else {
      const posix = p.replace(/\\/g, "/");
      if (IGNORE_FILES.some(rx => rx.test(posix))) continue;
      if (/\.(astro|mdx?|tsx?|jsx?|m?[cj]s|json)$/i.test(e.name)) yield p;
    }
  }
}

const hits = [];
for (const file of walk(ROOT)) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    for (const pat of PATTERNS) {
      if (pat.rx.test(ln)) {
        hits.push({ file, line: i + 1, issue: pat.name, snippet: ln.trim().slice(0, 200) });
      }
    }
  }
}

fs.mkdirSync("__ai", { recursive: true });
if (!hits.length) {
  fs.writeFileSync("__ai/refactor-scan.txt", "✅ No brittle literals found in src/.\n");
  console.log("refactor-scan: clean");
  process.exit(0);
}

const byFile = hits.reduce((m, h) => ((m[h.file] ??= []).push(h), m), {});
let report = "# Refactor scan — brittle literals found\n\n";
for (const [file, arr] of Object.entries(byFile)) {
  report += `- ${file}\n` + arr.map(h => `  - [${h.issue}] line ${h.line}: ${h.snippet}`).join("\n") + "\n";
}
fs.writeFileSync("__ai/refactor-scan.txt", report);
console.error("refactor-scan: brittle literals present (see __ai/refactor-scan.txt)");
process.exit(1);
