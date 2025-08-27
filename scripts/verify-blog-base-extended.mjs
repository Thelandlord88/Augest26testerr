#!/usr/bin/env node
/**
 * Extended BLOG_BASE verifier
 * - When BLOG_BASE === "/blog/", this script NO-OPs (skips).
 * - When BLOG_BASE !== "/blog/", it scans .astro/.md/.mdx and selected JSON
 *   for hard-coded "/blog/" and fails if any non-allowlisted hits are found.
 * - Writes a human report to __ai/blog-base-violations.txt
 *
 * Usage:
 *   BLOG_BASE=/guides/ node scripts/verify-blog-base-extended.mjs
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "__ai");
const OUT = path.join(OUT_DIR, "blog-base-violations.txt");
const BLOG_BASE = process.env.BLOG_BASE || "/blog/";

const EXT_ASTRO = new Set([".astro"]);
const EXT_MARKDOWN = new Set([".md", ".mdx"]);
const EXT_JSON = new Set([".json"]);

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", ".astro", ".vercel", ".netlify", "coverage", "__ai"
]);

// Allow-list by relative path (globs-lite via simple startsWith/endsWith)
// Keep this conservative; add entries as you intentionally store legacy "/blog/" in content.
const ALLOW = [
  "src/data/cards.home.json",
  "src/data/cards.areas.json",
  "src/data/topics.json",
];

function rel(p) { return path.relative(ROOT, p); }
function isAllowed(file) {
  const r = rel(file).replace(/\\/g, "/");
  return ALLOW.some(a => r === a || r.endsWith("/" + a));
}
function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function main() {
  await fsp.mkdir(OUT_DIR, { recursive: true });

  // Skip if default
  if (BLOG_BASE === "/blog/") {
    await fsp.writeFile(OUT, `BLOG_BASE is default ("${BLOG_BASE}") — extended verify skipped.\n`, "utf8");
    console.log(`[verify-blog-base-extended] Skipped (BLOG_BASE=${BLOG_BASE}).`);
    return;
  }

  const offenders = [];
  for (const file of walk(ROOT)) {
    const ext = path.extname(file).toLowerCase();
    const inSrc = file.includes(path.sep + "src" + path.sep);
    const isAstro = EXT_ASTRO.has(ext) && inSrc;
    const isMd = EXT_MARKDOWN.has(ext) && inSrc;
    const isJson = EXT_JSON.has(ext) && (file.includes(path.sep + "src" + path.sep + "data" + path.sep) || file.includes(path.sep + "src" + path.sep + "content" + path.sep));

    if (!isAstro && !isMd && !isJson) continue;

    const text = fs.readFileSync(file, "utf8");
  if (text.includes('"/blog/')) {
      if (!isAllowed(file)) offenders.push(rel(file));
    }
  }

  let lines = [];
  lines.push(`# BLOG_BASE extended verify — ${new Date().toISOString()}`);
  lines.push(`BLOG_BASE: ${BLOG_BASE}`);
  lines.push("");

  if (offenders.length) {
    lines.push("❌ Hard-coded \"/blog/\" found in non-allowlisted files:");
    offenders.sort().forEach(f => lines.push(`- ${f}`));
    lines.push("");
    lines.push("Fix: replace strings with rel/paths helpers that honor BLOG_BASE, or add intentional content files to the allow-list above.");
    await fsp.writeFile(OUT, lines.join("\n") + "\n", "utf8");
    console.error(`[verify-blog-base-extended] FAIL — see ${rel(OUT)}`);
    process.exit(1);
  } else {
    lines.push("✅ No non-allowlisted hard-coded \"/blog/\" strings found.");
    await fsp.writeFile(OUT, lines.join("\n") + "\n", "utf8");
    console.log(`[verify-blog-base-extended] PASS — no offenders.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
