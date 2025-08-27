// Rewrites /services/:service/:cluster/:suburb -> /services/:service/:suburb across src/ and dist/
// Use once if lingering old link shapes exist in content or built HTML.

import fs from "node:fs";
import path from "node:path";

const roots = ["src", "dist"];
const rx = /\/services\/([^\/]+)\/(ipswich|brisbane|logan)\/([^\/?#\s]+)(?=[\/?#]|\b|$)/gi;

function* walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(astro|html|md|mdx)$/.test(e.name)) yield p;
  }
}

let changes = 0;
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const s = fs.readFileSync(file, "utf8");
    if (!rx.test(s)) { rx.lastIndex = 0; continue; }
    rx.lastIndex = 0;
    const next = s.replace(rx, "/services/$1/$3");
    if (next !== s) {
      fs.writeFileSync(file, next);
      changes++;
      console.log("fixed:", file);
    }
  }
}
console.log(`Done. Files changed: ${changes}`);
