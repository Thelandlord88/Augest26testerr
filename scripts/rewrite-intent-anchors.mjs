#!/usr/bin/env node
/**
 * Intent Anchor Rewriter
 *
 * Rewrites anchors that point to /services/:service/:suburb/ so their text
 * is intent-aware, e.g. "Bond cleaning in Kenmore".
 *
 * Modes:
 *  - --mode=src  : scan source files (.astro/.md/.mdx/.html). Conservative: only rewrites
 *                  anchors whose inner HTML is plain text (no child tags).
 *  - --mode=dist : scan built HTML in /dist and rewrite all eligible anchors using an HTML parser.
 *
 * Defaults: --mode=src, dry-run. Use --write to apply edits.
 *
 * Options:
 *  --root=PATH         project root (default: cwd)
 *  --style=in|dash     "Bond cleaning in Suburb" (default) or "Bond cleaning — Suburb"
 *  --origin=URL        your site origin (used to strip absolute links). If omitted, tries import.meta.env.SITE via astro.config.*
 *  --write             actually write changes (creates .bak backups)
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// args & setup
const arg = (k, d = null) => {
  const m = process.argv.find(a => a.startsWith(k + "="));
  return m ? m.slice(k.length + 1) : d;
};
const ROOT = path.resolve(process.cwd(), arg("--root", "."));
const MODE = (arg("--mode", "src")).toLowerCase(); // src | dist
const STYLE = (arg("--style", "in") === "dash" ? "dash" : "in");
const WRITE = process.argv.includes("--write");
const EXTS_SRC = new Set([".astro", ".md", ".mdx", ".html"]);
const EXTS_DIST = new Set([".html"]);

const IGNORE_DIRS = new Set([
  "node_modules",".git",".astro",".vercel",".netlify","coverage","__ai","dist" // dist skipped in src mode
]);

// attempt to read site origin from astro.config.* if not explicitly passed
let SITE_ORIGIN = arg("--origin", null);
if (!SITE_ORIGIN) {
  const candidates = ["astro.config.mjs","astro.config.js","astro.config.ts","astro.config.cjs","astro.config.mts"];
  for (const c of candidates) {
    const p = path.join(ROOT, c);
    if (fs.existsSync(p)) {
      const txt = fs.readFileSync(p, "utf8");
      const m = txt.match(/\bsite\s*:\s*['"]([^'"]+)['"]/);
      if (m && m[1]) { SITE_ORIGIN = m[1]; break; }
    }
  }
}

const OUT_DIR = path.join(ROOT, "__ai");
await fsp.mkdir(OUT_DIR, { recursive: true });
const REPORT = path.join(OUT_DIR, "rewrite-intent-anchors.txt");

// ---------------------------------------------------------------------------
// utilities
const slugify = (s="") => String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const titleCase = (s="") => String(s).replace(/\b[a-z]/g, m => m.toUpperCase());
const humanizeSuburb = (slug="") => titleCase(String(slug).replace(/-/g," "));

const SERVICE_TITLE = {
  "bond-cleaning": "Bond cleaning",
  "spring-cleaning": "Spring cleaning",
  "bathroom-deep-clean": "Bathroom deep clean",
};
const titleForService = (slug) => SERVICE_TITLE[slug] || titleCase(String(slug).replace(/-/g," "));

const anchorForSuburb = (service, suburbName, style="in") => {
  const t = titleForService(service);
  return style === "dash" ? `${t} — ${suburbName}` : `${t} in ${suburbName}`;
};

function isAbsoluteHttp(u) {
  try { const url = new URL(u); return /^https?:$/.test(url.protocol); } catch { return false; }
}
function stripOrigin(u) {
  if (!isAbsoluteHttp(u)) return u;
  if (!SITE_ORIGIN) return u;
  try {
    const base = new URL(SITE_ORIGIN);
    const full = new URL(u);
    if (full.host === base.host && full.protocol === base.protocol) return full.pathname + full.search + full.hash;
    return u;
  } catch { return u; }
}
// Require exactly /services/:service/:suburb/ optionally followed by ? or # in href, but no extra segments
const SERVICE_RX = /^\/services\/([^\/]+)\/([^\/]+)\/$/i;

function cleanPath(href) {
  const u = stripOrigin(href);
  // strip query/hash
  const pathOnly = String(u).replace(/^https?:\/\/[^/]+/i,'').split('#')[0].split('?')[0];
  // normalize to a trailing slash path for matching
  let p = pathOnly;
  if (!p.startsWith('/')) return p; // not a path
  if (!p.endsWith('/')) p += '/';
  return p;
}

// load suburb names
let suburbsPath = path.join(ROOT, "src", "data", "suburbs.json");
if (!fs.existsSync(suburbsPath)) suburbsPath = path.join(ROOT, "src", "data", "suburbs.json"); // same, but keep for clarity
let SUBURB_NAME = new Map();
try {
  const raw = JSON.parse(fs.readFileSync(suburbsPath,"utf8"));
  for (const s of raw || []) {
    const slug = s.slug || slugify(s.name);
    const name = s.name || humanizeSuburb(slug);
    SUBURB_NAME.set(slug, name);
  }
} catch {
  // fallback: empty map
  SUBURB_NAME = new Map();
}

function walk(dir, setExts) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      // include dist only in dist mode
      if (MODE === "dist" || path.basename(full) !== "dist") out.push(...walk(full, setExts));
    } else {
      const ext = path.extname(ent.name).toLowerCase();
      if (setExts.has(ext)) out.push(full);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// core transformers

// Conservative source transformer (regex-y, plain-text anchors only)
function transformSource(code, file) {
  // matches <a ...href="...">TEXT</a> where TEXT has no tags
  const A_RX = /<a\b([^>]*?)\bhref\s*=\s*(['"])(.*?)\2([^>]*)>([^<]*?)<\/a>/gis;
  let changed = 0;
  const out = code.replace(A_RX, (m, pre, q, href, post, inner) => {
  const p = cleanPath(href);
  const mm = p.match(SERVICE_RX);
    if (!mm) return m;
    const service = mm[1].toLowerCase();
    const suburbSlug = mm[2].toLowerCase().replace(/\/+$/,"");
    const suburbName = SUBURB_NAME.get(suburbSlug) || humanizeSuburb(suburbSlug);

    const newText = anchorForSuburb(service, suburbName, STYLE);
    if (inner.trim() === newText) return m;

    changed++;
    return `<a${pre}href=${q}${href}${q}${post} aria-label="${newText}" title="${newText}">${newText}</a>`;
  });
  return { code: out, changed };
}

// Dist transformer (tolerant regex over built HTML)
function transformHtml(code) {
  const A_RX = /<a\b([^>]*?)\bhref\s*=\s*(['"])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi;
  let changed = 0;
  const out = code.replace(A_RX, (m, pre, q, href, post, inner) => {
  const p = cleanPath(href);
  const mm = p.match(SERVICE_RX);
    if (!mm) return m;
    const service = mm[1].toLowerCase();
    const suburbSlug = mm[2].toLowerCase().replace(/\/+$/,"");
    const suburbName = SUBURB_NAME.get(suburbSlug) || humanizeSuburb(suburbSlug);

    const desired = anchorForSuburb(service, suburbName, STYLE);

    // If inner already includes other HTML, don’t replace DOM; just add a11y labels.
    if (/<[a-zA-Z]/.test(inner)) {
      // add aria-label/title if missing
      let attrs = pre + post;
      const hasAria = /\baria-label\s*=/.test(attrs);
      const hasTitle = /\btitle\s*=/.test(attrs);
      const append =
        (hasAria ? "" : ` aria-label="${desired}"`) +
        (hasTitle ? "" : ` title="${desired}"`);
      if (!append) return m;
      changed++;
      return `<a${pre}href=${q}${href}${q}${post}${append}>${inner}</a>`;
    }

    // Plain text: replace text, add labels
    changed++;
    return `<a${pre}href=${q}${href}${q}${post} aria-label="${desired}" title="${desired}">${desired}</a>`;
  });
  return { code: out, changed };
}

// ---------------------------------------------------------------------------
// run

const files = MODE === "dist"
  ? walk(path.join(ROOT, "dist"), EXTS_DIST)
  : walk(path.join(ROOT, "src"), EXTS_SRC);

let totalFiles = 0, totalChanges = 0;
const changes = [];

for (const f of files) {
  const orig = fs.readFileSync(f, "utf8");
  let res;
  if (MODE === "dist") res = transformHtml(orig);
  else res = transformSource(orig, f);

  if (res.changed > 0) {
    totalFiles++;
    totalChanges += res.changed;
    changes.push({ file: path.relative(ROOT, f), edits: res.changed });

    if (WRITE) {
      // backup once
      const bak = f + ".bak";
      if (!fs.existsSync(bak)) fs.writeFileSync(bak, orig, "utf8");
      fs.writeFileSync(f, res.code, "utf8");
    }
  }
}

// report
const lines = [];
lines.push(`# intent anchor rewrite — ${new Date().toISOString()}`);
lines.push(`root: ${ROOT}`);
lines.push(`mode: ${MODE}  write: ${WRITE ? "yes" : "no"}  style: ${STYLE}`);
lines.push(`files scanned: ${files.length}`);
lines.push(`files changed: ${totalFiles}`);
lines.push(`anchors rewritten or labeled: ${totalChanges}`);
if (changes.length) {
  lines.push("\nchanged files:");
  for (const c of changes.slice(0, 100)) {
    lines.push(`- ${c.file} (${c.edits} edit${c.edits>1?"s":""})`);
  }
  if (changes.length > 100) lines.push(`… and ${changes.length-100} more`);
}
await fsp.writeFile(REPORT, lines.join("\n") + "\n", "utf8");
console.log(lines.join("\n"));
console.log(`\nWrote report: ${path.relative(ROOT, REPORT)}`);
if (!WRITE && totalFiles > 0) {
  console.log(`\n(dry run) add --write to apply changes. backups (*.bak) will be created.`);
}
