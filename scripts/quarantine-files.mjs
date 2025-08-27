#!/usr/bin/env node
/**
 * quarantine-files.mjs
 * Move a reviewed allow-list of files into "to be deleted/" (preserving structure).
 * Also supports --restore to move them back using the manifest.
 *
 * Usage:
 *   node scripts/quarantine-files.mjs --list __reports/unused-allowlist.txt --apply
 *   node scripts/quarantine-files.mjs --restore
 */

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const ARG = Object.fromEntries(
  process.argv.slice(2).map((s, i, arr) => s.startsWith('--')
    ? [s.replace(/^--/, ''), (arr[i+1] && !arr[i+1].startsWith('--')) ? arr[i+1] : true]
    : ['_', s]
  )
);
const listArg = typeof ARG.list === 'string' ? ARG.list : (Array.isArray(ARG._) ? ARG._[0] : null);
const APPLY = !!ARG.apply;
const RESTORE = !!ARG.restore;

const stagingRoot = path.join(repoRoot, 'to be deleted');
const manifestPath = path.join(stagingRoot, 'manifest.json');

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function loadList(p) {
  const abs = path.resolve(repoRoot, p);
  if (!fs.existsSync(abs)) throw new Error(`List not found: ${p}`);
  if (abs.endsWith('.json')) {
    const j = JSON.parse(fs.readFileSync(abs, 'utf8'));
    if (Array.isArray(j)) return j;
    if (j && Array.isArray(j.items)) return j.items.map(x => x.file);
    throw new Error('Unsupported JSON format.');
  }
  // txt
  return fs.readFileSync(abs, 'utf8')
    .split('\n').map(s => s.trim()).filter(Boolean).filter(s => !s.startsWith('#'));
}

if (RESTORE) {
  if (!fs.existsSync(manifestPath)) {
    console.error('No manifest found to restore from.');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const files = manifest.files || [];
  for (const rel of files) {
    const from = path.join(stagingRoot, rel);
    const to = path.join(repoRoot, rel);
    if (!fs.existsSync(from)) { console.warn(`[skip] missing in staging: ${rel}`); continue; }
    ensureDir(path.dirname(to));
    fs.renameSync(from, to);
    console.log(`restored ${rel}`);
  }
  console.log('✅ Restore complete.');
  process.exit(0);
}

if (!listArg) {
  console.error('Usage: node scripts/quarantine-files.mjs --list <allowlist.txt> [--apply]');
  process.exit(1);
}

const rels = loadList(listArg).map(r => r.replace(/^\.\//, '')).filter(Boolean);

// Validate presence
const missing = rels.filter(rel => !fs.existsSync(path.join(repoRoot, rel)));
if (missing.length) {
  console.error('Some listed files do not exist:\n' + missing.map(m => `  - ${m}`).join('\n'));
  process.exit(1);
}

console.log(`Files to quarantine (${rels.length}):`);
rels.forEach(r => console.log('  - ' + r));

if (!APPLY) {
  console.log('\n(DRY RUN) Add --apply to move these files to "to be deleted/".');
  process.exit(0);
}

ensureDir(stagingRoot);
for (const rel of rels) {
  const src = path.join(repoRoot, rel);
  const dest = path.join(stagingRoot, rel);
  ensureDir(path.dirname(dest));
  fs.renameSync(src, dest);
}

const manifest = { generatedAt: new Date().toISOString(), repoRoot, files: rels };
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`\n✅ Moved ${rels.length} file(s) into "to be deleted/".`);
console.log(`Manifest: ${path.relative(repoRoot, manifestPath)}`);
console.log(`Use "node scripts/quarantine-files.mjs --restore" to bring them back.`);
