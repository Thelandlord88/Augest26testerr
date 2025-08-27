#!/usr/bin/env node
/**
 * Codemod: replace hard-coded "/blog/" href/canonical in .astro with central helpers.
 * Dry-run by default. Pass --write to apply edits.
 */
import fs from 'node:fs';
import path from 'node:path';

const LOG_PATH = path.join(process.cwd(), '__ai', 'codemod-blog-base.txt');
const changedFiles = [];

const WRITE = process.argv.includes('--write');
const ROOT = process.cwd();
const TARGET_EXT = new Set(['.astro']);

// Helper: avoid fragile slash-regex foot-guns
const trimSlashes = (s = '') => String(s).replace(/^\/+/, '').replace(/\/+$/, '');

function* walk(dir) {

  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.astro', 'dist', '.vercel', '.netlify', '__ai'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (TARGET_EXT.has(path.extname(e.name))) yield full;
  }
}

const files = [...walk(path.join(ROOT, 'src'))];
let touched = 0;

function ensureImport(before, after) {
  // Work against the transformed content
  let content = after;
  const hasFrom = /from\s+["']~\/lib\/paths["']/.test(content);
  if (hasFrom) {
    // Ensure both names are present
    content = content.replace(
      /import\s*\{([^}]+)\}\s*from\s*["']~\/lib\/paths["']/,
      (m, names) => {
        const set = new Set(
          names
            .split(',')
            .map((n) => n.trim())
            .filter(Boolean)
        );
        set.add('paths');
        set.add('rel');
        return `import { ${[...set].join(', ')} } from "~/lib/paths"`;
      }
    );
    return content;
  }
  if (content.startsWith('---')) {
    return content.replace(/^---\s*\n/, `---\nimport { paths, rel } from "~/lib/paths";\n`);
  }
  return `---\nimport { paths, rel } from "~/lib/paths";\n---\n` + content;
}

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  let needsImport = false;

  // href="/blog/..."
  after = after.replace(/href\s*=\s*(["'])\/blog\/([^"']+)\1/g, (_m, q, rest) => {
  const bits = trimSlashes(rest).split('/');
    if (!bits[0]) return _m;
    needsImport = true;
    if (bits[1] === 'category' && bits[2]) return `href={rel.blogCategory("${bits[0]}", "${bits[2]}")}`;
    if (bits[1]) return `href={rel.blogPost("${bits[0]}", "${bits[1]}")}`;
    return `href={rel.blogCluster("${bits[0]}")}`;
  });

  // href={"/blog/..."}
  after = after.replace(/href\s*=\s*\{(["'])\/blog\/([^"']+)\1\}/g, (_m, q, rest) => {
  const bits = trimSlashes(rest).split('/');
    if (!bits[0]) return _m;
    needsImport = true;
    if (bits[1] === 'category' && bits[2]) return `href={rel.blogCategory("${bits[0]}", "${bits[2]}")}`;
    if (bits[1]) return `href={rel.blogPost("${bits[0]}", "${bits[1]}")}`;
    return `href={rel.blogCluster("${bits[0]}")}`;
  });

  // canonical="/blog/..."
  after = after.replace(/canonical\s*=\s*(["'])\/blog\/([^"']+)\1/g, (_m, q, rest) => {
  const bits = trimSlashes(rest).split('/');
    if (!bits[0]) return _m;
    needsImport = true;
    if (bits[1] === 'category' && bits[2]) return `canonical={paths.blogCategory("${bits[0]}", "${bits[2]}")}`;
    if (bits[1]) return `canonical={paths.blogPost("${bits[0]}", "${bits[1]}")}`;
    return `canonical={paths.blogCluster("${bits[0]}")}`;
  });

  // canonical={"/blog/..."}
  after = after.replace(/canonical\s*=\s*\{(["'])\/blog\/([^"']+)\1\}/g, (_m, q, rest) => {
  const bits = trimSlashes(rest).split('/');
    if (!bits[0]) return _m;
    needsImport = true;
    if (bits[1] === 'category' && bits[2]) return `canonical={paths.blogCategory("${bits[0]}", "${bits[2]}")}`;
    if (bits[1]) return `canonical={paths.blogPost("${bits[0]}", "${bits[1]}")}`;
    return `canonical={paths.blogCluster("${bits[0]}")}`;
  });

  if (after !== before) {
    touched++;
    const final = needsImport ? ensureImport(before, after) : after;
    if (WRITE) {
      if (!fs.existsSync(file + '.bak')) fs.writeFileSync(file + '.bak', before, 'utf8');
      fs.writeFileSync(file, final, 'utf8');
      console.log('Edited:', path.relative(ROOT, file));
      changedFiles.push(path.relative(ROOT, file));
    } else {
      console.log('Would edit:', path.relative(ROOT, file));
      changedFiles.push(path.relative(ROOT, file));
    }
  }
}

console.log(`${WRITE ? 'Edited' : 'Would edit'} ${touched} file(s).`);
if (!WRITE && touched > 0) console.log('Re-run with --write to apply changes.');

// Always write a JSON report for CI visibility
try {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  const report = { mode: WRITE ? 'write' : 'dry', touched, files: changedFiles };
  fs.writeFileSync(LOG_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log('Wrote', path.relative(process.cwd(), LOG_PATH));
} catch {}
