#!/usr/bin/env node
import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createSarif, rule, result, writeSarif } from './sarif.js';
import { execSync } from 'node:child_process';
import micromatch from 'micromatch';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OUT_PATH = process.env.AI_SARIF_OUT_COPY || 'sarif/ai-copy-lint.sarif';

const ROOTS = ['src'];
const EXTS = new Set(['.astro', '.md', '.mdx']);
let CONFIG = { routes: [], lexicon: {} };
try {
  CONFIG = JSON.parse(await fs.readFile('ai-rules.json', 'utf8'));
} catch {}

function listChanged() {
  try {
    if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
      const base = process.env.GITHUB_BASE_REF;
      if (base) {
        const out = execSync(`git fetch origin ${base} --depth=1 >/dev/null 2>&1 || true; git diff --name-only origin/${base}...HEAD`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        return out.split('\n').filter(Boolean);
      }
    }
    const out = execSync('git diff --name-only HEAD~1..HEAD', { encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch { return []; }
}

async function* walk(dir) {
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

async function collectFiles({ fullScan = false } = {}) {
  const files = [];
  const changed = new Set(fullScan || process.env.FULL_SCAN ? [] : listChanged());
  for (const r of ROOTS) {
    const p = path.resolve(r);
    try {
      const stat = await fs.stat(p);
      if (!stat.isDirectory()) continue;
      for await (const f of walk(p)) {
        if (!EXTS.has(path.extname(f))) continue;
        // If we have a changed list (PR), include only changed files
        if (changed.size > 0) {
          if (changed.has(path.relative(process.cwd(), f))) files.push(f);
        } else {
          files.push(f);
        }
      }
    } catch {}
  }
  return files;
}

function staticChecks(content) {
  const checks = [];
  const lines = content.split(/\r?\n/);
  const brandRegexps = [
    /One\s*N\s*Done\s*Bond\s*Clean/gi,
    /One\s*and\s*Done/gi,
  ];
  const todoRe = /(TODO|FIXME|TBD|\bWIP\b)/;
  const loremRe = /lorem ipsum/gi;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (todoRe.test(line)) checks.push({ ruleId: 'copy-todo', message: 'Found TODO/FIXME marker', line: i + 1 });
    if (loremRe.test(line)) checks.push({ ruleId: 'copy-lorem', message: 'Placeholder text "lorem ipsum"', line: i + 1 });
    if (/\s{2,}/.test(line)) checks.push({ ruleId: 'copy-spacing', message: 'Multiple consecutive spaces', line: i + 1 });
    for (const r of brandRegexps) {
      r.lastIndex = 0; if (r.test(line)) checks.push({ ruleId: 'copy-brand', message: 'Brand name variant detected; ensure consistency', line: i + 1 });
    }
  }
  return checks;
}

async function aiSuggestions(samples) {
  if (!OPENAI_API_KEY) return [];
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const prompt = `You are a copy editor. Review the provided snippets for tone, clarity, duplicate content, and inconsistent terminology.
Return ONLY JSON array of { file, message, severity } with severity in [note, warning]. Be brief.`;
  const text = samples.map(s => `FILE: ${s.file}\n---\n${s.content}\n---`).join('\n\n');
  try {
    const resp = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You output strictly JSON.' },
        { role: 'user', content: `${prompt}\n\n${text.slice(0, 12000)}` },
      ],
      temperature: 0.2,
    });
    const raw = resp.choices?.[0]?.message?.content?.trim() || '[]';
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.warn('[ai-copy-lint] OpenAI failed; continuing with static checks only.');
    return [];
  }
}

async function run() {
  // Try change-only first, then fall back to full scan if nothing matched
  let files = await collectFiles();
  if (files.length === 0) {
    files = await collectFiles({ fullScan: true });
    if (files.length > 0) {
      console.log(`[ai-copy-lint] No changed .astro/.md detected; falling back to full scan of ${files.length} file(s).`);
    }
  }
  if (files.length === 0) {
    console.log('[ai-copy-lint] No .astro/.md files found after full scan. Skipping.');
    const sar = createSarif({ toolName: 'AI Content Reviewer', rules: [], results: [] });
    await writeSarif(OUT_PATH, sar);
    return;
  }

  const rules = [
    rule({ id: 'copy-todo', name: 'TODO markers' }),
    rule({ id: 'copy-lorem', name: 'Placeholder text' }),
    rule({ id: 'copy-spacing', name: 'Spacing consistency' }),
    rule({ id: 'copy-brand', name: 'Brand consistency' }),
    rule({ id: 'copy-ai', name: 'AI copy suggestion' }),
  ];

  const results = [];
  const samples = [];
  for (const f of files) {
    const content = await fs.readFile(f, 'utf8');
    const checks = staticChecks(content);
    for (const c of checks) {
      results.push(result({ ruleId: c.ruleId, message: c.message, level: 'note', file: f, startLine: c.line, startColumn: 1 }));
    }
    // Intent checks using ai-rules.json heuristics based on a URL hint (from file path)
    const urlHint = '/' + path.relative('src/pages', f).replace(/index\.astro$/, '').replace(/\\/g, '/');
    const matches = CONFIG.routes.filter((r) => micromatch.isMatch(urlHint, r.glob));
    const must = [...new Set(matches.flatMap((m) => m.must || []))];
    const forbid = [...new Set(matches.flatMap((m) => m.forbid || []))];
    const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    for (const term of must) {
      if (!text.includes(term.toLowerCase())) {
        results.push(result({ ruleId: 'copy.missing-term', message: `Missing term "${term}"`, level: 'warning', file: f, startLine: 1, startColumn: 1 }));
      }
    }
    for (const term of forbid) {
      if (text.includes(term.toLowerCase())) {
        results.push(result({ ruleId: 'copy.forbidden-term', message: `Forbidden term "${term}" present`, level: 'error', file: f, startLine: 1, startColumn: 1 }));
      }
    }

    // Collect small samples for AI (first 400 chars of text-only)
    const snippet = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
    if (snippet) samples.push({ file: f, content: snippet });
  }

  // Limit AI sample count for cost
  const aiInput = samples.slice(0, 10);
  const aiFindings = await aiSuggestions(aiInput);
  for (const f of aiFindings) {
    if (!f || typeof f !== 'object') continue;
    const file = f.file && typeof f.file === 'string' ? f.file : aiInput[0]?.file;
    const level = ['note', 'warning', 'error'].includes(f.severity) ? f.severity : 'note';
    const message = typeof f.message === 'string' ? f.message : 'Copy suggestion';
    results.push(result({ ruleId: 'copy-ai', message, level, file, startLine: 1, startColumn: 1 }));
  }

  const sar = createSarif({ toolName: 'AI Content Reviewer', rules, results });
  await writeSarif(OUT_PATH, sar);
  console.log(`[ai-copy-lint] Wrote ${results.length} findings to ${OUT_PATH}`);
}

run().catch(err => {
  console.error('[ai-copy-lint] Fatal error', err);
  process.exit(0); // soft-exit
});
