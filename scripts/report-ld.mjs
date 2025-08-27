// scripts/report-ld.mjs
/**
 * Scan dist/ for <script type="application/ld+json"> blocks.
 * Writes:
 *   __ai/ld-pages.txt   - newline list of built HTML pages with JSON-LD
 *   __ai/ld-pages.json  - JSON array of those pages (dist-relative, leading '/')
 *   __ai/ld-multiples.json - details for pages with >1 JSON-LD block
 *
 * Why: gives a ground-truth list for gates/analytics (postbuild/CI).
 */
import fs from "node:fs";
import path from "node:path";

const DIST = "dist";
const OUT_DIR = "__ai";

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

function toRelUrl(absPath) {
  const rel = absPath.replace(new RegExp("^" + DIST + "[/\\\\]?"), "");
  return "/" + rel.split(path.sep).join("/");
}

function getLdBlocks(html) {
  const rx = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let m;
  while ((m = rx.exec(html))) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const pagesWithLD = [];
const multiples = [];

for (const file of fs.existsSync(DIST) ? walk(DIST) : []) {
  const html = fs.readFileSync(file, "utf8");
  const blocks = getLdBlocks(html);
  if (blocks.length > 0) {
    const rel = toRelUrl(file);
    pagesWithLD.push(rel);
    if (blocks.length > 1) {
      multiples.push({ page: rel, count: blocks.length });
    }
  }
}

pagesWithLD.sort();

fs.writeFileSync(
  path.join(OUT_DIR, "ld-pages.txt"),
  pagesWithLD.length ? pagesWithLD.join("\n") + "\n" : ""
);
fs.writeFileSync(
  path.join(OUT_DIR, "ld-pages.json"),
  JSON.stringify(pagesWithLD, null, 2) + "\n"
);
fs.writeFileSync(
  path.join(OUT_DIR, "ld-multiples.json"),
  JSON.stringify(multiples, null, 2) + "\n"
);

console.log(
  `🧾 JSON-LD report: ${pagesWithLD.length} page(s) with JSON-LD, ${multiples.length} with multiples`
);
