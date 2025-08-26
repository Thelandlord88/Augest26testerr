import fs from "node:fs";
import path from "node:path";

const DIST = "dist";
const CLUSTERS_JSON = "src/content/areas.clusters.json";

function norm(s) {
  return String(s).toLowerCase().trim().replace(/%20/g, "-").replace(/[_\s]+/g, "-").replace(/-+/g, "-");
}

function buildAliasSet() {
  const raw = JSON.parse(fs.readFileSync(CLUSTERS_JSON, "utf8"));
  const aliases = new Set();
  const nodes = Array.isArray(raw) ? raw : (raw?.clusters ?? []);
  for (const n of nodes) {
    const list = n?.aliases || {};
    const arr = Array.isArray(list) ? list : Object.keys(list);
    for (const a of arr) aliases.add(norm(a));
  }
  return aliases;
}

function aliasVariants(alias) {
  return [alias, alias.replace(/-/g, "_"), alias.replace(/-/g, "%20")];
}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

if (!fs.existsSync(DIST)) {
  console.log("ℹ️ dist/ not found (nothing to check)");
  process.exit(0);
}

const aliases = buildAliasSet();
const patterns = [];
for (const a of aliases) for (const v of aliasVariants(a)) patterns.push(new RegExp(`^(blog|areas)/${v}/`, "i"));

const offenders = [];
for (const f of walk(DIST)) {
  const rel = f.replace(/^dist[\\/]/, "").split(path.sep).join("/");
  if (patterns.some((rx) => rx.test(rel))) offenders.push("/" + rel);
}

if (offenders.length) {
  console.error("❌ Alias-built pages found (should be 301-only):");
  offenders.forEach((o) => console.error(" -", o));
  process.exit(1);
}

// Optional sitemap.xml check: ensure no alias URLs are present under either /blog or /guides
const sitemap = path.join(DIST, 'sitemap.xml');
if (fs.existsSync(sitemap)) {
  const xml = fs.readFileSync(sitemap, 'utf8');
  const baseDomains = [
    'https://onendonebondclean.com.au',
    'http://localhost',
  ];
  const aliasHits = [];
  for (const a of aliases) {
    for (const variant of aliasVariants(a)) {
      for (const dom of baseDomains) {
        if (xml.includes(`${dom}/blog/${variant}/`) || xml.includes(`${dom}/guides/${variant}/`)) {
          aliasHits.push(`${dom}/blog|guides/${variant}/`);
        }
      }
    }
  }
  if (aliasHits.length) {
    console.error('❌ Alias URLs found in sitemap.xml:');
    aliasHits.forEach((h) => console.error(' -', h));
    process.exit(1);
  }
}

console.log("✅ No alias-built pages in dist/ and no alias URLs in sitemap.xml");
