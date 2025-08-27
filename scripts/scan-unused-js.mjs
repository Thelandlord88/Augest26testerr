#!/usr/bin/env node
/**
 * scan-unused-js.mjs
 * Safe report (read-only): finds JS files that appear unused in a TS/Astro repo.
 * - Writes JSON + Markdown reports under __reports/
 * - NO file changes are made
 *
 * Usage:
 *   node scripts/scan-unused-js.mjs [--verbose]
 *
 * Notes:
 * - Understands "~" alias -> "src/" (plus tsconfig "paths")
 * - Considers Astro pages, server files, tool configs, and package.json scripts as entrypoints
 * - Parses imports in .{ts,tsx,js,mjs,cjs,jsx,astro}
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const repoRoot = path.resolve(process.cwd());
const VERBOSE = process.argv.includes('--verbose');

const IGNORED_DIRS = new Set([
  'node_modules', 'dist', '.astro', '.cache', '.vercel', '.netlify',
  'coverage', '__ai', '.git', '.playwright', '.vscode', 'to be deleted'
]);

const SRC_EXTS = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx'];
const INDEX_BASENAMES = SRC_EXTS.map(ext => 'index' + ext);
const JS_EXT_RE = /\.(js|mjs|cjs)$/i;

// Files we keep as entrypoints even if not imported
const ALWAYS_KEEP_PATTERNS = [
  // Tool/config files
  /(^|\/)(astro|vite|playwright|vitest|jest|tailwind|postcss)\.config\.(js|mjs|cjs|ts)$/i,
  /(^|\/)\.eslintrc\.(js|cjs|json)$/i,
  /(^|\/)\.prettierrc(\.(js|cjs|json))?$/i,
  /(^|\/)tsconfig(\.[\w-]+)?\.json$/i,
  /(^|\/)\.lintstagedrc(\.(js|cjs|json))?$/i,
  // test/spec files
  /\.(spec|test)\.(js|mjs|cjs)$/i,

  // ✅ Cypress defaults (auto-keep)
  /(^|\/)cypress\.config\.(js|mjs|cjs|ts)$/i,
  /(^|\/)cypress\.[\w-]*\.config\.(js|mjs|cjs|ts)$/i,
  /(^|\/)cypress\/(?:e2e|integration|support)\/.*\.(cy|spec)\.(js|ts|jsx|tsx)$/i,
  /(^|\/)cypress\/plugins\/.+\.(js|ts)$/i,
];

// ---------------------------------------------
// Utilities
// ---------------------------------------------
function readJsonOrNull(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

function matchAlwaysKeep(p) {
  return ALWAYS_KEEP_PATTERNS.some(re => re.test(p));
}

function listTrackedFiles() {
  try {
    const out = execSync('git ls-files', { cwd: repoRoot, stdio: ['ignore','pipe','ignore'] })
      .toString()
      .split('\n')
      .filter(Boolean)
      .map(rel => path.resolve(repoRoot, rel));
    return out;
  } catch {
    // fallback: full walk
    return walkDir(repoRoot, []);
  }
}

function walkDir(dir, out=[]) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const ent of ents) {
    if (IGNORED_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkDir(full, out);
    else out.push(full);
  }
  return out;
}

function loadTsPaths() {
  const tsconfig = readJsonOrNull(path.join(repoRoot, 'tsconfig.json')) || {};
  const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';
  const baseAbs = path.resolve(repoRoot, baseUrl);
  const paths = tsconfig.compilerOptions?.paths || {};
  const out = {};
  for (const [alias, arr] of Object.entries(paths)) {
    const key = alias.replace(/\/\*$/, '');
    out[key] = (arr || []).map(p => path.resolve(baseAbs, p.replace(/\/\*$/, '')));
  }
  return { baseAbs, paths: out };
}

function resolveWithExtensions(candidate) {
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  for (const ext of SRC_EXTS) {
    const p = candidate + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    for (const base of INDEX_BASENAMES) {
      const p = path.join(candidate, base);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    }
  }
  return null;
}

function buildResolver(tsPaths) {
  const defaultAlias = { '~': [path.join(repoRoot, 'src')] };
  const aliasMap = { ...defaultAlias, ...(tsPaths.paths || {}) };

  return function resolveSpecifier(fromFile, spec) {
    // bare module? ignore
    if (!spec.startsWith('.') && !spec.startsWith('/') && !spec.includes(':')) {
      // alias match?
      for (const [key, targets] of Object.entries(aliasMap)) {
        const prefix = key + '/';
        if (spec === key || spec.startsWith(prefix)) {
          const rest = spec === key ? '' : spec.slice(prefix.length);
            for (const base of targets) {
            const abs = path.resolve(base, rest);
            const found = resolveWithExtensions(abs);
            if (found) return found;
          }
        }
      }
      return null;
    }
    // absolute from repo root
    if (spec.startsWith('/')) {
      const abs = path.resolve(repoRoot, '.' + spec);
      return resolveWithExtensions(abs);
    }
    // relative
    const abs = path.resolve(path.dirname(fromFile), spec);
    return resolveWithExtensions(abs);
  };
}

const IMPORT_RE =
  /\bimport\s+(?:[^'\"]+from\s+)?["']([^"']+)["']|\brequire\s*\(\s*["']([^"']+)["']\s*\)|\bimport\s*\(\s*["']([^"']+)["']\s*\)|\bexport\s+[^'\"]*from\s+["']([^"']+)["']/g;

function collectSpecifiers(filePath, content) {
  const specs = [];
  let m;
  while ((m = IMPORT_RE.exec(content))) {
    const spec = m[1] || m[2] || m[3] || m[4];
    if (spec) specs.push(spec);
  }
  return specs;
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function extractScriptEntrypointsFromPkg() {
  const pkg = readJsonOrNull(path.join(repoRoot, 'package.json')) || {};
  const scripts = pkg.scripts || {};
  const files = new Set();
  for (const cmd of Object.values(scripts)) {
    if (typeof cmd !== 'string') continue;
    // capture "node scripts/foo.mjs" and bare "scripts/foo.mjs"
    const re = /\b(?:node\s+)?([^\s"']+\.(?:js|mjs|cjs))\b/gi;
    let m;
    while ((m = re.exec(cmd))) {
      const candidate = m[1];
      const abs = path.resolve(repoRoot, candidate);
      if (fs.existsSync(abs)) files.add(abs);
    }
  }
  return files;
}

// ---------------------------------------------
// Main
// ---------------------------------------------
(function main() {
  const all = listTrackedFiles();
  const sources = all.filter(p =>
    /\.(ts|tsx|js|mjs|cjs|jsx|astro)$/i.test(p) &&
    !p.includes(`${path.sep}to be deleted${path.sep}`)
  );
  const allJs = new Set(all.filter(p => JS_EXT_RE.test(p)));

  const tsPaths = loadTsPaths();
  const resolveSpec = buildResolver(tsPaths);

  // Graph: file -> resolved imports
  const graph = new Map();
  for (const f of sources) {
    const content = readFileSafe(f);
    const specs = collectSpecifiers(f, content);
    const resolved = specs
      .map(spec => resolveSpec(f, spec))
      .filter(Boolean);
    graph.set(f, resolved);
  }

  // Seeds (entrypoints that we must keep)
  const seeds = new Set();
  for (const f of allJs) {
    if (matchAlwaysKeep(f)) seeds.add(f);
    if (f.includes(`${path.sep}src${path.sep}pages${path.sep}`)) seeds.add(f);
    if (f.includes(`${path.sep}server${path.sep}`)) seeds.add(f);
  }
  for (const f of extractScriptEntrypointsFromPkg()) {
    if (JS_EXT_RE.test(f)) seeds.add(f);
  }

  // Traverse graph from all sources; mark any JS they (directly or indirectly) import as used
  const usedJs = new Set([...seeds]);
  const visited = new Set();

  function dfs(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const deps = graph.get(file) || [];
    for (const d of deps) {
      if (JS_EXT_RE.test(d)) usedJs.add(d);
      dfs(d);
    }
  }
  for (const f of sources) dfs(f);

  // Find “shadowed twins”: if foo.ts exists and foo.js is not used by graph, flag it
  const twinInfo = new Map(); // jsPath -> { twin: string|null }
  for (const js of allJs) {
    const base = js.replace(/\.(js|mjs|cjs)$/i, '');
    let twin = null;
    for (const ext of ['.ts', '.tsx']) {
      const candidate = base + ext;
      if (fs.existsSync(candidate)) { twin = candidate; break; }
    }
    twinInfo.set(js, { twin });
  }

  // Candidates = JS not used AND not a seed
  const candidates = [...allJs].filter(p => !usedJs.has(p));

  // Rank confidence
  const rows = candidates.map(p => {
    const rel = path.relative(repoRoot, p);
    const isConfig = matchAlwaysKeep(p);
    const inPages = p.includes(`${path.sep}src${path.sep}pages${path.sep}`);
    const inServer = p.includes(`${path.sep}server${path.sep}`);
    const twin = twinInfo.get(p)?.twin || null;
    // Confidence scoring: higher means safer to remove
    let confidence = 0;
    if (!isConfig && !inPages && !inServer) confidence += 2;
    if (twin) confidence += 2;
    // If nothing imports it (by definition here), +1
    confidence += 1;

    const reasons = [];
    if (twin) reasons.push(`TS twin present: ${path.relative(repoRoot, twin)}`);
    if (!isConfig && !inPages && !inServer) reasons.push('not a config/page/server entrypoint');
    reasons.push('no inbound imports detected');

    return { file: rel, confidence, reasons };
  }).sort((a, b) => b.confidence - a.confidence || a.file.localeCompare(b.file));

  // Output reports
  const outDir = path.join(repoRoot, '__reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'unused-js.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), repoRoot, count: rows.length, items: rows }, null, 2));

  const mdPath = path.join(outDir, 'unused-js.md');
  const md = [
    '# Unused JS report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Total candidates: ${rows.length}`,
    '',
    '| File | Confidence | Reasons |',
    '|------|------------|---------|',
    ...rows.map(r => `| \`${r.file}\` | ${r.confidence} | ${r.reasons.join('; ')} |`)
  ].join('\n');
  fs.writeFileSync(mdPath, md);

  if (VERBOSE) {
    console.log(`Scanned ${sources.length} source files, ${[...allJs].length} JS files.`);
    console.log(`Found ${rows.length} candidate(s).`);
  }
  console.log(`📝 Wrote report: ${path.relative(repoRoot, jsonPath)} and ${path.relative(repoRoot, mdPath)}`);
})();
