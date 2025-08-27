#!/usr/bin/env node
/**
 * Site Configuration & Absolute URL Audit
 *
 * What this does:
 * - Finds astro.config.* and validates `site` is a valid absolute URL.
 * - Audits code for correct usage of `import.meta.env.SITE` (and flags concat misuse).
 * - Flags lingering `Astro.site` references.
 * - Scans for hard-coded origins (e.g., https://preview-*.netlify.app) you should replace.
 * - Verifies sitemap/canonical/SEO helpers reference `import.meta.env.SITE`.
 * - (Optional) Creates a standard URL helper `src/lib/url.ts` via --add-helper.
 * - Supports monorepos via `--root=path/to/app`.
 *
 * Output:
 * - Writes a human-readable report to __ai/site-audit.txt
 * - Exits 1 on critical failures (so CI can fail fast).
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const arg = (name, dflt = null) => {
  const match = process.argv.find(a => a.startsWith(name + "="));
  if (!match) return dflt;
  return match.split("=")[1] || dflt;
};

const ROOT = path.resolve(process.cwd(), arg("--root", "."));
const OUT_DIR = path.join(ROOT, "__ai");
const OUT = path.join(OUT_DIR, "site-audit.txt");
const ADD_HELPER = process.argv.includes("--add-helper");

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", ".astro", ".vercel", ".netlify", "coverage", "__ai"
]);
const exts = new Set([".astro", ".js", ".mjs", ".cjs", ".ts", ".tsx"]);

const CANDIDATE_CONFIGS = [
  "astro.config.mjs", "astro.config.js", "astro.config.ts",
  "astro.config.cjs", "astro.config.mts"
];

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}
function read(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return ""; }
}
function rel(p) {
  return path.relative(ROOT, p) || p;
}
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (exts.has(path.extname(entry.name))) yield full;
  }
}
function parseSiteFromConfig(code) {
  // tolerant: site: 'https://…' OR "https://…"
  const m = code.match(/\bsite\s*:\s*['"]([^'"]+)['"]/);
  return m?.[1] || null;
}
function isAbsoluteHttpUrl(u) {
  try {
    const url = new URL(u);
    return /^https?:$/.test(url.protocol) && !!url.host;
  } catch { return false; }
}
function summarizeHits(files, pattern) {
  const rx = typeof pattern === "string"
    ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
    : pattern;
  let count = 0;
  const samples = [];
  for (const f of files) {
    const t = read(f);
    if (rx.test(t)) {
      count++;
      if (samples.length < 6) samples.push(rel(f));
    }
  }
  return { count, samples };
}
function ensureHelperFile() {
  const helperPath = path.join(ROOT, "src", "lib", "url.ts");
  if (exists(helperPath)) return helperPath;
  fs.mkdirSync(path.dirname(helperPath), { recursive: true });
  fs.writeFileSync(helperPath, `// src/lib/url.ts
// Standard absolute URL builder for SSR/client-safe usage.
// Uses Astro's \`site\` (exposed as import.meta.env.SITE) to absolutize paths.
export const absoluteUrl = (p = '/', origin = import.meta.env.SITE) => {
  const base = String(origin || '').replace(/\/$/, '');
  try { return new URL(p, base + '/').toString(); }
  catch { return String(p || '/'); }
};
`, "utf8");
  return helperPath;
}

function findHardcodedHosts(files, siteValue) {
  const HOST_RX = /\bhttps?:\/\/[a-z0-9.-]+(?::[0-9]+)?\b/ig;
  const allowedHosts = new Set([
    "https://schema.org",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://www.googletagmanager.com",
    "http://www.sitemaps.org",
    "http://www.w3.org",
    "https://www.instagram.com",
    "https://facebook.com",
    "https://www.facebook.com",
    "https://placehold.co",
    "https://astro.build",
    "https://json.schemastore.org",
  ]);
  const localHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

  let siteHost = null;
  try { siteHost = siteValue ? new URL(siteValue).host : null; } catch {}

  const byHost = new Map(); // origin -> { files: Set, examples: Set }
  for (const f of files) {
    const t = read(f);
    const matches = t.matchAll(HOST_RX);
    for (const m of matches) {
      const origin = m[0].replace(/\/+$/, "");
      // Skip allowed externals
      if (allowedHosts.has(origin)) continue;

      // Skip current configured site host
  let host = null, hostname = null;
  try { const u = new URL(origin); host = u.host; hostname = u.hostname; } catch { host = null; hostname = null; }
      if (!host) continue;
      if (siteHost && host === siteHost) continue;
  if (hostname && localHostnames.has(hostname)) continue; // allow localhost in dev helpers

      const entry = byHost.get(origin) || { files: new Set(), examples: new Set() };
      entry.files.add(rel(f));
      if (entry.examples.size < 6) entry.examples.add(rel(f));
      byHost.set(origin, entry);
    }
  }
  return byHost;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1) Find astro.config.* and grab `site`
  let configPath = null;
  let siteValue = null;
  for (const c of CANDIDATE_CONFIGS) {
    const p = path.join(ROOT, c);
    if (exists(p)) {
      const code = read(p);
      const maybeSite = parseSiteFromConfig(code);
      if (maybeSite) { configPath = p; siteValue = maybeSite; break; }
      if (!configPath) configPath = p; // remember first for messaging
    }
  }

  // 2) Crawl codebase
  const files = [...walk(ROOT)];
  const SELF_PATH = path.join(ROOT, 'scripts', 'assert-site-config.mjs');
  const filesNoSelf = files.filter(f => f !== SELF_PATH && !/README\.md$/.test(f));

  // 3) Usage & smells
  const envSite = summarizeHits(filesNoSelf, /\bimport\.meta\.env\.SITE\b/);
  const newURLEnv = summarizeHits(filesNoSelf, /new\s+URL\s*\([^)]*,\s*import\.meta\.env\.SITE\s*\)/);
  const concatSite = summarizeHits(filesNoSelf, /import\.meta\.env\.SITE\s*\+\s*['"]/);
  const astroSite = summarizeHits(filesNoSelf, /\bAstro\.site(\.origin)?\b/);

  const schemaHelpers = filesNoSelf
    .filter(f => {
      const n = path.basename(f).toLowerCase();
      return /seo|schema|schemamanager|schemagraph/.test(n) && /lib|utils|components|src/.test(f);
    })
    .slice(0, 40);
  const schemaUsesEnv = summarizeHits(schemaHelpers, /\bimport\.meta\.env\.SITE\b/);
  const schemaUsesAstro = summarizeHits(schemaHelpers, /\bAstro\.site(\.origin)?\b/);

  const canonicalFiles = filesNoSelf.filter(f =>
    /(sitemap|canonical|seo)/i.test(f) && exts.has(path.extname(f))
  );
  const canonicalUsesEnv = summarizeHits(canonicalFiles, /\bimport\.meta\.env\.SITE\b/);

  const hardcoded = findHardcodedHosts(filesNoSelf, siteValue);

  // 4) Build report
  const lines = [];
  lines.push(`# Site config & absolute URL audit — ${new Date().toISOString()}`);
  lines.push(`Root: ${ROOT}`);
  lines.push("");

  lines.push(`Astro config file: ${configPath ? rel(configPath) : "(not found)"}`);
  lines.push(`Configured site:   ${siteValue ?? "(missing)"}`);
  if (!siteValue) {
    lines.push("❌ No 'site' configured in astro.config.* — Astro will not populate import.meta.env.SITE.");
  } else if (!isAbsoluteHttpUrl(siteValue)) {
    lines.push(`❌ 'site' is not an absolute URL: ${siteValue}`);
  } else {
    lines.push("✅ 'site' is set to a valid absolute URL.");
  }
  lines.push("");

  lines.push("Usage summary:");
  lines.push(`- import.meta.env.SITE usage: ${envSite.count}${envSite.samples.length ? "  e.g. " + envSite.samples.join(", ") : ""}`);
  lines.push(`- new URL(…, import.meta.env.SITE) usage: ${newURLEnv.count}${newURLEnv.samples.length ? "  e.g. " + newURLEnv.samples.join(", ") : ""}`);
  lines.push(`- String concatenation with import.meta.env.SITE: ${concatSite.count}${concatSite.samples.length ? "  e.g. " + concatSite.samples.join(", ") : ""}`);
  lines.push(`- Astro.site / Astro.site.origin usage: ${astroSite.count}${astroSite.samples.length ? "  e.g. " + astroSite.samples.join(", ") : ""}`);
  lines.push("");

  if (schemaHelpers.length) {
    lines.push("JSON-LD helper files scanned:");
    for (const f of schemaHelpers) lines.push(`- ${rel(f)}`);
    lines.push(`→ helpers using import.meta.env.SITE: ${schemaUsesEnv.count}`);
    lines.push(`→ helpers using Astro.site: ${schemaUsesAstro.count}`);
    lines.push("");
  }

  if (canonicalFiles.length) {
    lines.push("Canonical/Sitemap/SEO files scanned:");
    for (const f of canonicalFiles.slice(0, 12)) lines.push(`- ${rel(f)}`);
    lines.push(`→ files using import.meta.env.SITE: ${canonicalUsesEnv.count}`);
    lines.push("");
  }

  if (hardcoded.size) {
    lines.push("Hard-coded origins detected (replace with absoluteUrl() or import.meta.env.SITE):");
    for (const [origin, meta] of hardcoded.entries()) {
      lines.push(`- ${origin}`);
      const examples = [...meta.examples];
      if (examples.length) lines.push(`  e.g. ${examples.join(", ")}`);
    }
    lines.push("");
  } else {
    lines.push("✅ No suspicious hard-coded origins found.");
    lines.push("");
  }

  // 5) Gates & actions
  const actions = [];
  let failures = 0;

  if (!siteValue || !isAbsoluteHttpUrl(siteValue)) {
    failures++;
    actions.push(`- Add/repair 'site' in ${configPath ? rel(configPath) : "astro.config.mjs"}:
  export default defineConfig({ site: 'https://YOUR_DOMAIN' })`);
  }

  if (envSite.count > 0 && (!siteValue || !isAbsoluteHttpUrl(siteValue))) {
    failures++;
    actions.push("- Code uses import.meta.env.SITE but 'site' is missing/invalid — those absolute URLs will be wrong at runtime.");
  }

  if (schemaHelpers.length && schemaUsesEnv.count === 0) {
    failures++;
    actions.push("- JSON-LD helpers are not using import.meta.env.SITE — update them to build absolute URLs from the configured origin.");
  }

  if (canonicalFiles.length && canonicalUsesEnv.count === 0) {
    failures++;
    actions.push("- Canonical/sitemap/SEO emitters do not reference import.meta.env.SITE — canonical URLs/sitemap may be incorrect.");
  }

  if (astroSite.count > 0) {
    failures++;
    actions.push("- Replace Astro.site/Astro.site.origin with import.meta.env.SITE (SSR-safe & adapter-agnostic).");
  }

  if (hardcoded.size > 0) {
    failures++;
    actions.push("- Replace hard-coded origins with absoluteUrl('/path') or new URL('/path', import.meta.env.SITE).");
  }

  if (concatSite.count > 0) {
    actions.push("- Avoid string concatenation with import.meta.env.SITE; prefer new URL('/path', import.meta.env.SITE).");
  }

  if (ADD_HELPER) {
    const p = ensureHelperFile();
    actions.push(`- Ensured helper exists: ${rel(p)} (use absoluteUrl('/path')).`);
  } else {
    actions.push("- (Optional) Add helper: src/lib/url.ts with absoluteUrl(). Run this script with --add-helper to create it.");
  }

  lines.push("Recommended actions:");
  for (const a of actions) lines.push(a);
  lines.push("");

  if (failures) {
    lines.push(`❌ Audit FAILED with ${failures} critical issue(s).`);
  } else {
    lines.push("✅ Audit passed. Configuration and usage look healthy.");
  }

  await fsp.mkdir(OUT_DIR, { recursive: true });
  await fsp.writeFile(OUT, lines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${rel(OUT)}`);
  if (failures) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
