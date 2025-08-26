// scripts/assert-ld-health.mjs
/**
 * JSON-LD health gate (production-hardened)
 *
 * - Enforces minimum number of LD pages (MIN_PAGES_WITH_LD)
 * - Enforces "must-have" coverage using globs (LD_MUST_HAVE)
 *   - Optional: fail if any glob matches zero pages (LD_MUST_HAVE_FAIL_ON_ZERO=1)
 * - Optional strict type checks (LD_ENFORCE_TYPES=1 or LD_REQUIRED_TYPES_JSON)
 * - Cross-platform path normalization (toPosix)
 * - Falls back to scanning dist/ if __ai/ld-pages.json is missing or empty
 */

import fs from "node:fs";
import path from "node:path";
import mm from "micromatch";

const DIST = "dist";
const MULTI = path.join("__ai", "ld-multiples.json");
const SOURCES = path.join("__ai", "ld-sources.json");
const PAGES_TXT = path.join("__ai", "ld-pages.txt");
const PAGES_JSON = path.join("__ai", "ld-pages.json");

const MIN_PAGES_WITH_LD = parseInt(process.env.MIN_PAGES_WITH_LD || "10", 10);
const MUST = (process.env.LD_MUST_HAVE || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const FAIL_ON_ZERO = process.env.LD_MUST_HAVE_FAIL_ON_ZERO === "1";

const ENFORCE_TYPES =
  process.env.LD_ENFORCE_TYPES === "1" ||
  Boolean(process.env.LD_REQUIRED_TYPES_JSON);
const TYPES_MAP_PATH = process.env.LD_REQUIRED_TYPES_JSON || "";

function readJSON(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

// ---------------- helpers ----------------
const toPosix = (p) =>
  ("/" + p.replace(/^\/?dist[\\/]/, "").split(path.sep).join("/")).replace(
    /\/+/g,
    "/"
  );

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

function scanDistForLdPages() {
  if (!fs.existsSync(DIST)) return [];
  const pages = [];
  const rx = /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i;
  for (const fp of walk(DIST)) {
    const html = fs.readFileSync(fp, "utf8");
    if (rx.test(html)) pages.push(toPosix(fp));
  }
  return pages;
}

function collectLdPages() {
  // Preferred: __ai/ld-pages.json (array of "/.../index.html" paths)
  const fromJson = readJSON(PAGES_JSON, null);
  if (Array.isArray(fromJson) && fromJson.length) return fromJson.map(toPosix);
  // Fallback: __ai/ld-pages.txt (one per line)
  if (fs.existsSync(PAGES_TXT)) {
    const arr = fs
      .readFileSync(PAGES_TXT, "utf8")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (arr.length) return arr.map(toPosix);
  }
  // Last resort: scan dist/
  return scanDistForLdPages();
}

function parseJsonSafe(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function getLdBlocks(html) {
  const rx = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out = [];
  let m;
  while ((m = rx.exec(html))) out.push(m[1]);
  return out;
}
function extractTypesFromHtml(html) {
  const blocks = getLdBlocks(html);
  const types = new Set();
  const collect = (node) => {
    if (!node || typeof node !== "object") return;
    if ("@type" in node) {
      const t = node["@type"];
      if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x));
      else if (typeof t === "string") types.add(t);
    }
    if ("@graph" in node && Array.isArray(node["@graph"])) node["@graph"].forEach(collect);
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === "object") collect(v);
    }
  };
  for (const raw of blocks) {
    const json = parseJsonSafe(raw);
    if (!json) continue;
    if (Array.isArray(json)) json.forEach(collect);
    else collect(json);
  }
  return types;
}
function hasAllRequiredTypesOnPage(pageRelPosix, required) {
  const abs = path.join(DIST, pageRelPosix.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return false;
  const html = fs.readFileSync(abs, "utf8");
  const types = extractTypesFromHtml(html);
  return required.every((t) => types.has(t));
}

let failures = 0;

// 1) Enforce single JSON-LD block per page
let multiples = readJSON(MULTI, []);
// support both shapes: [{page,count}] or {pages:[]} or ["path",...]
if (multiples && typeof multiples === "object" && !Array.isArray(multiples)) {
  multiples = multiples.pages || [];
}
const multiList = Array.isArray(multiples) ? multiples : [];
if (multiList.length > 0) {
  console.error("❌ JSON-LD health check failed: pages with multiple JSON-LD blocks:");
  for (const item of multiList) {
    const p = typeof item === "string" ? item : item?.page || JSON.stringify(item);
    console.error(` - ${p}`);
  }
  failures++;
} else {
  console.log("✅ No pages with multiple JSON-LD blocks.");
}

// 2) (Nice) Echo quick source summary
const sources = readJSON(SOURCES);
if (sources?.counts) {
  const c = sources.counts;
  console.log(
    `ℹ️  Schema sources — generators:${c.generators}, layouts:${c.layouts}, components:${c.components}, pages:${c.pages}, legacy:${c.legacy}, tooling:${c.tooling}, total:${c.total}`
  );
} else {
  console.log("ℹ️  Schema source summary not available (missing __ai/ld-sources.json).");
}

// 3) Presence + must-have gates
const ldPages = collectLdPages();
if (ldPages.length < MIN_PAGES_WITH_LD) {
  console.error(
    `❌ Only ${ldPages.length} page(s) have JSON-LD (minimum required: ${MIN_PAGES_WITH_LD}).`
  );
  failures++;
}

console.log("🔎 LD_MUST_HAVE coverage:");
let zeroMatchGlobs = [];
let exactMissing = [];
for (const pattern of MUST) {
  const isGlob = /[\*\?\[\]\{\}]/.test(pattern);
  if (isGlob) {
    const matches = mm(ldPages, pattern, { nocase: true });
    const preview = matches.slice(0, 3).join(", ");
    console.log(
      `• ${pattern} → ${matches.length} match(es)` +
        (matches.length ? `  e.g. ${preview}${matches.length > 3 ? " …" : ""}` : "")
    );
    if (matches.length === 0 && FAIL_ON_ZERO) zeroMatchGlobs.push(pattern);
  } else {
    const present = ldPages.includes(pattern);
    console.log(`• ${pattern} → ${present ? "present" : "missing"}`);
    if (!present) exactMissing.push(pattern);
  }
}

if (zeroMatchGlobs.length) {
  console.error(
    "❌ LD_MUST_HAVE globs with zero matches:\n - " + zeroMatchGlobs.join("\n - ")
  );
  failures++;
}
if (exactMissing.length) {
  console.error(
    `❌ JSON-LD missing on required page(s):\n - ${exactMissing.join("\n - ")}`
  );
  failures++;
}

// 4) Type validations (optional)
let typeFailures = [];
if (ENFORCE_TYPES) {
  let TYPES_MAP = null;
  if (TYPES_MAP_PATH) {
    try {
      TYPES_MAP = readJSON(TYPES_MAP_PATH);
      if (!TYPES_MAP || typeof TYPES_MAP !== "object") throw new Error("Invalid JSON");
    } catch (e) {
      console.error(
        `❌ Failed to read LD_REQUIRED_TYPES_JSON at ${TYPES_MAP_PATH}: ${e.message}`
      );
      process.exit(1);
    }
  }
  const map = TYPES_MAP || {
    "/index.html": ["WebSite", "LocalBusiness"],
    "/services/bond-cleaning/index.html": ["Service", "Offer"],
    "/blog/*/category/*/index.html": ["CollectionPage"],
  };

  console.log("\n🧪 Type validation:");
  for (const [pattern, requiredTypes] of Object.entries(map)) {
    const required = Array.isArray(requiredTypes) ? requiredTypes : [requiredTypes];
    const targets = mm(ldPages, pattern, { nocase: true });
    const okCount = targets.filter((p) => hasAllRequiredTypesOnPage(p, required)).length;
    const failCount = targets.length - okCount;

    console.log(
      `• ${pattern} → ${okCount}/${targets.length} page(s) satisfy [${required.join(
        ", "
      )}]`
    );

    if (failCount > 0) {
      for (const p of targets) {
        if (!hasAllRequiredTypesOnPage(p, required)) {
          typeFailures.push({ page: p, required });
        }
      }
    }
  }
}

// Summary
console.log("\n🔍 Schema health check:");
console.log(`- Total pages with JSON-LD: ${ldPages.length} (min required: ${MIN_PAGES_WITH_LD})`);
if (MUST.length) {
  console.log(
    `- LD_MUST_HAVE patterns: ${MUST.length} (fail on zero: ${FAIL_ON_ZERO ? "yes" : "no"})`
  );
}
if (ENFORCE_TYPES) {
  console.log(
    `- Type validations: ${
      typeFailures.length === 0 ? "✅ All pass" : `❌ ${typeFailures.length} failure(s)`
    }`
  );
}

if (typeFailures.length) {
  console.error(
    "\n❌ Type validation failures:\n" +
      typeFailures
        .map((f) => ` - ${f.page} missing one/more of: ${f.required.join(", ")}`)
        .join("\n")
  );
  failures++;
}

if (failures) process.exit(1);
console.log("\n✅ Schema health check passed");
