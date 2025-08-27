// scripts/ui-grep.mjs
import fs from "node:fs";
import path from "node:path";

const PATTERNS = [
  { name: "alias_clusters", rx: /\/(ipswich-region|brisbane-west|brisbane_west)\b/gi },
  { name: "legacy_service", rx: /\/services\/[^/]+\/(ipswich|brisbane|logan)\/[^/]+/gi },
];

const URL_ATTRS = /(?:href|src)=["']([^"']+)["']/gi;

function* walk(dir, exts) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full, exts);
    else if (exts.some(e => entry.name.endsWith(e))) yield full;
  }
}

const files = [
  ...walk("dist", [".html"]),
  ...walk("src", [".astro", ".html", ".md"]),
];

const findings = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");

  // broad scans
  for (const p of PATTERNS) {
    if (p.rx.test(text)) findings.push({ file, issue: p.name });
    p.rx.lastIndex = 0;
  }

  // bad_encoding only on URL attributes
  let m; let flagged = false;
  while ((m = URL_ATTRS.exec(text))) {
    const url = m[1];
    if (/%20/.test(url) || /\/.+_.+\//.test(url)) { // underscores inside path segs
      findings.push({ file, issue: "bad_encoding" });
      flagged = true;
      break;
    }
  }
  if (!flagged) URL_ATTRS.lastIndex = 0;

  // canonical trailing slash check
  const canonicalTag = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
  while ((m = canonicalTag.exec(text))) {
    const href = m[1];
    const isFile = /\.[a-z0-9]+$/i.test(href);
    const hasQueryOrHash = href.includes("?") || href.includes("#") || /[/?#]$/.test(href);
    if (!isFile && !hasQueryOrHash && !href.endsWith("/")) {
      findings.push({ file, issue: "canonical_mismatch" });
      break;
    }
  }
  canonicalTag.lastIndex = 0;
}

const byIssue = findings.reduce((m, o) => ((m[o.issue] ??= []).push(o.file), m), {});
let report = "";
for (const [k, arr] of Object.entries(byIssue)) {
  report += `## ${k}\n` + [...new Set(arr)].sort().map(f => `- ${f}`).join("\n") + "\n\n";
}
if (!report) report = "✅ No issues found.\n";

fs.mkdirSync("__ai", { recursive: true });
fs.writeFileSync("__ai/ui-grep.txt", report);
console.log("🧹 ui-grep → __ai/ui-grep.txt");
